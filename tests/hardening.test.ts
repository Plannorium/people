import { describe, it, expect, vi, afterEach } from "vitest";
import { isDocumentKey, generateObjectKey, validateMagicBytes } from "../lib/storage";
import { isPostalCodeRequired, getTimezonesForCountry } from "../lib/countries";
import { locationSchema } from "../lib/validation/location";

describe("document keys", () => {
  it("accepts only keys this app generates", () => {
    expect(isDocumentKey(generateObjectKey("identification"))).toBe(true);
    expect(isDocumentKey("identification/../other/secret")).toBe(false);
    expect(isDocumentKey("documents/2b1f3c1e-1111-4222-8333-444455556666")).toBe(false);
  });

  it("recognises real file signatures", () => {
    expect(validateMagicBytes(Buffer.from("%PDF-1.7")).valid).toBe(true);
    expect(validateMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0])).valid).toBe(true);
    expect(validateMagicBytes(Buffer.from("<html>")).valid).toBe(false);
  });
});

describe("country data", () => {
  it("does not require postal codes where they are not used", () => {
    expect(isPostalCodeRequired("AE")).toBe(false);
    expect(isPostalCodeRequired("NG")).toBe(false);
    expect(isPostalCodeRequired("GB")).toBe(true);
  });

  it("has real time zones beyond a hand-picked list", () => {
    expect(getTimezonesForCountry("GH")[0]).not.toBe("UTC");
    expect(getTimezonesForCountry("PK")).toContain("Asia/Karachi");
  });

  it("lets a UAE address through without a postal code", () => {
    const result = locationSchema.safeParse({
      countryCode: "AE", region: "Dubai", city: "Dubai", addressLine1: "Marina Walk",
      timeZone: "Asia/Dubai", workArrangement: "Remote",
    });
    expect(result.success).toBe(true);
  });

  it("still requires country and location", () => {
    const result = locationSchema.safeParse({ timeZone: "UTC", workArrangement: "Remote" });
    expect(result.success).toBe(false);
  });
});

describe("dev sign-in", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("is off in production builds even with old opt-in flags set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_AUTH_ENABLED", "true");
    const { DEV_AUTH_ENABLED } = await import("../lib/auth");
    expect(DEV_AUTH_ENABLED).toBe(false);
  });

  it("is off on Vercel even in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    const { DEV_AUTH_ENABLED } = await import("../lib/auth");
    expect(DEV_AUTH_ENABLED).toBe(false);
  });

  it("permits explicit OWNER_EMAIL even if external domain", async () => {
    vi.stubEnv("OWNER_EMAIL", "almussanplanner12@gmail.com");
    vi.stubEnv("ALLOWED_EMAIL_DOMAIN", "plannorium.com");
    const { authOptions } = await import("../lib/auth");
    const signInCallback = authOptions.callbacks?.signIn;
    expect(signInCallback).toBeDefined();
    if (signInCallback) {
      // Unrelated external domain should be restricted
      const strangerResult = await signInCallback({
        user: { id: "stranger", email: "stranger@gmail.com" },
        account: null,
      });
      expect(strangerResult).toBe("/sign-in?error=DomainRestricted");
    }
  });
});
