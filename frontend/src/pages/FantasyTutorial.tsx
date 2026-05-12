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
import { PlayerBoard } from "../components/PlayerBoard";
import { ResultModal } from "../components/ResultModal";
import { TutorialOverlay } from "../components/TutorialOverlay";
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

// FL은 1턴이므로 step 4개로 충분: intro / fl_hand / fl_placed / result
type FlStep = "intro" | "hand" | "placed" | "result";

const STEP_SEQUENCE: FlStep[] = ["intro", "hand", "placed", "result"];

const BUBBLE_OF_STEP: Record<FlStep, FantasyBubbleKey> = {
  intro: "intro",
  hand: "fl_hand",
  placed: "fl_placed",
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
  const opp: PlayerState = {
    player_id: BOT_ID,
    board: {
      top: scenario.opponent.board.top,
      middle: scenario.opponent.board.middle,
      bottom: scenario.opponent.board.bottom,
      top_count: 3,
      middle_count: 5,
      bottom_count: 5,
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
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-3 pb-12">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/tutorial")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← 튜토리얼 목록
        </button>
        <div className="text-sm font-semibold">{scenario.title}</div>
        <button
          type="button"
          onClick={skip}
          className="text-xs text-slate-500 hover:underline"
        >
          건너뛰기
        </button>
      </header>

      <section className="flex flex-col items-center gap-1 min-h-[6rem]">
        {myHand.length > 0 ? (
          <>
            <div className="text-xs text-slate-500">
              FL 손패 (14장 — 13장 배치 + 1장 버림)
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {myHand.map((c, i) => (
                <CardView key={`mh-${i}-${c.rank}-${c.suit}`} card={c} size="sm" />
              ))}
            </div>
          </>
        ) : (
          <div className="text-xs text-slate-400">
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
        <div className="text-xs text-slate-400">vs (★ FantasyLand)</div>
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
          <div className="w-full max-w-md bg-white rounded-lg shadow p-3">
            <div className="text-xs text-slate-500 mb-1">버린 카드</div>
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
