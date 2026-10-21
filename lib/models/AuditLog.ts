import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "view_record"
  | "reveal_id"
  | "view_document"
  | "view_health"
  | "update"
  | "export"
  | "role_change"
  | "delete"
  | "reminder_sent";

export interface IAuditLog extends Document {
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetEmployeeId?: string;
  fields?: string[]; // Names of fields touched/viewed, NEVER values
  ip?: string;
  userAgent?: string;
  at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String, required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        "view_record",
        "reveal_id",
        "view_document",
        "view_health",
        "update",
        "export",
        "role_change",
        "delete",
        "reminder_sent",
      ],
      index: true,
    },
    targetEmployeeId: { type: String, index: true },
    fields: [{ type: String }],
    ip: { type: String },
    userAgent: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  {
    // Append-only: disable automatic timestamps that encourage updates
    timestamps: false,
    versionKey: false,
  }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
