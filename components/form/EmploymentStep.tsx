"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mail } from "lucide-react";
import { DetailList, DetailItem } from "@/components/ui/Layout";
import { StepShell, StepFooter } from "./StepLayout";

interface EmploymentStepProps {
  employmentData?: {
    jobTitle?: string;
    department?: string;
    lineManager?: string;
    startDate?: string | Date;
    employmentType?: string;
    employeeId?: string;
  };
  hrEmail?: string;
}

export const EmploymentStep: React.FC<EmploymentStepProps> = ({
  employmentData,
  hrEmail = "team@plannorium.com",
}) => {
  const router = useRouter();
  const { t } = useLanguage();

  const startDate = employmentData?.startDate
    ? new Date(employmentData.startDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : undefined;

  return (
    <StepShell title={t("employment.title")} subtitle={t("employment.subtitle")}>
      <div className="rounded-2xl p-4 shadow-[inset_0_0_0_1px_var(--separator)] sm:p-5">
        <DetailList>
          <DetailItem label={t("employment.jobTitle")}>{employmentData?.jobTitle}</DetailItem>
          <DetailItem label={t("employment.department")}>{employmentData?.department}</DetailItem>
          <DetailItem label={t("employment.lineManager")}>{employmentData?.lineManager}</DetailItem>
          <DetailItem label={t("employment.startDate")}>{startDate}</DetailItem>
          <DetailItem label={t("employment.employmentType")}>{employmentData?.employmentType}</DetailItem>
          <DetailItem label={t("employment.employeeId")} mono ltr>
            {employmentData?.employeeId}
          </DetailItem>
        </DetailList>
      </div>

      <p className="mt-4 text-footnote text-label-2">
        HR maintains these details. Blank fields haven&rsquo;t been set yet.{" "}
        <a
          href={`mailto:${hrEmail}?subject=Employment%20details`}
          className="inline-flex items-center gap-1 font-medium text-tint hover:underline"
        >
          <Mail aria-hidden="true" className="h-3.5 w-3.5" />
          {t("employment.tellHr")}
        </a>
      </p>

      <StepFooter
        onBack={() => router.push("/onboarding/health")}
        onNext={() => router.push("/onboarding/review")}
      />
    </StepShell>
  );
};
