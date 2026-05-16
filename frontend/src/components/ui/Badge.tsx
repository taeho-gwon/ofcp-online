import type { HTMLAttributes } from "react";

const TONE_CLASS = {
  default: "",
  accent: "badge--accent",
  success: "badge--success",
  warning: "badge--warning",
  danger: "badge--danger",
  info: "badge--info",
} as const;

export type BadgeTone = keyof typeof TONE_CLASS;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  mono?: boolean;
}

export function Badge({
  tone = "default",
  dot = false,
  mono = false,
  children,
  className = "",
  ...rest
}: BadgeProps) {
  const cls = [
    "badge",
    TONE_CLASS[tone],
    dot && "badge--dot",
    mono && "badge--mono",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}
