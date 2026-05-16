import type { ReactNode } from "react";

export type AlertTone = "info" | "warning" | "danger" | "success";

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  iconChar?: string;
  children?: ReactNode;
}

const FALLBACK: Record<AlertTone, string> = {
  info: "i",
  warning: "!",
  danger: "×",
  success: "✓",
};

export function Alert({ tone = "info", title, iconChar, children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`}>
      <div className="alert-icon">{iconChar ?? FALLBACK[tone]}</div>
      <div>
        {title ? <p className="alert-title">{title}</p> : null}
        <p className="alert-body">{children}</p>
      </div>
    </div>
  );
}
