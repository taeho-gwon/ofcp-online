import type { Card, PlayerState, Row } from "../api/types";
import { ROW_CAPACITY } from "../api/types";
import { TitleBadge } from "../cosmetics/components/TitleBadge";
import { usePlayerCosmetics } from "../cosmetics/useResolved";
import { CardBack, CardView, EmptySlot } from "./Card";

const COUNT_KEY: Record<Row, "top_count" | "middle_count" | "bottom_count"> = {
  top: "top_count",
  middle: "middle_count",
  bottom: "bottom_count",
};

interface PendingCard {
  card: Card;
  handIdx: number;
}

export type OverlayPosition = Row | "center";
export type OverlayTone = "pos" | "neg" | "neutral";

export interface AnimOverlay {
  position: OverlayPosition;
  text: string;
  tone: OverlayTone;
  animKey: string | number;
}

interface Props {
  player: PlayerState;
  label: string;
  isMe: boolean;
  isCurrent: boolean;
  isDealer: boolean;
  // 내 보드일 때만 의미 있음
  pendingByRow?: Record<Row, PendingCard[]>;
  selectedRow?: Row | null;
  onRowSelect?: (row: Row) => void;
  onPendingClick?: (handIdx: number) => void;
  size?: "sm" | "md";
  animOverlay?: AnimOverlay | null;
}

const ROWS: Row[] = ["top", "middle", "bottom"];

const TONE_CLASS: Record<OverlayTone, string> = {
  pos: "text-emerald-600",
  neg: "text-rose-600",
  neutral: "text-amber-600",
};

function RowOverlay({ overlay }: { overlay: AnimOverlay }) {
  return (
    <span
      key={overlay.animKey}
      className={`ofc-pop-row pointer-events-none absolute left-1/2 top-1/2 z-10 text-3xl font-bold drop-shadow whitespace-nowrap text-center ${TONE_CLASS[overlay.tone]}`}
    >
      {overlay.text}
    </span>
  );
}

function CenterOverlay({ overlay }: { overlay: AnimOverlay }) {
  return (
    <span
      key={overlay.animKey}
      className={`ofc-pop-center pointer-events-none absolute left-1/2 top-1/2 z-10 text-5xl font-extrabold tracking-wider drop-shadow whitespace-pre-line text-center leading-tight ${TONE_CLASS[overlay.tone]}`}
    >
      {overlay.text}
    </span>
  );
}

export function PlayerBoard({
  player,
  label,
  isMe,
  isCurrent,
  isDealer,
  pendingByRow,
  selectedRow,
  onRowSelect,
  onPendingClick,
  size = "md",
  animOverlay = null,
}: Props) {
  const ring = isCurrent ? "ring-2 ring-amber-400" : "ring-1 ring-slate-300";
  const me = isMe ? "bg-emerald-50" : "bg-white";
  const isFoul = player.evaluation?.is_foul ?? false;
  const { title } = usePlayerCosmetics(player.player_id);

  const rowOverlay =
    animOverlay && ROWS.includes(animOverlay.position as Row)
      ? animOverlay
      : null;
  const centerOverlay = animOverlay?.position === "center" ? animOverlay : null;

  return (
    <div className={`relative rounded-lg ${ring} ${me} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex flex-col gap-0.5 truncate">
          <TitleBadge variant={title} />
          <span className="flex items-center gap-1.5 font-semibold truncate">
            {isDealer && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold shadow-sm"
                title="딜러"
              >
                D
              </span>
            )}
            <span className="truncate">{label}</span>
            {isMe && (
              <span className="text-emerald-700 text-xs">(나)</span>
            )}
          </span>
        </span>
        <div className="flex items-center gap-2 text-xs">
          {isFoul && (
            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">
              FOUL
            </span>
          )}
          {player.is_fantasy && (
            <span className="px-1.5 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded">
              FL
            </span>
          )}
          {player.next_fantasy_cards && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
              ★{player.next_fantasy_cards}
            </span>
          )}
          <span
            className={`font-mono ${
              player.score > 0
                ? "text-slate-800"
                : "text-rose-600"
            }`}
            title="누적 점수"
          >
            {player.score}
          </span>
        </div>
      </div>

      <div className={`relative flex flex-col gap-2 ${isFoul ? "opacity-50" : ""}`}>
        {ROWS.map((row) => {
          const placed = player.board[row];
          const placedCount = player.board[COUNT_KEY[row]];
          // 백엔드 마스킹 시 placed=[]이지만 placedCount는 실제 보드 카드 수 → 부족분을 뒷면 카드로 표시.
          const hidden = Math.max(0, placedCount - placed.length);
          const pending = pendingByRow?.[row] ?? [];
          const cap = ROW_CAPACITY[row];
          const empty = Math.max(0, cap - placedCount - pending.length);
          const isSelected = isMe && selectedRow === row;
          const rowClickable = isMe && !!onRowSelect;
          const rowRing = isSelected
            ? "ring-2 ring-amber-400 bg-amber-50"
            : "";
          const overlayHere =
            rowOverlay && rowOverlay.position === row ? rowOverlay : null;

          return (
            <div
              key={row}
              className={`relative flex justify-center gap-1 rounded-md p-1 ${rowRing}`}
            >
              {placed.map((c, i) => (
                <CardView
                  key={`p-${i}`}
                  card={c}
                  size={size}
                  playerId={player.player_id}
                />
              ))}
              {Array.from({ length: hidden }).map((_, i) => (
                <CardBack
                  key={`h-${i}`}
                  size={size}
                  playerId={player.player_id}
                />
              ))}
              {pending.map((p) => (
                <CardView
                  key={`pd-${p.handIdx}`}
                  card={p.card}
                  size={size}
                  faded
                  playerId={player.player_id}
                  onClick={
                    onPendingClick ? () => onPendingClick(p.handIdx) : undefined
                  }
                />
              ))}
              {Array.from({ length: empty }).map((_, i) => (
                <EmptySlot
                  key={`e-${i}`}
                  size={size}
                  highlighted={isSelected}
                  playerId={player.player_id}
                  onClick={
                    rowClickable ? () => onRowSelect!(row) : undefined
                  }
                />
              ))}
              {overlayHere && <RowOverlay overlay={overlayHere} />}
            </div>
          );
        })}
      </div>
      {isFoul && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-8xl font-black text-rose-600/60 drop-shadow">
            ✕
          </span>
        </div>
      )}
      {centerOverlay && <CenterOverlay overlay={centerOverlay} />}
    </div>
  );
}
