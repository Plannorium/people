"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/StatusPill";
import { MaskedValue } from "@/components/ui/MaskedValue";
import { Avatar, Banner, DetailItem, DetailList, SectionCard, NextOfKinBadge } from "@/components/ui/Layout";
import { HealthReveal } from "./HealthReveal";
import { useLocalTime } from "./EmergencyCard";
import {
  ChevronLeft,
  Phone,
  Mail,
  FileText,
  IdCard,
  Briefcase,
  HeartHandshake,
  HeartPulse,
  User,
  UserX,
} from "lucide-react";

type UserRole = "employee" | "hr_admin" | "owner";
type EmployeeStatus = "incomplete" | "complete" | "needs_review" | "offboarded";

interface RecordContact {
  fullName: string;
  relationship: string;
  isNextOfKin?: boolean;
  phoneE164: string;
  altPhoneE164?: string;
  email?: string;
  countryCode: string;
  countryName?: string;
  city: string;
  speaks?: string;
  priority: number;
}

export interface EmployeeRecord {
  _id: string;
  workEmail: string;
  role: UserRole;
  status: EmployeeStatus;
  isSelf: boolean;
  personal?: {
    legalFirstName?: string;
    legalLastName?: string;
    preferredName?: string;
    pronouns?: string;
    personalEmail?: string;
    mobileE164?: string;
    altPhoneE164?: string;
    nationalities?: string[];
    preferredLanguage?: string;
  };
  location?: {
    countryCode?: string;
    countryName?: string;
    region?: string;
    city?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    timeZone?: string;
    workArrangement?: string;
    officeLocation?: string;
  };
  emergencyContacts: RecordContact[];
  identification?: {
    documentType?: string;
    documentLast4?: string;
    issuingCountry?: string;
    expiryDate?: string;
    frontFileKey?: string;
    backFileKey?: string;
    ukRightToWork?: string;
    visaExpiry?: string;
  };
  hasHealthInfo: boolean;
  employment: {
    jobTitle?: string;
    department?: string;
    lineManager?: string;
    startDate?: string;
    employmentType?: string;
    employeeId?: string;
  };
  lastReviewedAt?: string;
  offboardedAt?: string;
}

interface RecordViewProps {
  employee: EmployeeRecord;
  currentUserRole: UserRole;
}

const ROLE_LABELS: Record<UserRole, string> = { employee: "Employee", hr_admin: "HR Admin", owner: "Owner" };

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function toDateInput(iso?: string): string {
  return iso ? new Date(iso).toISOString().split("T")[0] : "";
}

export const RecordView: React.FC<RecordViewProps> = ({ employee, currentUserRole }) => {
  const router = useRouter();
  const [isEditingEmployment, setIsEditingEmployment] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOffboarding, setIsOffboarding] = useState(false);
  const [confirmOffboard, setConfirmOffboard] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const initialForm = {
    jobTitle: employee.employment.jobTitle || "",
    department: employee.employment.department || "",
    lineManager: employee.employment.lineManager || "",
    startDate: toDateInput(employee.employment.startDate),
    employmentType: employee.employment.employmentType || "",
    employeeId: employee.employment.employeeId || "",
    role: employee.role,
    status: employee.status === "offboarded" ? "complete" : employee.status,
  };
  const [employmentForm, setEmploymentForm] = useState(initialForm);

  const p = employee.personal;
  const loc = employee.location;
  const localTime = useLocalTime(loc?.timeZone || "UTC");
  const contacts = employee.emergencyContacts;
  const idDoc = employee.identification;
  const isOffboarded = employee.status === "offboarded";
  const isOwner = currentUserRole === "owner";
  const canOffboard = !isOffboarded && !employee.isSelf && (employee.role !== "owner" || isOwner);

  const name = p?.legalFirstName
    ? `${p.legalFirstName} ${p.legalLastName || ""}`.trim()
    : employee.workEmail.split("@")[0];

  const [now] = useState(() => Date.now());
  const idDays = idDoc?.expiryDate
    ? Math.ceil((new Date(idDoc.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  const handleSaveEmployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const { status, ...rest } = employmentForm;
      const res = await fetch(`/api/employees/${employee._id}/employment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Offboarded records keep their status; only send it when it can change
        body: JSON.stringify(isOffboarded ? rest : { ...rest, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save changes.");
      setIsEditingEmployment(false);
      setFeedback({ tone: "success", text: "Employment details saved." });
      router.refresh();
    } catch (err) {
      setFeedback({ tone: "danger", text: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOffboard = async () => {
    setIsOffboarding(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/employees/${employee._id}/offboard`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't offboard this person.");
      setConfirmOffboard(false);
      setFeedback({ tone: "success", text: "Offboarded. Their access has ended and the retention period has started." });
      router.refresh();
    } catch (err) {
      setFeedback({ tone: "danger", text: (err as Error).message });
    } finally {
      setIsOffboarding(false);
    }
  };

  const handleViewDocument = async (key: string) => {
    setDocError(null);
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL
    const win = window.open("", "_blank");
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(key)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't open the document.");
      if (win) {
        win.opener = null;
        win.location.href = data.downloadUrl;
      } else {
        window.location.href = data.downloadUrl;
      }
    } catch (err) {
      win?.close();
      setDocError((err as Error).message);
    }
  };

  const set = (field: keyof typeof employmentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEmploymentForm({ ...employmentForm, [field]: e.target.value });

  return (
    <div className="space-y-6 animate-rise-in">
      <Link
        href="/admin"
        className="-ms-1 inline-flex items-center gap-0.5 text-subhead font-medium text-tint hover:underline"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
        Directory
      </Link>

      {/* Identity */}
      <section className="flex flex-col gap-5 rounded-[28px] bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:p-8">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-title2 font-bold text-label sm:text-title1">{name}</h1>
            <StatusPill status={employee.status} />
          </div>
          <p className="mt-1 text-subhead text-label-2">
            <span dir="ltr">{employee.workEmail}</span>
            <span aria-hidden="true"> · </span>
            {ROLE_LABELS[employee.role]}
            {p?.pronouns && (
              <>
                <span aria-hidden="true"> · </span>
                {p.pronouns}
              </>
            )}
          </p>
          <p className="mt-2 text-footnote text-label-2">
            {isOffboarded
              ? `Offboarded ${formatDate(employee.offboardedAt) || ""}`
              : employee.lastReviewedAt
                ? `Last reviewed ${formatDate(employee.lastReviewedAt)}`
                : "Not reviewed yet"}
          </p>
        </div>
        {canOffboard && !confirmOffboard && (
          <Button type="button" variant="danger" size="md" className="self-start sm:self-center" onClick={() => setConfirmOffboard(true)}>
            <UserX aria-hidden="true" className="h-4 w-4" />
            <span>Offboard</span>
          </Button>
        )}
      </section>

      {confirmOffboard && (
        <Banner
          tone="danger"
          title={`Offboard ${name}?`}
          action={
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmOffboard(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" isLoading={isOffboarding} onClick={handleOffboard}>
                Offboard
              </Button>
            </div>
          }
        >
          They&rsquo;ll lose access straight away. ID documents and health notes are deleted automatically after the retention period.
        </Banner>
      )}

      {feedback && <Banner tone={feedback.tone}>{feedback.text}</Banner>}

      {/* Emergency contacts first: this is what's needed under pressure */}
      <SectionCard
        title="Emergency contacts & next of kin"
        icon={<HeartHandshake />}
        action={
          loc?.timeZone && (
            <span className="text-footnote text-label-2">
              {localTime && <span className="font-semibold tabular-nums text-label">{localTime}</span>}
              {localTime && " local · "}
              {loc.timeZone.replace(/_/g, " ")}
            </span>
          )
        }
      >
        {contacts.length === 0 ? (
          <p className="text-subhead text-warning">No emergency contacts provided yet.</p>
        ) : (
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {contacts.map((contact, idx) => (
              <li key={idx} className="flex flex-col gap-3 rounded-[16px] bg-surface-2 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-footnote text-label-2">
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fill px-1.5 font-semibold tabular-nums text-label">
                      {idx + 1}
                    </span>
                    {contact.relationship && <span>{contact.relationship}</span>}
                    {contact.isNextOfKin && <NextOfKinBadge />}
                  </div>
                  <p className="mt-1.5 truncate text-body font-semibold text-label">{contact.fullName}</p>
                  <p className="text-footnote text-label-2">
                    {[contact.city, contact.countryName || contact.countryCode].filter(Boolean).join(", ")}
                    {contact.speaks && ` · Speaks ${contact.speaks}`}
                  </p>
                </div>
                <a
                  href={`tel:${contact.phoneE164}`}
                  className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-call text-subhead font-semibold text-on-call"
                  aria-label={`Call ${contact.fullName} on ${contact.phoneE164}`}
                >
                  <Phone aria-hidden="true" className="h-4 w-4 fill-current" />
                  <span className="tabular-nums" dir="ltr">
                    {contact.phoneE164}
                  </span>
                </a>
                {contact.altPhoneE164 && (
                  <a
                    href={`tel:${contact.altPhoneE164}`}
                    className="text-center text-footnote font-medium text-tint hover:underline"
                    dir="ltr"
                  >
                    Alt: {contact.altPhoneE164}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center justify-center gap-1.5 text-center text-footnote font-medium text-tint hover:underline break-all"
                    dir="ltr"
                  >
                    <Mail aria-hidden="true" className="h-3 w-3 shrink-0" />
                    <span>{contact.email}</span>
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard title="Medical & accessibility" icon={<HeartPulse />}>
        <HealthReveal employeeId={employee._id} hasHealthInfo={employee.hasHealthInfo} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <SectionCard title="Personal & home" icon={<User />}>
            <DetailList>
              <DetailItem label="Mobile" ltr>
                {p?.mobileE164 ? (
                  <a href={`tel:${p.mobileE164}`} className="text-tint hover:underline">
                    {p.mobileE164}
                  </a>
                ) : undefined}
              </DetailItem>
              <DetailItem label="Alternative phone" ltr>
                {p?.altPhoneE164}
              </DetailItem>
              <DetailItem label="Personal email" ltr wide>
                {p?.personalEmail}
              </DetailItem>
              <DetailItem label="Home address" wide>
                {loc?.addressLine1
                  ? [loc.addressLine1, loc.addressLine2, loc.city, loc.region, loc.postalCode, loc.countryName]
                      .filter(Boolean)
                      .join(", ")
                  : undefined}
              </DetailItem>
              <DetailItem label="Work arrangement">
                {loc?.workArrangement
                  ? `${loc.workArrangement}${loc.officeLocation ? ` · ${loc.officeLocation}` : ""}`
                  : undefined}
              </DetailItem>
              <DetailItem label="Preferred language">{p?.preferredLanguage}</DetailItem>
              <DetailItem label="Nationality">{p?.nationalities?.join(", ")}</DetailItem>
              <DetailItem label="Preferred name">{p?.preferredName}</DetailItem>
            </DetailList>
          </SectionCard>

          <SectionCard title="Identification" icon={<IdCard />}>
            <DetailList>
              <DetailItem label="Document">{idDoc?.documentType}</DetailItem>
              <DetailItem label="Number">
                {idDoc?.documentLast4 ? (
                  <MaskedValue maskedText={`•••• ${idDoc.documentLast4}`} employeeId={employee._id} />
                ) : undefined}
              </DetailItem>
              <DetailItem label="Issued by">{idDoc?.issuingCountry}</DetailItem>
              <DetailItem label="Expires">
                {idDoc?.expiryDate ? (
                  <span className={idDays !== null && idDays < 0 ? "text-danger" : idDays !== null && idDays <= 60 ? "text-warning" : ""}>
                    {formatDate(idDoc.expiryDate)}
                    {idDays !== null && idDays < 0 && " · Expired"}
                  </span>
                ) : undefined}
              </DetailItem>
              {idDoc?.ukRightToWork && <DetailItem label="UK right to work">{idDoc.ukRightToWork}</DetailItem>}
              {idDoc?.visaExpiry && <DetailItem label="Visa expires">{formatDate(idDoc.visaExpiry)}</DetailItem>}
            </DetailList>

            {(idDoc?.frontFileKey || idDoc?.backFileKey) && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-separator pt-4">
                {idDoc?.frontFileKey && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleViewDocument(idDoc.frontFileKey!)}>
                    <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>View front</span>
                  </Button>
                )}
                {idDoc?.backFileKey && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleViewDocument(idDoc.backFileKey!)}>
                    <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>View back</span>
                  </Button>
                )}
                <span className="text-footnote text-label-2">Views are logged</span>
              </div>
            )}
            {docError && <p className="mt-2 text-footnote text-danger">{docError}</p>}
          </SectionCard>
        </div>

        <SectionCard
          title="Employment & access"
          icon={<Briefcase />}
          className="self-start"
          action={
            !isEditingEmployment ? (
              <button
                type="button"
                className="text-subhead font-medium text-tint hover:underline"
                onClick={() => {
                  setFeedback(null);
                  setIsEditingEmployment(true);
                }}
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                className="text-subhead font-medium text-tint hover:underline"
                onClick={() => {
                  setEmploymentForm(initialForm);
                  setIsEditingEmployment(false);
                }}
              >
                Cancel
              </button>
            )
          }
        >
          {isEditingEmployment ? (
            <form onSubmit={handleSaveEmployment} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Job title" value={employmentForm.jobTitle} onChange={set("jobTitle")} maxLength={120} />
                <Input label="Department" value={employmentForm.department} onChange={set("department")} maxLength={120} />
                <Input label="Line manager" value={employmentForm.lineManager} onChange={set("lineManager")} maxLength={120} />
                <Input label="Start date" type="date" value={employmentForm.startDate} onChange={set("startDate")} />
                <Select label="Employment type" value={employmentForm.employmentType} onChange={set("employmentType")}>
                  <option value="">Not set</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Fixed-term">Fixed-term</option>
                  <option value="Intern">Intern</option>
                </Select>
                <Input label="Employee ID" value={employmentForm.employeeId} onChange={set("employeeId")} maxLength={40} ltr />
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-separator pt-4 sm:grid-cols-2">
                <Select
                  label="Access role"
                  value={employmentForm.role}
                  onChange={set("role")}
                  disabled={!isOwner}
                  hint={isOwner ? undefined : "Only owners can change roles"}
                >
                  <option value="employee">Employee</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="owner">Owner</option>
                </Select>

                {!isOffboarded && (
                  <Select label="Profile status" value={employmentForm.status} onChange={set("status")}>
                    <option value="incomplete">Incomplete</option>
                    <option value="complete">Complete</option>
                    <option value="needs_review">Needs review</option>
                  </Select>
                )}
              </div>

              <Button type="submit" isLoading={isSaving} className="w-full">
                Save changes
              </Button>
            </form>
          ) : (
            <DetailList>
              <DetailItem label="Job title">{employee.employment.jobTitle}</DetailItem>
              <DetailItem label="Department">{employee.employment.department}</DetailItem>
              <DetailItem label="Line manager">{employee.employment.lineManager}</DetailItem>
              <DetailItem label="Start date">{formatDate(employee.employment.startDate)}</DetailItem>
              <DetailItem label="Employment type">{employee.employment.employmentType}</DetailItem>
              <DetailItem label="Employee ID" mono ltr>
                {employee.employment.employeeId}
              </DetailItem>
              <DetailItem label="Access role">{ROLE_LABELS[employee.role]}</DetailItem>
            </DetailList>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
