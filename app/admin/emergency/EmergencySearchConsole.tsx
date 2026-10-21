"use client";

import React, { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { EmergencyCard, EmergencyEmployee } from "@/components/admin/EmergencyCard";
import { PageHeader } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmergencySearchConsoleProps {
  initialEmployees: EmergencyEmployee[];
}

const DEFAULT_VISIBLE = 8;

export const EmergencySearchConsole: React.FC<EmergencySearchConsoleProps> = ({
  initialEmployees,
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialEmployees;
    const digits = q.replace(/\D/g, "");
    return initialEmployees.filter((emp) => {
      const p = emp.personal;
      const fullName = `${p?.legalFirstName || ""} ${p?.legalLastName || ""} ${p?.preferredName || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        emp.workEmail.toLowerCase().includes(q) ||
        (emp.location?.city || "").toLowerCase().includes(q) ||
        (emp.location?.countryName || "").toLowerCase().includes(q) ||
        (digits.length >= 4 && (p?.mobileE164 || "").includes(digits))
      );
    });
  }, [initialEmployees, query]);

  const visible = query.trim() ? matches : matches.slice(0, DEFAULT_VISIBLE);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("admin.emergencyLookup.title")}
        subtitle={t("admin.emergencyLookup.subtitle")}
      />

      <div className="relative max-w-2xl">
        <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-label-2" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("admin.emergencyLookup.inputPlaceholder")}
          aria-label="Search staff by name, email, city or phone"
          autoComplete="off"
          autoFocus
          className="h-12 w-full rounded-[12px] bg-surface ps-12 pe-12 text-body text-label shadow-card outline-none placeholder:text-label-3 focus:shadow-[inset_0_0_0_1px_var(--tint)] focus:ring-4 focus:ring-tint/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="pressable absolute inset-y-0 end-3 my-auto flex h-7 w-7 items-center justify-center rounded-full bg-fill-strong text-label-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <p className="text-footnote text-label-2" aria-live="polite">
        {query.trim()
          ? `${matches.length} ${matches.length === 1 ? "match" : "matches"}`
          : initialEmployees.length > DEFAULT_VISIBLE
            ? `Showing ${DEFAULT_VISIBLE} of ${initialEmployees.length} staff. Search to find anyone else.`
            : `${initialEmployees.length} staff`}
      </p>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.length === 0 ? (
          <div className="col-span-full rounded-[18px] bg-surface px-6 py-12 text-center text-subhead text-label-2 shadow-card">
            {query.trim() ? <>No one matches &ldquo;{query}&rdquo;.</> : "No staff records yet."}
          </div>
        ) : (
          visible.map((emp) => <EmergencyCard key={emp._id} employee={emp} />)
        )}
      </div>
    </div>
  );
};
