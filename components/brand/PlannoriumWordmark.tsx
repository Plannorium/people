import { useId } from "react";

/**
 * The Plannorium wordmark: the P mark stands in for the capital P, so it reads
 * "[P]lannorium" with no second P. The mark is sized to the cap height and sits
 * on the text baseline; its bars take the text colour (works in both themes)
 * and the middle bar stays emerald.
 *
 * Geometry matches scripts/brand/plannorium_mark.py (70 × 100, cap height 100).
 */
export function PlannoriumMark({ className }: { className?: string }) {
  const clip = useId();
  return (
    <svg
      viewBox="0 0 70 100"
      data-brand-mark=""
      aria-hidden="true"
      className={className}
      style={{ height: "0.72em", width: "0.504em", flex: "none" }}
    >
      <defs>
        <clipPath id={clip}>
          <path d="M0 0 H38 A32 32 0 0 1 38 64 H0 Z" />
          <rect x="0" y="0" width="21" height="100" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="21" height="100" rx="4" fill="currentColor" />
        <rect x="26" y="0" width="19" height="64" rx="4" fill="#10B981" />
        <rect x="50" y="0" width="20" height="64" rx="4" fill="currentColor" />
      </g>
    </svg>
  );
}

/** `suffix` names the product after the wordmark, set lighter and faded ("[P]lannorium ID"). */
export default function PlannoriumWordmark({ className, suffix }: { className?: string; suffix?: string }) {
  return (
    <span
      dir="ltr"
      className={`brand-wordmark inline-flex items-baseline ${className ?? ""}`}
      aria-label={suffix ? `Plannorium ${suffix}` : "Plannorium"}
    >
      <PlannoriumMark className="mr-[0.06em]" />
      <span aria-hidden="true">lannorium</span>
      {suffix && (
        <span aria-hidden="true" className="ml-[0.28em] font-medium opacity-60">
          {suffix}
        </span>
      )}
    </span>
  );
}

/**
 * Render translated copy with the brand name drawn as the wordmark, e.g.
 * "Continue with Plannorium ID" → "Continue with [P]lannorium ID". Translations
 * stay whole sentences (word order differs by language); only the name is swapped.
 */
export function PlannoriumBrandText({ text }: { text: string }) {
  const parts = text.split(/(Plannorium ID|Plannorium)/);
  return (
    <>
      {parts.map((part, i) =>
        part === "Plannorium ID" ? (
          <PlannoriumWordmark key={i} suffix="ID" />
        ) : part === "Plannorium" ? (
          <PlannoriumWordmark key={i} />
        ) : (
          part
        )
      )}
    </>
  );
}
