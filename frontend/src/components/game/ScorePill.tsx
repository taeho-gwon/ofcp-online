import type { HTMLAttributes } from "react";

export type ScoreTone = "accent" | "neutral" | "danger";

export interface ScoreProps extends HTMLAttributes<HTMLSpanElement> {
  negative?: boolean;
  tone?: ScoreTone;
}

export function Score({
  negative = false,
  tone,
  className = "",
  children,
  style,
  ...rest
}: ScoreProps) {
  const resolved: ScoreTone = negative ? "danger" : tone || "accent";
  const cls = [
    "score-pill",
    resolved === "danger" && "score-pill--neg",
    resolved === "neutral" && "score-pill--neutral",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} style={style} {...rest}>
      {children}
    </span>
  );
}

export const ScorePill = Score;
