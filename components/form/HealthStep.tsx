"use client";

import React, { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { healthSchema, HealthFormData } from "@/lib/validation/health";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldShell, fieldClass } from "@/components/ui/Field";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";
import { StepShell, StepFooter, StepGroup, saveStep, afterSaveHref } from "./StepLayout";

interface HealthStepProps {
  initialData?: Partial<HealthFormData>;
}

function TextArea({
  label,
  placeholder,
  rows,
  maxLength,
  error,
  registration,
  count,
}: {
  count: number;
  label: string;
  placeholder: string;
  rows: number;
  maxLength: number;
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={<span className="flex w-full items-center justify-between gap-3"><span>{label}</span><span dir="ltr" className="text-caption font-normal tabular-nums text-label-2">{count}/{maxLength}</span></span>} error={error} messageId={`${id}-message`}>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${fieldClass(!!error)} min-h-24 resize-y leading-normal`}
        {...registration}
      />
    </FieldShell>
  );
}

export const HealthStep: React.FC<HealthStepProps> = ({ initialData }) => {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HealthFormData>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      bloodType: initialData?.bloodType || "",
      allergies: initialData?.allergies || "",
      medicalInfo: initialData?.medicalInfo || "",
      accessibilityNeeds: initialData?.accessibilityNeeds || "",
      healthConsent: initialData?.healthConsent || false,
    },
  });

  const [bloodType, allergies, medicalInfo, accessibilityNeeds] = watch([
    "bloodType",
    "allergies",
    "medicalInfo",
    "accessibilityNeeds",
  ]);

  const hasEnteredAnyHealth =
    (bloodType && bloodType !== "Don't know" && bloodType !== "") ||
    (allergies && allergies.trim().length > 0) ||
    (medicalInfo && medicalInfo.trim().length > 0) ||
    (accessibilityNeeds && accessibilityNeeds.trim().length > 0);

  const onSubmit = async (data: HealthFormData, event?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await saveStep("health", data, "Failed to save health information.");
      router.push(afterSaveHref(event, "/onboarding/employment"));
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <StepShell
      title={t("health.title")}
      subtitle={t("health.subtitle")}
      badge={
        <span className="rounded-full bg-fill px-2 py-0.5 text-caption font-medium text-label-2">
          {t("common.optional")}
        </span>
      }
      error={serverError}
    >
      <div className="mb-6 flex items-start gap-3 rounded-[18px] border border-tint/25 bg-tint/8 px-5 py-4 text-subhead text-label-2">
        <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-label" />
        <span>{language === "ar" ? "مشفّرة ولا تُعرض للموارد البشرية إلا لمساعدتك في العمل. يتم تسجيل كل مشاهدة." : "Encrypted, and only shown to HR if you need help at work. Every view is logged."}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="step-fields space-y-5">
        <div className="sm:max-w-[50%] sm:pe-2">
          <Select
            label={t("health.bloodType")}
            error={errors.bloodType?.message}
            {...register("bloodType")}
          >
            <option value="">{t("health.bloodUnknown")}</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>

        <TextArea
          count={(allergies || "").length}
          label={t("health.allergies")}
          placeholder={t("health.allergiesHint")}
          rows={2}
          maxLength={500}
          error={errors.allergies?.message}
          registration={register("allergies")}
        />

        <TextArea
          count={(medicalInfo || "").length}
          label={t("health.medicalInfo")}
          placeholder={t("health.medicalInfoHint")}
          rows={3}
          maxLength={1000}
          error={errors.medicalInfo?.message}
          registration={register("medicalInfo")}
        />

        <TextArea
          count={(accessibilityNeeds || "").length}
          label={t("health.accessibilityNeeds")}
          placeholder={t("health.accessibilityNeedsHint")}
          rows={3}
          maxLength={1000}
          error={errors.accessibilityNeeds?.message}
          registration={register("accessibilityNeeds")}
        />

        </div>

        {hasEnteredAnyHealth && (
          <div className={`animate-fade-in rounded-[20px] border ${watch("healthConsent") ? "border-tint/25" : "border-warning/40"}`}>
            <StepGroup title={t("health.consentTitle")}>
              {!watch("healthConsent") && <p className="text-xs text-[#FBBF24]">{language === "ar" ? "الموافقة مطلوبة لأنك أدخلت معلومات صحية." : "Required because you’ve filled in a health field."}</p>}
              <Checkbox
                isRequired
                label={t("health.consentCheckbox")}
                error={errors.healthConsent?.message}
                {...register("healthConsent")}
              />
            </StepGroup>
          </div>
        )}

        <StepFooter onBack={() => router.push("/onboarding/identification")} isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
};
