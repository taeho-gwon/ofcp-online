/* eslint-disable react-refresh/only-export-components */
/**
 * 기본 카드 스킨.
 *
 * 카드 시각은 디자인 시스템 토큰을 거치지 않고 raw 색을 사용한다 —
 * 추후 라이트/다크 모드가 도입되더라도 카드 face·back·slot은 변하지 않아야 한다.
 */
import { RANK_LABEL, SUIT_IS_RED, SUIT_LABEL } from "../../api/types";
import type {
  CardBackSkinProps,
  CardFaceProps,
  CardSize,
  CardSkin,
  EmptySlotSkinProps,
} from "./types";

interface Dim {
  width: number;
  height: number;
  cornerRank: number;
  cornerSuit: number;
  centerSuit: number;
  pad: number;
}

const DIM: Record<CardSize, Dim> = {
  sm: { width: 44, height: 56, cornerRank: 12, cornerSuit: 10, centerSuit: 22, pad: 4 },
  md: { width: 64, height: 80, cornerRank: 16, cornerSuit: 13, centerSuit: 34, pad: 5 },
};

const CARD_BG = "#ffffff";
const CARD_BORDER = "#d3dae3";
const CARD_SHADOW = "0 1px 2px rgba(15, 23, 42, 0.08)";
const CARD_RADIUS = 6;
const SUIT_RED = "#c0392b";
const SUIT_BLACK = "#1a1f2b";

const BACK_GRADIENT = "linear-gradient(135deg, #1a4d7a 0%, #0d2c4a 100%)";
const BACK_BORDER = "#0d2c4a";

const SLOT_BG = "rgba(15, 23, 42, 0.04)";
const SLOT_BG_HL = "rgba(31, 157, 106, 0.12)";
const SLOT_BORDER = "rgba(15, 23, 42, 0.18)";
const SLOT_BORDER_HL = "#1f9d6a";

function Face({ card, size }: CardFaceProps) {
  const d = DIM[size];
  const isRed = SUIT_IS_RED[card.suit];
  const color = isRed ? SUIT_RED : SUIT_BLACK;
  const rank = RANK_LABEL[card.rank];
  const suit = SUIT_LABEL[card.suit];

  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
        position: "relative",
        color,
        fontFamily: "var(--font-mono)",
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: d.pad,
          left: d.pad,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          gap: 1,
        }}
      >
        <span style={{ fontSize: d.cornerRank, fontWeight: 700 }}>{rank}</span>
        <span style={{ fontSize: d.cornerSuit }}>{suit}</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: d.centerSuit,
          lineHeight: 1,
        }}
      >
        {suit}
      </div>
    </div>
  );
}

function Back({ size }: CardBackSkinProps) {
  const d = DIM[size];
  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        background: BACK_GRADIENT,
        border: `1px solid ${BACK_BORDER}`,
        borderRadius: CARD_RADIUS,
        boxShadow: CARD_SHADOW,
      }}
    />
  );
}

function EmptySlot({ size, highlighted }: EmptySlotSkinProps) {
  const d = DIM[size];
  return (
    <div
      style={{
        width: d.width,
        height: d.height,
        background: highlighted ? SLOT_BG_HL : SLOT_BG,
        border: `1px dashed ${highlighted ? SLOT_BORDER_HL : SLOT_BORDER}`,
        borderRadius: CARD_RADIUS,
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    />
  );
}

export const defaultSkin: CardSkin = {
  id: "default",
  name: "기본",
  Face,
  Back,
  EmptySlot,
};
