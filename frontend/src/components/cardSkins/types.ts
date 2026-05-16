import type { ReactElement } from "react";
import type { Card } from "../../api/types";

export type CardSize = "sm" | "md";

export interface CardFaceProps {
  card: Card;
  size: CardSize;
}

export interface CardBackSkinProps {
  size: CardSize;
}

export interface EmptySlotSkinProps {
  size: CardSize;
  highlighted: boolean;
}

/**
 * 카드 스킨은 카드의 시각만 책임진다.
 * 인터랙션(click·hover·selected·faded)은 `components/Card.tsx`의 wrapper가 담당.
 */
export interface CardSkin {
  id: string;
  name: string;
  Face: (props: CardFaceProps) => ReactElement;
  Back: (props: CardBackSkinProps) => ReactElement;
  EmptySlot: (props: EmptySlotSkinProps) => ReactElement;
}
