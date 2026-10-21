import React, { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "panel" | "section" | "nested";
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "section",
  className = "",
}) => {
  const variantStyles = {
    panel: "bg-surface rounded-[22px] p-6 sm:p-9 shadow-card",
    section: "bg-surface rounded-[18px] p-5 sm:p-6 shadow-card",
    nested: "bg-surface-2 rounded-[14px] p-4",
  };

  return <div className={`${variantStyles[variant]} ${className}`}>{children}</div>;
};
