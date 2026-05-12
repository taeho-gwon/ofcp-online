import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Card, PlayerState, Row } from "../api/types";
import { ROW_CAPACITY } from "../api/types";
import {
  ActionBar,
  getRequiredDiscard,
  getRequiredPlace,
} from "../components/ActionBar";
import { CardView } from "../components/Card";
import { Hand } from "../components/Hand";
import { PlayerBoard } from "../components/PlayerBoard";
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

type Phase = "first_turn" | "normal_turn" | "done";

interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

interface PracticeState {
  phase: Phase;
  turnIdx: number; // 1=first, 2..5=normal
  deck: Card[];
  hand: Card[];
  committed: Board; // 이전 턴들에서 확정된 카드
  discarded: Card[];
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

function newGame(): PracticeState {
  const deck = freshDeck();
  const hand = deck.splice(0, 5);
  return {
    phase: "first_turn",
    turnIdx: 1,
    deck,
    hand,
    committed: emptyBoard(),
    discarded: [],
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

export function Practice() {
  const navigate = useNavigate();
  const authed = useAuthStore((s) => !!s.accessToken);

  const [g, setG] = useState<PracticeState>(() => newGame());
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [placed, setPlaced] = useState<PlacedSlot[]>([]);

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
      const card = g.hand[slot.handIdx];
      if (card) out[slot.row].push({ card, handIdx: slot.handIdx });
    }
    return out;
  }, [placed, g.hand]);

  const rowUsed = (row: Row): number =>
    g.committed[row].length + pendingByRow[row].length;

  const isMyTurn = g.phase !== "done";

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

  const handlePendingClick = (handIdx: number) => unplace(handIdx);

  const handleConfirm = () => {
    if (!isMyTurn) return;
    const phase = g.phase;
    const placeReq = getRequiredPlace(phase);
    const discardReq = getRequiredDiscard(phase, g.hand.length);
    if (placed.length !== placeReq) {
      toast.error(`${placeReq}장을 배치해야 합니다. (현재 ${placed.length}장)`);
      return;
    }
    const missing = g.hand
      .map((_, i) => i)
      .filter((i) => !placedIdxSet.has(i));
    if (missing.length !== discardReq) {
      toast.error(`버려질 카드 수가 맞지 않습니다.`);
      return;
    }

    // commit
    setG((prev) => {
      const newCommitted: Board = {
        top: [...prev.committed.top],
        middle: [...prev.committed.middle],
        bottom: [...prev.committed.bottom],
      };
      for (const slot of placed) {
        const card = prev.hand[slot.handIdx];
        if (card) newCommitted[slot.row].push(card);
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
        };
      }
      // normal_turn
      if (prev.turnIdx >= 5) {
        return {
          ...prev,
          phase: "done",
          hand: [],
          committed: newCommitted,
          discarded: newDiscarded,
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

  const restart = () => {
    setG(newGame());
    clearPending();
  };

  // ── PlayerBoard에 넘길 mock PlayerState ──────────────────────────────
  const isFoul =
    g.phase === "done" &&
    isFoulBoard(g.committed.top, g.committed.middle, g.committed.bottom);

  const evaluation = g.phase === "done"
    ? {
        top: {
          rank: evaluate(g.committed.top).rank,
          rank_label: "",
          label: handLabel(evaluate(g.committed.top)),
          royalty: royaltyTop(g.committed.top, isFoul),
        },
        middle: {
          rank: evaluate(g.committed.middle).rank,
          rank_label: "",
          label: handLabel(evaluate(g.committed.middle)),
          royalty: royaltyMiddle(g.committed.middle, isFoul),
        },
        bottom: {
          rank: evaluate(g.committed.bottom).rank,
          rank_label: "",
          label: handLabel(evaluate(g.committed.bottom)),
          royalty: royaltyBottom(g.committed.bottom, isFoul),
        },
        is_foul: isFoul,
        total_royalty:
          royaltyTop(g.committed.top, isFoul) +
          royaltyMiddle(g.committed.middle, isFoul) +
          royaltyBottom(g.committed.bottom, isFoul),
      }
    : null;

  const me: PlayerState = {
    player_id: "self",
    board: {
      top: g.committed.top,
      middle: g.committed.middle,
      bottom: g.committed.bottom,
      top_count: g.committed.top.length,
      middle_count: g.committed.middle.length,
      bottom_count: g.committed.bottom.length,
    },
    hand: g.hand,
    hand_count: g.hand.length,
    score: 0,
    is_fantasy: false,
    next_fantasy_cards:
      g.phase === "done" && !isFoul ? fantasyEntryCards(g.committed.top) : null,
    evaluation,
    last_round_delta: null,
  };

  const phaseLabel =
    g.phase === "first_turn"
      ? "1턴 — 5장 모두 배치"
      : g.phase === "normal_turn"
        ? `${g.turnIdx}턴 — 2장 배치, 1장은 자동 버림`
        : "라운드 종료";

  const totalRoyalty = evaluation?.total_royalty ?? 0;
  const flCards = me.next_fantasy_cards;

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
          <span className="font-semibold">{phaseLabel}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 text-xs">
            진행 {g.committed.top.length + g.committed.middle.length + g.committed.bottom.length}/13
            · 버림 {g.discarded.length}/4
          </span>
        </div>
        <button
          type="button"
          onClick={restart}
          className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
        >
          새 라운드
        </button>
      </header>

      <section className="flex justify-center">
        <ActionBar
          phase={g.phase}
          isMyTurn={isMyTurn}
          hasPending={
            placed.length > 0 || selectedRow !== null || selectedCardIdx !== null
          }
          onConfirm={handleConfirm}
          onCancel={clearPending}
        />
      </section>

      <section className="flex justify-center">
        <Hand
          hand={g.hand}
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
            label="연습"
            isMe={true}
            isCurrent={isMyTurn}
            isDealer={false}
            pendingByRow={pendingByRow}
            selectedRow={selectedRow}
            onRowSelect={isMyTurn ? handleRowSelect : undefined}
            onPendingClick={handlePendingClick}
          />
        </div>

        {g.phase === "done" && (
          <div className="w-full max-w-md bg-white rounded-lg shadow p-3 flex items-center justify-center gap-3 text-sm">
            {isFoul ? (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-bold">
                FOUL — Royalty 0
              </span>
            ) : (
              <>
                <span className="text-slate-600">
                  Total Royalty{" "}
                  <span className="text-emerald-700 font-bold">
                    +{totalRoyalty}
                  </span>
                </span>
                {flCards != null && (
                  <span className="px-2 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded font-semibold">
                    FantasyLand 자격 — {flCards}장
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {g.discarded.length > 0 && (
          <div className="w-full max-w-md bg-white rounded-lg shadow p-3">
            <div className="text-xs text-slate-500 mb-1">버린 카드</div>
            <div className="flex flex-wrap justify-center gap-1">
              {g.discarded.map((c, i) => (
                <CardView key={`d-${i}-${c.rank}-${c.suit}`} card={c} size="sm" faded />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
