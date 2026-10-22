"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Banner } from "./Layout";
import { REQUIRED_STEPS, STEP_LABELS, type RequiredStep } from "@/lib/onboarding";

export const STEPS = [
  { id: "personal", num: 1, labelKey: "onboarding.steps.personal" },
  { id: "location", num: 2, labelKey: "onboarding.steps.location" },
  { id: "contacts", num: 3, labelKey: "onboarding.steps.contacts" },
  { id: "identification", num: 4, labelKey: "onboarding.steps.identification" },
  { id: "health", num: 5, labelKey: "onboarding.steps.health" },
  { id: "employment", num: 6, labelKey: "onboarding.steps.employment" },
  { id: "review", num: 7, labelKey: "onboarding.steps.review" },
];

function isRequired(id: string): id is RequiredStep {
  return (REQUIRED_STEPS as readonly string[]).includes(id);
}

export const ProgressSteps: React.FC<{ completion: Record<RequiredStep, boolean> }> = ({ completion }) => {
  const pathname = usePathname();
  const { t, language } = useLanguage();

  const currentStepSlug = pathname?.split("/").pop() || "personal";
  const currentIndex = STEPS.findIndex((s) => s.id === currentStepSlug);
  const activeStep = currentIndex >= 0 ? currentIndex : 0;
  const percent = ((activeStep + 1) / STEPS.length) * 100;

  const doneCount = REQUIRED_STEPS.filter((s) => completion[s]).length;
  const allDone = doneCount === REQUIRED_STEPS.length;
  // Required sections the person has moved past without finishing
  const skipped = STEPS.slice(0, activeStep)
    .map((s) => s.id)
    .filter((id): id is RequiredStep => isRequired(id) && !completion[id]);
  const isReview = STEPS[activeStep].id === "review";
  const outstanding = isReview ? REQUIRED_STEPS.filter((s) => !completion[s]) : skipped;

  return (
    <div className="w-full min-w-0 self-start min-[860px]:sticky min-[860px]:top-24">
      <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-tint">{language === "ar" ? "بياناتك" : "Your details"}</p>
      <div className="mb-3 flex flex-col gap-2 text-footnote">
        <span className="font-medium text-label-2">
          {t("onboarding.progress", { current: activeStep + 1, total: STEPS.length })}
        </span>
        <span className="min-[860px]:hidden">{t(STEPS[activeStep].labelKey)}</span>
        <span className={allDone ? "font-semibold text-success" : "text-label-2"}>
          {allDone ? (language === "ar" ? "اكتملت جميع الأقسام المطلوبة" : "All required sections done") : (language === "ar" ? `اكتمل ${doneCount} من ${REQUIRED_STEPS.length} أقسام مطلوبة` : `${doneCount} of ${REQUIRED_STEPS.length} required sections done`)}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-fill"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={activeStep + 1}
      >
        <div
          className="h-full rounded-full bg-tint transition-[width] duration-500 ease-out-quint"
          style={{ width: `${percent}%` }}
        />
      </div>

      <nav aria-label="Onboarding steps" className="mt-6 hidden min-[860px]:block">
        <ol className="flex flex-col gap-2">
          {STEPS.map((step, idx) => {
            const isCurrent = idx === activeStep;
            const required = isRequired(step.id);
            const isDone = required ? completion[step.id as RequiredStep] : idx < activeStep;
            const isSkipped = required && !isDone && idx < activeStep;

            return (
              <li key={step.id}>
                <Link
                  href={`/onboarding/${step.id}`}
                  aria-current={isCurrent ? "step" : undefined}
                  title={isSkipped ? "Not completed yet" : undefined}
                  className={`pressable flex min-h-[52px] items-center gap-3 rounded-[14px] px-3 text-sm transition-colors ${
                    isCurrent
                      ? "bg-tint/10 font-semibold text-tint"
                      : isDone || isSkipped
                        ? "text-label hover:bg-fill"
                        : "text-label-2 hover:bg-fill hover:text-label"
                  }`}
                >
                  <span aria-hidden="true" className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-xs ${isCurrent ? "bg-tint text-canvas" : isDone ? "bg-tint/15 text-tint" : "border border-separator text-label-2"}`}>
                    {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.num}
                  </span>
                  {isSkipped && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />}
                  <span className="flex-1">{t(step.labelKey)}</span>
                  {step.id === "health" && <span className="rounded-md bg-fill px-1.5 py-0.5 text-[10px] font-normal text-label-2">{t("common.optional")}</span>}
                  {isSkipped && <span className="sr-only">(not completed)</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      {outstanding.length > 0 && (
        <div className="mt-4">
          <Banner tone="warning" title={isReview ? "A few sections still need finishing" : "You skipped ahead"}>
            {isReview ? "You can submit once these are done: " : "Not completed yet: "}
            {outstanding.map((step, i) => (
              <React.Fragment key={step}>
                {i > 0 && ", "}
                <Link href={`/onboarding/${step}`} className="font-medium text-tint hover:underline">
                  {STEP_LABELS[step]}
                </Link>
              </React.Fragment>
            ))}
            . Everything you&rsquo;ve saved is kept, so you can come back any time.
          </Banner>
        </div>
      )}
    </div>
  );
};
