import { AuditLog, AuditAction } from "./models/AuditLog";
import { connectDB } from "./db";

export interface WriteAuditParams {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetEmployeeId?: string;
  fields?: string[];
  ip?: string;
  userAgent?: string;
}

/**
 * Appends an entry to the AuditLog collection.
 * Never logs sensitive values, only field names.
 */
export async function writeAudit(params: WriteAuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actorId,
      actorEmail: params.actorEmail.toLowerCase(),
      action: params.action,
      targetEmployeeId: params.targetEmployeeId,
      fields: params.fields,
      ip: params.ip,
      userAgent: params.userAgent,
      at: new Date(),
    });
  } catch (error) {
    // Audit failures should be recorded to stderr but must not expose PII
    console.error("[Audit Error] Failed to write audit log entry:", (error as Error).message);
  }
}

/**
 * Helper to extract IP and userAgent from headers
 */
export function extractClientMeta(headers: Headers): { ip?: string; userAgent?: string } {
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : headers.get("x-real-ip") || undefined;
  const userAgent = headers.get("user-agent") || undefined;
  return { ip, userAgent };
}
