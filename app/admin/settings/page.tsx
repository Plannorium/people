import { requirePageSession } from "@/lib/access";
import { getAllowedEmailDomain } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Settings } from "@/lib/models/Settings";
import { SettingsClient } from "./SettingsClient";

export default async function AdminSettingsPage() {
  await requirePageSession(["owner"]);

  await connectDB();
  const settingsDoc = await Settings.findOne().lean();

  return (
    <SettingsClient
      initialSettings={{
        reviewIntervalMonths: settingsDoc?.reviewIntervalMonths ?? 6,
        retentionPeriodYears: settingsDoc?.retentionPeriodYears ?? 2,
        hrEmail: settingsDoc?.hrEmail || process.env.HR_EMAIL || "hr@plannorium.com",
      }}
      allowedEmailDomain={getAllowedEmailDomain()}
    />
  );
}
