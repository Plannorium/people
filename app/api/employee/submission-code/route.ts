import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireSession, apiError, isTrustedOrigin } from "@/lib/access";
import { normalizeEmail } from "@/lib/admin-policy";
import { sendSubmissionCode } from "@/lib/submission-verification";
import { EmailCodeError } from "@/lib/email-verification";

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const session = await requireSession();
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.adminChallengeId || normalizeEmail(token.email || "") !== normalizeEmail(session.user.email)) {
      return NextResponse.json({ error: "Please sign in again before confirming your submission." }, { status: 401 });
    }
    await sendSubmissionCode(session.user.email, token.adminChallengeId);
    return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof EmailCodeError) return NextResponse.json({ error: error.message }, { status: error.status, headers: error.status === 429 ? { "Retry-After": "60" } : undefined });
    return apiError(error, "Could not send the confirmation email.", "Submission verification");
  }
}
