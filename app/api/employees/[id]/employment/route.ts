import { configuredAdminRole } from "@/lib/admin-policy";
import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee, UserRole } from "@/lib/models/Employee";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { employmentUpdateSchema } from "@/lib/validation/employment";

const EMPLOYMENT_FIELDS = ["jobTitle", "department", "lineManager", "employmentType", "employeeId"] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["hr_admin", "owner"]);
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const body = employmentUpdateSchema.parse(await req.json());

    await connectDB();
    const employee = await Employee.findById(id);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const fieldsTouched: string[] = [];

    if (body.role && body.role !== employee.role && body.role !== configuredAdminRole(employee.workEmail)) {
      return NextResponse.json({ error: "Admin roles must match the owner’s configured email list." }, { status: 403 });
    }
    // Role changes require 'owner' role
    if (body.role && body.role !== employee.role) {
      if (session.user.role !== "owner") {
        return NextResponse.json(
          { error: "Only system owners can alter employee access roles." },
          { status: 403 }
        );
      }
      // Never leave the portal without an owner who can reach Settings
      if (employee.role === "owner") {
        const activeOwners = await Employee.countDocuments({ role: "owner", status: { $ne: "offboarded" } });
        if (activeOwners <= 1) {
          return NextResponse.json(
            { error: "This is the only owner. Make someone else an owner first." },
            { status: 400 }
          );
        }
      }
      employee.role = body.role as UserRole;
      fieldsTouched.push("role");
    }

    // Offboarding goes through /offboard so offboardedAt (and the retention clock) is always set
    if (body.status && body.status !== employee.status) {
      if (employee.status === "offboarded") {
        return NextResponse.json({ error: "Offboarded records can't change status." }, { status: 400 });
      }
      employee.status = body.status;
      fieldsTouched.push("status");
    }

    const current = employee.employment;
    const employment: Record<string, unknown> = {
      jobTitle: current?.jobTitle,
      department: current?.department,
      lineManager: current?.lineManager,
      startDate: current?.startDate,
      employmentType: current?.employmentType,
      employeeId: current?.employeeId,
    };
    for (const field of EMPLOYMENT_FIELDS) {
      const value = body[field];
      if (value === undefined) continue;
      const next = value || undefined;
      if ((employment[field] || undefined) === next) continue;
      employment[field] = next;
      fieldsTouched.push(`employment.${field}`);
    }
    if (body.startDate !== undefined) {
      const next = body.startDate ? new Date(body.startDate) : undefined;
      const current = employment.startDate ? new Date(employment.startDate as Date).getTime() : undefined;
      if (current !== next?.getTime()) {
        employment.startDate = next;
        fieldsTouched.push("employment.startDate");
      }
    }

    if (fieldsTouched.length === 0) {
      return NextResponse.json({ success: true });
    }
    employee.employment = employment;

    await employee.save();

    // Audit log
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: fieldsTouched.includes("role") ? "role_change" : "update",
      targetEmployeeId: employee._id.toString(),
      fields: fieldsTouched,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err, "Failed to update employment details.", "Update Employment Error");
  }
}
