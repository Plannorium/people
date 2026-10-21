"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/Field";
import { Banner, PageHeader } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

interface SettingsClientProps {
  initialSettings: {
    reviewIntervalMonths: number;
    retentionPeriodYears: number;
    hrEmail: string;
  };
  allowedEmailDomain: string;
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-footnote font-semibold text-label-2">{title}</h2>
      <div className="divide-y divide-separator overflow-hidden rounded-[18px] bg-surface shadow-card">{children}</div>
    </section>
  );
}

/** Label and explanation on the left, control on the right. */
function SettingRow({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="text-subhead font-medium text-label">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-footnote text-label-2">{hint}</p>}
      </div>
      <div>
        {children}
        {error && (
          <p role="alert" className="mt-1.5 text-footnote text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function NumberField({
  id,
  value,
  min,
  max,
  unit,
  invalid,
  onChange,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  invalid?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${fieldClass(invalid)} h-10 min-h-0 py-0 pe-16 tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-footnote text-label-2">{unit}</span>
    </div>
  );
}

export const SettingsClient: React.FC<SettingsClientProps> = ({ initialSettings, allowedEmailDomain }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const issues = (data.issues || []) as Array<{ path: string[]; message: string }>;
        setFieldErrors(Object.fromEntries(issues.map((i) => [i.path[0], i.message])));
        throw new Error(data.error || "Couldn't save settings.");
      }
      setFeedback({ tone: "success", text: "Settings saved and recorded in the audit log." });
    } catch (err) {
      setFeedback({ tone: "danger", text: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="Owner only" title={t("admin.settings.title")} subtitle={t("admin.settings.subtitle")} />

      {feedback && <Banner tone={feedback.tone}>{feedback.text}</Banner>}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <SettingsGroup title="Review & retention">
          <SettingRow
            id="reviewIntervalMonths"
            label={t("admin.settings.reviewInterval")}
            hint="Complete profiles are flagged for review after this long."
            error={fieldErrors.reviewIntervalMonths}
          >
            <NumberField
              id="reviewIntervalMonths"
              value={form.reviewIntervalMonths}
              min={1}
              max={24}
              unit="months"
              invalid={!!fieldErrors.reviewIntervalMonths}
              onChange={(v) => setForm({ ...form, reviewIntervalMonths: v })}
            />
          </SettingRow>
          <SettingRow
            id="retentionPeriodYears"
            label={t("admin.settings.retentionPeriod")}
            hint="After offboarding, ID documents and health notes are deleted after this long."
            error={fieldErrors.retentionPeriodYears}
          >
            <NumberField
              id="retentionPeriodYears"
              value={form.retentionPeriodYears}
              min={1}
              max={10}
              unit="years"
              invalid={!!fieldErrors.retentionPeriodYears}
              onChange={(v) => setForm({ ...form, retentionPeriodYears: v })}
            />
          </SettingRow>
        </SettingsGroup>

        <SettingsGroup title="Contact & access">
          <SettingRow
            id="hrEmail"
            label={t("admin.settings.hrEmail")}
            hint="Shown to staff who need to report a problem with their employment details."
            error={fieldErrors.hrEmail}
          >
            <input
              id="hrEmail"
              type="email"
              dir="ltr"
              value={form.hrEmail}
              onChange={(e) => setForm({ ...form, hrEmail: e.target.value })}
              aria-invalid={fieldErrors.hrEmail ? true : undefined}
              className={`${fieldClass(!!fieldErrors.hrEmail)} h-10 min-h-0 py-0 text-start`}
            />
          </SettingRow>
          <SettingRow
            id="allowedDomain"
            label={t("admin.settings.allowedDomain")}
            hint="Set by ALLOWED_EMAIL_DOMAIN in the environment, so it can't be changed here."
          >
            <p id="allowedDomain" className="flex h-10 items-center text-subhead text-label-2 sm:justify-end" dir="ltr">
              @{allowedEmailDomain}
            </p>
          </SettingRow>
        </SettingsGroup>

        <div className="flex justify-end">
          <Button type="submit" isLoading={isSaving}>
            {t("admin.settings.saveSettings")}
          </Button>
        </div>
      </form>
    </div>
  );
};
