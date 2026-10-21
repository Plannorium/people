"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { identificationSchema, IdentificationFormData } from "@/lib/validation/identification";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { DateInput } from "@/components/ui/DateInput";
import { FileUpload } from "@/components/ui/FileUpload";
import { useLanguage } from "@/contexts/LanguageContext";
import { StepShell, StepFooter, StepGroup, saveStep, afterSaveHref } from "./StepLayout";

interface IdentificationStepProps {
  initialData?: Partial<IdentificationFormData>;
  residenceCountryCode?: string;
}

export const IdentificationStep: React.FC<IdentificationStepProps> = ({
  initialData,
  residenceCountryCode = "GB",
}) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<IdentificationFormData>({
    resolver: zodResolver(identificationSchema),
    defaultValues: {
      documentType: initialData?.documentType || "Passport",
      documentNumber: initialData?.documentNumber || "",
      issuingCountry: initialData?.issuingCountry || "GB",
      expiryDate: initialData?.expiryDate ? new Date(initialData.expiryDate).toISOString().split("T")[0] : "",
      frontFileKey: initialData?.frontFileKey || "",
      backFileKey: initialData?.backFileKey || "",
      ukRightToWork: initialData?.ukRightToWork || "",
      visaExpiry: initialData?.visaExpiry ? new Date(initialData.visaExpiry).toISOString().split("T")[0] : "",
      residenceCountryCode,
    },
  });

  const selectedExpiry = watch("expiryDate");
  const selectedRtw = watch("ukRightToWork");
  const isUkResident = residenceCountryCode === "GB";

  // Warn when the document expires within 60 days
  let expiryWarning: string | undefined = undefined;
  if (selectedExpiry) {
    const diffDays = Math.ceil((new Date(selectedExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 60) {
      expiryWarning = t("identification.expiryWarning");
    }
  }

  const onSubmit = async (data: IdentificationFormData, event?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await saveStep("identification", data, "Failed to save identification details.");
      router.push(afterSaveHref(event, "/onboarding/health"));
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <StepShell title={t("identification.title")} subtitle={t("identification.subtitle")} error={serverError}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t("identification.documentType")}
            isRequired
            error={errors.documentType?.message}
            {...register("documentType")}
          >
            <option value="Passport">{t("identification.passport")}</option>
            <option value="National ID card">{t("identification.nationalId")}</option>
            <option value="Driving licence">{t("identification.drivingLicence")}</option>
            <option value="Residence permit / BRP">{t("identification.residencePermit")}</option>
            <option value="Other">{t("identification.otherDoc")}</option>
          </Select>

          <Input
            label={t("identification.documentNumber")}
            isRequired
            ltr
            autoComplete="off"
            spellCheck={false}
            error={errors.documentNumber?.message}
            {...register("documentNumber")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="issuingCountry"
            control={control}
            render={({ field }) => (
              <CountrySelect
                label={t("identification.issuingCountry")}
                isRequired
                value={field.value}
                onChange={field.onChange}
                error={errors.issuingCountry?.message}
              />
            )}
          />

          <DateInput
            label={t("identification.expiryDate")}
            isRequired
            warning={expiryWarning}
            error={errors.expiryDate?.message}
            {...register("expiryDate")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="frontFileKey"
            control={control}
            render={({ field }) => (
              <FileUpload
                label={t("identification.frontUpload")}
                hint={t("identification.frontUploadHint")}
                isRequired
                value={field.value}
                onChange={field.onChange}
                error={errors.frontFileKey?.message}
              />
            )}
          />

          <Controller
            name="backFileKey"
            control={control}
            render={({ field }) => (
              <FileUpload
                label={t("identification.backUpload")}
                hint="If your document has details on the back"
                value={field.value}
                onChange={field.onChange}
                error={errors.backFileKey?.message}
              />
            )}
          />
        </div>

        {isUkResident && (
          <StepGroup title="UK right to work">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label={t("identification.ukRightToWork")}
                isRequired
                error={errors.ukRightToWork?.message}
                {...register("ukRightToWork")}
              >
                <option value="">Select status</option>
                <option value="British / Irish citizen">{t("identification.britishIrish")}</option>
                <option value="Settled / Pre-settled status">{t("identification.settledStatus")}</option>
                <option value="Visa">{t("identification.visa")}</option>
                <option value="Other">{t("identification.otherRtw")}</option>
              </Select>

              {selectedRtw === "Visa" && (
                <div className="animate-fade-in">
                  <DateInput
                    label={t("identification.visaExpiry")}
                    isRequired
                    error={errors.visaExpiry?.message}
                    {...register("visaExpiry")}
                  />
                </div>
              )}
            </div>
          </StepGroup>
        )}

        <StepFooter onBack={() => router.push("/onboarding/contacts")} isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
};
