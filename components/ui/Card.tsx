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
    panel: "bg-surface rounded-[28px] p-5 sm:p-7 shadow-card",
    section: "bg-surface rounded-[28px] p-5 sm:p-7 shadow-card",
    nested: "bg-surface-2 rounded-[20px] p-5",
  };

  return <div className={`${variantStyles[variant]} ${className}`}>{children}</div>;
};
