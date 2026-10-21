import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { isValidObjectId } from "mongoose";
import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { RecordView } from "@/components/admin/RecordView";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { countryName } from "@/lib/format";
import { isNextOfKin, relationshipLabel } from "@/lib/validation/contacts";

export default async function AdminPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePageSession(["hr_admin", "owner"]);
  const { id: employeeId } = await params;

  if (!isValidObjectId(employeeId)) {
    notFound();
  }

  await connectDB();
  const employee = await Employee.findById(employeeId).lean();

  if (!employee) {
    notFound();
  }

  // Write audit log entry for viewing another person's record
  const meta = extractClientMeta(await headers());
  await writeAudit({
    actorId: session.user.id,
    actorEmail: session.user.email,
    action: "view_record",
    targetEmployeeId: employee._id.toString(),
    fields: ["full_record_view"],
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  // Plain, serialisable fields only: encrypted values and auth identifiers stay on the server
  const record = {
    _id: employee._id.toString(),
    workEmail: employee.workEmail,
    role: employee.role,
    status: employee.status,
    isSelf: employee.workEmail.toLowerCase() === session.user.email.toLowerCase(),
    personal: employee.personal
      ? {
          legalFirstName: employee.personal.legalFirstName,
          legalLastName: employee.personal.legalLastName,
          preferredName: employee.personal.preferredName,
          pronouns: employee.personal.pronouns,
          personalEmail: employee.personal.personalEmail,
          mobileE164: employee.personal.mobileE164,
          altPhoneE164: employee.personal.altPhoneE164,
          nationalities: employee.personal.nationalities,
          preferredLanguage: employee.personal.preferredLanguage,
        }
      : undefined,
    location: employee.location
      ? {
          countryCode: employee.location.countryCode,
          countryName: countryName(employee.location.countryCode),
          region: employee.location.region,
          city: employee.location.city,
          addressLine1: employee.location.addressLine1,
          addressLine2: employee.location.addressLine2,
          postalCode: employee.location.postalCode,
          timeZone: employee.location.timeZone,
          workArrangement: employee.location.workArrangement,
          officeLocation: employee.location.officeLocation,
        }
      : undefined,
    emergencyContacts: [...(employee.emergencyContacts || [])]
      .sort((a, b) => (a.priority || 0) - (b.priority || 0))
      .map((c) => ({
        fullName: c.fullName,
        relationship: relationshipLabel(c),
        isNextOfKin: isNextOfKin(c),
        phoneE164: c.phoneE164,
        altPhoneE164: c.altPhoneE164,
        email: c.email,
        countryCode: c.countryCode,
        countryName: countryName(c.countryCode),
        city: c.city,
        speaks: c.speaks,
        priority: c.priority,
      })),
    identification: employee.identification
      ? {
          documentType: employee.identification.documentType,
          documentLast4: employee.identification.documentLast4,
          issuingCountry: countryName(employee.identification.issuingCountry),
          expiryDate: employee.identification.expiryDate?.toISOString(),
          frontFileKey: employee.identification.frontFileKey,
          backFileKey: employee.identification.backFileKey,
          ukRightToWork: employee.identification.ukRightToWork,
          visaExpiry: employee.identification.visaExpiry?.toISOString(),
        }
      : undefined,
    hasHealthInfo: Boolean(employee.health?.enc),
    employment: {
      jobTitle: employee.employment?.jobTitle,
      department: employee.employment?.department,
      lineManager: employee.employment?.lineManager,
      startDate: employee.employment?.startDate?.toISOString(),
      employmentType: employee.employment?.employmentType,
      employeeId: employee.employment?.employeeId,
    },
    lastReviewedAt: employee.lastReviewedAt?.toISOString(),
    offboardedAt: employee.offboardedAt?.toISOString(),
  };

  return <RecordView employee={record} currentUserRole={session.user.role} />;
}
