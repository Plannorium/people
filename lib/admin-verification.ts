import { sendEmailCode, verifyEmailCode } from "./email-verification";
export { EmailCodeError as AdminCodeError, challengeDigest, codeDigest, equalDigest, CODE_TTL_MS, SEND_COOLDOWN_MS, MAX_CODE_ATTEMPTS } from "./email-verification";

export const sendAdminCode = (email: string, nonce: string): Promise<void> => sendEmailCode("admin", email, nonce);
export const verifyAdminCode = (email: string, nonce: string, code: unknown): Promise<boolean> => verifyEmailCode("admin", email, nonce, code);
