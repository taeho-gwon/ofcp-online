import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Card, Row } from "../api/types";
import { cardKey } from "../api/types";
import { CardView, EmptySlot } from "../components/Card";
import { evaluate, isFoulBoard } from "../lib/handEval";
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
const SUITS = [4, 3, 2, 1]; // S, H, D, C
const RANKS = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

const ALL_DECK: Card[] = SUITS.flatMap((suit) =>
  RANKS.map((rank) => ({ rank, suit })),
);

interface Placed {
  top: Card[];
  middle: Card[];
  bottom: Card[];
}

const emptyPlaced = (): Placed => ({ top: [], middle: [], bottom: [] });

export function Practice() {
  const navigate = useNavigate();
  const authed = useAuthStore((s) => !!s.accessToken);

  const [placed, setPlaced] = useState<Placed>(emptyPlaced);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const usedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const row of ROWS) for (const c of placed[row]) s.add(cardKey(c));
    return s;
  }, [placed]);

  const selectedCard = useMemo(() => {
    if (!selectedKey) return null;
    return ALL_DECK.find((c) => cardKey(c) === selectedKey) ?? null;
  }, [selectedKey]);

  const togglePoolCard = (c: Card) => {
    const k = cardKey(c);
    if (usedKeys.has(k)) return;
    setSelectedKey((cur) => (cur === k ? null : k));
  };

  const placeIntoRow = (row: Row) => {
    if (!selectedCard) return;
    if (placed[row].length >= ROW_CAP[row]) return;
    setPlaced((p) => ({ ...p, [row]: [...p[row], selectedCard] }));
    setSelectedKey(null);
  };

  const removeFromRow = (row: Row, idx: number) => {
    setPlaced((p) => {
      const next = [...p[row]];
      next.splice(idx, 1);
      return { ...p, [row]: next };
    });
  };

  const reset = () => {
    setPlaced(emptyPlaced());
    setSelectedKey(null);
  };

  const isComplete =
    placed.top.length === 3 &&
    placed.middle.length === 5 &&
    placed.bottom.length === 5;
  const isFoul = isFoulBoard(placed.top, placed.middle, placed.bottom);

  const rowEval = (row: Row) => {
    const cards = placed[row];
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

  const totalRoyalty = isComplete && !isFoul
    ? royaltyTop(placed.top, false) +
      royaltyMiddle(placed.middle, false) +
      royaltyBottom(placed.bottom, false)
    : 0;

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
          onClick={reset}
          className="text-sm px-3 py-1 rounded bg-slate-200 hover:bg-slate-300"
        >
          리셋
        </button>
      </header>

      <section className="max-w-3xl mx-auto bg-white rounded-lg shadow p-4 flex flex-col gap-3 mb-3">
        {ROWS.map((row) => {
          const cards = placed[row];
          const empty = Math.max(0, ROW_CAP[row] - cards.length);
          const ev = rowEval(row);
          return (
            <div key={row} className="flex flex-col gap-1">
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
                    key={`${row}-${i}`}
                    card={c}
                    size="sm"
                    onClick={() => removeFromRow(row, i)}
                  />
                ))}
                {Array.from({ length: empty }).map((_, i) => (
                  <EmptySlot
                    key={`${row}-e-${i}`}
                    size="sm"
                    highlighted={!!selectedCard}
                    onClick={selectedCard ? () => placeIntoRow(row) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {isComplete && (
          <div className="flex items-center justify-center gap-3 text-sm pt-2 border-t border-slate-200">
            {isFoul ? (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded font-bold">
                FOUL — Royalty 0
              </span>
            ) : (
              <span className="text-slate-600">
                Total Royalty{" "}
                <span className="text-emerald-700 font-bold">
                  +{totalRoyalty}
                </span>
              </span>
            )}
          </div>
        )}
      </section>

      <section className="max-w-3xl mx-auto bg-white rounded-lg shadow p-3">
        <div className="text-xs text-slate-500 mb-2">
          카드 풀 — 클릭해 선택 후, 위 보드의 빈 슬롯에 배치하세요. 배치된 카드는
          다시 눌러 풀로 되돌립니다.
        </div>
        <div className="flex flex-col gap-1">
          {SUITS.map((suit) => (
            <div key={suit} className="flex flex-wrap justify-center gap-1">
              {RANKS.map((rank) => {
                const c: Card = { rank, suit };
                const k = cardKey(c);
                const used = usedKeys.has(k);
                const selected = selectedKey === k;
                return (
                  <CardView
                    key={k}
                    card={c}
                    size="sm"
                    faded={used}
                    selected={selected}
                    onClick={used ? undefined : () => togglePoolCard(c)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
