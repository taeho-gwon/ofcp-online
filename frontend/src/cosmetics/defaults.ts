export const DEFAULT_CODES = {
  card_back: "back.navy",
  card_face: "face.classic",
  table_theme: "table.green",
  title: "title.beginner",
} as const;

export type CosmeticCategory = keyof typeof DEFAULT_CODES;
