import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/access";
import { configuredAdminRole } from "@/lib/admin-policy";
import { AdminVerification } from "./AdminVerification";
import { pageMetadata } from "@/components/brand/metadata";
export const metadata = pageMetadata("/verify-admin", "Verify admin access", "Confirm your Plannorium People admin sign-in using a one-time email verification code.");
export default async function Page() {
  const session = await requirePageSession();
  if (configuredAdminRole(session.user.email) === "employee") redirect("/me");
  if (session.user.role === "owner" || session.user.role === "hr_admin") redirect("/admin");
  return <AdminVerification email={session.user.email}/>;
}
