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
  sm: { width: 56, height: 72, rank: 26, cornerSuit: 12, centerSuit: 30, pad: 5 },
  md: { width: 80, height: 104, rank: 36, cornerSuit: 16, centerSuit: 44, pad: 6 },
};

/**
 * 다크 모던 스타일 — 어두운 배경에 형광 톤 rank/suit.
 * classic(밝은 흰 배경)과 한눈에 구분되도록 디자인.
 */
export function ModernFace({ card, size }: { card: Card; size: CardSize }) {
  const d = DIM[size];
  const red = SUIT_IS_RED[card.suit];
  // 다크 배경 위 강한 형광 톤
  const accent = red ? "#ff4d8a" : "#52e0c4";
  const subtle = red ? "#ff80a8" : "#7fffe0";
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        borderRadius: 8,
        display: "block",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
      }}
    >
      <defs>
        <linearGradient id="modern-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0d0d1a" />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={d.width}
        height={d.height}
        fill="url(#modern-bg)"
        rx={8}
        ry={8}
      />
      <rect
        x={1}
        y={1}
        width={d.width - 2}
        height={d.height - 2}
        fill="none"
        stroke={accent}
        strokeWidth={1.2}
        opacity={0.6}
        rx={7}
        ry={7}
      />
      {/* 좌상단 큰 rank */}
      <text
        x={d.pad + 2}
        y={d.pad + d.rank - 2}
        fontSize={d.rank}
        fontWeight={900}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={accent}
      >
        {RANK_LABEL[card.rank]}
      </text>
      {/* 우상단 작은 suit */}
      <text
        x={d.width - d.pad}
        y={d.pad + d.cornerSuit + 1}
        fontSize={d.cornerSuit}
        fill={subtle}
        textAnchor="end"
      >
        {SUIT_LABEL[card.suit]}
      </text>
      {/* 가운데 큰 suit */}
      <text
        x={d.width / 2}
        y={d.height - d.pad - 4}
        fontSize={d.centerSuit}
        fill={accent}
        textAnchor="middle"
        opacity={0.95}
      >
        {SUIT_LABEL[card.suit]}
      </text>
    </svg>
  );
}
