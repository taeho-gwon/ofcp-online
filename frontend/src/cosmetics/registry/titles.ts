import { DEFAULT_CODES } from "../defaults";
import type { TitleVariant } from "../types";

export const TITLES: Record<string, TitleVariant> = {
  "title.beginner": {
    code: "title.beginner",
    name: "초보자",
    text: "초보자",
    style: { background: "#888", color: "#ffffff" },
  },
  "title.fl_demon": {
    code: "title.fl_demon",
    name: "판타지랜드 악마",
    text: "판타지랜드 악마",
    style: {
      background: "linear-gradient(90deg, #7b2ff7 0%, #f107a3 100%)",
      color: "#ffd700",
      boxShadow: "0 0 4px rgba(241, 7, 163, 0.5)",
    },
  },
};

export function resolveTitle(code: string | null | undefined): TitleVariant {
  if (code && TITLES[code]) return TITLES[code];
  return TITLES[DEFAULT_CODES.title];
}
