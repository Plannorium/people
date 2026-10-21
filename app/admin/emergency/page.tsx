import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { countryName } from "@/lib/format";
import { EmergencySearchConsole } from "./EmergencySearchConsole";
import { isNextOfKin, relationshipLabel } from "@/lib/validation/contacts";

export default async function AdminEmergencyPage() {
  await requirePageSession(["hr_admin", "owner"]);

  await connectDB();
  const rawEmployees = await Employee.find({
    status: { $ne: "offboarded" },
  })
    .select("_id workEmail personal location emergencyContacts health.enc")
    .sort({ "personal.legalFirstName": 1 })
    .lean();

  // Only what a responder needs; the encrypted health blob stays on the server
  const employees = rawEmployees.map((e) => ({
    _id: e._id.toString(),
    workEmail: e.workEmail,
    personal: {
      legalFirstName: e.personal?.legalFirstName,
      legalLastName: e.personal?.legalLastName,
      preferredName: e.personal?.preferredName,
      mobileE164: e.personal?.mobileE164,
      altPhoneE164: e.personal?.altPhoneE164,
      preferredLanguage: e.personal?.preferredLanguage,
    },
    location: {
      countryCode: e.location?.countryCode,
      countryName: countryName(e.location?.countryCode),
      city: e.location?.city,
      region: e.location?.region,
      timeZone: e.location?.timeZone,
      addressLine1: e.location?.addressLine1,
      addressLine2: e.location?.addressLine2,
      postalCode: e.location?.postalCode,
    },
    emergencyContacts: [...(e.emergencyContacts || [])]
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
    hasHealthInfo: Boolean(e.health?.enc),
  }));

  return <EmergencySearchConsole initialEmployees={employees} />;
}
