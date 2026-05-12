// 튜토리얼 시나리오 데이터.
// 각 시나리오는 사용자 카드(17장), 자동 배치 시퀀스, 가상 상대 보드,
// step별 안내 말풍선으로 구성된다. 사용자는 '다음' 버튼만 누르며 진행한다.

import type { Card, Row } from "../api/types";

export interface ScenarioBoard {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

export interface NormalTurnScript {
  // 이번 턴 3장 중 어떤 카드를 배치하고 어떤 걸 버릴지.
  // handIdxInTurn은 이번 턴 hand(3장)의 0~2 인덱스.
  placements: { handIdxInTurn: 0 | 1 | 2; row: Row }[];
  discardHandIdxInTurn: 0 | 1 | 2;
}

export interface TutorialScenario {
  id: string;
  title: string;
  intro: string;
  outro: string;
  // 받을 순서대로 17장 (first 5 + normal 4턴 × 3장)
  myCards: Card[];
  // first turn 5장을 어떤 row에 놓을지 — 입력 카드 순서대로
  firstTurnPlacements: Row[];
  // normal turn 4회 (turn 2~5) 각각 script
  normalTurns: NormalTurnScript[];
  opponent: {
    nickname: string;
    board: ScenarioBoard;
  };
  // step별 말풍선 (when 키는 진행 단계 식별자)
  bubbles: Record<BubbleKey, string>;
}

export type BubbleKey =
  | "intro"
  | "first_turn_hand"
  | "first_turn_placed"
  | "normal_turn_hand"
  | "normal_turn_placed"
  | "result";

const C = (rank: number, suit: number): Card => ({ rank, suit });
// suit: 1=C(♣), 2=D(♦), 3=H(♥), 4=S(♠)

// ── 시나리오 1: 기본 — bottom Royal Flush로 Royalty 익히기 ─────────────────
export const SCENARIO_BASICS: TutorialScenario = {
  id: "basics",
  title: "기본 라운드 — Royalty 익히기",
  intro:
    "OFC 한 라운드를 함께 진행합니다. 카드는 정해진 자리에 자동으로 놓입니다 — '다음'을 누르며 흐름을 따라가 보세요.",
  outro:
    "bottom 줄에 강한 핸드를 만들면 Royalty 보너스가 크게 작용합니다. Royal Flush는 +25점!",
  myCards: [
    // first turn 5장 — bottom royal flush 완성
    C(14, 4), C(13, 4), C(12, 4), C(11, 4), C(10, 4),
    // normal turn 2 — middle에 8 페어
    C(8, 1), C(8, 2), C(5, 1),
    // normal turn 3 — middle 채우기
    C(2, 3), C(3, 3), C(5, 2),
    // normal turn 4 — middle 마지막 + top 시작
    C(4, 4), C(2, 1), C(5, 3),
    // normal turn 5 — top 마저
    C(3, 2), C(4, 3), C(5, 4),
  ],
  firstTurnPlacements: ["bottom", "bottom", "bottom", "bottom", "bottom"],
  normalTurns: [
    // turn 2 (8♣ 8♦ 5♣)
    {
      placements: [
        { handIdxInTurn: 0, row: "middle" },
        { handIdxInTurn: 1, row: "middle" },
      ],
      discardHandIdxInTurn: 2,
    },
    // turn 3 (2♥ 3♥ 5♦)
    {
      placements: [
        { handIdxInTurn: 0, row: "middle" },
        { handIdxInTurn: 1, row: "middle" },
      ],
      discardHandIdxInTurn: 2,
    },
    // turn 4 (4♠ 2♣ 5♥) — middle 5장 완성 + top 시작
    {
      placements: [
        { handIdxInTurn: 0, row: "middle" },
        { handIdxInTurn: 1, row: "top" },
      ],
      discardHandIdxInTurn: 2,
    },
    // turn 5 (3♦ 4♥ 5♠) — top 마무리
    {
      placements: [
        { handIdxInTurn: 0, row: "top" },
        { handIdxInTurn: 1, row: "top" },
      ],
      discardHandIdxInTurn: 2,
    },
  ],
  opponent: {
    nickname: "튜토리얼 봇",
    board: {
      // top: 5♠ 5♣ 9♠ — 5 페어
      top: [C(5, 4), C(5, 1), C(9, 4)],
      // middle: 7♣ 7♠ 7♥ K♣ 4♣ — 7 트리플 (Royalty +2)
      middle: [C(7, 1), C(7, 4), C(7, 3), C(13, 1), C(4, 1)],
      // bottom: 6♥ 7♦ 8♥ 9♦ T♥ — 스트레이트 (Royalty +2)
      bottom: [C(6, 3), C(7, 2), C(8, 3), C(9, 2), C(10, 3)],
    },
  },
  bubbles: {
    intro:
      "5장을 받아 시작합니다. 이 카드를 top(3)·middle(5)·bottom(5) 세 줄에 모두 배치해야 합니다.",
    first_turn_hand:
      "첫 5장이 모두 ♠입니다. 모두 bottom으로 보내면 한 줄에 Royal Flush를 노릴 수 있습니다.",
    first_turn_placed:
      "bottom이 A-K-Q-J-T ♠로 완성됐어요. Royal Flush는 Royalty +25점입니다.",
    normal_turn_hand:
      "이제 매 턴 3장씩 받고 2장만 배치하며 1장은 버립니다. 합쳐서 4번 진행해 보드가 완성됩니다.",
    normal_turn_placed:
      "한 턴이 끝났습니다. 같은 식으로 13장이 다 채워질 때까지 진행합니다.",
    result:
      "라운드 종료! 줄별로 상대와 비교해 라인 점수(±1)와 Royalty 차이가 합산됩니다. bottom의 Royal Flush가 결정적이었죠.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [SCENARIO_BASICS];
