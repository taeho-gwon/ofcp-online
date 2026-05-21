import {
  RANK_LABEL,
  SUIT_IS_RED,
  SUIT_LABEL,
  type Card,
} from "../../api/types";
import type { CardSize } from "../types";

interface Dim {
  width: number;
  height: number;
  rank: number;
  cornerSuit: number;
  centerSuit: number;
  pad: number;
}

const DIM: Record<CardSize, Dim> = {
  sm: { width: 56, height: 72, rank: 22, cornerSuit: 11, centerSuit: 26, pad: 5 },
  md: { width: 80, height: 104, rank: 30, cornerSuit: 14, centerSuit: 40, pad: 6 },
};

export function ModernFace({ card, size }: { card: Card; size: CardSize }) {
  const d = DIM[size];
  const red = SUIT_IS_RED[card.suit];
  const color = red ? "#e11d48" : "#0f172a";
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        background: "#fafafa",
        borderRadius: 8,
        boxShadow: "0 0 0 1px #888 inset",
        display: "block",
      }}
    >
      <text
        x={d.pad}
        y={d.pad + d.rank}
        fontSize={d.rank}
        fontWeight={900}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={color}
      >
        {RANK_LABEL[card.rank]}
      </text>
      <text
        x={d.width - d.pad}
        y={d.pad + d.cornerSuit}
        fontSize={d.cornerSuit}
        fill={color}
        textAnchor="end"
      >
        {SUIT_LABEL[card.suit]}
      </text>
      <text
        x={d.width / 2}
        y={d.height - d.pad - 4}
        fontSize={d.centerSuit}
        fill={color}
        textAnchor="middle"
        opacity={0.9}
      >
        {SUIT_LABEL[card.suit]}
      </text>
    </svg>
  );
}
