import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, api auth endpoints, sign-in, and robots.txt
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron/") || // authenticated by CRON_SECRET inside the route
    pathname === "/sign-in" ||
    pathname === "/robots.txt" ||
    pathname === "/logo.png" ||
    pathname === "/logo-mark.png" ||
    pathname.startsWith("/favicon")
  ) {
    return applySecurityHeaders(NextResponse.next());
  }

  // Token verification using next-auth secret
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If unauthenticated: API calls get 401 JSON, pages redirect to sign-in
  if ((!token || !token.email) && pathname.startsWith("/api/")) {
    return applySecurityHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  }
  if (!token || !token.email) {
    const signInUrl = new URL("/sign-in", req.url);
    if (pathname !== "/") {
      signInUrl.searchParams.set("callbackUrl", req.url);
    }
    return applySecurityHeaders(NextResponse.redirect(signInUrl));
  }

  // Admin route protection: must be hr_admin or owner
  if (pathname.startsWith("/admin")) {
    const role = (token.role as string) || "employee";
    if (role !== "hr_admin" && role !== "owner") {
      // Forbidden: redirect employee to /me
      return applySecurityHeaders(NextResponse.redirect(new URL("/me", req.url)));
    }

    // Owner only route protection: /admin/settings
    if (pathname.startsWith("/admin/settings") && role !== "owner") {
      return applySecurityHeaders(NextResponse.redirect(new URL("/admin", req.url)));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

const identityOrigin = (() => {
  try {
    return new URL(process.env.PLANNORIUM_ID_ISSUER || "https://id.plannorium.com").origin;
  } catch {
    return "https://id.plannorium.com";
  }
})();

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is needed without nonces;
// 'unsafe-eval' is only for the dev server. Cloudinary's API is allowed for direct, signed ID uploads.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.cloudinary.com",
  `form-action 'self' ${identityOrigin} https://accounts.google.com`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Security Headers per Section 8
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
