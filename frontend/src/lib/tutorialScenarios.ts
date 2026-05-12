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
//   middle: 3♣ 4♣ 5♣ 6♣ 7♠ — 3-7 스트레이트 (Royalty +4)
//   bottom: A♥ K♥ J♥ T♥ 7♥ — ♥ 플러시 (Royalty +4)
//                            합계 Royalty +11
export const SCENARIO_BASICS: TutorialScenario = {
  id: "basics",
  title: "기본 라운드",
  outro:
    "세 라인 모두 Royalty가 붙는 깔끔한 보드. ♥는 bottom 플러시 시드, ♣는 middle 스트레이트 시드, 같은 rank는 top 페어로 모아갑니다.",
  player: {
    cards: [
      // first 5: 8♦ 4♣ 5♣ A♥ K♥
      C(8, 2), C(4, 1), C(5, 1), C(14, 3), C(13, 3),
      // normal 2: J♥ 6♣ 9♦ (9♦ 버림 — bottom 플러시도 middle 스트레이트도 아님)
      C(11, 3), C(6, 1), C(9, 2),
      // normal 3: T♥ 3♣ 2♠ (2♠ 버림 — 너무 작고 모양도 안 맞음)
      C(10, 3), C(3, 1), C(2, 4),
      // normal 4: 7♥ 7♠ 2♣ (2♣ 버림 — middle 스트레이트는 3~7이라 2는 안 들어감)
      C(7, 3), C(7, 4), C(2, 1),
      // normal 5: 8♠ 4♠ 2♦ (2♦ 버림 — 어떤 라인에도 무관)
      C(8, 4), C(4, 4), C(2, 2),
    ],
    // first 5: 8♦→top(페어 시드), 4♣ 5♣→middle(스트레이트 시드), A♥ K♥→bottom(플러시 시드)
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      // turn 2 (J♥ 6♣ 9♦): J♥→bottom, 6♣→middle, 9♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (T♥ 3♣ 2♠): T♥→bottom, 3♣→middle, 2♠ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (7♥ 7♠ K♦): 7♥→bottom(플러시 완성), 7♠→middle(스트레이트 완성), K♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
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
      // first 5: 5♠ 5♦ J♣ 6♠ 7♦
      C(5, 4), C(5, 2), C(11, 1), C(6, 4), C(7, 2),
      // normal 2: 8♣ 5♥ 6♦ (6♦ 버림 — middle/top 어디에도 안 맞음)
      C(8, 1), C(5, 3), C(6, 2),
      // normal 3: 4♦ 9♣ 3♠ (3♠ 버림 — 너무 작고 모양도 안 맞음)
      C(4, 2), C(9, 1), C(3, 4),
      // normal 4: 9♥ J♠ 6♥ (6♥ 버림 — ♥ 한 장이라 flush 불가능)
      C(9, 3), C(11, 4), C(6, 3),
      // normal 5: 3♦ 2♥ 4♥ (4♥ 버림 — 마찬가지로 의미 없음)
      C(3, 2), C(2, 3), C(4, 3),
    ],
    // first 5: 5♠ 5♦→middle(페어 시드), J♣→top, 6♠ 7♦→bottom(스트레이트 시드)
    firstTurnPlacements: ["middle", "middle", "top", "bottom", "bottom"],
    normalTurns: [
      // turn 2 (8♣ 5♥ Q♥): 8♣→middle, 5♥→bottom, Q♥ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "bottom" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (4♦ 9♣ A♣): 4♦→bottom, 9♣→top, A♣ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (9♥ J♠ K♣): 9♥→middle, J♠→middle(완성), K♣ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5 (3♦ 2♥ A♦): 3♦→bottom(스트레이트 완성), 2♥→top(완성), A♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
    ],
  },
  bubbles: {
    intro:
      "OFC 한 라운드를 함께 따라가 봅니다. '다음'을 누르면 한 단계씩 진행됩니다.",
    first_turn_my:
      "첫 5장. 좋은 ♥(A,K)는 bottom 플러시 시드로, 같은 모양 ♣(4,5)는 middle 스트레이트 시드로, 8♦은 top 페어를 만들기 위한 자리로 보냅니다. 강한 카드는 bottom, 약한 카드는 top이 OFC의 기본입니다.",
    first_turn_opp_done:
      "봇도 5장을 분배했습니다. 봇은 5 페어 + 스트레이트 시드로 시작했네요.",
    normal_turn_my:
      "이제 매 턴 3장씩 받고 2장만 배치, 1장은 버립니다. 이번 카드 J♥ 6♣ 9♦에서 J♥는 bottom 플러시, 6♣는 middle 스트레이트로 들어가고 9♦은 어디에도 안 맞아 버립니다. **무의미한 카드는 과감히 버리는 것**이 OFC의 핵심입니다.",
    result:
      "라운드 종료. 사용자는 top 8 페어(+3), middle 스트레이트(+4), bottom 플러시(+4) — Royalty 합 +11. 모든 라인을 이기고 스쿱(+3)까지.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [SCENARIO_BASICS];
