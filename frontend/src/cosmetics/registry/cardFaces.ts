import { ClassicEmptySlot } from "../components/ClassicEmptySlot";
import { FourColorFace, TwoColorFace } from "../components/SuitFace";
import { DEFAULT_CODES } from "../defaults";
import type { CardFaceVariant } from "../types";

export const CARD_FACES: Record<string, CardFaceVariant> = {
  "face.2color": {
    code: "face.2color",
    name: "2색 덱",
    Face: TwoColorFace,
    EmptySlot: ClassicEmptySlot,
  },
  "face.4color": {
    code: "face.4color",
    name: "4색 덱",
    Face: FourColorFace,
    EmptySlot: ClassicEmptySlot,
  },
};

export function resolveCardFace(code: string | null | undefined): CardFaceVariant {
  if (code && CARD_FACES[code]) return CARD_FACES[code];
  return CARD_FACES[DEFAULT_CODES.card_face];
}
