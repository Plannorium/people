"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/ui/Layout";

export default function PrivacyPage() {
  const { t } = useLanguage();

  const sections = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`privacy.section${n}Title`),
    body: t(`privacy.section${n}Body`),
  }));

  return (
    <div className="mx-auto max-w-[720px] space-y-8 animate-rise-in">
      <PageHeader
        eyebrow={t("privacy.lastUpdated")}
        title={t("privacy.title")}
        subtitle={t("privacy.summary")}
      />

      <article className="divide-y divide-separator rounded-[28px] bg-surface px-6 shadow-card sm:px-9">
        {sections.map((section) => (
          <section key={section.title} className="py-7">
            <h2 className="text-title3 font-semibold text-label">{section.title}</h2>
            <p className="mt-2.5 text-body leading-relaxed text-label-2">{section.body}</p>
          </section>
        ))}
      </article>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] bg-surface p-5 shadow-card">
          <p className="text-footnote font-semibold text-label-2">Data controller</p>
          <p className="mt-1.5 text-subhead text-label">
            Plannorium Ltd
            <br />
            71-75 Shelton Street, Covent Garden
            <br />
            London WC2H 9JQ, United Kingdom
          </p>
        </div>

        <div className="rounded-[24px] bg-surface p-5 shadow-card">
          <p className="text-footnote font-semibold text-label-2">Questions or requests</p>
          <p className="mt-1.5 text-subhead text-label">
            To see, correct or export your data, email{" "}
            <a href="mailto:privacy@plannorium.com" className="font-medium text-tint hover:underline">
              privacy@plannorium.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
