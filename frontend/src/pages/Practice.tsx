import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type {
  BoardEvaluation,
  Card,
  GameState,
  HandEvaluation,
  PlayerState,
  Row,
} from "../api/types";
import { ROW_CAPACITY } from "../api/types";
import {
  ActionBar,
  getRequiredDiscard,
  getRequiredPlace,
} from "../components/ActionBar";
import { CardView } from "../components/Card";
import { Hand } from "../components/Hand";
import { PlayerBoard } from "../components/PlayerBoard";
import { ResultModal } from "../components/ResultModal";
import { useMatchupAnimation } from "../components/useMatchupAnimation";
import { evaluate, HandRank, isFoulBoard } from "../lib/handEval";
import {
  handLabel,
  royaltyBottom,
  royaltyMiddle,
  royaltyTop,
} from "../lib/royalty";
import { useAuthStore } from "../store/authStore";

const SUITS = [1, 2, 3, 4];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const PRACTICE_ID = "self";
const PRACTICE_NICK = "연습";
const PRACTICE_MAX_ROUNDS = 5; // 1라운드(first 1 + normal 4턴)를 max_rounds로 표시

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

interface PracticeState {
  // GameState와 분리된 내부 상태(deck/discarded 같은 게임엔 없는 정보 포함).
  phase: GameState["phase"];
  turnIdx: number; // 1=first, 2..5=normal
  deck: Card[];
  hand: Card[];
  committed: Board;
  discarded: Card[];
  cumulativeScore: number; // 연습 누적 royalty (1라운드 종료마다 가산)
  lastRoundDelta: number | null;
}

interface PlacedSlot {
  handIdx: number;
  row: Row;
}

const emptyBoard = (): Board => ({ top: [], middle: [], bottom: [] });

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function startNewRound(prevScore: number): PracticeState {
  const deck = freshDeck();
  const hand = deck.splice(0, 5);
  return {
    phase: "first_turn",
    turnIdx: 1,
    deck,
    hand,
    committed: emptyBoard(),
    discarded: [],
    cumulativeScore: prevScore,
    lastRoundDelta: null,
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

function rowEval(cards: Card[], isFoul: boolean, royaltyFn: (c: Card[], f: boolean) => number): HandEvaluation {
  const hv = evaluate(cards);
  return {
    rank: hv.rank,
    rank_label: "",
    label: handLabel(hv),
    royalty: royaltyFn(cards, isFoul),
  };
}

function buildEvaluation(board: Board): BoardEvaluation {
  const isFoul = isFoulBoard(board.top, board.middle, board.bottom);
  const top = rowEval(board.top, isFoul, royaltyTop);
  const middle = rowEval(board.middle, isFoul, royaltyMiddle);
  const bottom = rowEval(board.bottom, isFoul, royaltyBottom);
  return {
    top,
    middle,
    bottom,
    is_foul: isFoul,
    total_royalty: top.royalty + middle.royalty + bottom.royalty,
  };
}

function buildGameState(s: PracticeState): GameState {
  const showResult = s.phase === "done" || s.phase === "game_over";
  const evaluation = showResult ? buildEvaluation(s.committed) : null;
  const nextFl =
    showResult && evaluation && !evaluation.is_foul
      ? fantasyEntryCards(s.committed.top)
      : null;
  const me: PlayerState = {
    player_id: PRACTICE_ID,
    board: {
      top: s.committed.top,
      middle: s.committed.middle,
      bottom: s.committed.bottom,
      top_count: s.committed.top.length,
      middle_count: s.committed.middle.length,
      bottom_count: s.committed.bottom.length,
    },
    hand: s.hand,
    hand_count: s.hand.length,
    score: s.cumulativeScore,
    is_fantasy: false,
    next_fantasy_cards: nextFl,
    evaluation,
    last_round_delta: showResult ? s.lastRoundDelta : null,
  };
  return {
    game_id: "practice",
    phase: s.phase,
    dealer_idx: 0,
    current_player_idx: 0,
    current_player_id: PRACTICE_ID,
    round_number: 1,
    is_bonus_round: false,
    max_rounds: PRACTICE_MAX_ROUNDS,
    is_game_over: false, // 1라운드씩 반복하므로 게임 종료 아님 — "계속" 누르면 다음 라운드
    players: [me],
    matchups: showResult ? [] : null,
    players_meta: { [PRACTICE_ID]: PRACTICE_NICK },
  };
}

export function Practice() {
  const navigate = useNavigate();
  const authed = useAuthStore((s) => !!s.accessToken);

  const [s, setS] = useState<PracticeState>(() => startNewRound(0));
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [placed, setPlaced] = useState<PlacedSlot[]>([]);
  const [animationDone, setAnimationDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const gameState = useMemo(() => buildGameState(s), [s]);
  const me = gameState.players[0];
  const inResultPhase =
    gameState.phase === "done" || gameState.phase === "game_over";
  const isMyTurn = !inResultPhase;

  const anim = useMatchupAnimation(
    inResultPhase && !animationDone ? (gameState.matchups ?? []) : null,
    () => {
      setAnimationDone(true);
      setModalOpen(true);
    },
  );

  const placedIdxSet = useMemo(
    () => new Set(placed.map((p) => p.handIdx)),
    [placed],
  );

  const pendingByRow = useMemo(() => {
    const out: Record<Row, { card: Card; handIdx: number }[]> = {
      top: [],
      middle: [],
      bottom: [],
    };
    for (const slot of placed) {
      const card = s.hand[slot.handIdx];
      if (card) out[slot.row].push({ card, handIdx: slot.handIdx });
    }
    return out;
  }, [placed, s.hand]);

  const rowUsed = (row: Row): number =>
    s.committed[row].length + pendingByRow[row].length;

  const clearPending = () => {
    setSelectedRow(null);
    setSelectedCardIdx(null);
    setPlaced([]);
  };

  const placePiece = (handIdx: number, row: Row) => {
    if (placed.some((p) => p.handIdx === handIdx)) return;
    setPlaced((cur) => [...cur, { handIdx, row }]);
    setSelectedRow(row);
    setSelectedCardIdx(null);
  };

  const unplace = (handIdx: number) => {
    setPlaced((cur) => cur.filter((p) => p.handIdx !== handIdx));
  };

  const handleRowSelect = (row: Row) => {
    if (!isMyTurn) return;
    if (selectedCardIdx !== null) {
      if (rowUsed(row) >= ROW_CAPACITY[row]) {
        toast.error(`${row} 줄이 가득 찼습니다.`);
        return;
      }
      placePiece(selectedCardIdx, row);
      return;
    }
    setSelectedRow(selectedRow === row ? null : row);
  };

  const handleHandPlace = (idx: number) => {
    if (!isMyTurn) return;
    if (selectedRow !== null) {
      if (rowUsed(selectedRow) >= ROW_CAPACITY[selectedRow]) {
        toast.error(`${selectedRow} 줄이 가득 찼습니다.`);
        return;
      }
      placePiece(idx, selectedRow);
      return;
    }
    setSelectedCardIdx(selectedCardIdx === idx ? null : idx);
  };

  const handleConfirm = () => {
    if (!isMyTurn) return;
    const phase = s.phase;
    const placeReq = getRequiredPlace(phase);
    const discardReq = getRequiredDiscard(phase, s.hand.length);
    if (placed.length !== placeReq) {
      toast.error(`${placeReq}장을 배치해야 합니다.`);
      return;
    }
    const missing = s.hand
      .map((_, i) => i)
      .filter((i) => !placedIdxSet.has(i));
    if (missing.length !== discardReq) {
      toast.error("버려질 카드 수가 맞지 않습니다.");
      return;
    }

    setS((prev) => {
      const newCommitted: Board = {
        top: [...prev.committed.top],
        middle: [...prev.committed.middle],
        bottom: [...prev.committed.bottom],
      };
      for (const slot of placed) {
        const c = prev.hand[slot.handIdx];
        if (c) newCommitted[slot.row].push(c);
      }
      const newDiscarded =
        phase === "normal_turn" && missing.length === 1
          ? [...prev.discarded, prev.hand[missing[0]]]
          : prev.discarded;

      if (phase === "first_turn") {
        const newDeck = [...prev.deck];
        const dealt = newDeck.splice(0, 3);
        return {
          ...prev,
          phase: "normal_turn",
          turnIdx: 2,
          deck: newDeck,
          hand: dealt,
          committed: newCommitted,
          discarded: newDiscarded,
        };
      }
      // normal_turn
      if (prev.turnIdx >= 5) {
        const evalDone = buildEvaluation(newCommitted);
        const delta = evalDone.is_foul ? 0 : evalDone.total_royalty;
        return {
          ...prev,
          phase: "done",
          hand: [],
          committed: newCommitted,
          discarded: newDiscarded,
          lastRoundDelta: delta,
          cumulativeScore: prev.cumulativeScore + delta,
        };
      }
      const newDeck = [...prev.deck];
      const dealt = newDeck.splice(0, 3);
      return {
        ...prev,
        turnIdx: prev.turnIdx + 1,
        deck: newDeck,
        hand: dealt,
        committed: newCommitted,
        discarded: newDiscarded,
      };
    });
    clearPending();
  };

  const handleCloseResultModal = () => {
    // 다음 라운드 시작
    setModalOpen(false);
    setAnimationDone(false);
    setS((prev) => startNewRound(prev.cumulativeScore));
    clearPending();
  };

  const headerStatus = (() => {
    if (gameState.phase === "first_turn") return "1턴 — 5장 모두 배치";
    if (gameState.phase === "normal_turn") return `${s.turnIdx}턴 — 2장 배치, 1장 자동 버림`;
    return "라운드 종료";
  })();

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-3 pb-12">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(authed ? "/" : "/login")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← {authed ? "로비" : "로그인"}
        </button>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{headerStatus}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 text-xs">
            진행 {s.committed.top.length + s.committed.middle.length + s.committed.bottom.length}/13
            · 버림 {s.discarded.length}/4 · 누적 {s.cumulativeScore}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setS(startNewRound(0));
            clearPending();
            setModalOpen(false);
            setAnimationDone(false);
          }}
          className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
        >
          처음부터
        </button>
      </header>

      <section className="flex justify-center">
        <ActionBar
          phase={gameState.phase}
          isMyTurn={isMyTurn}
          hasPending={
            placed.length > 0 ||
            selectedRow !== null ||
            selectedCardIdx !== null
          }
          onConfirm={handleConfirm}
          onCancel={clearPending}
          onShowResult={
            inResultPhase && animationDone ? () => setModalOpen(true) : undefined
          }
        />
      </section>

      <section className="flex justify-center">
        <Hand
          hand={s.hand}
          placedIdxSet={placedIdxSet}
          enabled={isMyTurn}
          selectedIdx={selectedCardIdx}
          onPlace={handleHandPlace}
          onUnplace={unplace}
        />
      </section>

      <main className="flex-1 flex flex-col items-center gap-3">
        <div className="w-full max-w-md">
          <PlayerBoard
            player={me}
            label={PRACTICE_NICK}
            isMe={true}
            isCurrent={isMyTurn}
            isDealer={false}
            pendingByRow={pendingByRow}
            selectedRow={selectedRow}
            onRowSelect={isMyTurn ? handleRowSelect : undefined}
            onPendingClick={unplace}
            animOverlay={anim.overlaysByPlayer[PRACTICE_ID] ?? null}
          />
        </div>

        {s.discarded.length > 0 && !inResultPhase && (
          <div className="w-full max-w-md bg-white rounded-lg shadow p-3">
            <div className="text-xs text-slate-500 mb-1">버린 카드</div>
            <div className="flex flex-wrap justify-center gap-1">
              {s.discarded.map((c, i) => (
                <CardView key={`d-${i}-${c.rank}-${c.suit}`} card={c} size="sm" faded />
              ))}
            </div>
          </div>
        )}
      </main>

      {modalOpen && (
        <ResultModal
          players={gameState.players}
          matchups={gameState.matchups ?? []}
          myPlayerId={PRACTICE_ID}
          playersMeta={gameState.players_meta}
          roundNumber={gameState.round_number}
          maxRounds={gameState.max_rounds}
          isBonusRound={gameState.is_bonus_round}
          isGameOver={false}
          onClose={handleCloseResultModal}
        />
      )}
    </div>
  );
}
