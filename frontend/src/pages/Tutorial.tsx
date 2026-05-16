import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  type BubbleKey,
  type NormalScenario,
  type PlayerScript,
  TUTORIAL_SCENARIOS,
} from "../lib/tutorialScenarios";
import { FantasyTutorial } from "./FantasyTutorial";

const ME_ID = "self";
const BOT_ID = "bot";

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

const empty = (): Board => ({ top: [], middle: [], bottom: [] });

// 어떤 step 인지 정의. 사용자가 '다음' 누르면 stepIdx + 1.
type Step =
  | { kind: "intro"; bubble: BubbleKey }
  | { kind: "my_deal"; turn: number; bubble?: BubbleKey } // 사용자 hand 노출만
  | { kind: "my_place"; turn: number } // 사용자 자동 배치 적용
  | { kind: "opp"; turn: number; bubble?: BubbleKey } // 봇 자동 진행 (hand 분배 + 배치)
  | { kind: "result"; bubble: BubbleKey };

function buildSteps(): Step[] {
  const steps: Step[] = [];
  steps.push({ kind: "intro", bubble: "intro" });
  steps.push({ kind: "my_deal", turn: 1, bubble: "first_turn_my" });
  steps.push({ kind: "my_place", turn: 1 });
  steps.push({ kind: "opp", turn: 1, bubble: "first_turn_opp_done" });
  for (let t = 2; t <= 5; t++) {
    steps.push({
      kind: "my_deal",
      turn: t,
      bubble: t === 2 ? "normal_turn_my" : undefined,
    });
    steps.push({ kind: "my_place", turn: t });
    steps.push({ kind: "opp", turn: t });
  }
  steps.push({ kind: "result", bubble: "result" });
  return steps;
}

interface Derived {
  myBoard: Board;
  myHand: Card[];
  myDiscarded: Card[];
  oppBoard: Board;
  oppDiscarded: Card[];
  isResult: boolean;
}

function applyMyTurn(
  board: Board,
  discarded: Card[],
  hand: Card[],
  turnIdx: number,
  script: PlayerScript,
): { board: Board; discarded: Card[] } {
  const next: Board = {
    top: [...board.top],
    middle: [...board.middle],
    bottom: [...board.bottom],
  };
  if (turnIdx === 1) {
    for (let i = 0; i < 5; i++) next[script.firstTurnPlacements[i]].push(hand[i]);
    return { board: next, discarded };
  }
  const s = script.normalTurns[turnIdx - 2];
  for (const p of s.placements) next[p.row].push(hand[p.handIdxInTurn]);
  return {
    board: next,
    discarded: [...discarded, hand[s.discardHandIdxInTurn]],
  };
}

function applyOppTurn(
  board: Board,
  discarded: Card[],
  turnIdx: number,
  script: PlayerScript,
): { board: Board; discarded: Card[] } {
  const offset = turnIdx === 1 ? 0 : 5 + (turnIdx - 2) * 3;
  const count = turnIdx === 1 ? 5 : 3;
  const hand = script.cards.slice(offset, offset + count);
  return applyMyTurn(board, discarded, hand, turnIdx, script);
}

function derive(steps: Step[], stepIdx: number, sc: NormalScenario): Derived {
  let myBoard = empty();
  let myHand: Card[] = [];
  let myDiscarded: Card[] = [];
  let oppBoard = empty();
  let oppDiscarded: Card[] = [];
  let isResult = false;
  for (let i = 0; i <= stepIdx && i < steps.length; i++) {
    const s = steps[i];
    if (s.kind === "my_deal") {
      const offset = s.turn === 1 ? 0 : 5 + (s.turn - 2) * 3;
      const count = s.turn === 1 ? 5 : 3;
      myHand = sc.player.cards.slice(offset, offset + count);
    } else if (s.kind === "my_place") {
      const result = applyMyTurn(myBoard, myDiscarded, myHand, s.turn, sc.player);
      myBoard = result.board;
      myDiscarded = result.discarded;
      myHand = [];
    } else if (s.kind === "opp") {
      const result = applyOppTurn(oppBoard, oppDiscarded, s.turn, sc.opponent);
      oppBoard = result.board;
      oppDiscarded = result.discarded;
    } else if (s.kind === "result") {
      isResult = true;
    }
  }
  return { myBoard, myHand, myDiscarded, oppBoard, oppDiscarded, isResult };
}

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

function fantasyEntryCards(top: Card[]): number | null {
  if (top.length !== 3) return null;
  const hv = evaluate(top);
  if (hv.rank === HandRank.THREE_OF_A_KIND) return 17;
  if (hv.rank === HandRank.ONE_PAIR) {
    const high = hv.tiebreakers[0];
    if (high === 14) return 16;
    if (high === 13) return 15;
    if (high === 12) return 14;
  }
  return null;
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

export function Tutorial() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const scenario =
    TUTORIAL_SCENARIOS.find((s) => s.id === scenarioId) ?? TUTORIAL_SCENARIOS[0];
  if (scenario.kind === "fantasy") {
    return <FantasyTutorial scenario={scenario} />;
  }
  return <NormalTutorialInner scenario={scenario} />;
}

function NormalTutorialInner({ scenario }: { scenario: NormalScenario }) {
  const navigate = useNavigate();
  const steps = useMemo(() => buildSteps(), []);
  const [stepIdx, setStepIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const d = useMemo(
    () => derive(steps, stepIdx, scenario),
    [steps, stepIdx, scenario],
  );
  const currentStep = steps[stepIdx];
  const bubbleKey =
    currentStep && "bubble" in currentStep ? currentStep.bubble : undefined;
  const bubbleText = bubbleKey ? scenario.bubbles[bubbleKey] : undefined;

  const isLastStep = stepIdx >= steps.length - 1;

  // mock PlayerState
  const matchup: Matchup | null = d.isResult
    ? headToHeadMatchup(ME_ID, BOT_ID, d.myBoard, d.oppBoard)
    : null;
  const myDelta = matchup ? matchup.total_a : null;
  const oppDelta = matchup ? -matchup.total_a : null;
  const myFoul = d.isResult
    ? isFoulBoard(d.myBoard.top, d.myBoard.middle, d.myBoard.bottom)
    : false;
  const myFlCards =
    d.isResult && !myFoul ? fantasyEntryCards(d.myBoard.top) : null;
  const me: PlayerState = {
    player_id: ME_ID,
    board: {
      top: d.myBoard.top,
      middle: d.myBoard.middle,
      bottom: d.myBoard.bottom,
      top_count: d.myBoard.top.length,
      middle_count: d.myBoard.middle.length,
      bottom_count: d.myBoard.bottom.length,
    },
    hand: [],
    hand_count: 0,
    score: myDelta ?? 0,
    is_fantasy: false,
    next_fantasy_cards: myFlCards,
    evaluation: d.isResult ? buildEvaluation(d.myBoard) : null,
    last_round_delta: myDelta,
  };
  const opp: PlayerState = {
    player_id: BOT_ID,
    board: {
      top: d.oppBoard.top,
      middle: d.oppBoard.middle,
      bottom: d.oppBoard.bottom,
      top_count: d.oppBoard.top.length,
      middle_count: d.oppBoard.middle.length,
      bottom_count: d.oppBoard.bottom.length,
    },
    hand: [],
    hand_count: 0,
    score: oppDelta ?? 0,
    is_fantasy: false,
    next_fantasy_cards: null,
    evaluation: d.isResult ? buildEvaluation(d.oppBoard) : null,
    last_round_delta: oppDelta,
  };

  const next = () => {
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      setModalOpen(true);
    }
  };

  const handleResultClose = () => {
    setModalOpen(false);
    toast.success("튜토리얼 완료!");
    navigate("/");
  };

  const skip = () => {
    if (confirm("튜토리얼을 건너뛰시겠습니까?")) navigate("/");
  };

  const totalSteps = 5; // bubble 표시되는 핵심 step 수
  const visibleBubbleStepNo: Record<BubbleKey, number> = {
    intro: 1,
    first_turn_my: 2,
    first_turn_opp_done: 3,
    normal_turn_my: 4,
    result: 5,
  };
  const stepNo = bubbleKey ? visibleBubbleStepNo[bubbleKey] : 0;

  return (
    <div className="min-h-screen p-4 flex flex-col gap-3 pb-12">
      <PageHeader
        back={{ label: "← 로비", to: "/" }}
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
        {d.myHand.length > 0 ? (
          <>
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
              }}
            >
              내 카드
            </div>
            <div className="flex gap-1">
              {d.myHand.map((c, i) => (
                <CardView key={`mh-${i}-${c.rank}-${c.suit}`} card={c} />
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
            {d.isResult
              ? "라운드 종료"
              : currentStep && currentStep.kind === "intro"
                ? "튜토리얼 시작"
                : "다음 단계로 진행..."}
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
          vs
        </div>
        <div className="w-full max-w-md">
          <PlayerBoard
            player={me}
            label="나"
            isMe={true}
            isCurrent={!d.isResult}
            isDealer={false}
          />
        </div>

        {d.myDiscarded.length > 0 && (
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
              내가 버린 카드 / 봇이 버린 카드
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {d.myDiscarded.map((c, i) => (
                <CardView
                  key={`md-${i}-${c.rank}-${c.suit}`}
                  card={c}
                  size="sm"
                  faded
                />
              ))}
              <span className="w-2" />
              {d.oppDiscarded.map((c, i) => (
                <CardView
                  key={`od-${i}-${c.rank}-${c.suit}`}
                  card={c}
                  size="sm"
                  faded
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {bubbleText ? (
        <TutorialOverlay
          text={bubbleText}
          step={stepNo}
          totalSteps={totalSteps}
          onNext={next}
          onSkip={skip}
          ctaLabel={
            bubbleKey === "result"
              ? "결과 보기"
              : isLastStep
                ? "튜토리얼 완료"
                : "다음"
          }
        />
      ) : (
        !modalOpen && (
          <div className="fixed inset-x-0 bottom-12 z-30 flex justify-center pointer-events-none">
            <Button
              type="button"
              variant="primary"
              onClick={next}
              className="pointer-events-auto"
              style={{
                borderRadius: "var(--radius-full)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              다음 →
            </Button>
          </div>
        )
      )}

      {modalOpen && matchup && (
        <ResultModal
          players={[me, opp]}
          matchups={[matchup]}
          myPlayerId={ME_ID}
          playersMeta={{ [ME_ID]: "나", [BOT_ID]: scenario.opponent.nickname }}
          roundNumber={1}
          maxRounds={0}
          isBonusRound={false}
          isGameOver={false}
          onClose={handleResultClose}
        />
      )}
    </div>
  );
}
