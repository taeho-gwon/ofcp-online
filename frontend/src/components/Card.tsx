import type { Card as CardType } from "../api/types";
import { usePlayerCardSkin } from "../cosmetics/useResolved";

interface Props {
  card: CardType;
  /** 이 카드를 "소유한" 플레이어 id. 코스메틱 스킨 결정에 사용. 빈 문자열은 default fallback. */
  playerId: string;
  selected?: boolean;
  faded?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function CardView({
  card,
  playerId,
  selected = false,
  faded = false,
  onClick,
  size = "md",
}: Props) {
  const skin = usePlayerCardSkin(playerId);
  const clickable = !!onClick;
  const cls = [
    "card-view",
    clickable && "is-clickable",
    selected && "is-selected",
    faded && "is-faded",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" onClick={onClick} disabled={!clickable} className={cls}>
      <skin.Face card={card} size={size} />
    </button>
  );
}

interface SlotProps {
  playerId: string;
  onClick?: () => void;
  size?: "sm" | "md";
  highlighted?: boolean;
}

export function EmptySlot({
  playerId,
  onClick,
  size = "md",
  highlighted = false,
}: SlotProps) {
  const skin = usePlayerCardSkin(playerId);
  const clickable = !!onClick;
  const cls = ["card-slot", clickable && "is-clickable"]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" onClick={onClick} disabled={!clickable} className={cls}>
      <skin.EmptySlot size={size} highlighted={highlighted} />
    </button>
  );
}

export function CardBack({
  playerId,
  size = "sm",
}: {
  playerId: string;
  size?: "sm" | "md";
}) {
  const skin = usePlayerCardSkin(playerId);
  return <skin.Back size={size} />;
}
