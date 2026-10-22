import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { connectDB } from "./db";
import { AdminChallenge } from "./models/AdminChallenge";
import { SubmissionChallenge } from "./models/SubmissionChallenge";
import { configuredAdminRole, normalizeEmail } from "./admin-policy";

export type VerificationPurpose = "admin" | "submission";
const challengeStore = (purpose: VerificationPurpose) => purpose === "admin" ? AdminChallenge : SubmissionChallenge;

export const CODE_TTL_MS = 10 * 60 * 1000;
export const SEND_COOLDOWN_MS = 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export class EmailCodeError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function challengeDigest(value: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith("your-")) throw new EmailCodeError(503, "Email verification is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function codeDigest(email: string, nonce: string, code: string, purpose: VerificationPurpose = "admin"): string {
  return challengeDigest(JSON.stringify([purpose, normalizeEmail(email), nonce, code]));
}
export function equalDigest(a: string, b: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** One email delivery per minute per account, shared across sessions and server instances. */
export async function sendEmailCode(purpose: VerificationPurpose, email: string, nonce: string): Promise<void> {
  if (!nonce || (purpose === "admin" && configuredAdminRole(email) === "employee")) throw new EmailCodeError(403, "Verification is not authorized.");
  const Challenge = challengeStore(purpose);
  const key = process.env.RESEND_API_KEY;
  if (!key || !process.env.EMAIL_FROM) throw new EmailCodeError(503, "Verification email is not configured.");
  await connectDB();
  const now = new Date();
  const id = challengeDigest(`${purpose}-email:${normalizeEmail(email)}`);
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const hash = codeDigest(email, nonce, code, purpose);
  const nonceHash = challengeDigest(nonce);
  // Expired/locked challenges cannot be refreshed to reset the guessing budget.
  // Remove an expired record explicitly; TTL cleanup is deliberately asynchronous.
  await Challenge.deleteOne({ _id: id, expiresAt: { $lte: now } });
  try {
    await Challenge.findOneAndUpdate(
      { _id: id, nextSendAt: { $lte: now }, attempts: { $lt: MAX_CODE_ATTEMPTS } },
      { $set: { nonceHash, codeHash: hash, nextSendAt: new Date(now.getTime() + SEND_COOLDOWN_MS) },
        $setOnInsert: { expiresAt: new Date(now.getTime() + CODE_TTL_MS), attempts: 0 } },
      { upsert: true, new: true },
    );
  } catch (error) {
    if ((error as {code?:number}).code === 11000) throw new EmailCodeError(429, "Please wait before requesting another code. Too many attempts may require waiting ten minutes.");
    throw error;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [normalizeEmail(email)], subject: purpose === "admin" ? "Your Plannorium People admin verification code" : "Confirm your Plannorium People submission",
        text: purpose === "admin"
          ? `Your admin verification code is ${code}.\n\nIt expires within 10 minutes and works only with the sign-in that requested it. Never share this code. If you did not request it, do not approve the sign-in.`
          : `Your profile submission confirmation code is ${code}.\n\nEnter it on the review page to submit your details. It expires within 10 minutes, works only with the sign-in that requested it, and can confirm one submission. This code does not grant admin access. Never share it. If you did not request it, do not approve the submission.`, }),
    });
    if (!response.ok) throw new Error("Email delivery failed");
  } catch {
    // Keep the rate limit after provider failures. Never log codes or provider response bodies.
    await Challenge.updateOne({ _id: id, codeHash: hash }, { $set: { codeHash: challengeDigest(`undelivered:${hash}`) } });
    throw new EmailCodeError(503, "Could not deliver the verification email. Please try again later.");
  }
}

/** Attempts and consumption are atomic; a code cannot verify two sessions or be replayed. */
export async function verifyEmailCode(purpose: VerificationPurpose, email: string, nonce: string, code: unknown): Promise<boolean> {
  if (typeof code !== "string" || !/^\d{6}$/.test(code) || !nonce || (purpose === "admin" && configuredAdminRole(email) === "employee")) return false;
  const Challenge = challengeStore(purpose);
  await connectDB();
  const id = challengeDigest(`${purpose}-email:${normalizeEmail(email)}`);
  const nonceHash = challengeDigest(nonce);
  const challenge = await Challenge.findOneAndUpdate(
    { _id: id, nonceHash, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_CODE_ATTEMPTS } },
    { $inc: { attempts: 1 } }, { new: true },
  ).lean();
  if (!challenge || !equalDigest(String(challenge.codeHash), codeDigest(email, nonce, code, purpose))) return false;
  const consumed = await Challenge.updateOne({ _id: id, nonceHash, codeHash: challenge.codeHash, attempts: challenge.attempts }, { $set: { nonceHash: "consumed", codeHash: "consumed" } });
  return consumed.modifiedCount === 1;
}
