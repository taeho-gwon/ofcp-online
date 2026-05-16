import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type {
  BoardEvaluation,
  Card,
  HandEvaluation,
  Matchup,
  PlayerState,
} from "../api/types";
import { CardView } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { PlayerBoard } from "../components/PlayerBoard";
import { ResultModal } from "../components/ResultModal";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { Button } from "../components/ui";
import { evaluate, HandRank, isFoulBoard } from "../lib/handEval";
import {
  handLabel,
  royaltyBottom,
  royaltyMiddle,
  royaltyTop,
} from "../lib/royalty";
import { headToHeadMatchup } from "../lib/scoring";
import type {
  FantasyBubbleKey,
  FantasyScenario,
} from "../lib/tutorialScenarios";

const ME_ID = "self";
const BOT_ID = "bot";

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

const empty = (): Board => ({ top: [], middle: [], bottom: [] });

// FL 플레이어는 1턴에 끝나지만, 일반 플레이어(상대)는 5턴 진행.
// 시각적으로 "FL이 먼저 끝남 → 일반 플레이어가 따라잡음 → 결과 비교" 순서로 보여준다.
type FlStep = "intro" | "hand" | "placed" | "opp_done" | "result";

const STEP_SEQUENCE: FlStep[] = [
  "intro",
  "hand",
  "placed",
  "opp_done",
  "result",
];

const BUBBLE_OF_STEP: Record<FlStep, FantasyBubbleKey> = {
  intro: "intro",
  hand: "fl_hand",
  placed: "fl_placed",
  opp_done: "opp_done",
  result: "result",
};

function rowEval(
  cards: Card[],
  foul: boolean,
  fn: (c: Card[], f: boolean) => number,
): HandEvaluation {
  const hv = evaluate(cards);
  return {
    rank: hv.rank,
    rank_label: "",
    label: handLabel(hv),
    royalty: fn(cards, foul),
  };
}

function buildEvaluation(b: Board): BoardEvaluation {
  const foul = isFoulBoard(b.top, b.middle, b.bottom);
  const top = rowEval(b.top, foul, royaltyTop);
  const middle = rowEval(b.middle, foul, royaltyMiddle);
  const bottom = rowEval(b.bottom, foul, royaltyBottom);
  return {
    top,
    middle,
    bottom,
    is_foul: foul,
    total_royalty: top.royalty + middle.royalty + bottom.royalty,
  };
}

// 연속 FL 자격: top 트립스 이상 또는 bottom 포카드 이상.
function fantasyReentryCards(top: Card[], bottom: Card[]): number | null {
  if (top.length === 3) {
    const t = evaluate(top);
    if (t.rank >= HandRank.THREE_OF_A_KIND) return 14;
  }
  if (bottom.length === 5) {
    const b = evaluate(bottom);
    if (b.rank >= HandRank.FOUR_OF_A_KIND) return 14;
  }
  return null;
}

export function FantasyTutorial({ scenario }: { scenario: FantasyScenario }) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const step = STEP_SEQUENCE[stepIdx];

  // 단계별 보드/손/버림 derive
  const { myBoard, myHand, myDiscarded } = useMemo(() => {
    const board = empty();
    let hand: Card[] = [];
    let discarded: Card[] = [];
    if (step === "hand") {
      hand = [...scenario.player.cards];
    } else if (step === "placed" || step === "result") {
      const placedIdx = new Set<number>();
      for (const p of scenario.player.placements) {
        board[p.row].push(scenario.player.cards[p.handIdx]);
        placedIdx.add(p.handIdx);
      }
      discarded = scenario.player.cards.filter((_, i) => !placedIdx.has(i));
    }
    return { myBoard: board, myHand: hand, myDiscarded: discarded };
  }, [step, scenario]);

  const isResult = step === "result";

  const matchup: Matchup | null = isResult
    ? headToHeadMatchup(ME_ID, BOT_ID, myBoard, scenario.opponent.board)
    : null;
  const myDelta = matchup ? matchup.total_a : null;
  const oppDelta = matchup ? -matchup.total_a : null;

  const myFoul = isResult
    ? isFoulBoard(myBoard.top, myBoard.middle, myBoard.bottom)
    : false;
  const nextFlCards =
    isResult && !myFoul
      ? fantasyReentryCards(myBoard.top, myBoard.bottom)
      : null;

  const me: PlayerState = {
    player_id: ME_ID,
    board: {
      top: myBoard.top,
      middle: myBoard.middle,
      bottom: myBoard.bottom,
      top_count: myBoard.top.length,
      middle_count: myBoard.middle.length,
      bottom_count: myBoard.bottom.length,
    },
    hand: [],
    hand_count: 0,
    score: myDelta ?? 0,
    // 현재 라운드 FL 중이라는 표시 (PlayerBoard에 FL 배지)
    is_fantasy: true,
    next_fantasy_cards: nextFlCards,
    evaluation: isResult ? buildEvaluation(myBoard) : null,
    last_round_delta: myDelta,
  };
  // FL이 먼저 끝나는 흐름을 살리기 위해, 상대는 opp_done/result 단계에서만 보드를 노출한다.
  const oppShown = step === "opp_done" || step === "result";
  const oppBoardCards = oppShown
    ? scenario.opponent.board
    : { top: [] as Card[], middle: [] as Card[], bottom: [] as Card[] };
  const opp: PlayerState = {
    player_id: BOT_ID,
    board: {
      top: oppBoardCards.top,
      middle: oppBoardCards.middle,
      bottom: oppBoardCards.bottom,
      top_count: oppBoardCards.top.length,
      middle_count: oppBoardCards.middle.length,
      bottom_count: oppBoardCards.bottom.length,
    },
    hand: [],
    hand_count: 0,
    score: oppDelta ?? 0,
    is_fantasy: false,
    next_fantasy_cards: null,
    evaluation: isResult ? buildEvaluation(scenario.opponent.board) : null,
    last_round_delta: oppDelta,
  };

  const next = () => {
    if (stepIdx < STEP_SEQUENCE.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      setModalOpen(true);
    }
  };

  const skip = () => {
    if (confirm("튜토리얼을 건너뛰시겠습니까?")) navigate("/tutorial");
  };

  const closeResult = () => {
    setModalOpen(false);
    toast.success("튜토리얼 완료!");
    navigate("/tutorial");
  };

  const bubbleText = scenario.bubbles[BUBBLE_OF_STEP[step]];

  return (
    <div className="min-h-screen p-4 flex flex-col gap-3 pb-12">
      <PageHeader
        back={{ label: "← 튜토리얼 목록", to: "/tutorial" }}
        title={
          <div style={{ fontSize: "var(--fs-body-sm)", fontWeight: 600 }}>
            {scenario.title}
          </div>
        }
        rightActions={
          <Button type="button" variant="ghost" size="sm" onClick={skip}>
            건너뛰기
          </Button>
        }
      />

      <section className="flex flex-col items-center gap-1 min-h-[6rem]">
        {myHand.length > 0 ? (
          <>
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
              }}
            >
              FL 손패 (14장 — 13장 배치 + 1장 버림)
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {myHand.map((c, i) => (
                <CardView key={`mh-${i}-${c.rank}-${c.suit}`} card={c} size="sm" />
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              fontSize: "var(--fs-caption)",
              color: "var(--text-tertiary)",
            }}
          >
            {step === "intro"
              ? "FantasyLand 라운드 시작 전"
              : step === "placed"
                ? "FL 배치 완료"
                : step === "result"
                  ? "라운드 종료"
                  : "..."}
          </div>
        )}
      </section>

      <main className="flex flex-col items-center gap-3">
        <div className="w-full max-w-md">
          <PlayerBoard
            player={opp}
            label={scenario.opponent.nickname}
            isMe={false}
            isCurrent={false}
            isDealer={false}
          />
        </div>
        <div
          style={{
            fontSize: "var(--fs-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          vs (★ FantasyLand)
        </div>
        <div className="w-full max-w-md">
          <PlayerBoard
            player={me}
            label="나"
            isMe={true}
            isCurrent={!isResult}
            isDealer={false}
          />
        </div>

        {myDiscarded.length > 0 && (
          <div
            className="card"
            style={{ maxWidth: 448, width: "100%", padding: 12 }}
          >
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
                marginBottom: 4,
              }}
            >
              버린 카드
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {myDiscarded.map((c, i) => (
                <CardView
                  key={`d-${i}-${c.rank}-${c.suit}`}
                  card={c}
                  size="sm"
                  faded
                />
              ))}
            </div>
          </div>
        )}
      </main>

      <TutorialOverlay
        text={bubbleText}
        step={stepIdx + 1}
        totalSteps={STEP_SEQUENCE.length}
        onNext={next}
        onSkip={skip}
        ctaLabel={
          step === "result"
            ? "결과 보기"
            : stepIdx === STEP_SEQUENCE.length - 1
              ? "튜토리얼 완료"
              : "다음"
        }
      />

      {modalOpen && matchup && (
        <ResultModal
          players={[me, opp]}
          matchups={[matchup]}
          myPlayerId={ME_ID}
          playersMeta={{ [ME_ID]: "나", [BOT_ID]: scenario.opponent.nickname }}
          roundNumber={1}
          maxRounds={0}
          isBonusRound={true}
          isGameOver={false}
          onClose={closeResult}
        />
      )}
    </div>
  );
}
