import type { ButtonHTMLAttributes } from "react";
import { Icon } from "./Icon";

const VARIANT_CLASS = {
  primary: "btn--primary",
  secondary: "",
  ghost: "btn--ghost",
  danger: "btn--danger",
  accentOutline: "btn--accent-outline",
} as const;

const SIZE_CLASS = {
  sm: "btn--sm",
  md: "",
  lg: "btn--lg",
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASS;
export type ButtonSize = keyof typeof SIZE_CLASS;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconOnly?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconOnly = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    "btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    iconOnly && "btn--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}
