"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LanguageToggle } from "./LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut, Menu, X } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  hr_admin: "HR Admin",
  owner: "Owner",
};

/** Initials button that opens the signed-in account details and sign out. */
function AccountMenu({ email, roleLabel, signOutLabel }: { email: string; roleLabel: string; signOutLabel: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initials = email.split("@")[0].split(/[._-]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className={`pressable flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-[#a5a5aa] to-[#86868b] text-caption font-semibold text-white dark:from-[#6e6e73] dark:to-[#48484a] ${
          open ? "ring-4 ring-tint/20" : ""
        }`}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-64 origin-top-right animate-pop-in overflow-hidden rounded-[14px] bg-surface shadow-pop rtl:origin-top-left"
        >
          <div className="px-4 py-3">
            <p className="truncate text-subhead font-semibold text-label" dir="ltr">
              {email}
            </p>
            <p className="text-footnote text-label-2">{roleLabel}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="flex h-11 w-full items-center gap-2 border-t border-separator px-4 text-subhead font-medium text-danger hover:bg-fill"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {signOutLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export const Header: React.FC = () => {
  const { data: session } = useSession();
  const pathname = usePathname() || "";
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const role = session?.user?.role || "employee";
  const isHrOrOwner = role === "hr_admin" || role === "owner";

  // Close the menu after navigating
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileMenuOpen(false);
  }

  // Hairline under the bar only once content scrolls beneath it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Global destinations only; admin sections live in the admin tab bar, so nothing is listed twice
  const navLinks = [
    { href: "/me", label: t("nav.myProfile"), show: true, isActive: pathname === "/me" || pathname.startsWith("/onboarding") },
    { href: "/admin", label: t("nav.admin"), show: isHrOrOwner, isActive: pathname.startsWith("/admin") },
    { href: "/privacy", label: t("nav.privacyNotice"), show: true, isActive: pathname === "/privacy" },
  ].filter((l) => l.show);

  return (
    <header
      className={`material sticky top-0 z-40 w-full transition-shadow duration-200 ${
        scrolled || mobileMenuOpen ? "shadow-[0_0.5px_0_var(--separator)]" : ""
      }`}
    >
      {/* Three columns so the nav sits at the true centre, whatever the width of either side */}
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link
          href="/"
          className="pressable flex items-center gap-2 justify-self-start rounded-lg"
          aria-label="Plannorium People home"
        >
          <Image
            src="/logo-mark.png"
            alt=""
            width={22}
            height={22}
            className="h-[22px] w-[22px] object-contain"
            priority
          />
          <span className="text-body font-semibold leading-none tracking-tight text-label">
            Plannorium <span className="font-normal text-label-2">People</span>
          </span>
        </Link>

        {session ? (
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.isActive ? "page" : undefined}
                className={`pressable flex h-8 items-center rounded-full px-3.5 text-subhead transition-colors ${
                  link.isActive ? "bg-fill font-semibold text-label" : "text-label-2 hover:text-label"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : (
          <span className="hidden md:block" />
        )}

        <div className="flex items-center justify-end gap-2 justify-self-end">
          <LanguageToggle />

          {session && (
            <>
              <AccountMenu
                email={session.user?.email || ""}
                roleLabel={ROLE_LABELS[role] || role}
                signOutLabel={t("common.signOut")}
              />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="pressable -me-1.5 flex h-8 w-8 items-center justify-center rounded-full text-label hover:bg-fill md:hidden"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && session && (
        <div className="mx-auto max-w-6xl origin-top animate-pop-in px-4 pb-4 sm:px-6 md:hidden">
          <nav aria-label="Main" className="overflow-hidden rounded-[14px] bg-surface shadow-card">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={link.isActive ? "page" : undefined}
                className={`flex min-h-12 items-center border-b border-separator px-4 text-body last:border-b-0 active:bg-fill ${
                  link.isActive ? "font-semibold text-tint" : "text-label"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-footnote font-medium text-label" dir="ltr">
                {session.user?.email}
              </p>
              <p className="text-caption text-label-2">{ROLE_LABELS[role] || role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              className="pressable flex h-9 items-center gap-1.5 rounded-full bg-fill px-3.5 text-footnote font-semibold text-danger"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("common.signOut")}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
