import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Card, Row } from "../api/types";
import { cardKey } from "../api/types";
import { CardView, EmptySlot } from "../components/Card";
import { evaluate, HandRank, isFoulBoard } from "../lib/handEval";
import {
  handLabel,
  royaltyBottom,
  royaltyMiddle,
  royaltyTop,
} from "../lib/royalty";
import { useAuthStore } from "../store/authStore";

const ROW_CAP: Record<Row, number> = { top: 3, middle: 5, bottom: 5 };
const ROWS: Row[] = ["top", "middle", "bottom"];
const ROW_LABEL: Record<Row, string> = {
  top: "TOP (3)",
  middle: "MIDDLE (5)",
  bottom: "BOTTOM (5)",
};
const SUITS = [1, 2, 3, 4];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

type Phase = "first" | "normal" | "done";

interface Placed {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

const emptyPlaced = (): Placed => ({ top: [], middle: [], bottom: [] });

function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s });
  // Fisher–Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface GameState {
  phase: Phase;
  turnIdx: number; // 1=first, 2..5=normal
  deck: Card[];
  hand: Card[];
  placed: Placed;
  discarded: Card[];
}

function newGame(): GameState {
  const deck = freshDeck();
  const hand = deck.splice(0, 5);
  return {
    phase: "first",
    turnIdx: 1,
    deck,
    hand,
    placed: emptyPlaced(),
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

  const [g, setG] = useState<GameState>(() => newGame());
  const [selectedHandIdx, setSelectedHandIdx] = useState<number | null>(null);

  const placedCount =
    g.placed.top.length + g.placed.middle.length + g.placed.bottom.length;
  const isFoul = isFoulBoard(g.placed.top, g.placed.middle, g.placed.bottom);

  const canAdvance =
    g.phase === "first"
      ? g.hand.length === 0 && placedCount === 5
      : g.phase === "normal"
        ? g.hand.length === 1 && placedCount === 5 + (g.turnIdx - 1) * 2
        : false;

  const toggleHandPick = (idx: number) => {
    setSelectedHandIdx((cur) => (cur === idx ? null : idx));
  };

  const placeIntoRow = (row: Row) => {
    if (selectedHandIdx === null) return;
    if (g.placed[row].length >= ROW_CAP[row]) {
      toast.error("이 줄은 가득 찼습니다.");
      return;
    }
    setG((prev) => {
      const card = prev.hand[selectedHandIdx];
      if (!card) return prev;
      const newHand = [...prev.hand];
      newHand.splice(selectedHandIdx, 1);
      return {
        ...prev,
        hand: newHand,
        placed: { ...prev.placed, [row]: [...prev.placed[row], card] },
      };
    });
    setSelectedHandIdx(null);
  };

  const undoPlacement = (row: Row, idx: number) => {
    if (g.phase === "done") return;
    setG((prev) => {
      const next = [...prev.placed[row]];
      const [card] = next.splice(idx, 1);
      return {
        ...prev,
        placed: { ...prev.placed, [row]: next },
        hand: [...prev.hand, card],
      };
    });
    setSelectedHandIdx(null);
  };

  const advanceTurn = () => {
    if (!canAdvance) return;
    setG((prev) => {
      // first → normal turn 2
      if (prev.phase === "first") {
        const newDeck = [...prev.deck];
        const dealt = newDeck.splice(0, 3);
        return {
          ...prev,
          phase: "normal",
          turnIdx: 2,
          deck: newDeck,
          hand: dealt,
        };
      }
      // normal turn: 손에 남은 1장 → discard
      const discardCard = prev.hand[0];
      const newDiscarded = discardCard
        ? [...prev.discarded, discardCard]
        : prev.discarded;
      if (prev.turnIdx >= 5) {
        return {
          ...prev,
          phase: "done",
          hand: [],
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
        discarded: newDiscarded,
      };
    });
    setSelectedHandIdx(null);
  };

  const restart = () => {
    setG(newGame());
    setSelectedHandIdx(null);
  };

  const rowEval = (row: Row) => {
    const cards = g.placed[row];
    if (cards.length !== ROW_CAP[row]) return null;
    const hv = evaluate(cards);
    const royalty =
      row === "top"
        ? royaltyTop(cards, isFoul)
        : row === "middle"
          ? royaltyMiddle(cards, isFoul)
          : royaltyBottom(cards, isFoul);
    return { label: handLabel(hv), royalty };
  };

  const totalRoyalty =
    g.phase === "done" && !isFoul
      ? royaltyTop(g.placed.top, false) +
        royaltyMiddle(g.placed.middle, false) +
        royaltyBottom(g.placed.bottom, false)
      : 0;
  const flCards = g.phase === "done" && !isFoul
    ? fantasyEntryCards(g.placed.top)
    : null;

  const phaseLabel =
    g.phase === "first"
      ? "1턴 — 5장 모두 배치"
      : g.phase === "normal"
        ? `${g.turnIdx}턴 — 2장 배치 후 다음 턴 (1장 자동 버림)`
        : "라운드 종료";

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-12">
      <header className="max-w-3xl mx-auto flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(authed ? "/" : "/login")}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← {authed ? "로비" : "로그인"}
        </button>
        <h1 className="text-xl font-bold">연습 모드</h1>
        <button
          type="button"
          onClick={restart}
          className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
        >
          새 라운드
        </button>
      </header>

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-4 mb-3">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="font-semibold">{phaseLabel}</span>
          <span className="text-slate-500">
            진행 {placedCount}/13 · 버림 {g.discarded.length}/4
          </span>
        </div>

        {ROWS.map((row) => {
          const cards = g.placed[row];
          const empty = Math.max(0, ROW_CAP[row] - cards.length);
          const ev = rowEval(row);
          const slotClickable = selectedHandIdx !== null && empty > 0;
          return (
            <div key={row} className="flex flex-col gap-1 mb-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-mono">{ROW_LABEL[row]}</span>
                {ev && (
                  <span>
                    <span className="text-slate-700 font-semibold">
                      {ev.label}
                    </span>
                    {ev.royalty > 0 && (
                      <span className="ml-2 text-emerald-700 font-semibold">
                        +{ev.royalty}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex justify-center gap-1">
                {cards.map((c, i) => (
                  <CardView
                    key={`${row}-${i}-${cardKey(c)}`}
                    card={c}
                    size="md"
                    onClick={
                      g.phase === "done" ? undefined : () => undoPlacement(row, i)
                    }
                  />
                ))}
                {Array.from({ length: empty }).map((_, i) => (
                  <EmptySlot
                    key={`${row}-e-${i}`}
                    size="md"
                    highlighted={slotClickable}
                    onClick={slotClickable ? () => placeIntoRow(row) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {g.phase === "done" && (
          <div className="flex items-center justify-center gap-3 text-sm pt-3 mt-1 border-t border-slate-200">
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
                    FantasyLand 자격 — 다음 라운드 {flCards}장
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            {g.phase === "done"
              ? "라운드 종료. '새 라운드'를 눌러 다시 시작."
              : "내 카드 — 클릭해 선택 후 위의 빈 슬롯에 배치"}
          </span>
          {g.phase !== "done" && (
            <button
              type="button"
              onClick={advanceTurn}
              disabled={!canAdvance}
              className="text-sm px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {g.phase === "first"
                ? "1턴 확정"
                : g.turnIdx >= 5
                  ? "라운드 종료"
                  : "다음 턴"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-1 min-h-[5rem]">
          {g.hand.length === 0 && g.phase !== "done" && (
            <span className="text-slate-400 text-sm self-center">
              (배치 완료 — '{g.phase === "first" ? "1턴 확정" : "다음 턴"}' 클릭)
            </span>
          )}
          {g.hand.map((c, i) => (
            <CardView
              key={`hand-${i}-${cardKey(c)}`}
              card={c}
              size="md"
              selected={selectedHandIdx === i}
              onClick={() => toggleHandPick(i)}
            />
          ))}
        </div>
      </div>

      {g.discarded.length > 0 && (
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-3">
          <div className="text-xs text-slate-500 mb-1">버린 카드</div>
          <div className="flex flex-wrap justify-center gap-1">
            {g.discarded.map((c, i) => (
              <CardView key={`d-${i}-${cardKey(c)}`} card={c} size="sm" faded />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
