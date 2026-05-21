import { NavyBack } from "../components/NavyBack";
import { OceanBack } from "../components/OceanBack";
import { DEFAULT_CODES } from "../defaults";
import type { CardBackVariant } from "../types";

export const CARD_BACKS: Record<string, CardBackVariant> = {
  "back.navy": { code: "back.navy", name: "네이비", Component: NavyBack },
  "back.ocean": { code: "back.ocean", name: "오션", Component: OceanBack },
};

export function resolveCardBack(code: string | null | undefined): CardBackVariant {
  if (code && CARD_BACKS[code]) return CARD_BACKS[code];
  return CARD_BACKS[DEFAULT_CODES.card_back];
}
