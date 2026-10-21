import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { RemindersClient } from "./RemindersClient";

export default async function AdminRemindersPage() {
  await requirePageSession(["hr_admin", "owner"]);

  await connectDB();
  const rawEmployees = await Employee.find({
    status: { $in: ["incomplete", "needs_review"] },
  })
    .select("_id workEmail status personal.legalFirstName personal.legalLastName personal.preferredName lastReviewedAt createdAt")
    .sort({ status: 1, createdAt: -1 })
    .lean();

  const employees = rawEmployees.map((e) => ({
    _id: e._id.toString(),
    workEmail: e.workEmail,
    status: e.status as "incomplete" | "needs_review",
    personal: {
      legalFirstName: e.personal?.legalFirstName,
      legalLastName: e.personal?.legalLastName,
      preferredName: e.personal?.preferredName,
    },
    lastReviewedAt: e.lastReviewedAt ? new Date(e.lastReviewedAt).toISOString() : undefined,
    createdAt: new Date(e.createdAt).toISOString(),
  }));

  return <RemindersClient employees={employees} />;
}
