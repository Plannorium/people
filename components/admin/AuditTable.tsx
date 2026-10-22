"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronDown, Search } from "lucide-react";

interface AuditLogEntry {
  _id: string;
  actorEmail: string;
  action: string;
  targetEmployeeId?: string;
  targetName?: string;
  fields?: string[];
  ip?: string;
  at: string;
}

interface AuditTableProps {
  logs: AuditLogEntry[];
}

const ACTIONS: Record<string, { label: string; tone: string }> = {
  view_record: { label: "Viewed record", tone: "text-label" },
  reveal_id: { label: "Revealed ID number", tone: "text-warning" },
  view_document: { label: "Viewed document", tone: "text-warning" },
  view_health: { label: "Viewed health info", tone: "text-warning" },
  update: { label: "Updated", tone: "text-label" },
  export: { label: "Exported CSV", tone: "text-warning" },
  role_change: { label: "Changed role", tone: "text-danger" },
  delete: { label: "Deleted data", tone: "text-danger" },
  reminder_sent: { label: "Sent reminder", tone: "text-label" },
};

export const AuditTable: React.FC<AuditTableProps> = ({ logs }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        log.actorEmail.toLowerCase().includes(q) ||
        (log.targetName || "").toLowerCase().includes(q) ||
        (log.targetEmployeeId || "").toLowerCase().includes(q) ||
        (log.fields || []).join(" ").toLowerCase().includes(q);
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-label-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by person, actor or field"
            aria-label="Search audit log"
            className="min-h-[46px] w-full rounded-xl border border-white/12 bg-canvas ps-9 pe-3 text-subhead text-label outline-none placeholder:text-label-3 focus:bg-canvas focus:shadow-[inset_0_0_0_1px_var(--tint)] focus:ring-4 focus:ring-tint/15"
          />
        </div>

        <div className="relative sm:ms-auto">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter by action"
            className="min-h-[46px] w-full cursor-pointer appearance-none rounded-xl border border-white/12 bg-canvas ps-3 pe-9 text-subhead text-label outline-none focus:ring-4 focus:ring-tint/15"
          >
            <option value="all">All actions</option>
            {Object.entries(ACTIONS).map(([value, conf]) => (
              <option key={value} value={value}>
                {conf.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-label-2" />
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] bg-surface shadow-card">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[820px] table-fixed border-collapse text-start">
            <colgroup>
              <col className="w-[8.5rem]" />
              <col className="w-[15rem]" />
              <col className="w-[10.5rem]" />
              <col className="w-[11rem]" />
              <col />
              <col className="w-[8.5rem]" />
            </colgroup>
            <thead>
              <tr className="border-b border-separator text-footnote text-label-2">
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.timestamp")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.actor")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.action")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.target")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.fields")}</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium first:ps-5 last:pe-5">{t("admin.audit.ip")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-subhead text-label-2">
                    No entries match.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const conf = ACTIONS[log.action] || { label: log.action, tone: "text-label" };
                  return (
                    <tr key={log._id} className="border-b border-separator text-footnote last:border-b-0 hover:bg-fill/40">
                      <td className="whitespace-nowrap py-2.5 ps-5 pe-4 tabular-nums text-label-2">
                        {new Date(log.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="truncate px-4 py-2.5 text-start text-label" dir="ltr" title={log.actorEmail}>
                        {log.actorEmail}
                      </td>
                      <td className={`truncate px-4 py-2.5 font-medium ${conf.tone}`}>{conf.label}</td>
                      <td className="truncate px-4 py-2.5">
                        {log.targetEmployeeId ? (
                          <Link href={`/admin/people/${log.targetEmployeeId}`} className="text-tint hover:underline">
                            {log.targetName || `…${log.targetEmployeeId.slice(-6)}`}
                          </Link>
                        ) : (
                          <span className="text-label-3">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-label-2">
                        <span className="block truncate" title={log.fields?.join(", ")}>
                          {log.fields && log.fields.length > 0 ? log.fields.join(", ") : "—"}
                        </span>
                      </td>
                      <td className="truncate py-2.5 ps-4 pe-5 font-mono text-label-2">{log.ip || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-footnote text-label-2">
        Showing {filteredLogs.length} of {logs.length} entries
      </p>
    </div>
  );
};
