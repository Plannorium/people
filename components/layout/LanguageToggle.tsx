"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const OPTIONS = [
  { value: "en", label: "EN", name: "English" },
  { value: "ar", label: "عربي", name: "العربية" },
] as const;

/** Segmented control for the interface language. */
export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div role="group" aria-label="Language" className="flex h-8 items-center rounded-[9px] bg-fill p-0.5">
      {OPTIONS.map((opt) => {
        const isActive = language === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLanguage(opt.value)}
            aria-pressed={isActive}
            aria-label={opt.name}
            className={`h-7 min-w-10 rounded-[7px] px-2.5 text-footnote font-semibold transition-[background-color,color,box-shadow] duration-200 ${
              isActive ? "bg-surface text-label shadow-thumb" : "text-label-2 hover:text-label"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
