import { describe, it, expect } from "vitest";
import { encryptField, decryptField, maskDocumentNumber } from "../lib/crypto";

describe("Crypto - AES-256-GCM Field Encryption", () => {
  it("should encrypt and decrypt plaintext accurately (round-trip)", () => {
    const secretText = "PASSPORT-GBR-9988776655";
    const encrypted = encryptField(secretText);

    expect(encrypted).not.toBe(secretText);
    expect(encrypted.split(":").length).toBe(3); // iv:authTag:ciphertext

    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(secretText);
  });

  it("should produce different ciphertexts for the same plaintext due to random IVs", () => {
    const secret = "SensitiveHealthData123";
    const enc1 = encryptField(secret);
    const enc2 = encryptField(secret);

    expect(enc1).not.toBe(enc2);
    expect(decryptField(enc1)).toBe(secret);
    expect(decryptField(enc2)).toBe(secret);
  });

  it("should mask document numbers properly showing only last 4 characters", () => {
    expect(maskDocumentNumber("123456789")).toBe("•••• 6789");
    expect(maskDocumentNumber("9876")).toBe("•••• 9876");
    expect(maskDocumentNumber("12")).toBe("•••• 12");
    expect(maskDocumentNumber("")).toBe("");
  });
});
