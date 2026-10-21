import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { DirectoryTable } from "@/components/admin/DirectoryTable";
import { PageHeader } from "@/components/ui/Layout";

export default async function AdminDirectoryPage() {
  const session = await requirePageSession(["hr_admin", "owner"]);

  await connectDB();
  const rawEmployees = await Employee.find()
    .select("_id workEmail role status personal.legalFirstName personal.legalLastName personal.preferredName location.countryCode location.city employment.jobTitle employment.department identification.expiryDate lastReviewedAt createdAt")
    .sort({ createdAt: -1 })
    .lean();

  const employees = rawEmployees.map((emp) => ({
    _id: emp._id.toString(),
    workEmail: emp.workEmail,
    role: emp.role,
    status: emp.status,
    personal: {
      legalFirstName: emp.personal?.legalFirstName,
      legalLastName: emp.personal?.legalLastName,
      preferredName: emp.personal?.preferredName,
    },
    location: {
      countryCode: emp.location?.countryCode,
      city: emp.location?.city,
    },
    employment: {
      jobTitle: emp.employment?.jobTitle,
      department: emp.employment?.department,
    },
    identification: {
      expiryDate: emp.identification?.expiryDate
        ? new Date(emp.identification.expiryDate).toISOString()
        : undefined,
    },
    lastReviewedAt: emp.lastReviewedAt
      ? new Date(emp.lastReviewedAt).toISOString()
      : undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Directory"
        subtitle="Everyone with a People Portal record: profile completion, ID expiry and reviews."
      />
      <DirectoryTable
        employees={employees}
        canDelete={session.user.role === "owner"}
        currentEmail={session.user.email.toLowerCase()}
      />
    </div>
  );
}
