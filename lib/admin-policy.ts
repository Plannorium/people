import type { UserRole } from "./models/Employee";

export const ADMIN_VERIFICATION_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }

/** Environment configuration is the authority; database roles cannot expand this list. */
export function configuredAdminRole(email: string): UserRole {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return "employee";
  const owner = normalizeEmail(process.env.OWNER_EMAIL || "");
  if (owner && normalized === owner) return "owner";
  const admins = (process.env.ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean);
  return admins.includes(normalized) ? "hr_admin" : "employee";
}
export function hasFreshAdminVerification(verifiedAt: unknown, now = Date.now()): boolean {
  return typeof verifiedAt === "number" && Number.isFinite(verifiedAt) && verifiedAt <= now && now - verifiedAt < ADMIN_VERIFICATION_MAX_AGE_MS;
}
export function effectiveAdminRole(email: string, verifiedAt: unknown, now = Date.now()): UserRole {
  return hasFreshAdminVerification(verifiedAt, now) ? configuredAdminRole(email) : "employee";
}
