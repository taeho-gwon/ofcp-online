import { defaultSkin } from "./default";
import type { CardSkin } from "./types";

export type { CardSkin, CardSize } from "./types";

/**
 * 등록된 카드 스킨. 추후 유료 스킨을 여기에 추가한다.
 */
export const CARD_SKINS: Record<string, CardSkin> = {
  default: defaultSkin,
};

/**
 * 현재 사용자가 선택한 카드 스킨을 반환한다.
 *
 * 1단계: 항상 `default`. 추후 store에서 사용자 선택을 읽어 결정.
 */
export function useCardSkin(): CardSkin {
  return CARD_SKINS.default;
}
