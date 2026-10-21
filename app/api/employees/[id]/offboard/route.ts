import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { writeAudit, extractClientMeta } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["hr_admin", "owner"]);
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    await connectDB();
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    // Already offboarded: keep the original date so the retention clock isn't reset
    if (employee.status === "offboarded") {
      return NextResponse.json({ success: true, status: "offboarded" });
    }

    if (employee.workEmail.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can't offboard yourself." }, { status: 400 });
    }

    if (employee.role === "owner") {
      if (session.user.role !== "owner") {
        return NextResponse.json({ error: "Only an owner can offboard another owner." }, { status: 403 });
      }
      const activeOwners = await Employee.countDocuments({ role: "owner", status: { $ne: "offboarded" } });
      if (activeOwners <= 1) {
        return NextResponse.json({ error: "This is the only owner and can't be offboarded." }, { status: 400 });
      }
    }

    employee.status = "offboarded";
    employee.offboardedAt = new Date();
    await employee.save();

    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      targetEmployeeId: employee._id.toString(),
      fields: ["status", "offboardedAt"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, status: "offboarded" });
  } catch (err) {
    return apiError(err, "Failed to offboard employee.", "Offboard Error");
  }
}
