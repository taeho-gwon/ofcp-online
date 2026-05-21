import type { Card } from "../api/types";
import { CardView, EmptySlot } from "./Card";

interface Props {
  playerId: string;
  nickname: string;
  top: Card[];
  middle: Card[];
  bottom: Card[];
  isFoul: boolean;
  cumulativeScore: number;
  delta: number;
  nextFantasyCards: number | null;
}

const ROW_CAP = { top: 3, middle: 5, bottom: 5 };

export function ReplayBoard({
  playerId,
  nickname,
  top,
  middle,
  bottom,
  isFoul,
  cumulativeScore,
  delta,
  nextFantasyCards,
}: Props) {
  const ring = isFoul ? "ring-1 ring-rose-300" : "ring-1 ring-slate-300";
  return (
    <div className={`relative rounded-lg ${ring} bg-white p-3 flex flex-col gap-2`}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold truncate">{nickname}</span>
        <div className="flex items-center gap-2 text-xs">
          {isFoul && (
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">
              FOUL
            </span>
          )}
          {nextFantasyCards != null && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
              ★{nextFantasyCards}
            </span>
          )}
          <span
            className={`font-mono font-semibold ${
              delta > 0
                ? "text-emerald-700"
                : delta < 0
                  ? "text-rose-600"
                  : "text-slate-500"
            }`}
            title="이 라운드 점수 변동"
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
          <span className="font-mono text-slate-700" title="누적 점수">
            {cumulativeScore}
          </span>
        </div>
      </div>

      <div className={`flex flex-col gap-1.5 ${isFoul ? "opacity-60" : ""}`}>
        {(["top", "middle", "bottom"] as const).map((row) => {
          const cards = row === "top" ? top : row === "middle" ? middle : bottom;
          const empty = Math.max(0, ROW_CAP[row] - cards.length);
          return (
            <div key={row} className="flex justify-center gap-1">
              {cards.map((c, i) => (
                <CardView
                  key={`${row}-${i}`}
                  card={c}
                  size="sm"
                  playerId={playerId}
                />
              ))}
              {Array.from({ length: empty }).map((_, i) => (
                <EmptySlot
                  key={`${row}-e-${i}`}
                  size="sm"
                  playerId={playerId}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
