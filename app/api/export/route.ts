import { NextRequest, NextResponse } from "next/server";
import { requireRole, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { isNextOfKin, relationshipLabel } from "@/lib/validation/contacts";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(["hr_admin", "owner"]);

    await connectDB();
    const employees = await Employee.find({ status: { $ne: "offboarded" } }).sort({ createdAt: -1 });

    // CSV Header - STRICTLY NO DATE OF BIRTH, NO DOCUMENT NUMBERS, NO HEALTH DATA
    const headers = [
      "Work Email",
      "Legal First Name",
      "Legal Last Name",
      "Preferred Name",
      "Personal Email",
      "Mobile Phone",
      "Country",
      "City",
      "Address Line 1",
      "Postal Code",
      "Work Arrangement",
      "Emergency Contact 1 Name",
      "Emergency Contact 1 Phone",
      "Emergency Contact 1 Email",
      "Emergency Contact 1 Relationship",
      "Next of Kin Name",
      "Next of Kin Phone",
      "Next of Kin Relationship",
      "Document Type",
      "Issuing Country",
      "Document Expiry Date",
      "Job Title",
      "Department",
      "Status",
      "Last Reviewed At",
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      // Stop spreadsheet apps running a cell as a formula (CSV injection)
      // (plain E.164 phone numbers like +447700900123 are safe and left as they are)
      if (/^[=+\-@\t\r]/.test(str) && !/^\+\d{6,15}$/.test(str)) str = `'${str}`;
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = employees.map((emp) => {
      const p = emp.personal;
      const loc = emp.location;
      const contacts = [...(emp.emergencyContacts || [])].sort((a, b) => (a.priority || 0) - (b.priority || 0));
      const c1 = contacts[0];
      const kin = contacts.find((c) => isNextOfKin(c));
      const idDoc = emp.identification;
      const em = emp.employment;

      return [
        escapeCsv(emp.workEmail),
        escapeCsv(p?.legalFirstName),
        escapeCsv(p?.legalLastName),
        escapeCsv(p?.preferredName),
        escapeCsv(p?.personalEmail),
        escapeCsv(p?.mobileE164),
        escapeCsv(loc?.countryCode),
        escapeCsv(loc?.city),
        escapeCsv(loc?.addressLine1),
        escapeCsv(loc?.postalCode),
        escapeCsv(loc?.workArrangement),
        escapeCsv(c1?.fullName),
        escapeCsv(c1?.phoneE164),
        escapeCsv(c1?.email),
        escapeCsv(c1 ? relationshipLabel(c1) : ""),
        escapeCsv(kin?.fullName),
        escapeCsv(kin?.phoneE164),
        escapeCsv(kin ? relationshipLabel(kin) : ""),
        escapeCsv(idDoc?.documentType),
        escapeCsv(idDoc?.issuingCountry),
        escapeCsv(idDoc?.expiryDate ? new Date(idDoc.expiryDate).toISOString().split("T")[0] : ""),
        escapeCsv(em?.jobTitle),
        escapeCsv(em?.department),
        escapeCsv(emp.status),
        escapeCsv(emp.lastReviewedAt ? new Date(emp.lastReviewedAt).toISOString() : ""),
      ].join(",");
    });

    // Leading BOM so Excel reads UTF-8 (Arabic and accented names) correctly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    // Write audit log
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "export",
      fields: ["directory.csv"],
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="plannorium-people-directory-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    return apiError(err, "Failed to generate CSV export.", "CSV Export Error");
  }
}
