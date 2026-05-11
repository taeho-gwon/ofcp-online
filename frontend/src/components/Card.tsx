import type { Card as CardType } from "../api/types";
import { RANK_LABEL, SUIT_IS_RED, SUIT_LABEL } from "../api/types";

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
  const red = SUIT_IS_RED[card.suit];
  const clickable = !!onClick;

  const dim = size === "sm" ? "w-11 h-14 text-lg" : "w-16 h-20 text-2xl";
  const ring = selected ? "ring-2 ring-amber-400" : "";
  const fade = faded ? "opacity-30" : "";
  const cursor = clickable ? "cursor-pointer hover:-translate-y-1" : "";
  const color = red ? "text-rose-600" : "text-slate-900";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`${dim} ${ring} ${fade} ${cursor} bg-white border border-slate-300 rounded-md flex flex-col items-center justify-center shadow-sm transition select-none disabled:cursor-default ${color}`}
    >
      <span className="font-bold leading-none">{RANK_LABEL[card.rank]}</span>
      <span className="leading-none">{SUIT_LABEL[card.suit]}</span>
    </button>
  );
}

interface SlotProps {
  onClick?: () => void;
  size?: "sm" | "md";
  highlighted?: boolean;
}

export function EmptySlot({ onClick, size = "md", highlighted = false }: SlotProps) {
  const dim = size === "sm" ? "w-11 h-14" : "w-16 h-20";
  const clickable = !!onClick;
  const cursor = clickable
    ? "cursor-pointer hover:bg-amber-100"
    : "";
  const tone = highlighted
    ? "bg-amber-100/70 border-amber-400"
    : "bg-slate-100 border-slate-300";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`${dim} ${cursor} ${tone} border border-dashed rounded-md transition disabled:cursor-default`}
    />
  );
}

export function CardBack({ size = "sm" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-11 h-14" : "w-16 h-20";
  return (
    <div
      className={`${dim} bg-gradient-to-br from-indigo-500 to-indigo-700 border border-indigo-800 rounded-md shadow-sm`}
    />
  );
}
