"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalSchema, PersonalFormData } from "@/lib/validation/personal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { useLanguage } from "@/contexts/LanguageContext";
import { StepShell, StepFooter, saveStep, afterSaveHref } from "./StepLayout";

interface PersonalStepProps {
  initialData?: Partial<PersonalFormData>;
  workEmail: string;
}

/** Comma-separated text box backed by the nationalities array. */
function NationalitiesInput({
  value,
  onChange,
  label,
  error,
}: {
  value: string[] | undefined;
  onChange: (next: string[]) => void;
  label: string;
  error?: string;
}) {
  const [text, setText] = useState(() => (value || []).join(", "));
  return (
    <Input
      label={label}
      hint="Separate several with commas"
      error={error}
      placeholder="British, Saudi"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }}
    />
  );
}

export const PersonalStep: React.FC<PersonalStepProps> = ({ initialData, workEmail }) => {
  const router = useRouter();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PersonalFormData>({
    resolver: zodResolver(personalSchema),
    defaultValues: {
      legalFirstName: initialData?.legalFirstName || "",
      legalLastName: initialData?.legalLastName || "",
      preferredName: initialData?.preferredName || "",
      pronouns: initialData?.pronouns || "",
      workEmail: workEmail || initialData?.workEmail || "",
      personalEmail: initialData?.personalEmail || "",
      mobileE164: initialData?.mobileE164 || "",
      altPhoneE164: initialData?.altPhoneE164 || "",
      nationalities: initialData?.nationalities || [],
      preferredLanguage: initialData?.preferredLanguage || "English",
    },
  });

  const onSubmit = async (data: PersonalFormData, event?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      await saveStep("personal", data, "Failed to save personal details.");
      router.push(afterSaveHref(event, "/onboarding/location"));
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <StepShell title={t("personal.title")} subtitle={t("personal.subtitle")} error={serverError}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("personal.legalFirstName")}
            isRequired
            autoComplete="given-name"
            error={errors.legalFirstName?.message}
            {...register("legalFirstName")}
          />
          <Input
            label={t("personal.legalLastName")}
            isRequired
            autoComplete="family-name"
            error={errors.legalLastName?.message}
            {...register("legalLastName")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("personal.preferredName")}
            hint={t("personal.preferredNameHint")}
            autoComplete="nickname"
            error={errors.preferredName?.message}
            {...register("preferredName")}
          />

          <Select
            label={t("personal.pronouns")}
            error={errors.pronouns?.message}
            {...register("pronouns")}
          >
            <option value="">{t("personal.pronounsSelect")}</option>
            <option value="she/her">{t("personal.sheHer")}</option>
            <option value="he/him">{t("personal.heHim")}</option>
            <option value="they/them">{t("personal.theyThem")}</option>
            <option value="prefer to self-describe">{t("personal.selfDescribe")}</option>
            <option value="prefer not to say">{t("personal.preferNotToSay")}</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t("personal.workEmail")}
            value={workEmail}
            disabled
            readOnly
            ltr
            hint={t("personal.workEmailHint")}
          />

          <Input
            label={t("personal.personalEmail")}
            isRequired
            ltr
            type="email"
            autoComplete="email"
            hint={t("personal.personalEmailHint")}
            error={errors.personalEmail?.message}
            {...register("personalEmail")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="mobileE164"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label={t("personal.mobilePhone")}
                isRequired
                hint={t("personal.mobilePhoneHint")}
                value={field.value}
                onChange={field.onChange}
                error={errors.mobileE164?.message}
              />
            )}
          />

          <Controller
            name="altPhoneE164"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label={t("personal.altPhone")}
                value={field.value}
                onChange={field.onChange}
                error={errors.altPhoneE164?.message}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t("personal.preferredLanguage")}
            error={errors.preferredLanguage?.message}
            {...register("preferredLanguage")}
          >
            <option value="English">English</option>
            <option value="Arabic">العربية (Arabic)</option>
            <option value="Other">Other</option>
          </Select>

          <Controller
            name="nationalities"
            control={control}
            render={({ field }) => (
              <NationalitiesInput
                label={t("personal.nationality")}
                value={field.value}
                onChange={field.onChange}
                error={errors.nationalities?.message}
              />
            )}
          />
        </div>

        <StepFooter isSubmitting={isSubmitting} note={t("onboarding.savedNotice")} />
      </form>
    </StepShell>
  );
};
