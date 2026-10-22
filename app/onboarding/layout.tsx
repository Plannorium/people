import { pageMetadata } from "@/components/brand/metadata";
export const metadata = pageMetadata("/onboarding", "Your details", "Complete your personal and workplace details, add emergency contacts and review your information in the private Plannorium People onboarding portal.");
import React, { ReactNode } from "react";
import { requirePageSession } from "@/lib/access";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageSession();

  return (
    <div className="w-full">{children}</div>
  );
}
