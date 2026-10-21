import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { getPresignedDownloadUrl, isDocumentKey } from "@/lib/storage";
import { writeAudit, extractClientMeta } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await requireSession();
    const resolvedParams = await params;
    const rawKey = decodeURIComponent(resolvedParams.key);

    if (!isDocumentKey(rawKey)) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await connectDB();

    // Verify who owns this document key
    const employeeWithDoc = await Employee.findOne({
      $or: [
        { "identification.frontFileKey": rawKey },
        { "identification.backFileKey": rawKey },
      ],
    });

    if (!employeeWithDoc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const userRole = session.user.role || "employee";
    const isSelf = employeeWithDoc.workEmail.toLowerCase() === session.user.email.toLowerCase();

    // Access control: only self or HR/Owner can access
    if (!isSelf && userRole !== "hr_admin" && userRole !== "owner") {
      return NextResponse.json(
        { error: "Forbidden: You may not view documents belonging to other employees." },
        { status: 403 }
      );
    }

    // Generate 5-minute signed download URL
    const downloadUrl = await getPresignedDownloadUrl(rawKey);

    // Audit the document view
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "view_document",
      targetEmployeeId: employeeWithDoc._id.toString(),
      fields: [
        employeeWithDoc.identification?.frontFileKey === rawKey
          ? "identification.front"
          : "identification.back",
      ],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ downloadUrl });
  } catch (err) {
    return apiError(err, "Failed to generate document download.", "Document Download Error");
  }
}
