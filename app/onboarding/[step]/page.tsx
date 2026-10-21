import { notFound, redirect } from "next/navigation";
import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { Settings } from "@/lib/models/Settings";
import { decryptField } from "@/lib/crypto";
import { countryName, formatDate } from "@/lib/format";
import { getStepCompletion, missingSteps } from "@/lib/onboarding";
import { ProgressSteps } from "@/components/ui/ProgressSteps";

// Step form components
import { PersonalStep } from "@/components/form/PersonalStep";
import { LocationStep } from "@/components/form/LocationStep";
import { ContactsStep } from "@/components/form/ContactsStep";
import { IdentificationStep } from "@/components/form/IdentificationStep";
import { HealthStep } from "@/components/form/HealthStep";
import { EmploymentStep } from "@/components/form/EmploymentStep";
import { ReviewStep } from "@/components/form/ReviewStep";
import { isNextOfKin, relationshipLabel } from "@/lib/validation/contacts";

const VALID_STEPS = [
  "personal",
  "location",
  "contacts",
  "identification",
  "health",
  "employment",
  "review",
];

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const session = await requirePageSession();

  const resolvedParams = await params;
  const step = resolvedParams.step;

  if (!VALID_STEPS.includes(step)) {
    redirect("/onboarding/personal");
  }

  await connectDB();
  const employee = await Employee.findOne({
    workEmail: session.user.email.toLowerCase(),
  }).lean();

  if (!employee) {
    redirect("/sign-in");
  }

  // Decrypt only what the current step shows
  let healthDecrypted: Record<string, string | undefined> = {};
  if (step === "health" && employee.health?.enc) {
    try {
      const json = decryptField(employee.health.enc);
      healthDecrypted = JSON.parse(json);
    } catch (e) {
      console.error("Health decryption error", e);
    }
  }

  let docNumberPlain = "";
  if (step === "identification" && employee.identification?.documentNumberEnc) {
    try {
      docNumberPlain = decryptField(employee.identification.documentNumberEnc);
    } catch {
      docNumberPlain = "";
    }
  }

  const renderStep = async () => {
  switch (step) {
    case "personal":
      return (
        <PersonalStep
          initialData={employee.personal as any}
          workEmail={employee.workEmail}
        />
      );

    case "location":
      return <LocationStep initialData={employee.location as any} />;

    case "contacts":
      return (
        <ContactsStep
          initialData={{
            emergencyContacts: employee.emergencyContacts as any,
            emergencyContactsConfirmed: employee.emergencyContactsConfirmed,
          }}
        />
      );

    case "identification":
      return (
        <IdentificationStep
          initialData={{
            documentType: employee.identification?.documentType,
            documentNumber: docNumberPlain,
            issuingCountry: employee.identification?.issuingCountry,
            expiryDate: employee.identification?.expiryDate ? new Date(employee.identification.expiryDate).toISOString() : undefined,
            frontFileKey: employee.identification?.frontFileKey,
            backFileKey: employee.identification?.backFileKey,
            ukRightToWork: employee.identification?.ukRightToWork,
            visaExpiry: employee.identification?.visaExpiry ? new Date(employee.identification.visaExpiry).toISOString() : undefined,
          }}
          residenceCountryCode={employee.location?.countryCode || "GB"}
        />
      );

    case "health":
      return (
        <HealthStep
          initialData={{
            bloodType: healthDecrypted.bloodType || "",
            allergies: healthDecrypted.allergies || "",
            medicalInfo: healthDecrypted.medicalInfo || "",
            accessibilityNeeds: healthDecrypted.accessibilityNeeds || "",
            healthConsent: !!employee.healthConsentAt,
          }}
        />
      );

    case "employment": {
      const settings = await Settings.findOne().select("hrEmail").lean();
      return (
        <EmploymentStep
          employmentData={employee.employment as any}
          hrEmail={settings?.hrEmail || process.env.EMAIL_FROM || "team@plannorium.com"}
        />
      );
    }

    case "review":
      // Only the fields the summary shows; encrypted values never leave the server
      return (
        <ReviewStep
          missing={missingSteps(getStepCompletion(employee))}
          employeeRecord={{
            personal: {
              legalFirstName: employee.personal?.legalFirstName,
              legalLastName: employee.personal?.legalLastName,
              personalEmail: employee.personal?.personalEmail,
              mobileE164: employee.personal?.mobileE164,
              pronouns: employee.personal?.pronouns,
            },
            location: {
              countryName: countryName(employee.location?.countryCode),
              city: employee.location?.city,
              addressLine1: employee.location?.addressLine1,
              workArrangement: employee.location?.workArrangement,
              timeZone: employee.location?.timeZone,
            },
            emergencyContacts: (employee.emergencyContacts || []).map((c) => ({
              fullName: c.fullName,
              relationship: relationshipLabel(c),
              isNextOfKin: isNextOfKin(c),
              phoneE164: c.phoneE164,
              altPhoneE164: c.altPhoneE164,
              email: c.email,
            })),
            identification: {
              documentType: employee.identification?.documentType,
              documentLast4: employee.identification?.documentLast4,
              expiryDate: formatDate(employee.identification?.expiryDate),
            },
            hasHealthInfo: Boolean(employee.health?.enc),
          }}
        />
      );

    default:
      notFound();
  }
  };

  const completion = getStepCompletion(employee);
  const content = await renderStep();
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <ProgressSteps completion={completion} />
      {content}
    </div>
  );
}
