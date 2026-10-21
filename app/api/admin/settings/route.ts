import { NextRequest, NextResponse } from "next/server";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Settings } from "@/lib/models/Settings";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { settingsSchema } from "@/lib/validation/settings";

export async function GET() {
  try {
    await requireRole(["owner"]);
    await connectDB();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        reviewIntervalMonths: 6,
        retentionPeriodYears: 2,
        allowedEmailDomain: "plannorium.com",
        hrEmail: "hr@plannorium.com",
      });
    }
    return NextResponse.json(settings);
  } catch (err) {
    return apiError(err, "Failed to load settings.", "Settings Error");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(["owner"]);
    // The sign-in domain comes from ALLOWED_EMAIL_DOMAIN only, so it isn't editable here
    const validated = settingsSchema.parse(await req.json());

    await connectDB();
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const changed: string[] = [];
    if (settings.reviewIntervalMonths !== validated.reviewIntervalMonths) changed.push("settings.reviewIntervalMonths");
    if (settings.retentionPeriodYears !== validated.retentionPeriodYears) changed.push("settings.retentionPeriodYears");
    if (settings.hrEmail !== validated.hrEmail) changed.push("settings.hrEmail");

    settings.reviewIntervalMonths = validated.reviewIntervalMonths;
    settings.retentionPeriodYears = validated.retentionPeriodYears;
    settings.hrEmail = validated.hrEmail;
    settings.updatedBy = session.user.email;

    await settings.save();

    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      fields: changed.length > 0 ? changed : ["settings"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, settings });
  } catch (err) {
    return apiError(err, "Failed to save settings.", "Settings Error");
  }
}
