import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireSession, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { decryptField } from "@/lib/crypto";
import { writeAudit, extractClientMeta } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id: targetId } = await params;
    if (!isValidObjectId(targetId)) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    await connectDB();
    const employee = await Employee.findById(targetId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found." }, { status: 404 });
    }

    const userRole = session.user.role || "employee";
    const isSelf = employee.workEmail.toLowerCase() === session.user.email.toLowerCase();

    // Check authorization: must be self or hr_admin/owner
    if (!isSelf && userRole !== "hr_admin" && userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: You cannot reveal identification numbers of other staff." },
        { status: 403 }
      );
    }

    if (!employee.identification?.documentNumberEnc) {
      return NextResponse.json(
        { error: "No document number on file." },
        { status: 404 }
      );
    }

    // Decrypt AES-256-GCM
    const decrypted = decryptField(employee.identification.documentNumberEnc);

    // Audit log entry
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "reveal_id",
      targetEmployeeId: employee._id.toString(),
      fields: ["identification.documentNumber"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ documentNumber: decrypted });
  } catch (err) {
    return apiError(err, "Failed to reveal identification number.", "Reveal ID Error");
  }
}
