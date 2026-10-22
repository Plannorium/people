import { sendEmailCode, verifyEmailCode } from "./email-verification";
export const sendSubmissionCode = (email: string, nonce: string): Promise<void> => sendEmailCode("submission", email, nonce);
export const verifySubmissionCode = (email: string, nonce: string, code: unknown): Promise<boolean> => verifyEmailCode("submission", email, nonce, code);
