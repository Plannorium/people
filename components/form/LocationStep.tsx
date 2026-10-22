"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, LocationFormData } from "@/lib/validation/location";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTimezonesForCountry, isPostalCodeRequired } from "@/lib/countries";
import { StepShell, StepFooter, saveStep, afterSaveHref } from "./StepLayout";

interface LocationStepProps {
  initialData?: Partial<LocationFormData>;
}

export const LocationStep: React.FC<LocationStepProps> = ({ initialData }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      countryCode: initialData?.countryCode || "GB",
      region: initialData?.region || "",
      city: initialData?.city || "",
      addressLine1: initialData?.addressLine1 || "",
      addressLine2: initialData?.addressLine2 || "",
      postalCode: initialData?.postalCode || "",
      timeZone: initialData?.timeZone || "Europe/London",
      workArrangement: initialData?.workArrangement || "Remote",
      officeLocation: initialData?.officeLocation || "",
    },
  });

  const selectedCountry = watch("countryCode");
  const selectedArrangement = watch("workArrangement");
  const postalRequired = isPostalCodeRequired(selectedCountry);
  const officeRequired = selectedArrangement === "Office" || selectedArrangement === "Hybrid";

  // Keep the time zone valid for the chosen country
  const availableTimezones = useMemo(() => getTimezonesForCountry(selectedCountry), [selectedCountry]);
  useEffect(() => {
    if (availableTimezones.length > 0 && !availableTimezones.includes(getValues("timeZone"))) {
      setValue("timeZone", availableTimezones[0]);
    }
  }, [availableTimezones, getValues, setValue]);

  const onSubmit = async (data: LocationFormData, event?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await saveStep("location", data, "Failed to save location details.");
      router.push(afterSaveHref(event, "/onboarding/contacts"));
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <StepShell title={t("location.title")} subtitle={t("location.subtitle")} error={serverError}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="step-fields space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Controller
            name="countryCode"
            control={control}
            render={({ field }) => (
              <CountrySelect
                label={t("location.country")}
                isRequired
                value={field.value}
                onChange={field.onChange}
                error={errors.countryCode?.message}
              />
            )}
          />

          <Input
            label={t("location.region")}
            isRequired
            autoComplete="address-level1"
            error={errors.region?.message}
            placeholder="Greater London"
            {...register("region")}
          />
        </div>

        <Input
          label={t("location.address1")}
          isRequired
          autoComplete="address-line1"
          error={errors.addressLine1?.message}
          placeholder="Street and building number"
          {...register("addressLine1")}
        />

        <Input
          label={t("location.address2")}
          autoComplete="address-line2"
          error={errors.addressLine2?.message}
          placeholder="Apartment, suite, unit"
          {...register("addressLine2")}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label={t("location.city")}
            isRequired
            autoComplete="address-level2"
            error={errors.city?.message}
            {...register("city")}
          />

          <Input
            label={t("location.postalCode")}
            isRequired={postalRequired}
            autoComplete="postal-code"
            error={errors.postalCode?.message}
            ltr
            placeholder={postalRequired ? "" : t("common.optional")}
            {...register("postalCode")}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label={t("location.timeZone")}
            dir="ltr"
            isRequired
            error={errors.timeZone?.message}
            {...register("timeZone")}
          >
            {availableTimezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </Select>

          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-footnote font-medium">{t("location.workArrangement")} <span className="text-tint" aria-hidden="true">*</span></legend>
            <div className="grid min-h-[46px] grid-cols-3 gap-1 rounded-xl border border-white/12 bg-canvas p-1">
              {(["Remote", "Hybrid", "Office"] as const).map((value) => (
                <label key={value} className="cursor-pointer">
                  <input type="radio" value={value} {...register("workArrangement")} className="peer sr-only" />
                  <span className="flex min-h-9 items-center justify-center rounded-lg px-2 text-footnote text-label-2 peer-checked:bg-tint/15 peer-checked:text-tint peer-focus-visible:ring-2 peer-focus-visible:ring-tint">{t(`location.${value.toLowerCase()}`)}</span>
                </label>
              ))}
            </div>
            {errors.workArrangement && <p role="alert" className="mt-1.5 text-footnote text-[#F87171]">{errors.workArrangement.message}</p>}
          </fieldset>
        </div>

        {officeRequired && (
          <div className="animate-fade-in">
            <Select
              label={t("location.officeLocation")}
              isRequired
              error={errors.officeLocation?.message}
              {...register("officeLocation")}
            >
              <option value="">Select office</option>
              <option value="London">{t("location.london")}</option>
              <option value="Riyadh">{t("location.riyadh")}</option>
              <option value="Abuja">{t("location.abuja")}</option>
              <option value="Other">{t("location.otherOffice")}</option>
            </Select>
          </div>
        )}

        </div>

        <StepFooter onBack={() => router.push("/onboarding/personal")} isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
};
