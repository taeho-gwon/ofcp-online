import type { HTMLAttributes, ReactNode } from "react";

const TONE_CLASS = {
  default: "",
  warning: "timer--warning",
  critical: "timer--critical",
} as const;

export type TimerTone = keyof typeof TONE_CLASS;

export interface TimerProps extends HTMLAttributes<HTMLSpanElement> {
  seconds?: number;
  tone?: TimerTone;
  thresholds?: { warning?: number; critical?: number };
  format?: "mmss" | "seconds";
  children?: ReactNode;
}

export function Timer({
  seconds,
  tone,
  thresholds = { warning: 10, critical: 5 },
  format = "mmss",
  children,
  className = "",
  ...rest
}: TimerProps) {
  let resolvedTone: TimerTone | undefined = tone;
  if (!resolvedTone && typeof seconds === "number") {
    const crit = thresholds.critical ?? 5;
    const warn = thresholds.warning ?? 10;
    if (seconds <= crit) resolvedTone = "critical";
    else if (seconds <= warn) resolvedTone = "warning";
    else resolvedTone = "default";
  }

  const display =
    children ??
    (typeof seconds === "number"
      ? format === "seconds"
        ? `${seconds}초 남음`
        : formatMMSS(seconds)
      : null);

  return (
    <span
      className={`timer ${TONE_CLASS[resolvedTone ?? "default"]} ${className}`.trim()}
      {...rest}
    >
      {display}
    </span>
  );
}

function formatMMSS(s: number) {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
