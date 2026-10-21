import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  hr_admin: "HR Admin",
  owner: "Owner",
};

export function roleLabel(role?: string): string {
  return (role && ROLE_LABELS[role]) || "Employee";
}

/** "21 Oct 2026". Dates are stored as UTC midnight, so they're formatted in UTC. */
export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "2026-10-21", for date inputs. */
export function toDateInputValue(value?: string | Date | null): string {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
}

export function countryName(code?: string): string {
  if (!code) return "";
  return countries.getName(code.toUpperCase(), "en") || code;
}

/** Whole days from now until the date; negative once it has passed. */
export function daysUntil(value?: string | Date | null, now: Date = new Date()): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function displayName(person: {
  workEmail: string;
  personal?: { legalFirstName?: string; legalLastName?: string; preferredName?: string } | null;
}): string {
  const p = person.personal;
  const legal = `${p?.legalFirstName || ""} ${p?.legalLastName || ""}`.trim();
  return p?.preferredName || legal || person.workEmail.split("@")[0];
}
