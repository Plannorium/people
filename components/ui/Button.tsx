import React, { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: ReactNode;
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "min-h-11 px-4 text-footnote gap-1.5",
  md: "min-h-12 px-7 text-subhead gap-2",
  lg: "min-h-[52px] px-7 text-subhead gap-2",
};

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-brand-light active:bg-brand-dark [&_[data-brand-mark]_rect]:fill-current",
  secondary: "border border-white/15 bg-transparent text-label hover:bg-fill-strong",
  danger: "bg-danger/10 text-danger hover:bg-danger/15",
  ghost: "text-label-2 hover:bg-fill hover:text-label",
};

/** Button styling, also used to style links that act as buttons. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `pressable inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-bold disabled:cursor-not-allowed disabled:opacity-40 ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]}`;
}

export const Spinner: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  return (
    <button
      className={`${buttonClasses(variant, size)} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span className="inline-flex items-center gap-[inherit]">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
