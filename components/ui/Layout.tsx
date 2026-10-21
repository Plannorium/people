import React, { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

/** Page title block: large title, optional eyebrow, subtitle and trailing actions. */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-footnote font-semibold text-tint">{eyebrow}</p>}
        <h1 className="text-title1 font-bold text-label sm:text-large">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-subhead text-label-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A titled group on a surface, with an optional trailing action such as "Edit". */
export function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[18px] bg-surface p-5 shadow-card sm:p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-body font-semibold text-label">
          {icon && <span className="text-label-2 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
          <span>{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Label-over-value pairs, two columns from small screens up. */
export function DetailList({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 | 3 }) {
  const cols = columns === 1 ? "" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${cols}`}>{children}</dl>;
}

export function DetailItem({
  label,
  children,
  wide,
  ltr,
  mono,
}: {
  label: ReactNode;
  children?: ReactNode;
  wide?: boolean;
  ltr?: boolean;
  mono?: boolean;
}) {
  const isEmpty = children === undefined || children === null || children === "";
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-full" : ""}`}>
      <dt className="text-footnote text-label-2">{label}</dt>
      <dd
        dir={ltr ? "ltr" : undefined}
        className={`mt-0.5 break-words text-subhead ${isEmpty ? "text-label-3" : "text-label"} ${mono ? "font-mono tabular-nums" : ""} ${ltr ? "text-start" : ""}`}
      >
        {isEmpty ? "—" : children}
      </dd>
    </div>
  );
}

const BANNER_TONES = {
  info: { box: "bg-fill text-label", icon: Info, iconColor: "text-label-2" },
  success: { box: "bg-success/10 text-label", icon: CheckCircle2, iconColor: "text-success" },
  warning: { box: "bg-warning/10 text-label", icon: AlertTriangle, iconColor: "text-warning" },
  danger: { box: "bg-danger/10 text-label", icon: XCircle, iconColor: "text-danger" },
};

/** Inline status message. */
export function Banner({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: keyof typeof BANNER_TONES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const conf = BANNER_TONES[tone];
  const Icon = conf.icon;
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex animate-fade-in flex-col gap-3 rounded-[14px] px-4 py-3.5 sm:flex-row sm:items-center ${conf.box}`}
    >
      <div className="flex flex-1 items-start gap-3">
        <Icon aria-hidden="true" className={`mt-0.5 h-[18px] w-[18px] shrink-0 ${conf.iconColor}`} />
        <div className="text-subhead">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className={title ? "text-label-2" : ""}>{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 ps-[30px] sm:ps-0">{action}</div>}
    </div>
  );
}

/** Initials in a circle, like Contacts. */
export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials =
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  const sizes = {
    sm: "h-9 w-9 text-footnote",
    md: "h-12 w-12 text-body",
    lg: "h-16 w-16 text-title3 sm:h-[72px] sm:w-[72px] sm:text-title2",
  };
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-b from-[#a5a5aa] to-[#86868b] font-semibold text-white dark:from-[#6e6e73] dark:to-[#48484a] ${sizes[size]}`}
    >
      {initials}
    </span>
  );
}

/** Marks the emergency contact who is the person's next of kin. */
export function NextOfKinBadge({ label = "Next of kin" }: { label?: string }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full bg-tint/12 px-2 text-caption font-semibold text-tint">
      {label}
    </span>
  );
}
