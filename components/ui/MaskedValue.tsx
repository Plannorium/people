"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Spinner } from "./Button";
import { useLanguage } from "@/contexts/LanguageContext";

interface MaskedValueProps {
  maskedText: string;
  employeeId?: string;
  documentType?: string;
  onReveal?: () => Promise<string>;
}

export const MaskedValue: React.FC<MaskedValueProps> = ({
  maskedText,
  employeeId,
  onReveal,
}) => {
  const { t } = useLanguage();
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setError(null);
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }

    if (revealedValue) {
      setIsRevealed(true);
      return;
    }

    setIsLoading(true);
    try {
      let value: string;
      if (onReveal) {
        value = await onReveal();
      } else if (employeeId) {
        const res = await fetch(`/api/employees/${employeeId}/reveal-id`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn't reveal this number.");
        value = data.documentNumber;
      } else {
        return;
      }
      setRevealedValue(value);
      setIsRevealed(true);
    } catch (err) {
      setError((err as Error).message || "Couldn't reveal this number.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col">
      <span className="inline-flex items-center gap-2" dir="ltr">
        <span className="font-mono text-subhead tabular-nums text-label">
          {isRevealed && revealedValue ? revealedValue : maskedText}
        </span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          className="pressable inline-flex h-7 items-center gap-1 rounded-full px-2 text-footnote font-medium text-tint hover:bg-fill disabled:opacity-50"
          aria-label={isRevealed ? t("common.hide") : t("common.reveal")}
        >
          {isLoading ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : isRevealed ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          <span>{isRevealed ? t("common.hide") : t("common.reveal")}</span>
        </button>
      </span>
      {error && <span className="mt-1 text-footnote text-danger">{error}</span>}
    </span>
  );
};
