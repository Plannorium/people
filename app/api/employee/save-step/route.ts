import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { encryptField } from "@/lib/crypto";
import { writeAudit, extractClientMeta } from "@/lib/audit";
import { personalSchema } from "@/lib/validation/personal";
import { locationSchema } from "@/lib/validation/location";
import { contactsSchema } from "@/lib/validation/contacts";
import { identificationSchema } from "@/lib/validation/identification";
import { healthSchema } from "@/lib/validation/health";
import { verifyUploadedDocument, deleteDocument } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const { step, data } = await req.json();

    if (!step || !data) {
      return NextResponse.json({ error: "Missing step or data" }, { status: 400 });
    }

    await connectDB();

    const employee = await Employee.findOne({ workEmail: session.user.email.toLowerCase() });
    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    const fieldsTouched: string[] = [];

    switch (step) {
      case "personal": {
        const validated = personalSchema.parse(data);
        employee.personal = {
          legalFirstName: validated.legalFirstName,
          legalLastName: validated.legalLastName,
          preferredName: validated.preferredName,
          pronouns: validated.pronouns,
          personalEmail: validated.personalEmail,
          mobileE164: validated.mobileE164,
          altPhoneE164: validated.altPhoneE164,
          nationalities: validated.nationalities,
          preferredLanguage: validated.preferredLanguage,
        };
        fieldsTouched.push(
          "personal.legalFirstName",
          "personal.legalLastName",
          "personal.personalEmail",
          "personal.mobileE164",
          "personal.nationalities"
        );
        break;
      }

      case "location": {
        const validated = locationSchema.parse(data);
        employee.location = {
          countryCode: validated.countryCode,
          region: validated.region,
          city: validated.city,
          addressLine1: validated.addressLine1,
          addressLine2: validated.addressLine2,
          postalCode: validated.postalCode,
          timeZone: validated.timeZone,
          workArrangement: validated.workArrangement,
          officeLocation: validated.officeLocation,
        };
        fieldsTouched.push(
          "location.countryCode",
          "location.region",
          "location.city",
          "location.addressLine1",
          "location.timeZone",
          "location.workArrangement"
        );
        break;
      }

      case "contacts": {
        const validated = contactsSchema.parse(data);
        // Priority always follows the order shown on the form, with no gaps after removals
        employee.emergencyContacts = validated.emergencyContacts.map((contact, index) => ({
          ...contact,
          priority: index + 1,
        }));
        employee.emergencyContactsConfirmed = validated.emergencyContactsConfirmed;
        fieldsTouched.push("emergencyContacts", "emergencyContactsConfirmed");
        break;
      }

      case "identification": {
        // UK right-to-work rules depend on where the employee lives: use the saved record, not the client
        const validated = identificationSchema.parse({
          ...data,
          residenceCountryCode: employee.location?.countryCode,
        });

        const previousKeys = [
          employee.identification?.frontFileKey,
          employee.identification?.backFileKey,
        ].filter(Boolean) as string[];
        const newKeys = [validated.frontFileKey, validated.backFileKey].filter(Boolean) as string[];

        for (const key of newKeys) {
          if (previousKeys.includes(key)) continue;
          // A key may only ever belong to one employee
          const owner = await Employee.exists({
            _id: { $ne: employee._id },
            $or: [{ "identification.frontFileKey": key }, { "identification.backFileKey": key }],
          });
          if (owner) throw new Error("Invalid document reference.");
          await verifyUploadedDocument(key);
        }

        // Remove replaced uploads so old ID copies don't linger in storage
        for (const key of previousKeys) {
          if (!newKeys.includes(key)) await deleteDocument(key).catch(() => undefined);
        }

        const last4 = validated.documentNumber.slice(-4);
        const encryptedDocNumber = encryptField(validated.documentNumber);

        employee.identification = {
          documentType: validated.documentType,
          documentNumberEnc: encryptedDocNumber,
          documentLast4: last4,
          issuingCountry: validated.issuingCountry,
          expiryDate: new Date(validated.expiryDate),
          frontFileKey: validated.frontFileKey,
          backFileKey: validated.backFileKey || undefined,
          ukRightToWork: validated.ukRightToWork,
          visaExpiry: validated.visaExpiry ? new Date(validated.visaExpiry) : undefined,
        };
        fieldsTouched.push(
          "identification.documentType",
          "identification.documentNumberEnc",
          "identification.issuingCountry",
          "identification.expiryDate",
          "identification.frontFileKey"
        );
        break;
      }

      case "health": {
        const validated = healthSchema.parse(data);
        const hasHealthData =
          (validated.bloodType && validated.bloodType !== "Don't know") ||
          validated.allergies ||
          validated.medicalInfo ||
          validated.accessibilityNeeds;

        if (hasHealthData) {
          const healthBlob = JSON.stringify({
            bloodType: validated.bloodType,
            allergies: validated.allergies,
            medicalInfo: validated.medicalInfo,
            accessibilityNeeds: validated.accessibilityNeeds,
          });
          employee.health = { enc: encryptField(healthBlob) };
          employee.healthConsentAt = new Date();
          fieldsTouched.push("health.enc", "healthConsentAt");
        } else {
          employee.health = undefined;
          employee.healthConsentAt = undefined;
        }
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid step name" }, { status: 400 });
    }

    await employee.save();

    // Audit log
    const meta = extractClientMeta(req.headers);
    await writeAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: "update",
      targetEmployeeId: employee._id.toString(),
      fields: fieldsTouched,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, step });
  } catch (error) {
    return apiError(error, "Failed to save step", "Save Step Error");
  }
}
