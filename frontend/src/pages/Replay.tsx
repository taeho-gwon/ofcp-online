import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  getGameDetail,
  getGameEvents,
  type GameDetailResponse,
  type GameEventOut,
  type RoundEndPayload,
} from "../api/records";
import { ReplayBoard } from "../components/ReplayBoard";

const RULESET_LABEL: Record<string, string> = {
  pineapple: "12라운드",
  "pineapple-short": "6라운드",
};

interface RoundView {
  seq: number;
  payload: RoundEndPayload;
}

export function Replay() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GameDetailResponse | null>(null);
  const [rounds, setRounds] = useState<RoundView[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    Promise.all([getGameDetail(gameId), getGameEvents(gameId)])
      .then(([d, ev]) => {
        setDetail(d);
        setRounds(extractRounds(ev.events));
      })
      .catch((e) => {
        toast.error(`기록을 불러올 수 없습니다: ${(e as Error).message}`);
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 pb-12">
        불러오는 중...
      </div>
    );
  }
  if (!detail || !rounds) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 gap-2 pb-12">
        <span className="text-slate-500">기록이 없습니다.</span>
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="text-sm text-emerald-700 underline"
        >
          기록 목록으로
        </button>
      </div>
    );
  }

  const nicknameOf = (uid: string) =>
    detail.players.find((p) => p.user_id === uid)?.nickname ?? uid.slice(0, 6);
  const orderedUserIds = [...detail.players]
    .sort((a, b) => a.seat_idx - b.seat_idx)
    .map((p) => p.user_id);

  return (
    <div className="min-h-screen bg-slate-100 p-4 pb-12">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← 기록 목록
        </button>
        <h1 className="text-xl font-bold">리플레이</h1>
        <span className="w-20" />
      </header>

      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="text-slate-500">규칙</span>
          <span className="font-semibold">
            {RULESET_LABEL[detail.ruleset] ?? detail.ruleset}
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-500">라운드</span>
          <span className="font-semibold">{detail.round_count}</span>
          {detail.ended_at && (
            <>
              <span className="text-slate-500">·</span>
              <span className="text-slate-500">
                {new Date(detail.ended_at).toLocaleString()}
              </span>
            </>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          {detail.players.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between bg-slate-50 rounded px-3 py-1.5"
            >
              <span className="font-semibold truncate">{p.nickname}</span>
              <span className="font-mono text-slate-700">
                {p.final_score ?? "-"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {rounds.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-slate-500 text-sm">
            완료된 라운드가 없습니다.
          </div>
        )}
        {rounds.map((r, idx) => (
          <section
            key={r.seq}
            className="bg-white rounded-lg shadow p-3 flex flex-col gap-2"
          >
            <header className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                {r.payload.is_bonus_round
                  ? `R${r.payload.round_number} 보너스`
                  : `R${r.payload.round_number}`}
                <span className="text-slate-400 text-xs ml-2">
                  ({idx + 1}번째)
                </span>
              </span>
            </header>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {orderedUserIds.map((uid) => {
                const b = r.payload.boards[uid];
                if (!b) return null;
                return (
                  <ReplayBoard
                    key={uid}
                    nickname={nicknameOf(uid)}
                    top={b.top}
                    middle={b.middle}
                    bottom={b.bottom}
                    isFoul={b.is_foul}
                    cumulativeScore={r.payload.scores[uid] ?? 0}
                    delta={r.payload.deltas[uid] ?? 0}
                    nextFantasyCards={r.payload.next_fantasy_cards[uid] ?? null}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function extractRounds(events: GameEventOut[]): RoundView[] {
  return events
    .filter((e) => e.event_type === "round_end")
    .map((e) => ({ seq: e.seq, payload: e.payload as unknown as RoundEndPayload }));
}
