import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePageSession } from "@/lib/access";
import { connectDB } from "@/lib/db";
import { Employee } from "@/lib/models/Employee";
import { buttonClasses } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { MaskedValue } from "@/components/ui/MaskedValue";
import { Avatar, Banner, DetailItem, DetailList, NextOfKinBadge, SectionCard } from "@/components/ui/Layout";
import { isNextOfKin, relationshipLabel } from "@/lib/validation/contacts";
import { getStepCompletion, missingSteps, STEP_LABELS } from "@/lib/onboarding";
import { countryName, daysUntil, displayName, formatDate, roleLabel } from "@/lib/format";
import {
  User,
  MapPin,
  HeartHandshake,
  IdCard,
  HeartPulse,
  Briefcase,
  Lock,
} from "lucide-react";

function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="text-subhead font-medium text-tint hover:underline">
      Edit
    </Link>
  );
}

export default async function MyProfilePage() {
  const session = await requirePageSession();

  await connectDB();
  const employee = await Employee.findOne({
    workEmail: session.user.email.toLowerCase(),
  }).lean();

  if (!employee) {
    redirect("/sign-in");
  }

  const p = employee.personal;
  const loc = employee.location;
  const contacts = [...(employee.emergencyContacts || [])].sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const idDoc = employee.identification;
  const employment = employee.employment;

  const name = p?.legalFirstName ? `${p.legalFirstName} ${p.legalLastName || ""}`.trim() : displayName(employee);
  const idDays = daysUntil(idDoc?.expiryDate);
  const missing = missingSteps(getStepCompletion(employee));

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-rise-in">
      {employee.status === "needs_review" && (
        <Banner
          tone="warning"
          title="Time for your periodic review"
          action={
            <Link href="/onboarding/review" className={buttonClasses("primary", "sm")}>
              Review now
            </Link>
          }
        >
          Please confirm your emergency contacts and home address are still correct.
        </Banner>
      )}

      {employee.status === "incomplete" && (
        <Banner
          tone="warning"
          title="Your profile isn't finished"
          action={
            <Link href={`/onboarding/${missing[0] || "review"}`} className={buttonClasses("primary", "sm")}>
              Continue
            </Link>
          }
        >
          {missing.length > 0
            ? `Still to do: ${missing.map((step) => STEP_LABELS[step]).join(", ")}. Everything you've saved is kept.`
            : "All sections are filled in. Review and submit to finish."}
        </Banner>
      )}

      {/* Identity */}
      <section className="flex flex-col gap-5 rounded-[22px] bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:p-8">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-title2 font-bold text-label sm:text-title1">{name}</h1>
            <StatusPill status={employee.status} />
          </div>
          <p className="mt-1 text-subhead text-label-2">
            <span dir="ltr">{employee.workEmail}</span>
            <span aria-hidden="true"> · </span>
            {roleLabel(employee.role)}
            {p?.pronouns && (
              <>
                <span aria-hidden="true"> · </span>
                {p.pronouns}
              </>
            )}
          </p>
          <p className="mt-2 text-footnote text-label-2">
            {employee.lastReviewedAt
              ? `Last reviewed ${formatDate(employee.lastReviewedAt)}`
              : "Not reviewed yet"}
          </p>
        </div>
        <Link href="/onboarding/personal" className={`${buttonClasses("secondary", "md")} self-start sm:self-center`}>
          Update details
        </Link>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard title="Emergency contacts & next of kin" icon={<HeartHandshake />} action={<EditLink href="/onboarding/contacts" />} className="md:col-span-2">
          {contacts.length === 0 ? (
            <p className="text-subhead text-warning">No emergency contacts or next of kin yet. Add at least one.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {contacts.map((c, i) => (
                <li key={i} className="rounded-[14px] bg-surface-2 px-4 py-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-subhead font-semibold text-label">{c.fullName}</p>
                    <span className="flex shrink-0 items-center gap-2 text-footnote text-label-2">
                      {relationshipLabel(c)}
                      {isNextOfKin(c) && <NextOfKinBadge />}
                    </span>
                  </div>
                  <p className="mt-1 tabular-nums text-subhead text-label" dir="ltr">
                    {c.phoneE164}
                  </p>
                  {c.altPhoneE164 && (
                    <p className="mt-0.5 tabular-nums text-footnote text-label-2" dir="ltr">
                      Alt: {c.altPhoneE164}
                    </p>
                  )}
                  {c.email && (
                    <p className="mt-0.5 truncate text-footnote text-label-2" dir="ltr">
                      <a href={`mailto:${c.email}`} className="hover:underline">
                        {c.email}
                      </a>
                    </p>
                  )}
                  <p className="mt-0.5 text-footnote text-label-2">
                    {[c.city, countryName(c.countryCode)].filter(Boolean).join(", ")}
                    {c.speaks && ` · Speaks ${c.speaks}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Personal" icon={<User />} action={<EditLink href="/onboarding/personal" />}>
          <DetailList>
            <DetailItem label="Preferred name">{p?.preferredName}</DetailItem>
            <DetailItem label="Mobile" ltr>
              {p?.mobileE164}
            </DetailItem>
            <DetailItem label="Personal email" ltr wide>
              {p?.personalEmail}
            </DetailItem>
            <DetailItem label="Preferred language">{p?.preferredLanguage}</DetailItem>
            <DetailItem label="Nationality">{p?.nationalities?.join(", ")}</DetailItem>
          </DetailList>
        </SectionCard>

        <SectionCard title="Home" icon={<MapPin />} action={<EditLink href="/onboarding/location" />}>
          <DetailList>
            <DetailItem label="Address" wide>
              {loc?.addressLine1
                ? [loc.addressLine1, loc.addressLine2, loc.city, loc.postalCode, countryName(loc.countryCode)]
                    .filter(Boolean)
                    .join(", ")
                : undefined}
            </DetailItem>
            <DetailItem label="Work arrangement">
              {loc?.workArrangement
                ? `${loc.workArrangement}${loc.officeLocation ? ` · ${loc.officeLocation}` : ""}`
                : undefined}
            </DetailItem>
            <DetailItem label="Time zone">{loc?.timeZone?.replace(/_/g, " ")}</DetailItem>
          </DetailList>
        </SectionCard>

        <SectionCard title="Identification" icon={<IdCard />} action={<EditLink href="/onboarding/identification" />}>
          <DetailList>
            <DetailItem label="Document">{idDoc?.documentType}</DetailItem>
            <DetailItem label="Number">
              {idDoc?.documentLast4 ? (
                <MaskedValue maskedText={`•••• ${idDoc.documentLast4}`} employeeId={employee._id.toString()} />
              ) : undefined}
            </DetailItem>
            <DetailItem label="Issued by">{countryName(idDoc?.issuingCountry)}</DetailItem>
            <DetailItem label="Expires">
              {idDoc?.expiryDate ? (
                <span className={idDays !== null && idDays < 0 ? "text-danger" : idDays !== null && idDays <= 60 ? "text-warning" : ""}>
                  {formatDate(idDoc.expiryDate)}
                  {idDays !== null && idDays < 0 && " · Expired"}
                </span>
              ) : undefined}
            </DetailItem>
          </DetailList>
        </SectionCard>

        <SectionCard title="Health & accessibility" icon={<HeartPulse />} action={<EditLink href="/onboarding/health" />}>
          <p className="flex items-start gap-2 text-subhead text-label-2">
            <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {employee.health?.enc
                ? "On file and encrypted. HR can open it only to help you in an emergency, and every view is logged."
                : "Nothing provided. This is optional."}
            </span>
          </p>
        </SectionCard>

        <SectionCard
          title="Employment"
          icon={<Briefcase />}
          action={<span className="text-footnote text-label-2">Managed by HR</span>}
          className="md:col-span-2"
        >
          <DetailList columns={3}>
            <DetailItem label="Job title">{employment?.jobTitle}</DetailItem>
            <DetailItem label="Department">{employment?.department}</DetailItem>
            <DetailItem label="Line manager">{employment?.lineManager}</DetailItem>
            <DetailItem label="Start date">{formatDate(employment?.startDate)}</DetailItem>
            <DetailItem label="Employment type">{employment?.employmentType}</DetailItem>
            <DetailItem label="Employee ID" mono ltr>
              {employment?.employeeId}
            </DetailItem>
          </DetailList>
        </SectionCard>
      </div>
    </div>
  );
}
