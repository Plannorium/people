import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { codeDigest, equalDigest } from "../lib/email-verification";
import { sendSubmissionCode, verifySubmissionCode } from "../lib/submission-verification";
import { POST as postSubmissionCode } from "../app/api/employee/submission-code/route";
import { POST as postSubmit } from "../app/api/employee/submit/route";
import { NextRequest } from "next/server";

const store = vi.hoisted(() => ({
  connect: vi.fn(),
  adminFind: vi.fn(),
  subRemove: vi.fn(),
  subUpdate: vi.fn(),
  subFind: vi.fn(),
  empFindOne: vi.fn(),
  auditWrite: vi.fn(),
  getToken: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("../lib/db", () => ({ connectDB: store.connect }));
vi.mock("../lib/models/AdminChallenge", () => ({
  AdminChallenge: {
    deleteOne: vi.fn(),
    updateOne: vi.fn(),
    findOneAndUpdate: store.adminFind,
  },
}));
vi.mock("../lib/models/SubmissionChallenge", () => ({
  SubmissionChallenge: {
    deleteOne: store.subRemove,
    updateOne: store.subUpdate,
    findOneAndUpdate: store.subFind,
  },
}));
vi.mock("../lib/models/Employee", () => ({
  Employee: {
    findOne: store.empFindOne,
  },
}));
vi.mock("../lib/audit", () => ({
  writeAudit: store.auditWrite,
  extractClientMeta: () => ({ ip: "127.0.0.1", userAgent: "test-agent" }),
}));
vi.mock("next-auth/jwt", () => ({
  getToken: store.getToken,
}));
vi.mock("../lib/access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/access")>();
  return {
    ...actual,
    requireSession: store.requireSession,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXTAUTH_URL", "https://people.plannorium.com");
  vi.stubEnv("NEXTAUTH_SECRET", "a-strong-test-only-secret-with-at-least-thirty-two-characters");
  vi.stubEnv("RESEND_API_KEY", "re_test_key");
  vi.stubEnv("EMAIL_FROM", "team@plannorium.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("submission verification digest & isolation", () => {
  it("isolates submission digest from admin digest", () => {
    const adminHash = codeDigest("member@plannorium.com", "nonce-1", "123456", "admin");
    const subHash = codeDigest("member@plannorium.com", "nonce-1", "123456", "submission");
    expect(adminHash).not.toBe(subHash);
    expect(equalDigest(adminHash, subHash)).toBe(false);
  });

  it("permits ordinary staff emails to request submission codes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    store.subFind.mockResolvedValue({ _id: "sub-id" });

    await expect(sendSubmissionCode("employee@plannorium.com", "nonce-1")).resolves.toBeUndefined();
    expect(store.connect).toHaveBeenCalled();
    expect(store.adminFind).not.toHaveBeenCalled();
    expect(store.subFind).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Confirm your Plannorium People submission"),
      })
    );
  });

  it("verifies and consumes a valid submission code atomically", async () => {
    const email = "employee@plannorium.com";
    const nonce = "nonce-xyz";
    const code = "654321";
    const expectedHash = codeDigest(email, nonce, code, "submission");

    store.subFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "challenge-id",
        codeHash: expectedHash,
        attempts: 1,
      }),
    });
    store.subUpdate.mockResolvedValue({ modifiedCount: 1 });

    const result = await verifySubmissionCode(email, nonce, code);
    expect(result).toBe(true);
    expect(store.subUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ codeHash: expectedHash }),
      expect.objectContaining({ $set: { nonceHash: "consumed", codeHash: "consumed" } })
    );
  });

  it("rejects invalid code or replay", async () => {
    store.subFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "challenge-id",
        codeHash: "different-hash",
        attempts: 1,
      }),
    });

    const result = await verifySubmissionCode("employee@plannorium.com", "nonce-xyz", "000000");
    expect(result).toBe(false);
    expect(store.subUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/employee/submission-code", () => {
  it("rejects forbidden origin", async () => {
    const req = new NextRequest("https://people.plannorium.com/api/employee/submission-code", {
      method: "POST",
      headers: { origin: "https://evil.example.com" },
    });
    const res = await postSubmissionCode(req);
    expect(res.status).toBe(403);
  });

  it("sends code when authenticated with valid token nonce", async () => {
    store.requireSession.mockResolvedValue({
      user: { id: "emp_1", email: "member@plannorium.com" },
    });
    store.getToken.mockResolvedValue({
      email: "member@plannorium.com",
      adminChallengeId: "nonce-123",
    });
    store.subFind.mockResolvedValue({ _id: "sub-1" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const req = new NextRequest("https://people.plannorium.com/api/employee/submission-code", {
      method: "POST",
      headers: { origin: "https://people.plannorium.com" },
    });
    const res = await postSubmissionCode(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
  });

  it("rejects when token email does not match session", async () => {
    store.requireSession.mockResolvedValue({
      user: { id: "emp_1", email: "member@plannorium.com" },
    });
    store.getToken.mockResolvedValue({
      email: "other@plannorium.com",
      adminChallengeId: "nonce-123",
    });

    const req = new NextRequest("https://people.plannorium.com/api/employee/submission-code", {
      method: "POST",
      headers: { origin: "https://people.plannorium.com" },
    });
    const res = await postSubmissionCode(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/employee/submit", () => {
  const completeEmployeeDoc = () => ({
    _id: "emp_doc_1",
    workEmail: "member@plannorium.com",
    status: "incomplete",
    personal: {
      legalFirstName: "Jane",
      legalLastName: "Doe",
      personalEmail: "jane@personal.com",
      mobileE164: "+12025550123",
    },
    location: {
      addressLine1: "123 Main St",
      city: "Dubai",
      region: "Dubai",
      countryCode: "AE",
      timeZone: "Asia/Dubai",
      workArrangement: "remote",
    },
    emergencyContacts: [
      { fullName: "John Doe", phoneE164: "+12025550199", isNextOfKin: true },
    ],
    emergencyContactsConfirmed: true,
    identification: {
      documentType: "passport",
      documentNumberEnc: "enc_data",
      frontFileKey: "front_key_123",
      expiryDate: new Date("2030-01-01"),
      documentLast4: "1234",
    },
    save: vi.fn().mockResolvedValue(true),
  });

  it("rejects submission without valid verification code (403)", async () => {
    store.requireSession.mockResolvedValue({
      user: { id: "emp_1", email: "member@plannorium.com" },
    });
    store.getToken.mockResolvedValue({
      email: "member@plannorium.com",
      adminChallengeId: "nonce-123",
    });
    const employee = completeEmployeeDoc();
    store.empFindOne.mockResolvedValue(employee);

    // subFind returns null -> code fails verification
    store.subFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest("https://people.plannorium.com/api/employee/submit", {
      method: "POST",
      headers: {
        origin: "https://people.plannorium.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accuracyConfirmed: true,
        privacyAcknowledged: true,
        verificationCode: "000000",
      }),
    });

    const res = await postSubmit(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.code).toBe("EmailVerificationRequired");
    expect(employee.save).not.toHaveBeenCalled();
  });

  it("accepts submission and completes record with valid verification code", async () => {
    store.requireSession.mockResolvedValue({
      user: { id: "emp_1", email: "member@plannorium.com" },
    });
    store.getToken.mockResolvedValue({
      email: "member@plannorium.com",
      adminChallengeId: "nonce-123",
    });
    const employee = completeEmployeeDoc();
    store.empFindOne.mockResolvedValue(employee);

    const validHash = codeDigest("member@plannorium.com", "nonce-123", "987654", "submission");
    store.subFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "challenge-id",
        codeHash: validHash,
        attempts: 1,
      }),
    });
    store.subUpdate.mockResolvedValue({ modifiedCount: 1 });

    const req = new NextRequest("https://people.plannorium.com/api/employee/submit", {
      method: "POST",
      headers: {
        origin: "https://people.plannorium.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accuracyConfirmed: true,
        privacyAcknowledged: true,
        verificationCode: "987654",
      }),
    });

    const res = await postSubmit(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("complete");
    expect(employee.status).toBe("complete");
    expect(employee.save).toHaveBeenCalled();
    expect(store.auditWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        actorEmail: "member@plannorium.com",
      })
    );
  });
});
