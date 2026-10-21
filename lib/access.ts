import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";
import { UserRole, EmployeeStatus } from "./models/Employee";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden: Insufficient privileges") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export interface AuthenticatedSession {
  user: {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: UserRole;
    status?: EmployeeStatus;
    employeeRecordId?: string;
  };
}

/**
 * Ensures user is authenticated via next-auth session.
 * The session callback reloads role and status from the database, so an offboarded
 * person is shut out on their next request even while their session cookie is still valid.
 */
export async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    throw new UnauthorizedError("You must be signed in to perform this action.");
  }
  if (session.user.status === "offboarded") {
    throw new UnauthorizedError("Your access to the People Portal has ended.");
  }
  return session as unknown as AuthenticatedSession;
}

/**
 * Ensures user has one of the allowed roles.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedSession> {
  const session = await requireSession();
  const userRole = session.user.role || "employee";
  if (!allowedRoles.includes(userRole)) {
    throw new ForbiddenError(`Action requires one of the following roles: ${allowedRoles.join(", ")}`);
  }
  return session;
}

/**
 * Ensures user is either hr_admin / owner, or accessing their own employee record.
 */
export async function requireSelfOrHr(targetEmployeeId: string): Promise<AuthenticatedSession> {
  const session = await requireSession();
  const userRole = session.user.role || "employee";

  if (userRole === "hr_admin" || userRole === "owner") {
    return session;
  }

  // Employee can only access their own record
  if (session.user.employeeRecordId === targetEmployeeId || session.user.id === targetEmployeeId) {
    return session;
  }

  throw new ForbiddenError("Employees may only access their own record.");
}

/**
 * Page-level guard for server components. Layouts are not re-run on client-side
 * navigation, so every protected page checks for itself.
 */
export async function requirePageSession(allowedRoles?: UserRole[]): Promise<AuthenticatedSession> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    redirect("/sign-in");
  }
  if (session.user.status === "offboarded") {
    redirect("/sign-in?error=AccessRevoked");
  }
  const role = session.user.role || "employee";
  if (allowedRoles && !allowedRoles.includes(role)) {
    redirect(role === "hr_admin" || role === "owner" ? "/admin" : "/me");
  }
  return session as unknown as AuthenticatedSession;
}

/**
 * Maps a thrown error to a JSON response. Auth errors keep their status; messages from
 * plain `Error`s (thrown deliberately with user-facing text) are passed through, anything
 * else (database, network) is logged and replaced with the fallback message.
 */
export function apiError(err: unknown, fallback: string, logLabel?: string): NextResponse {
  const e = err as { name?: string; message?: string; issues?: unknown };
  if (e?.name === "UnauthorizedError") {
    return NextResponse.json({ error: e.message }, { status: 401 });
  }
  if (e?.name === "ForbiddenError") {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  if (e?.name === "ZodError") {
    return NextResponse.json({ error: "Please check the highlighted fields.", issues: e.issues }, { status: 400 });
  }
  if (e?.name === "SyntaxError") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  console.error(`[${logLabel || "API Error"}]`, e?.name, e?.message);
  if (e?.name === "Error" && e.message) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
