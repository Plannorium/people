"use client";
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return <button type="button" onClick={() => setLanguage(language === "en" ? "ar" : "en")} aria-label={language === "en" ? "العربية" : "English"} className="pressable flex h-11 min-w-11 items-center justify-center rounded-lg border border-separator px-3 text-xs font-bold text-label-2 hover:bg-fill hover:text-label">{language === "en" ? "AR" : "EN"}</button>;
}
