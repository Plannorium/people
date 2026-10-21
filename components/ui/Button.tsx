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
  sm: "h-8 px-3.5 text-footnote gap-1.5",
  md: "h-11 px-5 text-subhead gap-2",
  lg: "h-[50px] px-6 text-body gap-2",
};

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-fill text-label hover:bg-fill-strong",
  danger: "bg-danger/10 text-danger hover:bg-danger/15",
  ghost: "text-tint hover:bg-fill",
};

/** Button styling, also used to style links that act as buttons. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md"): string {
  return `pressable inline-flex select-none items-center justify-center whitespace-nowrap rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]}`;
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
