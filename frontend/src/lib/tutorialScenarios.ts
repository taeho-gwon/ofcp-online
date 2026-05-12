// 튜토리얼 시나리오 — 사용자는 직접 카드 배치, 봇은 script로 자동 진행.
//
// 사용자 카드 17장: 받는 순서. 사용자가 자유 배치.
// 봇 카드 17장 + script: 어디에 놓고 무엇을 버리는지 미리 정해진다.

import type { Card, Row } from "../api/types";

const C = (rank: number, suit: number): Card => ({ rank, suit });
// suit: 1=C(♣), 2=D(♦), 3=H(♥), 4=S(♠)

export interface NormalTurnScript {
  // 이번 턴 hand(3장) 중 어떤 인덱스를 어디 놓고 어떤 걸 버릴지.
  placements: { handIdxInTurn: 0 | 1 | 2; row: Row }[];
  discardHandIdxInTurn: 0 | 1 | 2;
}

export interface OpponentScript {
  nickname: string;
  cards: Card[]; // 17장
  firstTurnPlacements: Row[]; // 5장 각각의 row
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
  // 사용자 카드(자유 배치)
  myCards: Card[]; // 17장
  opponent: OpponentScript;
  bubbles: Record<BubbleKey, string>;
}

// ── 시나리오 1: 기본 — 분배 + Royalty 익히기 ────────────────────────────────
export const SCENARIO_BASICS: TutorialScenario = {
  id: "basics",
  title: "기본 라운드",
  outro:
    "라운드 종료. bottom에 ♥ 플러시를 만들면 Royalty +4. 봇과 줄별로 비교해 합산됩니다.",
  myCards: [
    // first 5 — 분배해야 하는 손패: 작은 클럽 + 큰 카드들 + 같은 모양 시드
    C(2, 1), C(13, 4), C(4, 3), C(14, 3), C(7, 3),
    // normal 2 (J♥ 9♠ 3♣)
    C(11, 3), C(9, 4), C(3, 1),
    // normal 3 (T♥ K♣ 6♣)
    C(10, 3), C(13, 1), C(6, 1),
    // normal 4 (8♥ 9♣ 5♦)
    C(8, 3), C(9, 1), C(5, 2),
    // normal 5 (6♦ 5♣ 2♦)
    C(6, 2), C(5, 1), C(2, 2),
  ],
  opponent: {
    nickname: "튜토리얼 봇",
    cards: [
      // first 5 (3♠ 5♥ 5♠ 6♥ 7♠)
      C(3, 4), C(5, 3), C(5, 4), C(6, 3), C(7, 4),
      // normal 2 (3♦ Q♥ 4♣)
      C(3, 2), C(12, 3), C(4, 1),
      // normal 3 (J♦ 8♠ 4♦)
      C(11, 2), C(8, 4), C(4, 2),
      // normal 4 (8♦ 9♥ 2♠)
      C(8, 2), C(9, 3), C(2, 4),
      // normal 5 (2♥ T♠ 9♦)
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
      "OFC 한 라운드를 봇과 함께 진행합니다. 받은 카드를 직접 top·middle·bottom에 배치하세요. **bottom > middle > top** 강도 순으로 만들어야 Foul을 피합니다.",
    first_turn_my:
      "5장을 받았습니다. **5장을 모두 보드에 배치**해야 합니다. 가장 좋은 카드는 bottom으로 보내세요. (예: top 1장, middle 2장, bottom 2장)",
    first_turn_opp_done:
      "봇도 5장을 배치했습니다. 봇의 보드를 보며 라인을 비교해보세요.",
    normal_turn_my:
      "이제 매 턴 3장씩 받습니다. **2장을 보드에 배치하고 1장은 버립니다.** 4번 반복하면 보드 13장이 완성됩니다.",
    result:
      "라운드 종료. 줄별 라인 점수(±1)와 Royalty 차이가 합산됩니다. bottom 플러시는 Royalty +4점.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [SCENARIO_BASICS];
