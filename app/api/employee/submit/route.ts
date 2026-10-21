import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { reviewSchema } from "@/lib/validation/review";
import { getStepCompletion, missingSteps, STEP_LABELS } from "@/lib/onboarding";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    // 1. Validate declaration checkboxes
    reviewSchema.parse(body);

    await connectDB();
    const employee = await Employee.findOne({ workEmail: session.user.email.toLowerCase() });
    if (!employee) {
      return NextResponse.json({ error: "Employee record not found." }, { status: 404 });
    }

    // 2. Server-side check that every required section is complete (same rules the progress bar shows)
    const missing = missingSteps(getStepCompletion(employee));
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `Still to complete: ${missing.map((step) => STEP_LABELS[step]).join(", ")}.`,
          missing,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    employee.status = "complete";
    employee.lastReviewedAt = now;
    employee.accuracyConfirmedAt = now;
    employee.privacyAcknowledgedAt = now;

    await employee.save();

    // 3. Write Audit Log entry
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      targetEmployeeId: employee._id.toString(),
      fields: ["status", "lastReviewedAt", "accuracyConfirmedAt", "privacyAcknowledgedAt"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({
      success: true,
      status: "complete",
      lastReviewedAt: now,
    });
  } catch (err) {
    return apiError(err, "Failed to submit profile.", "Employee Submit Error");
  }
}
