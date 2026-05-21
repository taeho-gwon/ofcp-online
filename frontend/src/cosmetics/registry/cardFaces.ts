import { ClassicEmptySlot } from "../components/ClassicEmptySlot";
import { ClassicFace } from "../components/ClassicFace";
import { ModernFace } from "../components/ModernFace";
import { DEFAULT_CODES } from "../defaults";
import type { CardFaceVariant } from "../types";

export const CARD_FACES: Record<string, CardFaceVariant> = {
  "face.classic": {
    code: "face.classic",
    name: "클래식",
    Face: ClassicFace,
    EmptySlot: ClassicEmptySlot,
  },
  "face.modern": {
    code: "face.modern",
    name: "모던",
    Face: ModernFace,
    EmptySlot: ClassicEmptySlot,
  },
};

export function resolveCardFace(code: string | null | undefined): CardFaceVariant {
  if (code && CARD_FACES[code]) return CARD_FACES[code];
  return CARD_FACES[DEFAULT_CODES.card_face];
}
