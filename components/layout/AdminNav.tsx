"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Siren, Bell, ShieldCheck, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const AdminNav: React.FC = () => {
  const pathname = usePathname() || "";
  const { data: session } = useSession();
  const { t } = useLanguage();

  const isOwner = session?.user?.role === "owner";

  const adminTabs = [
    { href: "/admin", label: t("nav.adminDirectory"), icon: Users, isActive: pathname === "/admin" || pathname.startsWith("/admin/people") },
    { href: "/admin/emergency", label: t("nav.adminEmergency"), icon: Siren, isActive: pathname.startsWith("/admin/emergency") },
    { href: "/admin/reminders", label: t("nav.adminReminders"), icon: Bell, isActive: pathname.startsWith("/admin/reminders") },
    { href: "/admin/audit", label: t("nav.adminAudit"), icon: ShieldCheck, isActive: pathname.startsWith("/admin/audit") },
    ...(isOwner
      ? [{ href: "/admin/settings", label: t("nav.adminSettings"), icon: Settings, isActive: pathname.startsWith("/admin/settings") }]
      : []),
  ];

  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-max items-center gap-0.5 rounded-[11px] bg-fill p-[3px]">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={tab.isActive ? "page" : undefined}
              className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-footnote font-medium transition-[background-color,color,box-shadow] duration-200 ${
                tab.isActive ? "bg-surface font-semibold text-label shadow-thumb" : "text-label-2 hover:text-label"
              }`}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
