import { NextRequest, NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { sendReminderEmail } from "@/lib/email";
import { writeAudit, extractClientMeta } from "@/lib/audit";

const REMINDER_TYPES = ["complete_onboarding", "review_profile"] as const;
type ReminderType = (typeof REMINDER_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["hr_admin", "owner"]);
    const { employeeIds, type } = await req.json();

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return NextResponse.json({ error: "Select at least one employee." }, { status: 400 });
    }
    if (employeeIds.length > 500) {
      return NextResponse.json({ error: "Send to at most 500 people at a time." }, { status: 400 });
    }
    if (type !== undefined && !REMINDER_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid reminder type." }, { status: 400 });
    }

    const ids = employeeIds.filter((id: unknown) => typeof id === "string" && isValidObjectId(id));

    await connectDB();
    // Former staff never get reminders
    const employees = await Employee.find({ _id: { $in: ids }, status: { $ne: "offboarded" } });

    let sentCount = 0;
    let lastError: string | undefined;
    const meta = extractClientMeta(req.headers);

    for (const emp of employees) {
      const recipientName = emp.personal?.preferredName || emp.personal?.legalFirstName;
      const reminderType: ReminderType =
        type || (emp.status === "needs_review" ? "review_profile" : "complete_onboarding");
      const result = await sendReminderEmail({
        toEmail: emp.workEmail,
        recipientName,
        type: reminderType,
      });

      if (!result.success) {
        lastError = result.error;
        continue;
      }
      sentCount++;

      await writeAudit({
        actorId: session.user.id,
        actorEmail: session.user.email,
        action: "reminder_sent",
        targetEmployeeId: emp._id.toString(),
        fields: [reminderType],
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    if (sentCount === 0 && lastError) {
      return NextResponse.json({ error: lastError }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      count: sentCount,
      failed: employees.length - sentCount,
    });
  } catch (err) {
    return apiError(err, "Failed to dispatch reminders.", "Reminders API Error");
  }
}
