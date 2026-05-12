import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type {
  BoardEvaluation,
  Card,
  HandEvaluation,
  PlayerState,
  Row,
} from "../api/types";
import { CardView } from "../components/Card";
import { PlayerBoard } from "../components/PlayerBoard";
import { ResultModal } from "../components/ResultModal";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { evaluate, isFoulBoard } from "../lib/handEval";
import {
  handLabel,
  royaltyBottom,
  royaltyMiddle,
  royaltyTop,
} from "../lib/royalty";
import { headToHeadMatchup } from "../lib/scoring";
import {
  type BubbleKey,
  TUTORIAL_SCENARIOS,
  type TutorialScenario,
} from "../lib/tutorialScenarios";

interface StepDef {
  bubble?: BubbleKey;
  newHand?: Card[];
  placements?: { card: Card; row: Row }[];
  discards?: Card[];
  isResult?: boolean;
}

function buildSteps(s: TutorialScenario): StepDef[] {
  const steps: StepDef[] = [];
  steps.push({ bubble: "intro" });
  // first turn
  const first5 = s.myCards.slice(0, 5);
  steps.push({ bubble: "first_turn_hand", newHand: first5 });
  steps.push({
    bubble: "first_turn_placed",
    placements: first5.map((card, i) => ({ card, row: s.firstTurnPlacements[i] })),
  });
  // normal turns
  for (let t = 0; t < s.normalTurns.length; t++) {
    const offset = 5 + t * 3;
    const handCards = s.myCards.slice(offset, offset + 3);
    const script = s.normalTurns[t];
    steps.push({
      bubble: t === 0 ? "normal_turn_hand" : undefined,
      newHand: handCards,
    });
    const placements = script.placements.map((p) => ({
      card: handCards[p.handIdxInTurn],
      row: p.row,
    }));
    const discardCard = handCards[script.discardHandIdxInTurn];
    steps.push({
      bubble: t === 0 ? "normal_turn_placed" : undefined,
      placements,
      discards: [discardCard],
    });
  }
  // result
  steps.push({ bubble: "result", isResult: true });
  return steps;
}

interface DerivedState {
  board: { top: Card[]; middle: Card[]; bottom: Card[] };
  hand: Card[];
  discarded: Card[];
}

function deriveAt(steps: StepDef[], idx: number): DerivedState {
  const board = { top: [] as Card[], middle: [] as Card[], bottom: [] as Card[] };
  let hand: Card[] = [];
  const discarded: Card[] = [];
  for (let i = 0; i <= idx && i < steps.length; i++) {
    const s = steps[i];
    if (s.newHand) hand = s.newHand;
    if (s.placements) {
      for (const p of s.placements) board[p.row].push(p.card);
      hand = [];
    }
    if (s.discards) discarded.push(...s.discards);
  }
  return { board, hand, discarded };
}

function rowEval(
  cards: Card[],
  isFoul: boolean,
  fn: (c: Card[], f: boolean) => number,
): HandEvaluation {
  const hv = evaluate(cards);
  return {
    rank: hv.rank,
    rank_label: "",
    label: handLabel(hv),
    royalty: fn(cards, isFoul),
  };
}

function buildEvaluation(b: {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}): BoardEvaluation {
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

const ME_ID = "self";
const OPP_ID = "bot";

export function Tutorial() {
  const navigate = useNavigate();
  const [scenarioIdx] = useState(0);
  const scenario = TUTORIAL_SCENARIOS[scenarioIdx];
  const steps = useMemo(() => buildSteps(scenario), [scenario]);
  const [stepIdx, setStepIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const derived = useMemo(() => deriveAt(steps, stepIdx), [steps, stepIdx]);
  const currentStep = steps[stepIdx];
  const bubbleKey = currentStep.bubble;
  const bubbleText = bubbleKey ? scenario.bubbles[bubbleKey] : undefined;
  const reachedResult = currentStep.isResult;

  // 결과 step 진입 시 자동으로 ResultModal 열기 (말풍선과 함께 보이게 약간 지연 가능)
  if (reachedResult && !modalOpen) {
    // 즉시 열어도 무방
    setTimeout(() => setModalOpen(true), 0);
  }

  const next = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      finish();
    }
  };

  const skip = () => {
    if (confirm("튜토리얼을 건너뛰시겠습니까?")) {
      navigate("/");
    }
  };

  const finish = () => {
    toast.success("튜토리얼 완료! 이제 게임에 도전해보세요.");
    navigate("/");
  };

  // mock PlayerState — PlayerBoard 컴포넌트에 넘기기 위해
  const isComplete =
    derived.board.top.length === 3 &&
    derived.board.middle.length === 5 &&
    derived.board.bottom.length === 5;
  const me: PlayerState = {
    player_id: ME_ID,
    board: {
      top: derived.board.top,
      middle: derived.board.middle,
      bottom: derived.board.bottom,
      top_count: derived.board.top.length,
      middle_count: derived.board.middle.length,
      bottom_count: derived.board.bottom.length,
    },
    hand: [],
    hand_count: 0,
    score: 0,
    is_fantasy: false,
    next_fantasy_cards: null,
    evaluation: isComplete ? buildEvaluation(derived.board) : null,
    last_round_delta: null,
  };
  const opponent: PlayerState = {
    player_id: OPP_ID,
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
    score: 0,
    is_fantasy: false,
    next_fantasy_cards: null,
    evaluation: reachedResult ? buildEvaluation(scenario.opponent.board) : null,
    last_round_delta: null,
  };

  // 결과 시 매치업 계산 + delta 채우기
  let matchups: import("../api/types").Matchup[] = [];
  if (reachedResult) {
    const m = headToHeadMatchup(ME_ID, OPP_ID, derived.board, scenario.opponent.board);
    matchups = [m];
    me.last_round_delta = m.total_a;
    me.score = m.total_a;
    opponent.last_round_delta = -m.total_a;
    opponent.score = -m.total_a;
  }

  const playersMeta = {
    [ME_ID]: "나",
    [OPP_ID]: scenario.opponent.nickname,
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-3 pb-12">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← 로비
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

      <section className="text-center text-xs text-slate-500">
        {reachedResult
          ? "라운드 종료"
          : derived.hand.length > 0
            ? "이번 턴 카드 — '다음'을 누르면 자동 배치됩니다"
            : "다음 카드를 받습니다"}
      </section>

      {derived.hand.length > 0 && (
        <section className="flex justify-center gap-1 min-h-20">
          {derived.hand.map((c, i) => (
            <CardView key={`h-${i}-${c.rank}-${c.suit}`} card={c} />
          ))}
        </section>
      )}

      <main className="flex flex-col items-center gap-3">
        <div className="w-full max-w-md">
          <PlayerBoard
            player={opponent}
            label={scenario.opponent.nickname}
            isMe={false}
            isCurrent={false}
            isDealer={false}
          />
        </div>
        <div className="text-xs text-slate-400">vs</div>
        <div className="w-full max-w-md">
          <PlayerBoard
            player={me}
            label="나"
            isMe={true}
            isCurrent={!reachedResult}
            isDealer={false}
          />
        </div>

        {derived.discarded.length > 0 && (
          <div className="w-full max-w-md bg-white rounded-lg shadow p-3">
            <div className="text-xs text-slate-500 mb-1">버린 카드</div>
            <div className="flex flex-wrap justify-center gap-1">
              {derived.discarded.map((c, i) => (
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

      {bubbleText && (
        <TutorialOverlay
          text={bubbleText}
          step={stepIdx + 1}
          totalSteps={steps.length}
          onNext={next}
          onSkip={skip}
          ctaLabel={
            stepIdx === steps.length - 1
              ? "튜토리얼 완료"
              : reachedResult
                ? "결과 닫기"
                : "다음"
          }
        />
      )}

      {modalOpen && reachedResult && (
        <ResultModal
          players={[me, opponent]}
          matchups={matchups}
          myPlayerId={ME_ID}
          playersMeta={playersMeta}
          roundNumber={1}
          maxRounds={0}
          isBonusRound={false}
          isGameOver={false}
          onClose={() => {
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
