"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations } from "@/lib/translations";

export type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("en"); // "en" on the server and first paint

  const applyDocumentLanguage = (lang: Language) => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  // After hydration, switch to the saved or browser language (localStorage isn't available on the server)
  useEffect(() => {
    let saved: Language | null = null;
    try {
      saved = localStorage.getItem("plannorium-people-lang") as Language | null;
    } catch {
      // localStorage may fail in private mode
    }
    const browserLang = navigator.language.split("-")[0] as Language;
    const initial: Language = saved === "en" || saved === "ar" ? saved : browserLang === "ar" ? "ar" : "en";
    applyDocumentLanguage(initial);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    setLanguageState(initial);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("plannorium-people-lang", lang);
    } catch {
      // localStorage may fail in private mode
    }
    applyDocumentLanguage(lang);
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split(".");
    let value: any = translations[language];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== "string") {
      // Fallback to English if translation is missing
      let fallback: any = translations.en;
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      value = typeof fallback === "string" ? fallback : key;
    }

    if (replacements) {
      for (const [rKey, rVal] of Object.entries(replacements)) {
        value = value.replace(new RegExp(`\\{${rKey}\\}`, "g"), String(rVal));
      }
    }

    return value;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        isRtl: language === "ar",
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
