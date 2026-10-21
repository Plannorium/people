"use client";

import React, { InputHTMLAttributes, forwardRef, useId } from "react";
import { FieldShell, fieldClass } from "./Field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  isRequired?: boolean;
  ltr?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, isRequired, ltr = false, className = "", id, ...props }, ref) => {
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
        messageId={messageId}
      >
        <input
          ref={ref}
          id={inputId}
          dir={ltr ? "ltr" : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={isRequired || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={`${fieldClass(!!error)} ${ltr ? "text-start" : ""} ${className}`}
          {...props}
        />
      </FieldShell>
    );
  }
);

Input.displayName = "Input";
