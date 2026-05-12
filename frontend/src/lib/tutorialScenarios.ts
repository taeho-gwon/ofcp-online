// 튜토리얼 시나리오 — 사용자/봇 모두 고정 배치(script).
// 사용자는 '다음' 버튼만 누르며 한 턴씩 자동 진행한다.

import type { Card, Row } from "../api/types";

const C = (rank: number, suit: number): Card => ({ rank, suit });

export interface NormalTurnScript {
  placements: { handIdxInTurn: 0 | 1 | 2; row: Row }[];
  discardHandIdxInTurn: 0 | 1 | 2;
}

export interface PlayerScript {
  cards: Card[]; // 17장
  firstTurnPlacements: Row[]; // 5개
  normalTurns: NormalTurnScript[]; // 4개
}

export type BubbleKey =
  | "intro"
  | "first_turn_my"
  | "first_turn_opp_done"
  | "normal_turn_my"
  | "result";

export interface TutorialScenario {
  id: string;
  title: string;
  outro: string;
  player: PlayerScript;
  opponent: PlayerScript & { nickname: string };
  bubbles: Record<BubbleKey, string>;
}

// ── 시나리오 1: 기본 — 분배 + bottom 플러시 Royalty ─────────────────────────
export const SCENARIO_BASICS: TutorialScenario = {
  id: "basics",
  title: "기본 라운드",
  outro:
    "라운드 종료. bottom에 ♥ 플러시를 만들면 Royalty +4. 봇과 줄별로 비교해 합산됩니다.",
  player: {
    cards: [
      // first 5: 2♣ K♠ 4♥ A♥ 7♥ — 분배 필요
      C(2, 1), C(13, 4), C(4, 3), C(14, 3), C(7, 3),
      // normal 2: J♥ 9♠ 3♣
      C(11, 3), C(9, 4), C(3, 1),
      // normal 3: T♥ K♣ 6♣
      C(10, 3), C(13, 1), C(6, 1),
      // normal 4: 8♥ 9♣ 5♦
      C(8, 3), C(9, 1), C(5, 2),
      // normal 5: 6♦ 5♣ 2♦
      C(6, 2), C(5, 1), C(2, 2),
    ],
    // first 5: 2♣→top, K♠→middle, 4♥→middle, A♥→bottom, 7♥→bottom
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      // turn 2 (J♥ 9♠ 3♣): J♥→bottom, 9♠→middle, 3♣ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (T♥ K♣ 6♣): T♥→bottom, K♣→middle, 6♣ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (8♥ 9♣ 5♦): 8♥→bottom (bottom flush 완성), 9♣→middle (middle 완성), 5♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5 (6♦ 5♣ 2♦): 6♦→top, 5♣→top, 2♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "top" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
    ],
  },
  opponent: {
    nickname: "튜토리얼 봇",
    cards: [
      // first 5: 3♠ 5♥ 5♠ 6♥ 7♠
      C(3, 4), C(5, 3), C(5, 4), C(6, 3), C(7, 4),
      // normal 2: 3♦ Q♥ 4♣
      C(3, 2), C(12, 3), C(4, 1),
      // normal 3: J♦ 8♠ 4♦
      C(11, 2), C(8, 4), C(4, 2),
      // normal 4: 8♦ 9♥ 2♠
      C(8, 2), C(9, 3), C(2, 4),
      // normal 5: 2♥ T♠ 9♦
      C(2, 3), C(10, 4), C(9, 2),
    ],
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      {
        placements: [
          { handIdxInTurn: 0, row: "top" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "top" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
    ],
  },
  bubbles: {
    intro:
      "OFC 한 라운드를 봇과 함께 따라가 봅니다. '다음'을 누르면 한 턴씩 진행됩니다.",
    first_turn_my:
      "첫 5장을 받았습니다. bottom > middle > top 순으로 강해야 Foul을 피합니다. ♥ 카드를 bottom에 모으면 플러시를 노릴 수 있습니다.",
    first_turn_opp_done:
      "봇도 5장을 같은 방식으로 배치했습니다. 봇의 보드도 비교하며 보세요.",
    normal_turn_my:
      "이제 매 턴 3장씩 받고 2장만 배치합니다. 1장은 버립니다. 4번 더 진행하면 보드가 완성됩니다.",
    result:
      "라운드 종료. 줄별로 라인 점수(±1) + 스쿱(±3) + Royalty 차이가 합산됩니다.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [SCENARIO_BASICS];
