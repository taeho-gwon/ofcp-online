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

/** 표준 포커덱 — 빨강(♦♥) / 검정(♣♠) 2색. */
const TWO_COLOR: Record<number, string> = {
  1: "#1a1a1a", // ♣ 검정
  2: "#c2185b", // ♦ 빨강
  3: "#c2185b", // ♥ 빨강
  4: "#1a1a1a", // ♠ 검정
};

/** 4색 덱 — 각 suit 마다 고유 색. 가독성 강화. */
const FOUR_COLOR: Record<number, string> = {
  1: "#16a34a", // ♣ 초록
  2: "#1d4ed8", // ♦ 파랑
  3: "#c2185b", // ♥ 빨강
  4: "#1a1a1a", // ♠ 검정
};

function SuitFace({
  card,
  size,
  colorMap,
}: {
  card: Card;
  size: CardSize;
  colorMap: Record<number, string>;
}) {
  const d = DIM[size];
  const color = colorMap[card.suit] ?? (SUIT_IS_RED[card.suit] ? "#c2185b" : "#1a1a1a");
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

export function TwoColorFace({ card, size }: { card: Card; size: CardSize }) {
  return <SuitFace card={card} size={size} colorMap={TWO_COLOR} />;
}

export function FourColorFace({ card, size }: { card: Card; size: CardSize }) {
  return <SuitFace card={card} size={size} colorMap={FOUR_COLOR} />;
}
