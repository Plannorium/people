"use client";

import React, { useState } from "react";
import { HeartPulse, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HealthInfo {
  bloodType: string;
  allergies: string;
  medicalInfo: string;
  accessibilityNeeds: string;
}

/** Loads encrypted health notes on demand. Each load is written to the audit log. */
export const HealthReveal: React.FC<{ employeeId: string; hasHealthInfo: boolean; compact?: boolean }> = ({
  employeeId,
  hasHealthInfo,
  compact = false,
}) => {
  const [info, setInfo] = useState<HealthInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasHealthInfo) {
    return (
      <p className={`${compact ? "text-caption" : "text-subhead"} text-label-2`}>No health or accessibility notes on file.</p>
    );
  }

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}/health`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't load health information.");
      setInfo(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!info) {
    return (
      <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"}>
        <p className={`flex items-start gap-2 text-label-2 ${compact ? "text-caption" : "text-subhead"}`}>
          <Lock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{compact ? "Medical info is encrypted. Views are logged." : "Encrypted. Opening it is logged in the audit trail."}</span>
        </p>
        <Button type="button" variant="secondary" size="sm" isLoading={isLoading} onClick={load} className={compact ? "w-full" : ""}>
          <HeartPulse aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Show medical info</span>
        </Button>
        {error && <p className="text-footnote text-danger">{error}</p>}
      </div>
    );
  }

  const rows = [
    { label: "Blood type", value: info.bloodType },
    { label: "Severe allergies", value: info.allergies, emphasise: true },
    { label: "Medical information", value: info.medicalInfo, emphasise: true },
    { label: "Accessibility needs", value: info.accessibilityNeeds },
  ];

  return (
    <dl className={`grid animate-fade-in grid-cols-1 gap-x-6 ${compact ? "gap-y-2" : "gap-y-4 sm:grid-cols-2"}`}>
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-footnote text-label-2">{row.label}</dt>
          <dd
            className={`mt-0.5 whitespace-pre-line break-words text-subhead ${
              row.value ? (row.emphasise ? "font-semibold text-label" : "text-label") : "text-label-3"
            }`}
          >
            {row.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
};
