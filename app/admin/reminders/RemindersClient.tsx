"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Banner, PageHeader } from "@/components/ui/Layout";
import { Send } from "lucide-react";

interface RemindersClientProps {
  employees: Array<{
    _id: string;
    workEmail: string;
    status: "incomplete" | "needs_review";
    personal?: {
      legalFirstName?: string;
      legalLastName?: string;
      preferredName?: string;
    };
    lastReviewedAt?: string;
    createdAt: string;
  }>;
}

export const RemindersClient: React.FC<RemindersClientProps> = ({ employees }) => {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success?: string; error?: string } | null>(null);

  const allSelected = employees.length > 0 && selectedIds.length === employees.length;

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : employees.map((e) => e._id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSendReminders = async () => {
    if (selectedIds.length === 0) return;
    setIsSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedIds }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reminders.");
      }

      const sent = `Sent ${data.count} ${data.count === 1 ? "reminder" : "reminders"}.`;
      setFeedback(
        data.failed > 0
          ? { error: `${sent} ${data.failed} couldn't be delivered. Try those again later.` }
          : { success: sent }
      );
      setSelectedIds([]);
      router.refresh();
    } catch (err) {
      setFeedback({ error: (err as Error).message || "Failed to send reminders." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        subtitle="Email people whose profile is unfinished or due for its periodic review."
        actions={
          <Button
            type="button"
            disabled={selectedIds.length === 0}
            isLoading={isSending}
            onClick={handleSendReminders}
          >
            <Send aria-hidden="true" className="h-4 w-4" />
            <span>
              {selectedIds.length > 0 ? `Send to ${selectedIds.length}` : "Send reminders"}
            </span>
          </Button>
        }
      />

      {feedback?.success && <Banner tone="success">{feedback.success}</Banner>}
      {feedback?.error && <Banner tone="danger">{feedback.error}</Banner>}

      <div className="overflow-hidden rounded-[24px] bg-surface shadow-card">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-start">
            <thead>
              <tr className="border-b border-separator text-footnote text-label-2">
                <th scope="col" className="w-12 py-2.5 ps-5 pe-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={employees.length === 0}
                    aria-label="Select everyone"
                    className="h-[18px] w-[18px] cursor-pointer accent-tint"
                  />
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5 text-start font-medium">Last reviewed</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-subhead text-label-2">
                    Everyone is up to date.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const isChecked = selectedIds.includes(emp._id);
                  const name =
                    emp.personal?.preferredName ||
                    `${emp.personal?.legalFirstName || ""} ${emp.personal?.legalLastName || ""}`.trim() ||
                    emp.workEmail.split("@")[0];

                  return (
                    <tr
                      key={emp._id}
                      onClick={() => toggleSelect(emp._id)}
                      className={`cursor-pointer border-b border-separator text-subhead transition-colors last:border-b-0 ${
                        isChecked ? "bg-tint/[0.06]" : "hover:bg-fill/60"
                      }`}
                    >
                      <td className="py-2.5 ps-5 pe-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(emp._id)}
                          aria-label={`Select ${name}`}
                          className="h-[18px] w-[18px] cursor-pointer accent-tint"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block font-medium text-label">{name}</span>
                        <span className="block text-footnote text-label-2" dir="ltr">
                          {emp.workEmail}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={emp.status} size="sm" />
                      </td>
                      <td className="px-5 py-2.5 tabular-nums text-label-2">
                        {emp.lastReviewedAt
                          ? new Date(emp.lastReviewedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "Never"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
