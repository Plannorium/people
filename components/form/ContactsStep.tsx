"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactsSchema, ContactsFormData, LEGACY_NEXT_OF_KIN } from "@/lib/validation/contacts";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2 } from "lucide-react";
import { StepShell, StepFooter, StepGroup, saveStep, afterSaveHref } from "./StepLayout";

interface ContactsStepProps {
  initialData?: Partial<ContactsFormData>;
}

const RELATIONSHIPS = [
  { value: "Spouse / Partner", key: "contacts.spouse" },
  { value: "Parent", key: "contacts.parent" },
  { value: "Sibling", key: "contacts.sibling" },
  { value: "Child", key: "contacts.child" },
  { value: "Relative", key: "contacts.relative" },
  { value: "Friend", key: "contacts.friend" },
  { value: "Other", key: "contacts.other" },
];

export const ContactsStep: React.FC<ContactsStepProps> = ({ initialData }) => {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Older records stored next of kin as the relationship: turn it into the flag and ask for the real relationship
  const defaultContacts = initialData?.emergencyContacts?.length
    ? initialData.emergencyContacts.map((c) =>
        c.relationship === LEGACY_NEXT_OF_KIN
          ? { ...c, relationship: "", isNextOfKin: true }
          : { ...c, isNextOfKin: Boolean(c.isNextOfKin) }
      )
    : [
        {
          fullName: "",
          relationship: "Spouse / Partner",
          phoneE164: "",
          altPhoneE164: "",
          email: "",
          countryCode: "GB",
          city: "",
          speaks: "English",
          priority: 1,
          isNextOfKin: false,
        },
      ];

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<ContactsFormData>({
    resolver: zodResolver(contactsSchema),
    defaultValues: {
      emergencyContacts: defaultContacts,
      emergencyContactsConfirmed: initialData?.emergencyContactsConfirmed || false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emergencyContacts",
  });

  const onSubmit = async (data: ContactsFormData, event?: React.BaseSyntheticEvent) => {
    setIsSubmitting(true);
    setServerError(null);

    try {
      // Priority follows the order on screen
      const ordered = {
        ...data,
        emergencyContacts: data.emergencyContacts.map((c, i) => ({ ...c, priority: i + 1 })),
      };
      await saveStep("contacts", ordered, "Failed to save emergency contacts.");
      router.push(afterSaveHref(event, "/onboarding/identification"));
    } catch (err) {
      setServerError((err as Error).message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <StepShell title={t("contacts.title")} subtitle={t("contacts.subtitle")} error={serverError}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {fields.map((fieldItem, index) => {
          const err = errors.emergencyContacts?.[index];

          return (
            <StepGroup
              key={fieldItem.id}
              title={<span className="flex items-center gap-3"><span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-tint text-sm font-bold text-canvas">{index + 1}</span>{index === 0 ? (language === "ar" ? "جهة الاتصال الأساسية" : "Primary contact") : t("contacts.contactNum", { num: index + 1 })}</span>}
              action={
                fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="pressable flex min-h-11 items-center gap-1.5 rounded-full px-3 text-footnote font-medium text-danger hover:bg-danger/10"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    <span>{t("contacts.removeContact")}</span>
                  </button>
                )
              }
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label={t("contacts.fullName")}
                  isRequired
                  error={err?.fullName?.message}
                  {...register(`emergencyContacts.${index}.fullName` as const)}
                />

                <Select
                  label={t("contacts.relationship")}
                  isRequired
                  error={err?.relationship?.message}
                  {...register(`emergencyContacts.${index}.relationship` as const)}
                >
                  <option value="" disabled>
                    {t("contacts.selectRelationship")}
                  </option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.key)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-5">
                <Controller
                  name={`emergencyContacts.${index}.phoneE164` as const}
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      label={t("contacts.phone")}
                      isRequired
                      value={field.value}
                      onChange={field.onChange}
                      error={err?.phoneE164?.message}
                    />
                  )}
                />

                <Controller
                  name={`emergencyContacts.${index}.altPhoneE164` as const}
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      label={t("contacts.altPhone")}
                      value={field.value}
                      onChange={field.onChange}
                      error={err?.altPhoneE164?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input
                  label={t("contacts.email")}
                  type="email"
                  dir="ltr"
                  placeholder="contact@example.com"
                  error={err?.email?.message}
                  {...register(`emergencyContacts.${index}.email` as const)}
                />

                <Input
                  label={t("contacts.speaks")}
                  error={err?.speaks?.message}
                  placeholder="English, Arabic"
                  {...register(`emergencyContacts.${index}.speaks` as const)}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Controller
                  name={`emergencyContacts.${index}.countryCode` as const}
                  control={control}
                  render={({ field }) => (
                    <CountrySelect
                      label={t("contacts.country")}
                      isRequired
                      value={field.value}
                      onChange={field.onChange}
                      error={err?.countryCode?.message}
                    />
                  )}
                />

                <Input
                  label={t("contacts.city")}
                  isRequired
                  error={err?.city?.message}
                  {...register(`emergencyContacts.${index}.city` as const)}
                />
              </div>

              <Controller
                name={`emergencyContacts.${index}.isNextOfKin` as const}
                control={control}
                render={({ field }) => (
                  <div>
                    <Checkbox
                      label={t("contacts.nextOfKinCheckbox")}
                      checked={!!field.value}
                      onBlur={field.onBlur}
                      error={err?.isNextOfKin?.message}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        // Only one next of kin: choosing this contact clears the others
                        if (checked) {
                          getValues("emergencyContacts").forEach((_, other) => {
                            if (other !== index) setValue(`emergencyContacts.${other}.isNextOfKin`, false);
                          });
                        }
                        field.onChange(checked);
                      }}
                    />
                    <p className="mt-1 ps-8.5 text-footnote text-label-2">{t("contacts.nextOfKinHint")}</p>
                  </div>
                )}
              />
            </StepGroup>
          );
        })}

        {fields.length < 3 && (
          <div className="contact-add-panel rounded-[28px] p-6">
          <h2 className="text-lg font-semibold text-label">{language === "ar" ? "شخص آخر للتواصل معه" : "Another person to reach"}</h2>
          <p className="mt-2 mb-4 text-sm leading-relaxed text-label-2">{language === "ar" ? "جهة اتصال إضافية تساعد الموارد البشرية إذا تعذّر الوصول إلى الشخص الأول." : "An additional contact helps HR if the first person is unreachable."}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              append({
                fullName: "",
                relationship: "Parent",
                phoneE164: "",
                altPhoneE164: "",
                email: "",
                countryCode: "GB",
                city: "",
                speaks: "English",
                priority: fields.length + 1,
                isNextOfKin: false,
              })
            }
            className="!border-tint/40 !bg-tint/12 !text-brand-light"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            <span>{fields.length === 1 ? t("contacts.addContact") : "Add another contact"}</span>
          </Button>
          </div>
        )}

        <div className="rounded-[20px] border border-separator bg-surface p-5">
          <Checkbox
            isRequired
            label={t("contacts.confirmNotice")}
            error={errors.emergencyContactsConfirmed?.message}
            {...register("emergencyContactsConfirmed")}
          />
        </div>

        <StepFooter onBack={() => router.push("/onboarding/location")} isSubmitting={isSubmitting} />
      </form>
    </StepShell>
  );
};
