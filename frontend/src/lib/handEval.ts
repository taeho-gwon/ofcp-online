// app/game/hand.py 의 evaluate 와 board.is_foul 로직을 미러링.
// 변경 시 양쪽 함께 수정.

import type { Card } from "../api/types";

export const HandRank = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
} as const;

export type HandRankValue = (typeof HandRank)[keyof typeof HandRank];

export interface HandValue {
  rank: HandRankValue;
  tiebreakers: number[];
}

function ranksDesc(cards: Card[]): number[] {
  return cards.map((c) => c.rank).sort((a, b) => b - a);
}

function countByRank(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
  return m;
}

// counts 내림차순 + 같은 count면 rank 내림차순
function rankGroups(counts: Map<number, number>): { rank: number; count: number }[] {
  return Array.from(counts.entries())
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function checkStraight(ranks: number[]): { is: boolean; high: number } {
  const unique = Array.from(new Set(ranks)).sort((a, b) => b - a);
  if (unique.length === 5 && unique[0] - unique[4] === 4) {
    return { is: true, high: unique[0] };
  }
  // A-2-3-4-5 wheel
  if (
    unique.length === 5 &&
    unique[0] === 14 &&
    unique[1] === 5 &&
    unique[2] === 4 &&
    unique[3] === 3 &&
    unique[4] === 2
  ) {
    return { is: true, high: 5 };
  }
  return { is: false, high: 0 };
}

function evaluateThree(cards: Card[]): HandValue {
  const ranks = ranksDesc(cards);
  const counts = countByRank(cards);
  const groups = rankGroups(counts);

  if (groups[0].count === 3) {
    return { rank: HandRank.THREE_OF_A_KIND, tiebreakers: [groups[0].rank] };
  }
  if (groups[0].count === 2) {
    const pair = groups[0].rank;
    const kicker = ranks.find((r) => r !== pair)!;
    return { rank: HandRank.ONE_PAIR, tiebreakers: [pair, kicker] };
  }
  return { rank: HandRank.HIGH_CARD, tiebreakers: ranks };
}

function evaluateFive(cards: Card[]): HandValue {
  const ranks = ranksDesc(cards);
  const counts = countByRank(cards);
  const groups = rankGroups(counts);
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;
  const { is: isStraight, high: straightHigh } = checkStraight(ranks);

  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { rank: HandRank.ROYAL_FLUSH, tiebreakers: [straightHigh] };
    }
    return { rank: HandRank.STRAIGHT_FLUSH, tiebreakers: [straightHigh] };
  }
  if (groups[0].count === 4) {
    const quad = groups[0].rank;
    const kicker = ranks.find((r) => r !== quad)!;
    return { rank: HandRank.FOUR_OF_A_KIND, tiebreakers: [quad, kicker] };
  }
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return {
      rank: HandRank.FULL_HOUSE,
      tiebreakers: [groups[0].rank, groups[1].rank],
    };
  }
  if (isFlush) {
    return { rank: HandRank.FLUSH, tiebreakers: ranks };
  }
  if (isStraight) {
    return { rank: HandRank.STRAIGHT, tiebreakers: [straightHigh] };
  }
  if (groups[0].count === 3) {
    const trip = groups[0].rank;
    const kickers = ranks.filter((r) => r !== trip);
    return { rank: HandRank.THREE_OF_A_KIND, tiebreakers: [trip, ...kickers] };
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const [hi, lo] = [groups[0].rank, groups[1].rank].sort((a, b) => b - a);
    const kicker = ranks.find((r) => r !== hi && r !== lo)!;
    return { rank: HandRank.TWO_PAIR, tiebreakers: [hi, lo, kicker] };
  }
  if (groups[0].count === 2) {
    const pair = groups[0].rank;
    const kickers = ranks.filter((r) => r !== pair);
    return { rank: HandRank.ONE_PAIR, tiebreakers: [pair, ...kickers] };
  }
  return { rank: HandRank.HIGH_CARD, tiebreakers: ranks };
}

export function evaluate(cards: Card[]): HandValue {
  if (cards.length === 3) return evaluateThree(cards);
  if (cards.length === 5) return evaluateFive(cards);
  throw new Error(`Cannot evaluate ${cards.length}-card hand`);
}

function compareHand(a: HandValue, b: HandValue): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  const n = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < n; i++) {
    const x = a.tiebreakers[i] ?? 0;
    const y = b.tiebreakers[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// bottom >= middle >= top 가 아니면 foul (백엔드 board.is_foul과 동일).
export function isFoulBoard(
  top: Card[],
  middle: Card[],
  bottom: Card[],
): boolean {
  if (top.length !== 3 || middle.length !== 5 || bottom.length !== 5) {
    return false; // 미완성 보드는 foul 판정 안 함
  }
  const t = evaluate(top);
  const m = evaluate(middle);
  const b = evaluate(bottom);
  return !(compareHand(b, m) >= 0 && compareHand(m, t) >= 0);
}
