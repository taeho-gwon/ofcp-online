import { DEFAULT_CODES } from "../defaults";
import type { TableThemeVariant } from "../types";

export const TABLE_THEMES: Record<string, TableThemeVariant> = {
  "table.green": {
    code: "table.green",
    name: "그린 펠트",
    surfaceStyle: {
      background:
        "radial-gradient(ellipse at center, #1f7a4a 0%, #145d36 70%, #0f4426 100%)",
      boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.4)",
    },
  },
  "table.walnut": {
    code: "table.walnut",
    name: "월넛",
    surfaceStyle: {
      background:
        "repeating-linear-gradient(90deg, #5c3a1f 0px, #6b4528 2px, #5c3a1f 4px), radial-gradient(ellipse at center, #6b4528 0%, #3d2614 100%)",
      backgroundBlendMode: "multiply",
      boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.4)",
    },
  },
};

export function resolveTableTheme(
  code: string | null | undefined,
): TableThemeVariant {
  if (code && TABLE_THEMES[code]) return TABLE_THEMES[code];
  return TABLE_THEMES[DEFAULT_CODES.table_theme];
}
