"use client";

import React, { ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reviewSchema, ReviewFormData } from "@/lib/validation/review";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { DetailList, DetailItem, NextOfKinBadge } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, FileCheck } from "lucide-react";
import { StepShell, StepFooter } from "./StepLayout";

interface ReviewContact {
  fullName: string;
  relationship: string;
  isNextOfKin?: boolean;
  phoneE164: string;
  altPhoneE164?: string;
  email?: string;
}

export interface ReviewRecord {
  personal?: {
    legalFirstName?: string;
    legalLastName?: string;
    personalEmail?: string;
    mobileE164?: string;
    pronouns?: string;
  };
  location?: {
    countryName?: string;
    city?: string;
    addressLine1?: string;
    workArrangement?: string;
    timeZone?: string;
  };
  emergencyContacts?: ReviewContact[];
  identification?: {
    documentType?: string;
    documentLast4?: string;
    expiryDate?: string;
  };
  hasHealthInfo?: boolean;
}

interface ReviewStepProps {
  employeeRecord: ReviewRecord;
  /** Required sections that still need finishing; submit stays disabled until empty */
  missing?: string[];
}

function ReviewSection({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <section className="py-5 first:pt-0 last:pb-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-subhead font-semibold text-label">{title}</h2>
        <Link href={href} className="text-subhead font-medium text-tint hover:underline">
          {t("common.edit")}
        </Link>
      </div>
      {children}
    </section>
  );
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ employeeRecord, missing = [] }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      accuracyConfirmed: false,
      privacyAcknowledged: false,
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/employee/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to finalize and submit profile.");
      }

      setIsSuccess(true);
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto w-full max-w-lg animate-rise-in">
        <div className="rounded-[22px] bg-surface px-6 py-12 text-center shadow-card sm:px-10">
          <CheckCircle2 aria-hidden="true" className="mx-auto h-14 w-14 text-success" strokeWidth={1.5} />
          <h1 className="mt-5 text-title1 font-bold text-label">{t("onboarding.successTitle")}</h1>
          <p className="mx-auto mt-2 max-w-sm text-subhead text-label-2">{t("onboarding.successMessage")}</p>
          <Button type="button" size="lg" onClick={() => router.push("/me")} className="mt-8">
            {t("onboarding.viewProfile")}
          </Button>
        </div>
      </div>
    );
  }

  const p = employeeRecord?.personal;
  const loc = employeeRecord?.location;
  const contacts = employeeRecord?.emergencyContacts || [];
  const idDoc = employeeRecord?.identification;

  return (
    <StepShell title={t("review.title")} subtitle={t("review.subtitle")} error={serverError} width="max-w-3xl">
      <div className="divide-y divide-separator">
        <ReviewSection title={t("personal.title")} href="/onboarding/personal">
          <DetailList columns={3}>
            <DetailItem label="Legal name">
              {p?.legalFirstName ? `${p.legalFirstName} ${p.legalLastName || ""}`.trim() : undefined}
            </DetailItem>
            <DetailItem label={t("personal.personalEmail")} ltr>
              {p?.personalEmail}
            </DetailItem>
            <DetailItem label={t("personal.mobilePhone")} ltr>
              {p?.mobileE164}
            </DetailItem>
          </DetailList>
        </ReviewSection>

        <ReviewSection title={t("location.title")} href="/onboarding/location">
          <DetailList columns={3}>
            <DetailItem label={t("location.address1")}>{loc?.addressLine1}</DetailItem>
            <DetailItem label={t("location.city")}>
              {loc?.city ? [loc.city, loc.countryName].filter(Boolean).join(", ") : undefined}
            </DetailItem>
            <DetailItem label={t("location.workArrangement")}>{loc?.workArrangement}</DetailItem>
          </DetailList>
        </ReviewSection>

        <ReviewSection title={t("contacts.title")} href="/onboarding/contacts">
          {contacts.length === 0 ? (
            <p className="text-subhead text-warning">No emergency contacts yet.</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c, i) => (
                <li key={i} className="flex flex-col gap-1 py-1.5 sm:flex-row sm:items-center sm:justify-between text-subhead">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-label">{c.fullName}</span>
                    {c.relationship && <span className="text-label-2"> · {c.relationship}</span>}
                    {c.isNextOfKin && (
                      <span className="ms-2 align-middle">
                        <NextOfKinBadge label={t("contacts.nextOfKin")} />
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 text-footnote text-label-2" dir="ltr">
                    <span className="tabular-nums">{c.phoneE164}</span>
                    {c.altPhoneE164 && <span className="tabular-nums">Alt: {c.altPhoneE164}</span>}
                    {c.email && <span>{c.email}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ReviewSection>

        <ReviewSection title={t("identification.title")} href="/onboarding/identification">
          <DetailList columns={3}>
            <DetailItem label={t("identification.documentType")}>{idDoc?.documentType}</DetailItem>
            <DetailItem label={t("identification.documentNumber")} mono ltr>
              {idDoc?.documentLast4 ? `•••• ${idDoc.documentLast4}` : undefined}
            </DetailItem>
            <DetailItem label={t("identification.expiryDate")}>{idDoc?.expiryDate}</DetailItem>
          </DetailList>
        </ReviewSection>

        <ReviewSection title={t("health.title")} href="/onboarding/health">
          <p className="text-subhead text-label-2">
            {employeeRecord.hasHealthInfo ? "Provided and encrypted." : "Nothing provided (optional)."}
          </p>
        </ReviewSection>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4 border-t border-separator pt-6">
        <Checkbox
          isRequired
          label={t("review.accuracyConfirmation")}
          error={errors.accuracyConfirmed?.message}
          {...register("accuracyConfirmed")}
        />

        <Checkbox
          isRequired
          label={
            <span>
              {t("review.privacyConfirmation")}{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-tint hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Read the notice
              </Link>
            </span>
          }
          error={errors.privacyAcknowledged?.message}
          {...register("privacyAcknowledged")}
        />

        <StepFooter
          onBack={() => router.push("/onboarding/employment")}
          isSubmitting={isSubmitting}
          nextDisabled={missing.length > 0}
          nextLabel={t("review.submitRecord")}
          nextIcon={<FileCheck aria-hidden="true" className="h-4 w-4" />}
        />
      </form>
    </StepShell>
  );
};
