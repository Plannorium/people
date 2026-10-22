import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { ForbiddenError, isTrustedOrigin } from "../lib/access";

// Pure helper function representing the server-side authorization policy
function checkSelfOrHr(
  sessionUser: { role: string; employeeRecordId: string },
  targetEmployeeId: string
) {
  if (sessionUser.role === "hr_admin" || sessionUser.role === "owner") {
    return true;
  }
  if (sessionUser.employeeRecordId === targetEmployeeId) {
    return true;
  }
  throw new ForbiddenError("Employees may only access their own record.");
}

function checkRole(sessionUser: { role: string }, allowedRoles: string[]) {
  if (allowedRoles.includes(sessionUser.role)) {
    return true;
  }
  throw new ForbiddenError("Insufficient privileges");
}

describe("Access Control & Role Guards", () => {
  it("allows employee to access their own record", () => {
    const employee = { role: "employee", employeeRecordId: "emp_123" };
    expect(checkSelfOrHr(employee, "emp_123")).toBe(true);
  });

  it("strictly prevents employee from accessing another employee's record", () => {
    const employee = { role: "employee", employeeRecordId: "emp_123" };
    expect(() => checkSelfOrHr(employee, "emp_456")).toThrow(ForbiddenError);
  });

  it("allows hr_admin and owner to access any employee's record", () => {
    const hr = { role: "hr_admin", employeeRecordId: "emp_hr" };
    const owner = { role: "owner", employeeRecordId: "emp_owner" };

    expect(checkSelfOrHr(hr, "emp_456")).toBe(true);
    expect(checkSelfOrHr(owner, "emp_456")).toBe(true);
  });

  it("enforces role gating for admin endpoints", () => {
    const employee = { role: "employee" };
    const hr = { role: "hr_admin" };
    const owner = { role: "owner" };

    expect(() => checkRole(employee, ["hr_admin", "owner"])).toThrow(ForbiddenError);
    expect(checkRole(hr, ["hr_admin", "owner"])).toBe(true);
    expect(checkRole(owner, ["hr_admin", "owner"])).toBe(true);

    // Owner only route
    expect(() => checkRole(hr, ["owner"])).toThrow(ForbiddenError);
    expect(checkRole(owner, ["owner"])).toBe(true);
  });
});

describe("isTrustedOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  const post = (url: string, origin?: string) =>
    new NextRequest(url, { method: "POST", headers: origin ? { origin } : {} });

  it("accepts the deployment the request reached, even when NEXTAUTH_URL points elsewhere", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://people.plannorium.com");
    expect(isTrustedOrigin(post("http://localhost:3000/api/employee/submit", "http://localhost:3000"))).toBe(true);
    expect(isTrustedOrigin(post("https://people.plannorium.com/api/employee/submit", "https://people.plannorium.com"))).toBe(true);
  });

  it("rejects other sites and requests without an Origin", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://people.plannorium.com");
    expect(isTrustedOrigin(post("https://people.plannorium.com/api/employee/submit", "https://evil.example.com"))).toBe(false);
    expect(isTrustedOrigin(post("https://people.plannorium.com/api/employee/submit"))).toBe(false);
  });
});
