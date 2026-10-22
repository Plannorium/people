import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireSession, apiError, isTrustedOrigin } from "@/lib/access";
import { configuredAdminRole } from "@/lib/admin-policy";
import { sendAdminCode, AdminCodeError } from "@/lib/admin-verification";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const session = await requireSession();
    if (configuredAdminRole(session.user.email) === "employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.adminChallengeId || token.email?.toLowerCase() !== session.user.email.toLowerCase()) return NextResponse.json({ error: "Please sign in again before verifying admin access." }, { status: 401 });
    await sendAdminCode(session.user.email, token.adminChallengeId);
    return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AdminCodeError) return NextResponse.json({ error: error.message }, { status: error.status, headers: error.status === 429 ? { "Retry-After": "60" } : undefined });
    return apiError(error, "Could not send the verification email.", "Admin verification");
  }
}
