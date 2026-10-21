import React, { ReactNode } from "react";

/** Shared surface for text inputs, selects and pickers. */
export function fieldClass(hasError?: boolean, hasWarning?: boolean): string {
  const state = hasError
    ? "shadow-[inset_0_0_0_1px_var(--danger)] focus:ring-4 focus:ring-danger/15"
    : hasWarning
      ? "shadow-[inset_0_0_0_1px_var(--warning)] focus:ring-4 focus:ring-warning/15"
      : "focus:shadow-[inset_0_0_0_1px_var(--tint)] focus:ring-4 focus:ring-tint/15";
  return `w-full min-h-11 rounded-[10px] bg-fill px-3.5 py-2.5 text-subhead text-label placeholder:text-label-3 outline-none transition-[box-shadow,background-color] duration-150 focus:bg-surface disabled:opacity-60 disabled:cursor-not-allowed ${state}`;
}

interface FieldShellProps {
  id?: string;
  label?: ReactNode;
  isRequired?: boolean;
  hint?: ReactNode;
  error?: string;
  warning?: string;
  /** id of the element that holds the hint or error, for aria-describedby */
  messageId?: string;
  children: ReactNode;
}

export const FieldShell: React.FC<FieldShellProps> = ({
  id,
  label,
  isRequired,
  hint,
  error,
  warning,
  messageId,
  children,
}) => {
  const message = error || warning || hint;
  const tone = error ? "text-danger" : warning ? "text-warning" : "text-label-2";

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-footnote font-medium text-label-2">
          <span>{label}</span>
          {isRequired && (
            <span aria-hidden="true" className="text-label-3">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {message && (
        <p id={messageId} className={`mt-1.5 text-footnote ${tone}`} role={error ? "alert" : undefined}>
          {message}
        </p>
      )}
    </div>
  );
};
