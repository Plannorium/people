"use client";

import React, { SelectHTMLAttributes, forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { FieldShell, fieldClass } from "./Field";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  options?: SelectOption[];
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, isRequired, options, children, className = "", id, ...props },
    ref
  ) => {
    const autoId = useId();
    const selectId = id || autoId;
    const messageId = `${selectId}-message`;

    return (
      <FieldShell
        id={selectId}
        label={label}
        isRequired={isRequired}
        hint={hint}
        error={error}
        messageId={messageId}
      >
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            className={`${fieldClass(!!error)} appearance-none pe-10 cursor-pointer ${className}`}
            {...props}
          >
            {children ||
              options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-label-2"
          />
        </div>
      </FieldShell>
    );
  }
);

Select.displayName = "Select";
