// 튜토리얼 시나리오 — 사용자/봇 모두 고정 배치(script).
// 사용자는 '다음' 버튼만 누르며 한 턴씩 자동 진행한다.

import type { Card, Row } from "../api/types";

const C = (rank: number, suit: number): Card => ({ rank, suit });
// suit: 1=C(♣), 2=D(♦), 3=H(♥), 4=S(♠)

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

// ── 시나리오 1: 기본 — 세 라인 Royalty 동시 노리기 ──────────────────────────
//
// 의도 최종 보드(사용자):
//   top:    8♦ 8♠ 4♠       — 8 페어 (Royalty +3)
//   middle: 4♣ 5♦ 6♣ 7♠ 8♥ — 4~8 스트레이트 (Royalty +4) — 모양 4종 다양
//   bottom: A♥ K♥ J♥ T♥ 7♥ — ♥ 플러시 (Royalty +4)
//                            합계 Royalty +11
//
// 사용자 버림(2♠/2♣/2♦/9♦): 모두 어디에도 안 맞는 작은/무의미 카드.
export const SCENARIO_BASICS: TutorialScenario = {
  id: "basics",
  title: "기본 라운드",
  outro:
    "세 라인 모두 Royalty가 붙는 깔끔한 보드. ♥는 bottom 플러시, 4·5·6·7은 middle 스트레이트, 같은 rank는 top 페어로 모아갑니다.",
  player: {
    cards: [
      // first 5: 8♦ 4♣ 5♦ A♥ K♥
      C(8, 2), C(4, 1), C(5, 2), C(14, 3), C(13, 3),
      // normal 2: 6♣ J♥ 9♦ (9♦ 버림 — bottom 플러시도 4-8 스트레이트도 아님)
      C(6, 1), C(11, 3), C(9, 2),
      // normal 3: 7♠ T♥ 2♠ (2♠ 버림 — 너무 작아 어떤 라인에도 무관)
      C(7, 4), C(10, 3), C(2, 4),
      // normal 4: 8♥ 7♥ 2♣ (2♣ 버림 — 4-8 스트레이트에 2는 안 들어감)
      C(8, 3), C(7, 3), C(2, 1),
      // normal 5: 8♠ 4♠ 2♦ (2♦ 버림 — 어떤 라인에도 무관)
      C(8, 4), C(4, 4), C(2, 2),
    ],
    // first 5: 8♦→top, 4♣ 5♦→middle, A♥ K♥→bottom
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      // turn 2 (6♣ J♥ 9♦): 6♣→middle, J♥→bottom, 9♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (7♠ T♥ 2♠): 7♠→middle, T♥→bottom, 2♠ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (8♥ 7♥ 2♣): 8♥→middle(스트레이트 완성), 7♥→bottom(플러시 완성), 2♣ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5 (8♠ 4♠ 2♦): 8♠→top(8 페어 완성), 4♠→top, 2♦ 버림
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
      // first 5: 5♠ 6♠ 7♦ J♠ 5♥ — 5·6·7을 bottom 스트레이트 시드로 함께 배치
      C(5, 4), C(6, 4), C(7, 2), C(11, 4), C(5, 3),
      // normal 2: 8♣ 9♣ 3♥ (3♥ 버림)
      C(8, 1), C(9, 1), C(3, 3),
      // normal 3: J♦ 9♥ 4♥ (4♥ 버림 — J 페어 완성)
      C(11, 2), C(9, 3), C(4, 3),
      // normal 4: 4♦ 2♥ 6♥ (6♥ 버림)
      C(4, 2), C(2, 3), C(6, 3),
      // normal 5: Q♥ 3♦ 3♠ (3♠ 버림)
      C(12, 3), C(3, 2), C(3, 4),
    ],
    // first 5: 5♠ 6♠ 7♦→bottom(스트레이트 시드), J♠→middle, 5♥→top
    firstTurnPlacements: ["bottom", "bottom", "bottom", "middle", "top"],
    normalTurns: [
      // turn 2 (8♣ 9♣ 3♥): 8♣→middle, 9♣→top, 3♥ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (J♦ 9♥ 4♥): J♦→middle(J 페어 완성), 9♥→middle, 4♥ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (4♦ 2♥ 6♥): 4♦→bottom, 2♥→top, 6♥ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5 (Q♥ 3♦ 3♠): Q♥→middle, 3♦→bottom(스트레이트 완성), 3♠ 버림
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
      "OFC 한 라운드를 함께 따라가 봅니다. '다음'을 누르면 한 단계씩 진행됩니다.",
    first_turn_my:
      "첫 5장. ♥(A·K)는 bottom 플러시 시드로, 4♣·5♦는 middle 스트레이트 시드로, 8♦은 top 페어를 만들 자리로 분배합니다. **강한 카드는 bottom으로 보낸다**가 OFC 기본 원칙입니다.",
    first_turn_opp_done:
      "봇도 5장을 분배했습니다. 5♠ 6♠ 7♦을 bottom에 모아 스트레이트 시드로 시작했네요.",
    normal_turn_my:
      "이제 매 턴 3장씩 받고 2장만 배치, 1장은 버립니다. 이번 카드 6♣ J♥ 9♦에서 6♣는 middle 스트레이트, J♥는 bottom 플러시로 들어가고 9♦은 어떤 라인에도 안 맞아 버립니다. **무의미한 카드는 과감히 버리는 것**이 OFC의 핵심.",
    result:
      "라운드 종료. 점수는 세 부분으로 나뉩니다 — (1) **라인 점수**: 각 줄(top/middle/bottom)에서 이기면 +1, 지면 -1. (2) **스쿱**: 3줄 모두 이기면 추가 +3. (3) **Royalty 차이**: 줄별 보너스(예: middle 스트레이트 +4, bottom 플러시 +4, top 8 페어 +3) 합의 차이. 이번 라운드는 라인 +3, 스쿱 +3, Royalty +9 (사용자 11 − 봇 2) = 총 +15.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [SCENARIO_BASICS];
