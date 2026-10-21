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
