export const DEFAULT_CODES = {
  card_back: "back.navy",
  card_face: "face.2color",
  table_theme: "table.green",
  title: "title.beginner",
} as const;

export type CosmeticCategory = keyof typeof DEFAULT_CODES;
