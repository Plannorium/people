import React, { ReactNode } from "react";
import { requirePageSession } from "@/lib/access";
import { AdminNav } from "@/components/layout/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePageSession(["hr_admin", "owner"]);

  return (
    <div className="w-full space-y-8">
      <AdminNav />
      <div>{children}</div>
    </div>
  );
}
