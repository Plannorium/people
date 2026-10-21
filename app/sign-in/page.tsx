"use client";

import React, { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";

const DEV_ROLES = [
  { value: "employee", label: "Employee" },
  { value: "hr_admin", label: "HR Admin" },
  { value: "owner", label: "Owner" },
] as const;

function SignInContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Dev mode credentials state
  const [devEmail, setDevEmail] = useState("alex@plannorium.com");
  const [devRole, setDevRole] = useState<string>("employee");

  const errorParam = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // Someone whose access ended may still hold a session cookie: clear it
  useEffect(() => {
    if (errorParam === "AccessRevoked" && status === "authenticated") {
      signOut({ redirect: false });
    }
  }, [errorParam, status]);

  const start = async (provider: string, options: Record<string, string> = {}) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl, ...options });
    } catch (e) {
      console.error(e);
      setIsLoading(null);
    }
  };

  const errorMessage =
    errorParam === "DomainRestricted"
      ? t("signIn.domainError")
      : errorParam === "AccessRevoked"
        ? t("signIn.revokedError")
        : errorParam === "EmailUnverified"
          ? t("signIn.unverifiedError")
          : errorParam === "NotInvited"
            ? t("signIn.notInvitedError")
          : errorParam
            ? t("signIn.genericError")
            : null;

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <div className="w-full max-w-[400px] animate-rise-in">
        <div className="rounded-[22px] bg-surface px-6 py-9 shadow-card sm:px-9 sm:py-11">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface shadow-thumb">
              <Image src="/logo-mark.png" alt="Plannorium" width={36} height={36} className="h-9 w-9 object-contain" priority />
            </span>
            <h1 className="mt-6 text-title1 font-bold text-label">{t("signIn.title")}</h1>
            <p className="mt-2 text-subhead text-label-2">{t("signIn.subtitle")}</p>
          </div>

          {errorMessage && (
            <div className="mt-6">
              <Banner tone="danger">{errorMessage}</Banner>
            </div>
          )}

          <div className="mt-8 space-y-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              isLoading={isLoading === "plannorium"}
              disabled={!!isLoading}
              onClick={() => start("plannorium")}
            >
              {t("signIn.ctaPlannorium")}
            </Button>

            {process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true" && (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
                isLoading={isLoading === "google"}
                disabled={!!isLoading}
                onClick={() => start("google")}
              >
                {t("signIn.ctaGoogle")}
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-footnote text-label-2">
            <Lock aria-hidden="true" className="me-1 inline-block h-3.5 w-3.5 align-[-2px]" />
            {t("signIn.staffOnly")}
          </p>
        </div>

        {/* Local `next dev` only; the provider itself is disabled in every other build */}
        {process.env.NODE_ENV === "development" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              start("dev-login", { email: devEmail, role: devRole });
            }}
            className="mt-4 space-y-3 rounded-[18px] bg-surface p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <p className="text-footnote font-semibold text-label">Developer sign-in</p>
              <span className="rounded-full bg-warning/12 px-2 py-0.5 text-caption font-semibold text-warning">
                Local only
              </span>
            </div>
            <input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="name@plannorium.com"
              aria-label="Work email"
              dir="ltr"
              className="h-10 w-full rounded-[10px] bg-fill px-3 text-subhead text-label outline-none placeholder:text-label-3 focus:ring-4 focus:ring-tint/15"
            />
            <div role="radiogroup" aria-label="Role" className="grid grid-cols-3 gap-0.5 rounded-[9px] bg-fill p-0.5">
              {DEV_ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={devRole === r.value}
                  onClick={() => setDevRole(r.value)}
                  className={`h-7 rounded-[7px] text-footnote font-medium transition-[background-color,color,box-shadow] ${
                    devRole === r.value ? "bg-surface text-label shadow-thumb" : "text-label-2 hover:text-label"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="md"
              isLoading={isLoading === "dev-login"}
              disabled={!!isLoading}
              className="w-full"
            >
              Sign in as {DEV_ROLES.find((r) => r.value === devRole)?.label}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  // useSearchParams needs a Suspense boundary for static rendering
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
