// 백엔드 app/game/scoring.py PINEAPPLE_OFC 룰셋 미러링.

import type { Card } from "../api/types";
import { evaluate, HandRank, type HandRankValue, type HandValue } from "./handEval";

const TOP_PAIR_ROYALTY: Record<number, number> = {
  6: 1,
  7: 2,
  8: 3,
  9: 4,
  10: 5,
  11: 6,
  12: 7,
  13: 8,
  14: 9,
};

const MIDDLE_ROYALTY: Partial<Record<HandRankValue, number>> = {
  [HandRank.THREE_OF_A_KIND]: 2,
  [HandRank.STRAIGHT]: 4,
  [HandRank.FLUSH]: 8,
  [HandRank.FULL_HOUSE]: 12,
  [HandRank.FOUR_OF_A_KIND]: 20,
  [HandRank.STRAIGHT_FLUSH]: 30,
  [HandRank.ROYAL_FLUSH]: 50,
};

const BOTTOM_ROYALTY: Partial<Record<HandRankValue, number>> = {
  [HandRank.STRAIGHT]: 2,
  [HandRank.FLUSH]: 4,
  [HandRank.FULL_HOUSE]: 6,
  [HandRank.FOUR_OF_A_KIND]: 10,
  [HandRank.STRAIGHT_FLUSH]: 15,
  [HandRank.ROYAL_FLUSH]: 25,
};

export function royaltyTop(top: Card[], isFoul: boolean): number {
  if (isFoul || top.length !== 3) return 0;
  const hv = evaluate(top);
  if (hv.rank === HandRank.THREE_OF_A_KIND) return hv.tiebreakers[0] - 2 + 10;
  if (hv.rank === HandRank.ONE_PAIR) {
    return TOP_PAIR_ROYALTY[hv.tiebreakers[0]] ?? 0;
  }
  return 0;
}

export function royaltyMiddle(middle: Card[], isFoul: boolean): number {
  if (isFoul || middle.length !== 5) return 0;
  return MIDDLE_ROYALTY[evaluate(middle).rank] ?? 0;
}

export function royaltyBottom(bottom: Card[], isFoul: boolean): number {
  if (isFoul || bottom.length !== 5) return 0;
  return BOTTOM_ROYALTY[evaluate(bottom).rank] ?? 0;
}

const HAND_RANK_LABEL: Record<HandRankValue, string> = {
  [HandRank.HIGH_CARD]: "하이카드",
  [HandRank.ONE_PAIR]: "원페어",
  [HandRank.TWO_PAIR]: "투페어",
  [HandRank.THREE_OF_A_KIND]: "트리플",
  [HandRank.STRAIGHT]: "스트레이트",
  [HandRank.FLUSH]: "플러시",
  [HandRank.FULL_HOUSE]: "풀하우스",
  [HandRank.FOUR_OF_A_KIND]: "포카드",
  [HandRank.STRAIGHT_FLUSH]: "스트레이트 플러시",
  [HandRank.ROYAL_FLUSH]: "로열 플러시",
};

const RANK_CHAR: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function handLabel(hv: HandValue): string {
  const base = HAND_RANK_LABEL[hv.rank];
  const tb = hv.tiebreakers;
  switch (hv.rank) {
    case HandRank.ROYAL_FLUSH:
      return base;
    case HandRank.STRAIGHT_FLUSH:
    case HandRank.STRAIGHT:
    case HandRank.FLUSH:
    case HandRank.HIGH_CARD:
      return `${base} (${RANK_CHAR[tb[0]]}-high)`;
    case HandRank.FOUR_OF_A_KIND:
      return `${base} ${RANK_CHAR[tb[0]].repeat(4)}`;
    case HandRank.FULL_HOUSE:
      return `${base} (${RANK_CHAR[tb[0]].repeat(3)}+${RANK_CHAR[tb[1]].repeat(2)})`;
    case HandRank.THREE_OF_A_KIND:
      return `${base} ${RANK_CHAR[tb[0]].repeat(3)}`;
    case HandRank.TWO_PAIR:
      return `${base} ${RANK_CHAR[tb[0]].repeat(2)}+${RANK_CHAR[tb[1]].repeat(2)}`;
    case HandRank.ONE_PAIR:
      return `${base} ${RANK_CHAR[tb[0]].repeat(2)}`;
    default:
      return base;
  }
}
