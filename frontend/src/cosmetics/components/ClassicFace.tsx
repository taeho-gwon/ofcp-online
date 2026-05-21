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
  cornerRank: number;
  cornerSuit: number;
  centerSuit: number;
  pad: number;
}

const DIM: Record<CardSize, Dim> = {
  sm: {
    width: 56,
    height: 72,
    cornerRank: 15,
    cornerSuit: 13,
    centerSuit: 28,
    pad: 5,
  },
  md: {
    width: 80,
    height: 104,
    cornerRank: 20,
    cornerSuit: 16,
    centerSuit: 42,
    pad: 6,
  },
};

export function ClassicFace({ card, size }: { card: Card; size: CardSize }) {
  const d = DIM[size];
  const red = SUIT_IS_RED[card.suit];
  const color = red ? "#c2185b" : "#1a1a1a";
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        background: "#ffffff",
        borderRadius: 6,
        boxShadow: "0 0 0 1px #b3b3b3 inset",
        display: "block",
      }}
    >
      <text
        x={d.pad}
        y={d.pad + d.cornerRank}
        fontSize={d.cornerRank}
        fontWeight={700}
        fill={color}
      >
        {RANK_LABEL[card.rank]}
      </text>
      <text
        x={d.pad}
        y={d.pad + d.cornerRank + d.cornerSuit + 2}
        fontSize={d.cornerSuit}
        fill={color}
      >
        {SUIT_LABEL[card.suit]}
      </text>
      <text
        x={d.width / 2}
        y={d.height / 2 + d.centerSuit / 3}
        fontSize={d.centerSuit}
        fill={color}
        textAnchor="middle"
      >
        {SUIT_LABEL[card.suit]}
      </text>
    </svg>
  );
}
