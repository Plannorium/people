"use client";

import React, { InputHTMLAttributes, forwardRef, useId } from "react";
import { FieldShell, fieldClass } from "./Field";

export interface DateInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  warning?: string;
  hint?: string;
  isRequired?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, warning, hint, isRequired, className = "", id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    const messageId = `${inputId}-message`;

    return (
      <FieldShell
        id={inputId}
        label={label}
        isRequired={isRequired}
        hint={hint}
        error={error}
        warning={warning}
        messageId={messageId}
      >
        <input
          type="date"
          ref={ref}
          id={inputId}
          dir="ltr"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || warning || hint ? messageId : undefined}
          className={`${fieldClass(!!error, !!warning)} text-start ${className}`}
          {...props}
        />
      </FieldShell>
    );
  }
);

DateInput.displayName = "DateInput";
