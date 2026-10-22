"use client";

import React, { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

/** Card, title and error banner shared by every onboarding step. */
export function StepShell({
  title,
  subtitle,
  badge,
  error,
  width = "max-w-none",
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  error?: string | null;
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto min-w-0 w-full ${width} animate-rise-in`}>
      <div>
        <div className="mb-7">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title1 font-bold text-label sm:text-large">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-3 text-subhead leading-relaxed text-label-2">{subtitle}</p>}
        </div>
        {error && (
          <div className="mb-6">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Back / Next row at the foot of a step. */
export function StepFooter({
  onBack,
  nextLabel,
  nextIcon,
  isSubmitting,
  onNext,
  note,
  nextDisabled,
}: {
  onBack?: () => void;
  nextLabel?: ReactNode;
  nextIcon?: ReactNode;
  isSubmitting?: boolean;
  /** Without onNext the button submits the surrounding form. */
  onNext?: () => void;
  note?: ReactNode;
  nextDisabled?: boolean;
}) {
  const { t, isRtl, language } = useLanguage();
  return (
    <div className="mt-7 flex flex-col-reverse items-stretch justify-between gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
      {onBack ? (
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          <span>{t("common.back")}</span>
        </Button>
      ) : (
        <p className="hidden text-footnote text-label-2 sm:block">{note}</p>
      )}
      <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
      {!onNext && (
        // Same submit, but returns to My Details afterwards (see afterSaveHref)
        <Button type="submit" name="intent" value="later" variant="ghost" disabled={isSubmitting} className="step-save-later">
          {language === "ar" ? "حفظ والإكمال لاحقًا" : "Save & finish later"}
        </Button>
      )}
      <Button
        type={onNext ? "button" : "submit"}
        onClick={onNext}
        isLoading={isSubmitting}
        disabled={nextDisabled}
        className="w-full sm:w-auto"
      >
        {nextIcon}
        <span>{nextLabel || (language === "ar" ? "حفظ ومتابعة" : "Save and continue")}</span>
        {!nextIcon && <ArrowRight aria-hidden="true" className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />}
      </Button>
      </div>
    </div>
  );
}

/** Small grouped block inside a step, e.g. one emergency contact. */
export function StepGroup({
  title,
  action,
  children,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="brand-edge rounded-[28px] bg-surface p-5 shadow-card sm:p-7">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-title3 font-semibold text-label">{title}</h2>}
          {action}
        </div>
      )}
      <div className="space-y-5">{children}</div>
    </div>
  );
}

export async function saveStep(step: string, data: unknown, fallbackError: string): Promise<void> {
  const res = await fetch("/api/employee/save-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || fallbackError);
  }
}

/** Where to go after a step saves: My Details for "Save & finish later", otherwise the next step. */
export function afterSaveHref(event: React.BaseSyntheticEvent | undefined, next: string): string {
  const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter;
  return submitter?.getAttribute("value") === "later" ? "/me" : next;
}
