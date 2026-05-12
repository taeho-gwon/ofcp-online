import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type {
  BoardEvaluation,
  Card,
  GameState,
  HandEvaluation,
  PlayerState,
  WsClientMsg,
} from "../api/types";
import { OfcTable, type OfcSession } from "../components/OfcTable";
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
  type NormalTurnScript,
  type OpponentScript,
  TUTORIAL_SCENARIOS,
  type TutorialScenario,
} from "../lib/tutorialScenarios";

const ME_ID = "self";
const BOT_ID = "bot";
const BOT_DELAY_MS = 900;

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

interface TState {
  phase: "first_turn" | "normal_turn" | "done";
  turnIdx: number; // 1=first, 2..5=normal
  currentPlayer: "self" | "bot";
  myHand: Card[];
  myBoard: Board;
  myDiscarded: Card[];
  myDeckIdx: number;
  botBoard: Board;
  botDiscarded: Card[];
  botDeckIdx: number;
  bubble: BubbleKey | null;
}

const emptyBoard = (): Board => ({ top: [], middle: [], bottom: [] });

function initialState(): TState {
  return {
    phase: "first_turn",
    turnIdx: 1,
    currentPlayer: "self",
    myHand: [],
    myBoard: emptyBoard(),
    myDiscarded: [],
    myDeckIdx: 0,
    botBoard: emptyBoard(),
    botDiscarded: [],
    botDeckIdx: 0,
    bubble: "intro",
  };
}

function dealMy(s: TState, scenario: TutorialScenario): TState {
  const count = s.turnIdx === 1 ? 5 : 3;
  return {
    ...s,
    myHand: scenario.myCards.slice(s.myDeckIdx, s.myDeckIdx + count),
    myDeckIdx: s.myDeckIdx + count,
  };
}

function applyMyAction(s: TState, msg: WsClientMsg): TState {
  if (msg.action === "first_turn" || msg.action === "normal_turn") {
    const placed: Board = {
      top: [...s.myBoard.top, ...msg.placements.top],
      middle: [...s.myBoard.middle, ...msg.placements.middle],
      bottom: [...s.myBoard.bottom, ...msg.placements.bottom],
    };
    const discarded =
      msg.action === "normal_turn"
        ? [...s.myDiscarded, msg.discard]
        : s.myDiscarded;
    return {
      ...s,
      myBoard: placed,
      myDiscarded: discarded,
      myHand: [],
      currentPlayer: "bot",
    };
  }
  return s;
}

function applyBotAction(s: TState, opp: OpponentScript): TState {
  // 봇이 자기 차례에 카드 받고 script대로 배치한다.
  const count = s.turnIdx === 1 ? 5 : 3;
  const hand = opp.cards.slice(s.botDeckIdx, s.botDeckIdx + count);
  const newDeckIdx = s.botDeckIdx + count;
  const board: Board = {
    top: [...s.botBoard.top],
    middle: [...s.botBoard.middle],
    bottom: [...s.botBoard.bottom],
  };
  let discarded = s.botDiscarded;

  if (s.turnIdx === 1) {
    // first turn — 5장 모두 배치
    for (let i = 0; i < 5; i++) {
      board[opp.firstTurnPlacements[i]].push(hand[i]);
    }
  } else {
    const script: NormalTurnScript = opp.normalTurns[s.turnIdx - 2];
    for (const p of script.placements) {
      board[p.row].push(hand[p.handIdxInTurn]);
    }
    discarded = [...discarded, hand[script.discardHandIdxInTurn]];
  }

  const next: TState = {
    ...s,
    botBoard: board,
    botDiscarded: discarded,
    botDeckIdx: newDeckIdx,
    currentPlayer: "self",
  };

  if (s.turnIdx === 5) {
    next.phase = "done";
    next.bubble = "result";
    return next;
  }

  // 다음 턴 진입
  next.turnIdx = s.turnIdx + 1;
  next.phase = "normal_turn";

  if (s.turnIdx === 1) {
    // first turn 끝 → 사용자 normal turn 시작 전 안내 bubble
    // 사용자 hand는 bubble 닫을 때 deal
    next.bubble = "first_turn_opp_done";
  }
  // 일반 normal turn — 사용자 hand deal은 호출자(botStep)가 처리
  return next;
}

// 봇 액션 + 필요한 경우 사용자 다음 hand deal까지.
function botStep(s: TState, scenario: TutorialScenario): TState {
  const next = applyBotAction(s, scenario.opponent);
  if (
    next.phase === "normal_turn" &&
    next.currentPlayer === "self" &&
    next.bubble === null &&
    next.myHand.length === 0
  ) {
    return dealMy(next, scenario);
  }
  return next;
}

function dismissBubble(s: TState, scenario: TutorialScenario): TState {
  switch (s.bubble) {
    case "intro":
      // 사용자 first turn 5장 deal
      return { ...dealMy(s, scenario), bubble: "first_turn_my" };
    case "first_turn_my":
      return { ...s, bubble: null };
    case "first_turn_opp_done":
      return { ...dealMy(s, scenario), bubble: "normal_turn_my" };
    case "normal_turn_my":
      return { ...s, bubble: null };
    case "result":
      return { ...s, bubble: null };
    default:
      return s;
  }
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

function toPlayer(
  id: string,
  board: Board,
  hand: Card[],
  showEval: boolean,
  lastDelta: number | null,
): PlayerState {
  return {
    player_id: id,
    board: {
      top: board.top,
      middle: board.middle,
      bottom: board.bottom,
      top_count: board.top.length,
      middle_count: board.middle.length,
      bottom_count: board.bottom.length,
    },
    hand,
    hand_count: hand.length,
    score: lastDelta ?? 0,
    is_fantasy: false,
    next_fantasy_cards: null,
    evaluation: showEval ? buildEvaluation(board) : null,
    last_round_delta: lastDelta,
  };
}

function buildGameState(s: TState, scenario: TutorialScenario): GameState {
  const showResult = s.phase === "done";
  const matchups = showResult
    ? [headToHeadMatchup(ME_ID, BOT_ID, s.myBoard, s.botBoard)]
    : null;
  const myDelta = matchups ? matchups[0].total_a : null;
  const botDelta = matchups ? -matchups[0].total_a : null;
  const me = toPlayer(ME_ID, s.myBoard, s.myHand, showResult, myDelta);
  const bot = toPlayer(BOT_ID, s.botBoard, [], showResult, botDelta);
  return {
    game_id: "tutorial",
    phase: s.phase,
    dealer_idx: 1, // 봇이 dealer라 첫 turn current = self
    current_player_idx: s.currentPlayer === "self" ? 0 : 1,
    current_player_id: s.currentPlayer === "self" ? ME_ID : BOT_ID,
    round_number: 1,
    is_bonus_round: false,
    max_rounds: 0,
    is_game_over: false,
    players: [me, bot],
    matchups,
    players_meta: { [ME_ID]: "나", [BOT_ID]: scenario.opponent.nickname },
  };
}

export function Tutorial() {
  const navigate = useNavigate();
  const [scenarioIdx] = useState(0);
  const scenario = TUTORIAL_SCENARIOS[scenarioIdx];
  const [s, setS] = useState<TState>(initialState);

  // 봇 차례면 일정 시간 뒤 자동 진행
  useEffect(() => {
    if (s.currentPlayer !== "bot") return;
    if (s.bubble !== null) return;
    const t = setTimeout(() => {
      setS((prev) => botStep(prev, scenario));
    }, BOT_DELAY_MS);
    return () => clearTimeout(t);
  }, [s.currentPlayer, s.bubble, scenario]);

  const gameState = useMemo(() => buildGameState(s, scenario), [s, scenario]);

  const session: OfcSession = useMemo(
    () => ({
      gameState,
      myPlayerId: ME_ID,
      connected: true,
      confirm: (msg) => setS((prev) => applyMyAction(prev, msg)),
      resultClose: () => {
        toast.success("튜토리얼 완료!");
        navigate("/");
      },
    }),
    [gameState, navigate],
  );

  const bubbleText = s.bubble ? scenario.bubbles[s.bubble] : null;
  // step 번호 (UX용): intro=1, first_turn_my=2, ...result=5
  const bubbleStepMap: Record<BubbleKey, number> = {
    intro: 1,
    first_turn_my: 2,
    first_turn_opp_done: 3,
    normal_turn_my: 4,
    result: 5,
  };
  const stepNo = s.bubble ? bubbleStepMap[s.bubble] : 0;

  const handleSkip = () => {
    if (confirm("튜토리얼을 건너뛰시겠습니까?")) navigate("/");
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
          onClick={handleSkip}
          className="text-xs text-slate-500 hover:underline"
        >
          건너뛰기
        </button>
      </header>

      <OfcTable session={session} />

      {bubbleText && (
        <TutorialOverlay
          text={bubbleText}
          step={stepNo}
          totalSteps={5}
          onNext={() => setS((prev) => dismissBubble(prev, scenario))}
          onSkip={handleSkip}
          ctaLabel={s.bubble === "result" ? "결과 보기" : "다음"}
        />
      )}
    </div>
  );
}
