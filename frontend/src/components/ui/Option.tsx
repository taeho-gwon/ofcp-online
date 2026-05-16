import type { ReactNode } from "react";

export interface OptionProps {
  kind?: "radio" | "checkbox";
  on: boolean;
  onChange: (next: boolean) => void;
  children?: ReactNode;
}

export function Option({
  kind = "checkbox",
  on,
  onChange,
  children,
}: OptionProps) {
  return (
    <label className={`option ${on ? "is-on" : ""}`.trim()}>
      <input
        type={kind === "radio" ? "radio" : "checkbox"}
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      <span
        className={`option-box ${kind === "radio" ? "is-radio" : ""}`.trim()}
        aria-hidden="true"
      />
      {children}
    </label>
  );
}
