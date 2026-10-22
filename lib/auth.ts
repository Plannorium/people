import { randomUUID } from "node:crypto";
import { configuredAdminRole, effectiveAdminRole } from "./admin-policy";
import { verifyAdminCode } from "./admin-verification";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "./db";
import { Employee, UserRole } from "./models/Employee";

const PLANNORIUM_IDENTITY_URL =
  process.env.PLANNORIUM_ID_ISSUER ||
  process.env.PLANNORIUM_IDENTITY_URL ||
  "https://id.plannorium.com";

export function getAllowedEmailDomain(): string {
  const raw = process.env.ALLOWED_EMAIL_DOMAIN;
  if (!raw) return "plannorium.com";
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:[0-9]+$/, "")
    .replace(/^@/, "");
  if (!cleaned || cleaned.includes("localhost") || cleaned.includes("127.0.0.1")) {
    return "plannorium.com";
  }
  return cleaned;
}

/**
 * Optional invite list (ACCESS_ALLOWLIST, comma-separated emails). When set, only those
 * addresses and OWNER_EMAIL may use the portal, e.g. while it is being tested before launch.
 */
export function isEmailAllowed(email: string): boolean {
  const list = (process.env.ACCESS_ALLOWLIST || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return true;
  const normalized = email.toLowerCase().trim();
  const owner = process.env.OWNER_EMAIL?.toLowerCase().trim();
  return normalized === owner || configuredAdminRole(normalized) !== "employee" || list.includes(normalized);
}

// Passwordless dev sign-in: local `next dev` only. Never in a production build or on Vercel,
// whatever the env vars say, because it lets anyone sign in as any staff email.
export const DEV_AUTH_ENABLED =
  process.env.NODE_ENV === "development" && !process.env.VERCEL && process.env.PEOPLE_ENABLE_DEV_AUTH === "true";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  providers: [
    // 1. Plannorium ID OIDC Provider
    {
      id: "plannorium",
      name: "Plannorium ID",
      type: "oauth",
      wellKnown: `${PLANNORIUM_IDENTITY_URL.replace(/\/+$/, "")}/.well-known/openid-configuration`,
      jwks_endpoint: `${PLANNORIUM_IDENTITY_URL.replace(/\/+$/, "")}/.well-known/jwks.json`,
      issuer: PLANNORIUM_IDENTITY_URL.replace(/\/+$/, ""),
      authorization: {
        url: `${PLANNORIUM_IDENTITY_URL.replace(/\/+$/, "")}/oauth/authorize`,
        params: { scope: "openid email profile" },
      },
      token: `${PLANNORIUM_IDENTITY_URL.replace(/\/+$/, "")}/api/oauth/token`,
      userinfo: `${PLANNORIUM_IDENTITY_URL.replace(/\/+$/, "")}/api/oauth/userinfo`,
      checks: ["pkce", "state"],
      idToken: true,
      client: {
        id_token_signed_response_alg: "RS256",
      },
      clientId: process.env.PLANNORIUM_ID_CLIENT_ID || process.env.PLANNORIUM_CLIENT_ID,
      clientSecret: process.env.PLANNORIUM_ID_CLIENT_SECRET || process.env.PLANNORIUM_CLIENT_SECRET,
      profile(profile: any) {
        return {
          id: profile.sub || profile.id,
          name: profile.name,
          email: profile.email,
          image: profile.picture || profile.image,
          email_verified: profile.email_verified === true || profile.verified === true,
        };
      },
    } as any,

    // 2. Google Provider fallback (restricted to plannorium.com)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // 3. Development provider (local `next dev` only, see DEV_AUTH_ENABLED)
    ...(DEV_AUTH_ENABLED
      ? [
          CredentialsProvider({
            id: "dev-login",
            name: "Plannorium Dev Access",
            credentials: {
              email: { label: "Work Email", type: "email", placeholder: "alex@plannorium.com" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const email = credentials.email.toLowerCase().trim();
              const allowedDomain = getAllowedEmailDomain();
              const isOwner = configuredAdminRole(email) !== "employee";
              if (!isOwner && !email.endsWith(`@${allowedDomain}`)) {
                throw new Error(`Only @${allowedDomain} accounts or explicitly authorized admin accounts are allowed.`);
              }
              const role: UserRole = "employee";
              return {
                id: `dev_${email}`,
                email,
                name: email.split("@")[0],
                role,
              };
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email ? user.email.toLowerCase().trim() : "";
      if (!email) return false;

      const allowedDomain = getAllowedEmailDomain();
      const isOwnerEmail = configuredAdminRole(email) !== "employee";

      // Restrict strictly to configured domain (e.g. plannorium.com), unless it is the explicitly configured owner
      if (!isOwnerEmail && !email.endsWith(`@${allowedDomain}`)) {
        return "/sign-in?error=DomainRestricted";
      }

      if (!isEmailAllowed(email)) {
        return "/sign-in?error=NotInvited";
      }

      // Only trust addresses the identity provider has verified
      if (account?.provider === "plannorium" && (user as { email_verified?: boolean }).email_verified !== true) {
        return "/sign-in?error=EmailUnverified";
      }
      if (account?.provider === "google") {
        const g = profile as { email_verified?: boolean; hd?: string } | undefined;
        if (g?.email_verified !== true || (!isOwnerEmail && g?.hd?.toLowerCase() !== allowedDomain)) {
          return "/sign-in?error=DomainRestricted";
        }
      }

      try {
        await connectDB();

        const authSub = (user.id || profile?.sub || (account && account.providerAccountId) || email).toString();

        // Find or create employee record
        let employee = await Employee.findOne({
          $or: [{ workEmail: email }, { authSubject: authSub }],
        });

        if (!employee) {
          // The first owner must be named explicitly; no default address gets owner rights
          const role: UserRole = configuredAdminRole(email);

          employee = await Employee.create({
            authSubject: authSub,
            workEmail: email,
            role,
            status: "incomplete",
          });
        } else if (employee.status === "offboarded") {
          // Former staff can no longer sign in
          return "/sign-in?error=AccessRevoked";
        } else if (!employee.authSubject) {
          employee.authSubject = authSub;
          await employee.save();
        }

        const configuredRole = configuredAdminRole(email);
        if (employee.role !== configuredRole) {
          employee.role = configuredRole;
          await employee.save();
        }
        return true;
      } catch (err) {
        console.error("[Auth] Error finding or creating employee record:", err);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.adminChallengeId = randomUUID();
        token.adminVerifiedAt = undefined;
      }
      if (!token.adminChallengeId) {
        token.adminChallengeId = randomUUID();
      }

      // Lookup role and employee record ID from DB
      if (token.email) {
        try {
          await connectDB();
          const emp = await Employee.findOne({ workEmail: token.email.toLowerCase() }).select("_id role status");
          if (emp && !isEmailAllowed(token.email)) {
            // Removed from the invite list: treated like an ended account on the next request
            token.role = "employee";
            token.status = "offboarded";
          } else if (emp?.status === "offboarded") {
            token.role = "employee";
            token.status = "offboarded";
            token.adminVerifiedAt = undefined;
          } else if (emp) {
            if (trigger === "update" && token.adminChallengeId && session && typeof session === "object" && "adminVerificationCode" in session) {
              const valid = await verifyAdminCode(token.email, token.adminChallengeId, session.adminVerificationCode);
              if (valid) token.adminVerifiedAt = Date.now();
            }
            token.role = token.adminChallengeId ? effectiveAdminRole(token.email, token.adminVerifiedAt) : "employee";
            token.status = emp.status;
            token.employeeRecordId = emp._id.toString();
          } else {
            // Record removed: drop any privileges carried in the old token
            token.role = "employee";
            token.status = "offboarded";
            token.employeeRecordId = undefined;
          }
        } catch (e) {
          // A database or verification failure must never preserve old elevated privileges.
          token.role = "employee";
          token.status = "offboarded";
          token.employeeRecordId = undefined;
          token.adminVerifiedAt = undefined;
          console.error("[Auth] Could not refresh session permissions.", e instanceof Error ? e.name : "UnknownError");
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role || "employee";
        (session.user as any).status = token.status || "incomplete";
        (session.user as any).employeeRecordId = token.employeeRecordId;
        session.user.adminVerificationRequired = token.status !== "offboarded" && configuredAdminRole(token.email || "") !== "employee" && token.role === "employee";
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Relative paths stay on the current origin (e.g. /onboarding, /me)
      if (url.startsWith("/")) {
        return url;
      }
      try {
        const parsed = new URL(url);
        // If redirecting to localhost or matching base origin, allow it
        if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.origin === baseUrl) {
          return url;
        }
      } catch {
        // Fall back to baseUrl
      }
      return baseUrl;
    },
  },
};
