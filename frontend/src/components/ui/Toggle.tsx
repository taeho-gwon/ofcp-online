export interface ToggleProps {
  on: boolean;
  onChange: (next: boolean) => void;
  "aria-label"?: string;
}

export function Toggle({ on, onChange, "aria-label": ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle ${on ? "is-on" : ""}`.trim()}
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!on);
        }
      }}
    />
  );
}
