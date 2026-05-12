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

export type NormalBubbleKey =
  | "intro"
  | "first_turn_my"
  | "first_turn_opp_done"
  | "normal_turn_my"
  | "result";

export type FantasyBubbleKey = "intro" | "fl_hand" | "fl_placed" | "result";

// 호환을 위한 alias (이전 코드에서 import해 쓰던 이름)
export type BubbleKey = NormalBubbleKey;

export interface NormalScenario {
  kind: "normal";
  id: string;
  title: string;
  outro: string;
  player: PlayerScript;
  opponent: PlayerScript & { nickname: string };
  bubbles: Record<NormalBubbleKey, string>;
}

export interface FantasyScenario {
  kind: "fantasy";
  id: string;
  title: string;
  outro: string;
  player: {
    cards: Card[]; // 14장
    // 14장 중 어떤 13장을 어느 row에 배치할지. 나머지 1장은 자동 버림.
    placements: { handIdx: number; row: Row }[];
  };
  opponent: {
    nickname: string;
    board: { top: Card[]; middle: Card[]; bottom: Card[] };
  };
  bubbles: Record<FantasyBubbleKey, string>;
}

export type TutorialScenario = NormalScenario | FantasyScenario;

// ── 시나리오 1: 기본 — 세 라인 Royalty 동시 노리기 ──────────────────────────
//
// 의도 최종 보드(사용자):
//   top:    8♦ 8♠ 4♠       — 8 페어 (Royalty +3)
//   middle: 4♣ 5♦ 6♣ 7♠ 8♥ — 4~8 스트레이트 (Royalty +4) — 모양 4종 다양
//   bottom: A♥ K♥ J♥ T♥ 7♥ — ♥ 플러시 (Royalty +4)
//                            합계 Royalty +11
//
// 사용자 버림(2♠/2♣/2♦/9♦): 모두 어디에도 안 맞는 작은/무의미 카드.
export const SCENARIO_BASICS: NormalScenario = {
  kind: "normal",
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

// ── 시나리오 2: FantasyLand 진입 — top에 QQ+ 페어 ───────────────────────────
//
// 의도 최종 보드(사용자):
//   top:    Q♦ Q♠ 4♠       — Q 페어 (Royalty +7, FantasyLand 자격 14장)
//   middle: 8♣ 8♦ 8♥ K♣ 2♣ — 8 트리플 (Royalty +2)
//   bottom: A♥ K♥ J♥ T♥ 7♥ — ♥ 플러시 (Royalty +4)
//                            합계 Royalty +13
//
// 학습 포인트: top에 QQ 이상 페어를 만들면 **다음 라운드에 14장+를 한 번에**
// 받는 FantasyLand에 진입한다. KK는 15장, AA는 16장, 트립스(222 등)는 17장.
export const SCENARIO_FANTASY: NormalScenario = {
  kind: "normal",
  id: "fantasy",
  title: "FantasyLand 진입",
  outro:
    "top에 QQ 이상 페어를 만들면 다음 라운드 14장+를 한 번에 받는 FantasyLand에 진입합니다. KK=15장, AA=16장, 트립스=17장.",
  player: {
    cards: [
      // first 5: Q♦ 8♣ 8♦ A♥ K♥
      C(12, 2), C(8, 1), C(8, 2), C(14, 3), C(13, 3),
      // normal 2: J♥ 8♥ 9♦ (9♦ 버림)
      C(11, 3), C(8, 3), C(9, 2),
      // normal 3: T♥ K♣ 2♠ (2♠ 버림)
      C(10, 3), C(13, 1), C(2, 4),
      // normal 4: 7♥ 2♣ 3♦ (3♦ 버림)
      C(7, 3), C(2, 1), C(3, 2),
      // normal 5: Q♠ 4♠ 2♦ (2♦ 버림)
      C(12, 4), C(4, 4), C(2, 2),
    ],
    // Q♦→top, 8♣ 8♦→middle, A♥ K♥→bottom
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5: Q♠→top(Q 페어 완성 → FL!), 4♠→top, 2♦ 버림
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
      // first 5: 9♣ 5♣ 5♠ 6♦ 7♦
      C(9, 1), C(5, 1), C(5, 4), C(6, 2), C(7, 2),
      // normal 2: 8♠ 6♣ 3♠ (3♠ 버림)
      C(8, 4), C(6, 1), C(3, 4),
      // normal 3: J♣ 5♦ 7♣ (7♣ 버림)
      C(11, 1), C(5, 2), C(7, 1),
      // normal 4: 5♥ 4♥ 4♣ (4♣ 버림)
      C(5, 3), C(4, 3), C(4, 1),
      // normal 5: 2♥ 3♥ 6♥ (6♥ 버림)
      C(2, 3), C(3, 3), C(6, 3),
    ],
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "top" },
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
    ],
  },
  bubbles: {
    intro:
      "이번 시나리오는 **FantasyLand(FL) 진입**. top에 QQ 이상 페어를 만들면 다음 라운드 14장을 한 번에 받습니다.",
    first_turn_my:
      "첫 5장. Q♦은 top FL 시드, 8♣·8♦은 middle 트리플 시드, A♥·K♥은 bottom 플러시 시드. 한 번에 세 라인을 다 노리는 분배입니다.",
    first_turn_opp_done:
      "봇은 평범하게 페어/스트레이트 시드로 시작했습니다.",
    normal_turn_my:
      "normal turn에서 ♥는 bottom, 8♥은 middle 트리플 완성으로, 무의미한 작은 카드는 버립니다. top 자리(Q 페어용)는 마지막에 채울 예정입니다.",
    result:
      "점수 계산 — 라인 +3, 스쿱 +3, Royalty +11(사용자 13 − 봇 2) = 총 +17. 그리고 top에 Q 페어를 만들었으니 **다음 라운드 FantasyLand 14장**을 받습니다!",
  },
};

// ── 시나리오 3: Foul — top에 페어 둘 때 middle도 강해야 ─────────────────────
//
// 의도 최종 보드(사용자) — 학습용 *Foul* 사례:
//   top:    K♠ K♣ 5♠       — K 페어 (강함, rank 2)
//   middle: 2♣ 4♦ 7♥ 9♠ J♥ — high card J (약함, rank 1)
//   bottom: A♥ K♥ Q♥ T♥ 8♥ — ♥ 플러시 (강함, rank 6)
//
// middle(high card) < top(K pair) → FOUL. 라인 모두 자동 패배 + Royalty 0.
export const SCENARIO_FOUL: NormalScenario = {
  kind: "normal",
  id: "foul",
  title: "Foul — 피해야 하는 함정",
  outro:
    "top에 큰 페어를 두면 middle도 그보다 강한 핸드여야 합니다. K 페어를 top에 두려면 middle은 최소 K 페어 이상이 되어야 하는데, 그게 안 되면 K를 middle/bottom으로 보내는 게 안전합니다.",
  player: {
    cards: [
      // first 5: K♠ 2♣ 4♦ A♥ K♥
      C(13, 4), C(2, 1), C(4, 2), C(14, 3), C(13, 3),
      // normal 2: K♣ 7♥ 9♦ (9♦ 버림)
      C(13, 1), C(7, 3), C(9, 2),
      // normal 3: Q♥ 9♠ 3♠ (3♠ 버림)
      C(12, 3), C(9, 4), C(3, 4),
      // normal 4: T♥ J♥ 2♠ (2♠ 버림)
      C(10, 3), C(11, 3), C(2, 4),
      // normal 5: 8♥ 5♠ 6♦ (6♦ 버림)
      C(8, 3), C(5, 4), C(6, 2),
    ],
    // K♠→top, 2♣→middle, 4♦→middle, A♥ K♥→bottom
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      // turn 2 (K♣ 7♥ 9♦): K♣→top, 7♥→middle, 9♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "top" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 3 (Q♥ 9♠ 3♠): Q♥→bottom, 9♠→middle, 3♠ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 4 (T♥ J♥ 2♠): T♥→bottom, J♥→middle, 2♠ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      // turn 5 (8♥ 5♠ 6♦): 8♥→bottom(flush 완성), 5♠→top, 6♦ 버림
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "top" },
        ],
        discardHandIdxInTurn: 2,
      },
    ],
  },
  opponent: {
    nickname: "튜토리얼 봇",
    cards: [
      // first 5: 9♣ 3♥ 4♥ 6♠ 7♠
      C(9, 1), C(3, 3), C(4, 3), C(6, 4), C(7, 4),
      // normal 2: 8♣ 5♥ 4♣ (4♣ 버림)
      C(8, 1), C(5, 3), C(4, 1),
      // normal 3: J♣ 5♣ 6♣ (6♣ 버림)
      C(11, 1), C(5, 1), C(6, 1),
      // normal 4: T♣ 7♣ 3♣ (3♣ 버림)
      C(10, 1), C(7, 1), C(3, 1),
      // normal 5: 2♥ 8♠ T♠ (T♠ 버림)
      C(2, 3), C(8, 4), C(10, 4),
    ],
    firstTurnPlacements: ["top", "middle", "middle", "bottom", "bottom"],
    normalTurns: [
      {
        placements: [
          { handIdxInTurn: 0, row: "middle" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "top" },
          { handIdxInTurn: 1, row: "middle" },
        ],
        discardHandIdxInTurn: 2,
      },
      {
        placements: [
          { handIdxInTurn: 0, row: "bottom" },
          { handIdxInTurn: 1, row: "bottom" },
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
    ],
  },
  bubbles: {
    intro:
      "이번 시나리오는 **Foul** 사례. top·middle·bottom 강도가 bottom ≥ middle ≥ top이 안 되면 Foul로 라인 자동 패배 + Royalty 0이 됩니다.",
    first_turn_my:
      "첫 5장에 K가 두 장(K♠ K♥). 사용자는 K♠을 top에 두고 K♥는 bottom으로 보냈습니다. 강한 K 페어를 top에 두면 royalty +8이지만, middle이 K 페어보다 강해야 Foul을 피합니다.",
    first_turn_opp_done:
      "봇은 평범한 보드를 만들고 있습니다.",
    normal_turn_my:
      "K♣를 또 받았네요. top에 추가해 K 페어를 굳혔습니다. 그런데 middle 자리에 들어갈 카드들이 모두 페어를 못 만들어요. 이게 곧 Foul로 이어집니다.",
    result:
      "**FOUL** — middle이 high card(J)인데 top은 K 페어라 middle < top. 모든 라인 자동 패배(-3) + 스쿱(-3) + Royalty 0. 봇 royalty만큼도 더 빼앗깁니다. **교훈**: top에 페어를 두려면 middle이 그보다 강해야 합니다. middle을 못 살리면 K를 middle/bottom으로 보내는 게 안전.",
  },
};

// ── 시나리오 4: FantasyLand 진행 + 연속 FL ─────────────────────────────────
//
// 사용자가 FL 라운드(14장 한 번에)를 진행한다. 13장 배치 + 1장 버림.
// 의도 최종 보드:
//   top:    Q♣ Q♦ A♠            — Q 페어 (Royalty +7)
//   middle: K♥ K♣ 9♦ 7♣ 2♣      — K 페어 (Royalty 0)
//   bottom: 8♣ 8♦ 8♥ 8♠ 4♥      — 8 포카드 (Royalty +10)
//                                  합계 Royalty +17
//
// 학습 포인트:
// - FL은 14/15/16/17장을 한 번에 받아 1턴으로 끝.
// - **연속 FL 자격**: FL 중 top이 트립스 이상 또는 bottom이 포카드 이상이면
//   다음 라운드도 FL(14장). 이 시나리오는 bottom 포카드로 연속 FL 진입.
export const SCENARIO_FL_PROGRESS: FantasyScenario = {
  kind: "fantasy",
  id: "fl-progress",
  title: "FantasyLand 진행 + 연속 FL",
  outro:
    "FL 중 top 트립스 이상 또는 bottom 포카드 이상을 만들면 다음 라운드도 14장 FL. 이번 보드는 bottom 8 포카드라 연속 FL 자격 획득.",
  player: {
    // FL hand 14장 (handIdx 0~13)
    cards: [
      C(14, 4),                              // 0: A♠
      C(13, 4), C(13, 3), C(13, 1),          // 1~3: K♠ K♥ K♣ (트립스 시드)
      C(12, 1), C(12, 2),                    // 4~5: Q♣ Q♦
      C(9, 2), C(4, 3),                      // 6~7: 9♦ 4♥ (middle kicker)
      C(8, 1), C(8, 2), C(8, 3), C(8, 4),    // 8~11: 8 포카드
      C(2, 1),                               // 12: 2♣ (bottom kicker)
      C(7, 1),                               // 13: 7♣ (버림 — 어디에도 안 맞음)
    ],
    // 13장 배치 + handIdx 13(7♣)이 자동 버림
    placements: [
      // top: Q♣ Q♦ A♠ — Q 페어 + A kicker (Royalty +7)
      { handIdx: 4, row: "top" },  // Q♣
      { handIdx: 5, row: "top" },  // Q♦
      { handIdx: 0, row: "top" },  // A♠
      // middle: K♠ K♥ K♣ 9♦ 4♥ — K 트립스 (Royalty +2)
      { handIdx: 1, row: "middle" },
      { handIdx: 2, row: "middle" },
      { handIdx: 3, row: "middle" },
      { handIdx: 6, row: "middle" },
      { handIdx: 7, row: "middle" },
      // bottom: 8♣ 8♦ 8♥ 8♠ 2♣ — 8 포카드 (Royalty +10) → 연속 FL trigger
      { handIdx: 8, row: "bottom" },
      { handIdx: 9, row: "bottom" },
      { handIdx: 10, row: "bottom" },
      { handIdx: 11, row: "bottom" },
      { handIdx: 12, row: "bottom" },
    ],
  },
  opponent: {
    nickname: "튜토리얼 봇",
    board: {
      // 봇은 평범한 일반 라운드 보드
      top: [C(5, 4), C(5, 1), C(7, 4)], // 5♠ 5♣ 7♠ — 5 페어
      middle: [C(6, 1), C(6, 2), C(9, 1), C(11, 1), C(2, 3)], // 6♣ 6♦ 9♣ J♣ 2♥ — 6 페어
      bottom: [C(3, 3), C(4, 2), C(5, 3), C(6, 3), C(7, 2)], // 3♥ 4♦ 5♥ 6♥ 7♦ — 3-7 straight
    },
  },
  bubbles: {
    intro:
      "이번은 **FantasyLand 진행** 시나리오. 이전 라운드에서 top에 Q 페어를 만들어 FL 자격을 얻었습니다. FL은 14장을 한 번에 받아 1턴에 13장 배치하고 1장은 버립니다.",
    fl_hand:
      "FL hand 14장이 손에 들어왔습니다. K 세 장(트립스 시드), 8 네 장(포카드!), Q 두 장 등 강한 카드가 모여있네요. middle을 K 트리플, bottom을 8 포카드, top을 Q 페어로 만드는 게 가장 큰 점수가 나옵니다.",
    fl_placed:
      "배치 완료. top Q 페어(+7), middle K 트리플(+2), bottom 8 포카드(+10) = Royalty +19. **bottom 포카드 이상이라 연속 FL 자격**도 획득. 다음 라운드도 14장!",
    result:
      "점수 — 라인 +3, 스쿱 +3, Royalty 차이 +17(사용자 19 − 봇 2) = 총 +23. 그리고 **다음 라운드도 FantasyLand(14장)**. top 트립스나 bottom 포카드 이상이 연속 FL 조건이라는 점 기억하세요.",
  },
};

export const TUTORIAL_SCENARIOS: TutorialScenario[] = [
  SCENARIO_BASICS,
  SCENARIO_FOUL,
  SCENARIO_FANTASY,
  SCENARIO_FL_PROGRESS,
];
