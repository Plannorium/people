import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireSession, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { decryptField } from "@/lib/crypto";
import { writeAudit, extractClientMeta } from "@/lib/audit";

/**
 * Decrypts the optional health notes (blood type, allergies, medical and accessibility
 * information) so HR can pass them to responders in an emergency. Every read is audited.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    await connectDB();
    const employee = await Employee.findById(id).select("_id workEmail health");
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const userRole = session.user.role || "employee";
    const isSelf = employee.workEmail.toLowerCase() === session.user.email.toLowerCase();
    if (!isSelf && userRole !== "hr_admin" && userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: You cannot view health information of other staff." },
        { status: 403 }
      );
    }

    if (!employee.health?.enc) {
      return NextResponse.json({ error: "No health information on file." }, { status: 404 });
    }

    const parsed = JSON.parse(decryptField(employee.health.enc)) as Record<string, string | undefined>;

    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "view_health",
      targetEmployeeId: employee._id.toString(),
      fields: ["health"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      bloodType: parsed.bloodType || "",
      allergies: parsed.allergies || "",
      medicalInfo: parsed.medicalInfo || "",
      accessibilityNeeds: parsed.accessibilityNeeds || "",
    });
  } catch (err) {
    return apiError(err, "Failed to load health information.", "Reveal Health Error");
  }
}
