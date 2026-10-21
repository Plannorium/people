import crypto from "crypto";

/**
 * AES-256-GCM Field Encryption
 * Key is 32 bytes provided via FIELD_ENCRYPTION_KEY as base64 string or 32-char hex.
 */

function getEncryptionKey(): Buffer {
  const envKey = process.env.FIELD_ENCRYPTION_KEY;
  if (!envKey) {
    // If not configured in dev/test, fallback to a reproducible 32-byte key with warning
    if (process.env.NODE_ENV === "production") {
      throw new Error("FIELD_ENCRYPTION_KEY environment variable is missing.");
    }
    return Buffer.from("01234567890123456789012345678901", "utf-8");
  }

  // Support base64 (standard) or hex or raw 32 bytes
  try {
    const buf = Buffer.from(envKey, "base64");
    if (buf.length === 32) return buf;
  } catch {
    // fallback
  }

  const hexBuf = Buffer.from(envKey, "hex");
  if (hexBuf.length === 32) return hexBuf;

  const utf8Buf = Buffer.from(envKey, "utf-8");
  if (utf8Buf.length >= 32) return utf8Buf.subarray(0, 32);

  throw new Error("FIELD_ENCRYPTION_KEY must be a 32-byte base64 string.");
}

/**
 * Encrypt plaintext string with AES-256-GCM.
 * Output format: "iv:authTag:ciphertext" (all base64)
 */
export function encryptField(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt AES-256-GCM string.
 */
export function decryptField(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format.");
  }

  const [ivB64, authTagB64, dataB64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encryptedData = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Mask document number, showing only the last 4 characters.
 * Example: "AB1234567" -> "•••• 4567"
 */
export function maskDocumentNumber(docNum: string): string {
  if (!docNum) return "";
  const trimmed = docNum.trim();
  if (trimmed.length <= 4) {
    return "•••• " + trimmed;
  }
  const last4 = trimmed.slice(-4);
  return `•••• ${last4}`;
}
