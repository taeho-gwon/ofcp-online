// 백엔드 app/game/scoring.py의 head_to_head_detail 미러.
// 변경 시 양쪽 함께 수정.

import type { Card, Matchup } from "../api/types";
import { evaluate, type HandValue, isFoulBoard } from "./handEval";
import { royaltyBottom, royaltyMiddle, royaltyTop } from "./royalty";

const SCOOP_BONUS = 3;

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
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

function cmpLine(a: Card[], b: Card[]): number {
  const d = compareHand(evaluate(a), evaluate(b));
  if (d > 0) return 1;
  if (d < 0) return -1;
  return 0;
}

export function headToHeadMatchup(
  aId: string,
  bId: string,
  a: Board,
  b: Board,
): Matchup {
  const foulA = isFoulBoard(a.top, a.middle, a.bottom);
  const foulB = isFoulBoard(b.top, b.middle, b.bottom);

  const topRoyA = foulA ? 0 : royaltyTop(a.top, false);
  const midRoyA = foulA ? 0 : royaltyMiddle(a.middle, false);
  const botRoyA = foulA ? 0 : royaltyBottom(a.bottom, false);
  const topRoyB = foulB ? 0 : royaltyTop(b.top, false);
  const midRoyB = foulB ? 0 : royaltyMiddle(b.middle, false);
  const botRoyB = foulB ? 0 : royaltyBottom(b.bottom, false);

  let topLine: number, middleLine: number, bottomLine: number;
  if (foulA && foulB) {
    topLine = middleLine = bottomLine = 0;
  } else if (foulA) {
    topLine = middleLine = bottomLine = -1;
  } else if (foulB) {
    topLine = middleLine = bottomLine = 1;
  } else {
    topLine = cmpLine(a.top, b.top);
    middleLine = cmpLine(a.middle, b.middle);
    bottomLine = cmpLine(a.bottom, b.bottom);
  }

  const lineSum = topLine + middleLine + bottomLine;
  const scoop = lineSum === 3 ? SCOOP_BONUS : lineSum === -3 ? -SCOOP_BONUS : 0;
  const royaltyDiff =
    topRoyA + midRoyA + botRoyA - (topRoyB + midRoyB + botRoyB);
  const total = lineSum + scoop + royaltyDiff;

  return {
    a_id: aId,
    b_id: bId,
    top_line_a: topLine,
    top_royalty_a: topRoyA,
    top_royalty_b: topRoyB,
    middle_line_a: middleLine,
    middle_royalty_a: midRoyA,
    middle_royalty_b: midRoyB,
    bottom_line_a: bottomLine,
    bottom_royalty_a: botRoyA,
    bottom_royalty_b: botRoyB,
    scoop_a: scoop,
    foul_a: foulA,
    foul_b: foulB,
    total_a: total,
  };
}
