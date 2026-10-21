"use client";

import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { getAllCountries } from "@/lib/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { FieldShell, fieldClass } from "./Field";

interface CountrySelectProps {
  label?: string;
  value?: string;
  onChange: (code: string) => void;
  error?: string;
  isRequired?: boolean;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  label,
  value,
  onChange,
  error,
  isRequired,
}) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerId = useId();
  const listId = useId();

  const countries = useMemo(() => getAllCountries(language), [language]);

  const selectedCountry = useMemo(
    () => countries.find((c) => c.code === value),
    [countries, value]
  );

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const choose = (code: string) => {
    onChange(code);
    setIsOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  };

  const isAr = language === "ar";

  return (
    <FieldShell id={triggerId} label={label} isRequired={isRequired} error={error}>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listId}
          onClick={() => setIsOpen(!isOpen)}
          className={`${fieldClass(!!error)} flex items-center justify-between gap-2 text-start ${isOpen ? "bg-surface shadow-[inset_0_0_0_1px_var(--tint)] ring-4 ring-tint/15" : ""}`}
        >
          <span className={`truncate ${selectedCountry ? "text-label" : "text-label-3"}`}>
            {selectedCountry
              ? isAr
                ? selectedCountry.nameAr
                : selectedCountry.name
              : isAr
                ? "اختر الدولة"
                : "Select country"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 text-label-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-full min-w-[16rem] origin-top animate-pop-in overflow-hidden rounded-[14px] bg-surface shadow-pop">
            <div className="p-2">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-4 w-4 text-label-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isAr ? "بحث" : "Search"}
                  aria-label={isAr ? "ابحث عن الدولة" : "Search countries"}
                  className="h-9 w-full rounded-[9px] bg-fill ps-8 pe-3 text-subhead text-label outline-none placeholder:text-label-3"
                  autoFocus
                />
              </div>
            </div>
            <ul id={listId} role="listbox" aria-labelledby={triggerId} className="max-h-64 overflow-y-auto overscroll-contain px-1.5 pb-1.5">
              {filteredCountries.length === 0 ? (
                <li className="px-3 py-6 text-center text-footnote text-label-2">
                  {isAr ? "لا توجد نتائج" : "No countries found"}
                </li>
              ) : (
                filteredCountries.map((c) => {
                  const isSelected = c.code === value;
                  return (
                    <li key={c.code} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => choose(c.code)}
                        className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-start text-subhead transition-colors hover:bg-fill focus-visible:bg-fill focus-visible:outline-none ${
                          isSelected ? "font-semibold text-tint" : "text-label"
                        }`}
                      >
                        <span className="flex-1 truncate">{isAr ? c.nameAr : c.name}</span>
                        {isSelected && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </FieldShell>
  );
};
