import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configuredAdminRole, effectiveAdminRole, hasFreshAdminVerification, ADMIN_VERIFICATION_MAX_AGE_MS } from "../lib/admin-policy";
import { codeDigest, equalDigest, sendAdminCode, verifyAdminCode } from "../lib/admin-verification";

const store = vi.hoisted(() => ({
  connect: vi.fn(), remove: vi.fn(), update: vi.fn(), find: vi.fn(),
}));
vi.mock("../lib/db", () => ({ connectDB: store.connect }));
vi.mock("../lib/models/AdminChallenge", () => ({ AdminChallenge: {
  deleteOne: store.remove, updateOne: store.update, findOneAndUpdate: store.find,
} }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("OWNER_EMAIL", "owner@example.test");
  vi.stubEnv("ADMIN_EMAILS", "alias@example.test");
  vi.stubEnv("NEXTAUTH_SECRET", "a-strong-test-only-secret-with-at-least-thirty-two-characters");
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "security@example.test");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("explicit admin identity policy", () => {
  it("denies all elevation with an empty configuration", () => {
    vi.stubEnv("OWNER_EMAIL", ""); vi.stubEnv("ADMIN_EMAILS", "");
    expect(configuredAdminRole("owner@example.test")).toBe("employee");
    expect(effectiveAdminRole("owner@example.test", Date.now())).toBe("employee");
  });
  it("matches exact normalized emails, never domains, wildcards or lookalikes", () => {
    expect(configuredAdminRole(" OWNER@EXAMPLE.TEST ")).toBe("owner");
    expect(configuredAdminRole("alias@example.test")).toBe("hr_admin");
    for (const email of ["other@example.test", "owner@example.test.evil", "owner+extra@example.test", "*"]) expect(configuredAdminRole(email)).toBe("employee");
    vi.stubEnv("ADMIN_EMAILS", "*@example.test");
    expect(configuredAdminRole("other@example.test")).toBe("employee");
  });
  it("requires recent server-issued verification, rejects forged/future timestamps", () => {
    const now = 10_000_000_000;
    for (const value of [undefined, true, "verified", NaN, now+1, now-ADMIN_VERIFICATION_MAX_AGE_MS]) expect(hasFreshAdminVerification(value, now)).toBe(false);
    expect(effectiveAdminRole("owner@example.test", now-1, now)).toBe("owner");
    expect(effectiveAdminRole("other@example.test", now-1, now)).toBe("employee");
    vi.stubEnv("OWNER_EMAIL", "replacement@example.test");
    expect(effectiveAdminRole("owner@example.test", now-1, now)).toBe("employee");
  });
});

describe("admin email challenge", () => {
  it("binds the digest to the email and sign-in, and uses constant-size safe comparison", () => {
    const digest = codeDigest("owner@example.test", "session-a", "123456");
    expect(equalDigest(digest, codeDigest("OWNER@example.test", "session-a", "123456"))).toBe(true);
    expect(equalDigest(digest, codeDigest("owner@example.test", "session-b", "123456"))).toBe(false);
    expect(equalDigest(digest, codeDigest("alias@example.test", "session-a", "123456"))).toBe(false);
    expect(equalDigest(digest, "123456")).toBe(false);
  });
  it("rejects unlisted accounts and malformed codes before touching storage", async () => {
    expect(await verifyAdminCode("other@example.test", "session-a", "123456")).toBe(false);
    for (const code of [null, {verified:true}, "12345", "1234567", "abcdef"]) expect(await verifyAdminCode("owner@example.test", "session-a", code)).toBe(false);
    expect(store.connect).not.toHaveBeenCalled();
  });
  it("fails closed when email delivery or a strong secret is not configured", async () => {
    await expect(sendAdminCode("owner@example.test", "session-a")).rejects.toMatchObject({status:503});
    expect(store.connect).not.toHaveBeenCalled();
    vi.stubEnv("NEXTAUTH_SECRET", "your-nextauth-secret-here");
    expect(()=>codeDigest("owner@example.test", "session-a", "123456")).toThrow();
  });
  it("requires an unexpired challenge with attempts remaining, never an absent one", async () => {
    store.find.mockReturnValue({lean:async()=>null});
    expect(await verifyAdminCode("owner@example.test", "session-a", "123456")).toBe(false);
    const filter = store.find.mock.calls[0][0];
    expect(filter.expiresAt.$gt).toBeInstanceOf(Date);
    expect(filter.attempts).toEqual({$lt:5});
    expect(store.update).not.toHaveBeenCalled();
  });
  it("counts a wrong code without consuming or elevating the account", async () => {
    store.find.mockReturnValue({lean:async()=>({codeHash:codeDigest("owner@example.test","session-a","654321"),attempts:1})});
    expect(await verifyAdminCode("owner@example.test", "session-a", "123456")).toBe(false);
    expect(store.find.mock.calls[0][1]).toEqual({$inc:{attempts:1}});
    expect(store.update).not.toHaveBeenCalled();
  });
  it("only succeeds if atomic one-time consumption wins, preserving delivery cooldown", async () => {
    store.find.mockReturnValue({lean:async()=>({codeHash:codeDigest("owner@example.test","session-a","123456"),attempts:1})});
    store.update.mockResolvedValueOnce({modifiedCount:1}).mockResolvedValueOnce({modifiedCount:0});
    expect(await verifyAdminCode("owner@example.test", "session-a", "123456")).toBe(true);
    expect(await verifyAdminCode("owner@example.test", "session-a", "123456")).toBe(false);
    expect(store.remove).not.toHaveBeenCalled();
  });
  it("reports throttling and never sends email when the shared account limit is hit", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    store.find.mockRejectedValueOnce({code:11000});
    const fetcher=vi.fn(); vi.stubGlobal("fetch",fetcher);
    await expect(sendAdminCode("owner@example.test", "session-a")).rejects.toMatchObject({status:429});
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not pretend delivery succeeded when the email provider fails", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    store.find.mockResolvedValueOnce({}); store.update.mockResolvedValueOnce({modifiedCount:1});
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false}));
    await expect(sendAdminCode("owner@example.test", "session-a")).rejects.toMatchObject({status:503});
    expect(store.update).toHaveBeenCalled();
  });
});
