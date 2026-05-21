import type { ReactNode } from "react";
import type { TableThemeVariant } from "../types";

export function TableSurface({
  theme,
  children,
}: {
  theme: TableThemeVariant;
  children: ReactNode;
}) {
  return (
    <div
      className={theme.surfaceClass}
      style={{ borderRadius: 12, padding: 12, ...theme.surfaceStyle }}
    >
      {children}
    </div>
  );
}
