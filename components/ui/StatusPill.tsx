"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export type StatusType =
  | "complete"
  | "incomplete"
  | "needs_review"
  | "offboarded"
  | "idExpiringSoon"
  | "idExpired";

interface StatusPillProps {
  status: StatusType;
  customLabel?: string;
  size?: "sm" | "md";
}

const STYLES: Record<StatusType, { pill: string; dot: string }> = {
  complete: { pill: "bg-success/12 text-[#4ADE80]", dot: "bg-success" },
  incomplete: { pill: "bg-warning/12 text-[#FBBF24]", dot: "bg-warning" },
  needs_review: { pill: "bg-warning/12 text-[#FBBF24]", dot: "bg-warning" },
  offboarded: { pill: "bg-fill text-label-2", dot: "bg-label-3" },
  idExpiringSoon: { pill: "bg-warning/12 text-[#FBBF24]", dot: "bg-warning" },
  idExpired: { pill: "bg-danger/10 text-[#F87171]", dot: "bg-danger" },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  customLabel,
  size = "md",
}) => {
  const { t } = useLanguage();
  const style = STYLES[status] || STYLES.incomplete;
  const displayLabel = customLabel || t(`status.${status}`);
  const sizeClass = size === "sm" ? "h-[22px] px-2 text-[11px]" : "h-6 px-2.5 text-[11px]";

  return (
    <span
      className={`inline-flex shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-full font-semibold uppercase tracking-[0.08em] ${style.pill} ${sizeClass}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <span>{displayLabel}</span>
    </span>
  );
};
