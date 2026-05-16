import type { ReactNode } from "react";

export interface SegmentedOption {
  value: string;
  label: ReactNode;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (next: string) => void;
  "aria-label"?: string;
}

export function Segmented({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
}: SegmentedProps) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={value === opt.value ? "is-on" : ""}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
