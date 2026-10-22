"use client";

import React, { InputHTMLAttributes, forwardRef, useId } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  error?: string;
  isRequired?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, isRequired, className = "", id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className={`group flex items-start gap-3 cursor-pointer select-none text-sm text-label ${className}`}
        >
          <input
            type="checkbox"
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className="peer sr-only"
            {...props}
          />
          {/* The box is the input's sibling, so peer-checked can style it and the tick inside it */}
          <span
            aria-hidden="true"
            className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded bg-fill transition-[background-color,transform,box-shadow] duration-150 group-active:scale-90 peer-checked:bg-tint peer-focus-visible:ring-4 peer-focus-visible:ring-tint/25 peer-checked:[&>svg]:opacity-100 peer-checked:[&>svg]:scale-100 ${
              error ? "shadow-[inset_0_0_0_1px_var(--danger)]" : "shadow-[inset_0_0_0_1px_var(--separator)]"
            }`}
          >
            <svg
              className="h-3.5 w-3.5 scale-75 text-canvas opacity-0 transition-[opacity,transform] duration-150"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="flex-1 leading-[1.55]">
            {label}
            {isRequired && (
              <span aria-hidden="true" className="ms-1 text-tint">
                *
              </span>
            )}
          </span>
        </label>
        {error && (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 ps-8.5 text-footnote text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
