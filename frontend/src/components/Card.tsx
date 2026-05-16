import type { Card as CardType } from "../api/types";
import { useCardSkin } from "./cardSkins";

interface Props {
  card: CardType;
  selected?: boolean;
  faded?: boolean;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function CardView({
  card,
  selected = false,
  faded = false,
  onClick,
  size = "md",
}: Props) {
  const skin = useCardSkin();
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
  onClick?: () => void;
  size?: "sm" | "md";
  highlighted?: boolean;
}

export function EmptySlot({
  onClick,
  size = "md",
  highlighted = false,
}: SlotProps) {
  const skin = useCardSkin();
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

export function CardBack({ size = "sm" }: { size?: "sm" | "md" }) {
  const skin = useCardSkin();
  return <skin.Back size={size} />;
}
