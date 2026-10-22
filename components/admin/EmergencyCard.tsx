"use client";

import React, { useState, useEffect } from "react";
import { Phone, Mail, Clock, MapPin } from "lucide-react";
import { Avatar, NextOfKinBadge } from "@/components/ui/Layout";
import { HealthReveal } from "./HealthReveal";

interface EmergencyContact {
  fullName: string;
  relationship: string;
  isNextOfKin?: boolean;
  phoneE164: string;
  altPhoneE164?: string;
  email?: string;
  countryCode: string;
  countryName?: string;
  city: string;
  speaks?: string;
  priority: number;
}

export interface EmergencyEmployee {
  _id: string;
  workEmail: string;
  personal?: {
    legalFirstName?: string;
    legalLastName?: string;
    preferredName?: string;
    mobileE164?: string;
    altPhoneE164?: string;
    preferredLanguage?: string;
  };
  location?: {
    countryCode?: string;
    countryName?: string;
    city?: string;
    region?: string;
    timeZone?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
  };
  emergencyContacts?: EmergencyContact[];
  hasHealthInfo?: boolean;
}

interface EmergencyCardProps {
  employee: EmergencyEmployee;
}

/** Live clock in the employee's own time zone, so nobody calls family at 3am by mistake. */
export function useLocalTime(timeZone: string): string {
  const [localTime, setLocalTime] = useState("");
  useEffect(() => {
    const update = () => {
      try {
        setLocalTime(
          new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", weekday: "short" }).format(
            new Date()
          )
        );
      } catch {
        setLocalTime("");
      }
    };
    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [timeZone]);
  return localTime;
}

export const EmergencyCard: React.FC<EmergencyCardProps> = ({ employee }) => {
  const timeZone = employee.location?.timeZone || "UTC";
  const localTime = useLocalTime(timeZone);

  const p = employee.personal;
  const legalName = `${p?.legalFirstName || ""} ${p?.legalLastName || ""}`.trim();
  const fullName = p?.preferredName || legalName || employee.workEmail;
  const loc = employee.location;
  const address = [loc?.addressLine1, loc?.addressLine2, loc?.city, loc?.postalCode, loc?.countryName]
    .filter(Boolean)
    .join(", ");

  const contacts = employee.emergencyContacts || [];

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[24px] bg-surface shadow-card">
      {/* Who, and what time it is for them */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar name={fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-subhead font-semibold text-label" title={fullName}>
            {fullName}
          </h2>
          <p className="flex items-center gap-1 truncate text-caption text-label-2">
            <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
            {localTime && <span dir="ltr" className="font-semibold tabular-nums text-label">{localTime}</span>}
            <span className="truncate">{timeZone.replace(/_/g, " ")}</span>
          </p>
        </div>
      </header>

      <div className="space-y-2 px-4 pb-3 text-footnote">
        <p className="flex min-w-0 items-start gap-1.5 text-label-2" title={address}>
          <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className={`line-clamp-2 ${address ? "text-label" : ""}`}>{address || "No home address on file"}</span>
        </p>
        {p?.mobileE164 && (
          <a
            href={`tel:${p.mobileE164}`}
            className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full bg-call/12 px-2.5 font-semibold text-call"
            aria-label={`Call ${fullName} on ${p.mobileE164}`}
          >
            <Phone aria-hidden="true" className="h-3 w-3" />
            <span className="tabular-nums" dir="ltr">
              {p.mobileE164}
            </span>
          </a>
        )}
      </div>

      {/* Emergency contacts, in priority order */}
      <div className="flex-1 border-t border-separator">
        {contacts.length === 0 ? (
          <p className="m-3 rounded-[12px] bg-danger/10 px-3 py-2.5 text-footnote font-medium text-danger">
            No emergency contacts on file. Try their own mobile first.
          </p>
        ) : (
          <ol className="divide-y divide-separator">
            {contacts.map((contact, idx) => {
              const place = [contact.city, contact.countryName || contact.countryCode].filter(Boolean).join(", ");
              return (
                <li key={idx} className="space-y-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fill text-[0.6875rem] font-semibold tabular-nums text-label">
                        {idx + 1}
                      </span>
                      <span className="truncate text-subhead font-semibold text-label" title={contact.fullName}>
                        {contact.fullName}
                      </span>
                    </p>
                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-label-2">
                      {contact.isNextOfKin && <NextOfKinBadge />}
                      <span className="truncate">{[contact.relationship, place].filter(Boolean).join(" · ")}</span>
                    </p>
                    {contact.speaks && <p className="truncate text-caption text-label-2">Speaks {contact.speaks}</p>}
                  </div>

                  {/* One tap to call, full-width target */}
                  <a
                    href={`tel:${contact.phoneE164}`}
                    className="pressable flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-call px-3 text-footnote font-semibold text-on-call"
                    aria-label={`Call ${contact.fullName} on ${contact.phoneE164}`}
                  >
                    <Phone aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                    <span className="truncate tabular-nums" dir="ltr">
                      {contact.phoneE164}
                    </span>
                  </a>

                  {(contact.altPhoneE164 || contact.email) && (
                    <div className="flex min-w-0 flex-col gap-0.5 text-caption">
                      {contact.altPhoneE164 && (
                        <a href={`tel:${contact.altPhoneE164}`} className="truncate tabular-nums text-tint hover:underline" dir="ltr">
                          Alt {contact.altPhoneE164}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex min-w-0 items-center gap-1 text-tint hover:underline">
                          <Mail aria-hidden="true" className="h-3 w-3 shrink-0" />
                          <span className="truncate" dir="ltr">
                            {contact.email}
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t border-separator bg-surface-2/40 px-4 py-3">
        <HealthReveal employeeId={employee._id} hasHealthInfo={!!employee.hasHealthInfo} compact />
      </div>
    </article>
  );
};
