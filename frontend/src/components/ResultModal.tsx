import type { Matchup, PlayerState, Row } from "../api/types";
import { displayName } from "../lib/displayName";

type PlayersMeta = Record<string, string> | undefined;

interface Props {
  players: PlayerState[];
  matchups: Matchup[];
  myPlayerId: string;
  playersMeta: PlayersMeta;
  roundNumber: number;
  maxRounds: number;
  isBonusRound: boolean;
  isGameOver: boolean;
  onClose: () => void;
  onNewRoom?: () => void;
}

const ROW_LABEL: Record<Row, string> = {
  top: "탑",
  middle: "미들",
  bottom: "바텀",
};

const ROWS: Row[] = ["top", "middle", "bottom"];

function fmt(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

function toneClass(n: number): string {
  if (n > 0) return "text-emerald-700";
  if (n < 0) return "text-rose-600";
  return "text-slate-500";
}

function PlayerCard({
  player,
  isMe,
  playersMeta,
}: {
  player: PlayerState;
  isMe: boolean;
  playersMeta: PlayersMeta;
}) {
  const ev = player.evaluation;
  const delta = player.last_round_delta ?? 0;
  return (
    <div
      className={`rounded-lg border ${
        isMe ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
      } p-3 flex flex-col gap-2`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {displayName(player.player_id, playersMeta)}
          </span>
          {isMe && <span className="text-xs text-emerald-700">(나)</span>}
          {ev?.is_foul && (
            <span className="px-1.5 py-0.5 text-xs bg-rose-100 text-rose-700 rounded font-semibold">
              FOUL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {player.is_fantasy && (
            <span className="px-1.5 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded">
              FL
            </span>
          )}
          {player.next_fantasy_cards && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
              ★ 다음 FL {player.next_fantasy_cards}장
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-2xl font-mono font-bold ${toneClass(delta)}`}>
          {fmt(delta)}
        </span>
        <span className="text-xs text-slate-500">
          누적{" "}
          <span
            className={`font-mono ${
              player.score > 0 ? "text-slate-800" : "text-rose-600"
            }`}
          >
            {player.score}
          </span>
        </span>
      </div>

      {ev && (
        <div className="flex flex-col gap-1 text-sm">
          {ROWS.map((row) => {
            const re = ev[row];
            return (
              <div
                key={row}
                className="flex items-center justify-between gap-2 py-0.5 border-t border-slate-200/70 first:border-0"
              >
                <span className="w-10 text-xs uppercase font-mono text-slate-500">
                  {ROW_LABEL[row]}
                </span>
                <span className="flex-1 truncate">{re.label}</span>
                <span
                  className={`font-mono text-xs ${
                    re.royalty > 0 ? "text-amber-600" : "text-slate-400"
                  }`}
                >
                  {re.royalty > 0 ? `♛+${re.royalty}` : ""}
                </span>
              </div>
            );
          })}
          {ev.total_royalty > 0 && (
            <div className="text-xs text-amber-700 mt-1">
              총 로열티{" "}
              <span className="font-mono font-semibold">+{ev.total_royalty}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchupRow({
  m,
  perspectiveId,
  playersMeta,
}: {
  m: Matchup;
  perspectiveId?: string;
  playersMeta: PlayersMeta;
}) {
  // perspectiveId가 b쪽이면 부호를 뒤집어 표시한다. 미지정 또는 a면 그대로.
  const flip = perspectiveId === m.b_id ? -1 : 1;
  const meId = flip === -1 ? m.b_id : m.a_id;
  const oppId = flip === -1 ? m.a_id : m.b_id;

  const topTotal =
    flip * (m.top_line_a + (m.top_royalty_a - m.top_royalty_b));
  const middleTotal =
    flip * (m.middle_line_a + (m.middle_royalty_a - m.middle_royalty_b));
  const bottomTotal =
    flip * (m.bottom_line_a + (m.bottom_royalty_a - m.bottom_royalty_b));

  const cells: { label: string; value: number }[] = [
    { label: "탑", value: topTotal },
    { label: "미들", value: middleTotal },
    { label: "바텀", value: bottomTotal },
  ];
  const scoop = flip * m.scoop_a;
  if (scoop !== 0) cells.push({ label: "스쿱", value: scoop });

  const total = flip * m.total_a;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-sm border-t border-slate-200">
      <div className="font-medium min-w-0 truncate">
        {perspectiveId ? (
          <>
            <span className="text-slate-400 mr-1">vs</span>
            <span className="truncate">
              {displayName(oppId, playersMeta)}
            </span>
          </>
        ) : (
          <>
            <span className="truncate">
              {displayName(meId, playersMeta)}
            </span>
            <span className="text-slate-400 mx-1">vs</span>
            <span className="truncate">
              {displayName(oppId, playersMeta)}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs">
        {cells.map((c) => (
          <span key={c.label} className="flex items-center gap-1">
            <span className="text-slate-500">{c.label}</span>
            <span className={`font-mono ${toneClass(c.value)}`}>
              {fmt(c.value)}
            </span>
          </span>
        ))}
        <span className="ml-2 font-mono font-semibold">
          <span className="text-slate-500 mr-1">합계</span>
          <span className={toneClass(total)}>{fmt(total)}</span>
        </span>
      </div>
    </div>
  );
}

function FinalStandings({
  players,
  myPlayerId,
  playersMeta,
}: {
  players: PlayerState[];
  myPlayerId: string;
  playersMeta: PlayersMeta;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
      <div className="text-sm font-semibold text-amber-800 mb-2">최종 순위</div>
      <div className="flex flex-col gap-1">
        {ranked.map((p, i) => {
          const isMe = p.player_id === myPlayerId;
          const eliminated = p.score <= 0;
          return (
            <div
              key={p.player_id}
              className="flex items-center justify-between text-sm py-1"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-amber-700 w-6">#{i + 1}</span>
                <span className={isMe ? "font-semibold text-emerald-700" : ""}>
                  {displayName(p.player_id, playersMeta)}
                  {isMe && (
                    <span className="ml-1 text-xs text-emerald-700">(나)</span>
                  )}
                </span>
                {eliminated && (
                  <span className="px-1.5 py-0.5 text-xs bg-rose-100 text-rose-700 rounded">
                    탈락
                  </span>
                )}
              </span>
              <span
                className={`font-mono font-semibold ${
                  p.score > 0
                    ? "text-emerald-700"
                    : p.score < 0
                      ? "text-rose-600"
                      : "text-slate-500"
                }`}
              >
                {p.score}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultModal({
  players,
  matchups,
  myPlayerId,
  playersMeta,
  roundNumber,
  maxRounds,
  isBonusRound,
  isGameOver,
  onClose,
  onNewRoom,
}: Props) {
  const heading = isGameOver
    ? "🏁 게임 종료"
    : isBonusRound
      ? "★ FantasyLand 결과"
      : maxRounds > 0
        ? `라운드 ${roundNumber} / ${maxRounds}`
        : "라운드 결과";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${Math.min(players.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {players.map((p) => (
            <PlayerCard
              key={p.player_id}
              player={p}
              isMe={p.player_id === myPlayerId}
              playersMeta={playersMeta}
            />
          ))}
        </div>

        {matchups.length > 0 && (() => {
          const myMatchups = matchups.filter(
            (m) => m.a_id === myPlayerId || m.b_id === myPlayerId,
          );
          // 관전자처럼 내 매치업이 없으면 전체를 a 기준으로 보여준다.
          const rows = myMatchups.length > 0 ? myMatchups : matchups;
          const perspective = myMatchups.length > 0 ? myPlayerId : undefined;
          return (
            <div className="mt-5">
              <div className="text-sm font-semibold text-slate-700 mb-1">
                상세 결과
              </div>
              <div className="rounded-md border border-slate-200 px-3">
                {rows.map((m, i) => (
                  <MatchupRow
                    key={i}
                    m={m}
                    perspectiveId={perspective}
                    playersMeta={playersMeta}
                  />
                ))}
              </div>
            </div>
          );
        })()}

        {isGameOver && (
          <FinalStandings
            players={players}
            myPlayerId={myPlayerId}
            playersMeta={playersMeta}
          />
        )}

        <div className="mt-5 flex justify-end gap-2">
          {isGameOver ? (
            <button
              type="button"
              onClick={onNewRoom}
              className="px-4 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              새 방으로
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              계속
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
