import { redirect } from "next/navigation";
import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { getStepCompletion, missingSteps } from "@/lib/onboarding";

export default async function HomePage() {
  const session = await requirePageSession();

  await connectDB();
  const employee = await Employee.findOne({ workEmail: session.user.email.toLowerCase() });

  if (!employee || employee.status === "incomplete") {
    // Pick up where they left off
    const next = missingSteps(getStepCompletion(employee))[0];
    redirect(`/onboarding/${next || "review"}`);
  }

  redirect("/me");
}
