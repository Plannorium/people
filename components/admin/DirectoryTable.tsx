"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill, StatusType } from "@/components/ui/StatusPill";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronRight, ChevronDown, Download, Search } from "lucide-react";

interface DirectoryEmployee {
  _id: string;
  workEmail: string;
  role: string;
  status: "complete" | "incomplete" | "needs_review" | "offboarded";
  personal?: {
    legalFirstName?: string;
    legalLastName?: string;
    preferredName?: string;
  };
  location?: {
    countryCode?: string;
    city?: string;
  };
  employment?: {
    jobTitle?: string;
    department?: string;
  };
  identification?: {
    expiryDate?: string;
  };
  lastReviewedAt?: string;
}

interface DirectoryTableProps {
  employees: DirectoryEmployee[];
  /** Owners can permanently delete records, e.g. test data */
  canDelete?: boolean;
  currentEmail?: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function idDaysLeft(emp: DirectoryEmployee, now: number): number | null {
  if (!emp.identification?.expiryDate) return null;
  return Math.ceil((new Date(emp.identification.expiryDate).getTime() - now) / DAY_MS);
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export const DirectoryTable: React.FC<DirectoryTableProps> = ({ employees, canDelete = false, currentEmail = "" }) => {
  const { t } = useLanguage();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const isSelectable = (emp: DirectoryEmployee) => canDelete && emp.workEmail.toLowerCase() !== currentEmail;
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteResult(null);
    try {
      const res = await fetch("/api/admin/employees/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, confirm: confirmText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't delete these records.");
      setDeleteResult({ tone: "success", text: `Deleted ${data.count} ${data.count === 1 ? "record" : "records"} permanently.` });
      setSelected([]);
      setConfirmText("");
      router.refresh();
    } catch (err) {
      setDeleteResult({ tone: "danger", text: (err as Error).message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics cover current staff only
  const active = employees.filter((e) => e.status !== "offboarded");
  const total = active.length;
  const completedCount = active.filter((e) => e.status === "complete").length;
  const reviewCount = active.filter((e) => e.status === "needs_review" || e.status === "incomplete").length;
  const completionPercentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const idAttentionCount = active.filter((e) => {
    const days = idDaysLeft(e, now);
    return days !== null && days <= 60;
  }).length;

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      const fullName = `${emp.personal?.legalFirstName || ""} ${emp.personal?.legalLastName || ""} ${emp.personal?.preferredName || ""}`.toLowerCase();
      const matchesSearch =
        !q ||
        fullName.includes(q) ||
        emp.workEmail.toLowerCase().includes(q) ||
        (emp.employment?.department || "").toLowerCase().includes(q) ||
        (emp.employment?.jobTitle || "").toLowerCase().includes(q) ||
        (emp.location?.city || "").toLowerCase().includes(q) ||
        (emp.location?.countryCode || "").toLowerCase().includes(q);

      const days = idDaysLeft(emp, now);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && emp.status !== "offboarded") ||
        emp.status === statusFilter ||
        (statusFilter === "expiring" && emp.status !== "offboarded" && days !== null && days <= 60);

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter, now]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Export failed.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plannorium-people-directory-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const metrics = [
    { label: "Current staff", value: total },
    { label: "Complete", value: completedCount, detail: `${completionPercentage}%`, tone: "text-success" },
    { label: "Incomplete or due review", value: reviewCount, tone: reviewCount > 0 ? "text-warning" : undefined },
    { label: "IDs expiring or expired", value: idAttentionCount, tone: idAttentionCount > 0 ? "text-danger" : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-[18px] bg-surface px-5 py-4 shadow-card">
            <p className="text-footnote text-label-2">{m.label}</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className={`text-title1 font-semibold tabular-nums ${m.tone || "text-label"}`}>{m.value}</span>
              {m.detail && <span className="text-footnote text-label-2">{m.detail}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-label-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            aria-label="Search directory"
            className="h-10 w-full rounded-[10px] bg-fill ps-9 pe-3 text-subhead text-label outline-none placeholder:text-label-3 focus:bg-surface focus:shadow-[inset_0_0_0_1px_var(--tint)] focus:ring-4 focus:ring-tint/15"
          />
        </div>

        <div className="flex items-center gap-2 sm:ms-auto">
          <div className="relative flex-1 sm:flex-none">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-10 w-full cursor-pointer appearance-none rounded-[10px] bg-fill ps-3 pe-9 text-subhead text-label outline-none focus:ring-4 focus:ring-tint/15"
            >
              <option value="active">Current staff</option>
              <option value="all">Everyone</option>
              <option value="complete">Complete</option>
              <option value="incomplete">Incomplete</option>
              <option value="needs_review">Needs review</option>
              <option value="expiring">ID expiring or expired</option>
              <option value="offboarded">Offboarded</option>
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-label-2" />
          </div>

          <Button type="button" variant="secondary" size="md" className="h-10" isLoading={isExporting} onClick={handleExportCsv}>
            <Download aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">{t("admin.exportCsv")}</span>
          </Button>
        </div>
      </div>

      {exportError && <Banner tone="danger">{exportError}</Banner>}
      {deleteResult && <Banner tone={deleteResult.tone}>{deleteResult.text}</Banner>}

      {canDelete && selected.length > 0 && (
        <div className="flex animate-fade-in flex-col gap-3 rounded-[14px] bg-danger/10 px-4 py-3.5 sm:flex-row sm:items-center">
          <p className="flex-1 text-subhead text-label">
            <span className="font-semibold">
              Permanently delete {selected.length} {selected.length === 1 ? "record" : "records"}?
            </span>{" "}
            <span className="text-label-2">Their details and ID files are removed for good. The audit log keeps a note of the deletion.</span>
          </p>
          <div className="flex items-center gap-2">
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              aria-label="Type DELETE to confirm"
              autoComplete="off"
              className="h-9 w-32 rounded-[9px] bg-surface px-3 text-subhead text-label outline-none placeholder:text-label-3 focus:ring-4 focus:ring-danger/15"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => { setSelected([]); setConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              disabled={confirmText !== "DELETE"}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-start">
            <thead>
              <tr className="border-b border-separator text-footnote text-label-2">
                {canDelete && (
                  <th scope="col" className="w-10 py-2.5 ps-5 pe-0">
                    <span className="sr-only">Select</span>
                  </th>
                )}
                <th scope="col" className="px-5 py-2.5 text-start font-medium">{t("admin.columns.name")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Role</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("admin.columns.location")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("admin.columns.status")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">{t("admin.columns.idExpiry")}</th>
                <th scope="col" className="w-10 px-4 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 7 : 6} className="px-5 py-12 text-center text-subhead text-label-2">
                    {search ? `No one matches “${search}”.` : "No records in this view."}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const firstName = emp.personal?.legalFirstName || "";
                  const lastName = emp.personal?.legalLastName || "";
                  const name =
                    emp.personal?.preferredName ||
                    `${firstName} ${lastName}`.trim() ||
                    emp.workEmail.split("@")[0];

                  const days = idDaysLeft(emp, now);
                  const isExpired = days !== null && days < 0;
                  const isExpiringSoon = days !== null && days >= 0 && days <= 60;
                  const pillStatus: StatusType =
                    emp.status === "offboarded"
                      ? "offboarded"
                      : isExpired
                        ? "idExpired"
                        : isExpiringSoon
                          ? "idExpiringSoon"
                          : emp.status;
                  const href = `/admin/people/${emp._id}`;

                  return (
                    <tr
                      key={emp._id}
                      onClick={() => router.push(href)}
                      className={`cursor-pointer border-b border-separator text-subhead transition-colors last:border-b-0 hover:bg-fill/60 ${
                        emp.status === "offboarded" ? "opacity-60" : ""
                      }`}
                    >
                      {canDelete && (
                        <td className="py-2.5 ps-5 pe-0" onClick={(e) => e.stopPropagation()}>
                          {isSelectable(emp) && (
                            <input
                              type="checkbox"
                              checked={selected.includes(emp._id)}
                              onChange={() => toggle(emp._id)}
                              aria-label={`Select ${name}`}
                              className="h-4.5 w-4.5 cursor-pointer accent-danger"
                            />
                          )}
                        </td>
                      )}
                      <td className="px-5 py-2.5">
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          className="block font-medium text-label focus-visible:underline"
                        >
                          {name}
                        </Link>
                        <span className="block text-footnote text-label-2" dir="ltr">
                          {emp.workEmail}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block text-label">{emp.employment?.jobTitle || "—"}</span>
                        {emp.employment?.department && (
                          <span className="block text-footnote text-label-2">{emp.employment.department}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-label">
                        {emp.location?.city || emp.location?.countryCode
                          ? [emp.location?.city, emp.location?.countryCode].filter(Boolean).join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={pillStatus} size="sm" />
                      </td>
                      <td
                        className={`px-4 py-2.5 tabular-nums ${isExpired ? "text-danger" : isExpiringSoon ? "text-warning" : "text-label-2"}`}
                      >
                        {formatDate(emp.identification?.expiryDate)}
                      </td>
                      <td className="px-4 py-2.5 text-label-3">
                        <ChevronRight aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-footnote text-label-2">
        Showing {filteredEmployees.length} of {employees.length} records
      </p>
    </div>
  );
};
