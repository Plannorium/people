"use client";

import React, { useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { getAllCountries } from "@/lib/countries";
import { useLanguage } from "@/contexts/LanguageContext";
import { FieldShell, fieldClass } from "./Field";

interface PhoneInputProps {
  label?: string;
  value?: string;
  onChange: (e164Value: string) => void;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  /** Country preselected for an empty field, e.g. the employee's country of residence. */
  defaultCountry?: string;
}

/** Splits a stored E.164 value into the country and the number typed after the dial code. */
function splitValue(value: string, fallbackCountry: CountryCode): { country: CountryCode; local: string } {
  if (value.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(value);
    if (parsed?.country) return { country: parsed.country, local: parsed.nationalNumber };
    // No single country for this number (shared dial code or unlisted range): still split off
    // the dial code, or editing the field would prepend it a second time
    if (parsed) {
      const sameCode = getCountries().filter((c) => getCountryCallingCode(c) === parsed.countryCallingCode);
      const country = sameCode.includes(fallbackCountry) ? fallbackCountry : sameCode[0];
      if (country) return { country, local: parsed.nationalNumber };
    }
  }
  return { country: fallbackCountry, local: value.replace(/^\+/, "") };
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label,
  value = "",
  onChange,
  error,
  hint,
  isRequired,
  defaultCountry = "GB",
}) => {
  const { language } = useLanguage();
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const supported = useMemo(() => new Set<string>(getCountries()), []);
  const fallback = (supported.has(defaultCountry.toUpperCase()) ? defaultCountry.toUpperCase() : "GB") as CountryCode;

  const [country, setCountry] = useState<CountryCode>(() => splitValue(value, fallback).country);
  const [localNumber, setLocalNumber] = useState(() => splitValue(value, fallback).local);

  // Re-sync only when the value changes from outside (e.g. form reset), never from our own typing
  const [lastEmitted, setLastEmitted] = useState(value);
  if (value !== lastEmitted) {
    setLastEmitted(value);
    const next = splitValue(value, fallback);
    setCountry(next.country);
    setLocalNumber(next.local);
  }

  // Every country libphonenumber supports, named in the active language
  const options = useMemo(() => {
    const names = new Map(getAllCountries(language).map((c) => [c.code, language === "ar" ? c.nameAr : c.name]));
    return getCountries()
      .filter((code) => names.has(code))
      .map((code) => ({ code, label: `${names.get(code)} (+${getCountryCallingCode(code)})` }))
      .sort((a, b) => a.label.localeCompare(b.label, language));
  }, [language]);

  const emit = (nextCountry: CountryCode, raw: string) => {
    const digits = raw.replace(/\D/g, "").replace(/^0+/, ""); // drop a trunk "0" typed out of habit
    const e164 = digits ? `+${getCountryCallingCode(nextCountry)}${digits}` : "";
    setLastEmitted(e164);
    onChange(e164);
  };

  return (
    <FieldShell
      id={inputId}
      label={label}
      isRequired={isRequired}
      hint={hint}
      error={error}
      messageId={messageId}
    >
      <div className="flex items-stretch gap-2" dir="ltr">
        {/* Shows only the dial code; the full country name lives in the native picker */}
        <div className="relative w-28 shrink-0 sm:w-[200px]">
          <select
            value={country}
            aria-label="Country calling code"
            onChange={(e) => {
              const next = e.target.value as CountryCode;
              setCountry(next);
              emit(next, localNumber);
            }}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
          >
            {options.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
          <div
            aria-hidden="true"
            className="pointer-events-none flex h-full min-h-[46px] items-center justify-between rounded-xl border border-white/12 bg-canvas ps-3 pe-2 text-subhead tabular-nums text-label transition-[box-shadow] peer-focus-visible:shadow-[inset_0_0_0_1px_var(--tint)] peer-focus-visible:ring-3 peer-focus-visible:ring-tint/15"
          >
            <span>
              {country} +{getCountryCallingCode(country)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-label-2" />
          </div>
        </div>

        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={localNumber}
          aria-invalid={error ? true : undefined}
          aria-required={isRequired || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onChange={(e) => {
            setLocalNumber(e.target.value);
            emit(country, e.target.value);
          }}
          placeholder="7911 123456"
          className={`${fieldClass(!!error)} min-w-0 tabular-nums`}
        />
      </div>
    </FieldShell>
  );
};
