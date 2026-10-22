"use client";

import React, { useEffect, useState, Suspense } from "react";
import { PlannoriumBrandText, PlannoriumMark } from "@/components/brand/PlannoriumWordmark";
import { signIn, signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

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
      <div className="w-full max-w-[440px] animate-rise-in">
        <div className="rounded-[40px] bg-surface px-6 py-11 shadow-card sm:px-9">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface shadow-thumb">
              <span className="brand-arrival text-[50px] text-label"><PlannoriumMark /></span>
            </span>
            <h1 className="mt-6 text-[30px] font-bold leading-tight text-label">{t("signIn.title")}</h1>
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
              <PlannoriumBrandText text={t("signIn.ctaPlannorium")} />
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
