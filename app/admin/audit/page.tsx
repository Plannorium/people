import { isValidObjectId } from "mongoose";
import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/lib/models/AuditLog";
import { Employee } from "@/lib/models/Employee";
import { AuditTable } from "@/components/admin/AuditTable";
import { PageHeader } from "@/components/ui/Layout";
import { displayName } from "@/lib/format";

export default async function AdminAuditPage() {
  await requirePageSession(["hr_admin", "owner"]);

  await connectDB();
  const rawLogs = await AuditLog.find()
    .sort({ at: -1 })
    .limit(200)
    .lean();

  // Show who a record belongs to instead of a bare database id
  const targetIds = [...new Set(rawLogs.map((l) => l.targetEmployeeId))].filter(
    (id): id is string => typeof id === "string" && isValidObjectId(id)
  );
  const targets = await Employee.find({ _id: { $in: targetIds } })
    .select("_id workEmail personal.legalFirstName personal.legalLastName personal.preferredName")
    .lean();
  const targetNames = new Map(targets.map((e) => [e._id.toString(), displayName(e)]));

  const logs = rawLogs.map((l) => ({
    _id: l._id.toString(),
    actorEmail: l.actorEmail,
    action: l.action,
    targetEmployeeId: l.targetEmployeeId,
    targetName: l.targetEmployeeId ? targetNames.get(l.targetEmployeeId) : undefined,
    fields: l.fields,
    ip: l.ip,
    at: new Date(l.at).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="Append-only record of every profile view, ID reveal, document view, health view, export and change. Latest 200 entries."
      />
      <AuditTable logs={logs} />
    </div>
  );
}
