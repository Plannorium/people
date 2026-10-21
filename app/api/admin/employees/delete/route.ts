import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { deleteDocument } from "@/lib/storage";
import { writeAudit, extractClientMeta } from "@/lib/audit";

/**
 * Permanently removes employee records (e.g. test or smoke data), including their stored
 * ID files. Owner only. Audit entries are kept: the log is append-only.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["owner"]);
    const { ids, confirm } = await req.json();

    if (confirm !== "DELETE") {
      return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Select at least one record." }, { status: 400 });
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: "Delete at most 200 records at a time." }, { status: 400 });
    }
    const validIds = ids.filter((id: unknown) => typeof id === "string" && isValidObjectId(id));

    await connectDB();
    const targets = await Employee.find({ _id: { $in: validIds } });

    if (targets.some((emp) => emp.workEmail.toLowerCase() === session.user.email.toLowerCase())) {
      return NextResponse.json({ error: "You can't delete your own record." }, { status: 400 });
    }

    const remainingOwners = await Employee.countDocuments({
      role: "owner",
      status: { $ne: "offboarded" },
      _id: { $nin: targets.map((emp) => emp._id) },
    });
    if (remainingOwners < 1) {
      return NextResponse.json({ error: "At least one owner must remain." }, { status: 400 });
    }

    const meta = extractClientMeta(req.headers);
    for (const emp of targets) {
      const keys = [emp.identification?.frontFileKey, emp.identification?.backFileKey].filter(Boolean) as string[];
      await Promise.all(keys.map((key) => deleteDocument(key).catch(() => undefined)));
      await Employee.deleteOne({ _id: emp._id });

      await writeAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "delete",
        targetEmployeeId: emp._id.toString(),
        fields: ["record.deleted", ...(keys.length ? ["identification.files"] : [])],
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    return NextResponse.json({ success: true, count: targets.length });
  } catch (err) {
    return apiError(err, "Failed to delete records.", "Delete Records Error");
  }
}
