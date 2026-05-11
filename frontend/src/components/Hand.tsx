import { useEffect, useMemo, useState } from "react";
import type { Card } from "../api/types";
import { CardView } from "./Card";

type SortMode = "rank" | "suit";

const STORAGE_KEY = "ofc.handSort";

function loadSortMode(): SortMode {
  if (typeof window === "undefined") return "rank";
  return window.localStorage.getItem(STORAGE_KEY) === "suit" ? "suit" : "rank";
}

function sortIndices(cards: Card[], mode: SortMode): number[] {
  const out = cards.map((_, i) => i);
  out.sort((a, b) => {
    const ca = cards[a];
    const cb = cards[b];
    if (mode === "rank") {
      return ca.rank - cb.rank || ca.suit - cb.suit;
    }
    return ca.suit - cb.suit || ca.rank - cb.rank;
  });
  return out;
}

interface Props {
  hand: Card[];
  placedIdxSet: Set<number>;
  enabled: boolean;
  selectedIdx: number | null;
  onPlace: (idx: number) => void;
  onUnplace: (idx: number) => void;
}

export function Hand({
  hand,
  placedIdxSet,
  enabled,
  selectedIdx,
  onPlace,
  onUnplace,
}: Props) {
  const [mode, setMode] = useState<SortMode>(loadSortMode);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const ordered = useMemo(() => sortIndices(hand, mode), [hand, mode]);

  return (
    <div className="flex flex-col items-center gap-2">
      {hand.length > 0 && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 mr-1">정렬</span>
          <SortToggle
            label="숫자순"
            active={mode === "rank"}
            onClick={() => setMode("rank")}
          />
          <SortToggle
            label="모양순"
            active={mode === "suit"}
            onClick={() => setMode("suit")}
          />
        </div>
      )}
      <div className="flex items-center gap-2 justify-center min-h-20">
        {hand.length === 0 && (
          <span className="text-slate-400 text-sm">손패 없음</span>
        )}
        {ordered.map((i) => {
          const c = hand[i];
          const isPlaced = placedIdxSet.has(i);
          const isSelected = selectedIdx === i;
          const clickable = enabled;
          const handleClick = !clickable
            ? undefined
            : isPlaced
              ? () => onUnplace(i)
              : () => onPlace(i);
          return (
            <CardView
              key={i}
              card={c}
              faded={isPlaced}
              selected={isSelected}
              onClick={handleClick}
            />
          );
        })}
      </div>
    </div>
  );
}

function SortToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 rounded border transition-colors ${
        active
          ? "bg-slate-800 text-white border-slate-800"
          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
