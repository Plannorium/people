import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";
import ct from "countries-and-timezones";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

export interface CountryOption {
  code: string;
  name: string;
  nameAr: string;
  dialCode?: string;
}

// Countries where every address has a postal code, so it is required on the form.
// Anywhere else (e.g. AE, QA, HK, IE-optional, much of Africa) it is optional.
const POSTAL_CODE_REQUIRED_COUNTRIES = new Set([
  "GB", "US", "CA", "AU", "NZ", "DE", "FR", "NL", "BE", "LU", "ES", "PT", "IT", "CH", "AT",
  "SE", "NO", "DK", "FI", "PL", "CZ", "JP", "KR", "CN", "SG", "IN", "PK", "SA", "TR", "MA",
  "ZA", "BR", "MX",
]);

export function isPostalCodeRequired(countryCode?: string): boolean {
  if (!countryCode) return false;
  return POSTAL_CODE_REQUIRED_COUNTRIES.has(countryCode.toUpperCase());
}

/** All IANA time zones for a country (most common first), from countries-and-timezones. */
export function getTimezonesForCountry(countryCode?: string): string[] {
  if (!countryCode) return ["UTC"];
  const zones = ct.getCountry(countryCode.toUpperCase())?.timezones;
  return zones && zones.length > 0 ? zones : ["UTC"];
}

export function getAllCountries(lang: "en" | "ar" = "en"): CountryOption[] {
  const namesEn = countries.getNames("en", { select: "official" }) || {};
  const namesAr = countries.getNames("ar", { select: "official" }) || {};

  return Object.keys(namesEn)
    .map((code) => ({
      code,
      name: namesEn[code] || code,
      nameAr: namesAr[code] || namesEn[code] || code,
    }))
    .sort((a, b) => {
      const nameA = lang === "ar" ? a.nameAr : a.name;
      const nameB = lang === "ar" ? b.nameAr : b.name;
      return nameA.localeCompare(nameB);
    });
}
