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
import { PageHeader } from "../components/PageHeader";
import { ReplayBoard } from "../components/ReplayBoard";
import { Button } from "../components/ui";

const RULESET_LABEL: Record<string, string> = {
  pineapple: "12라운드",
  "pineapple-short": "6라운드",
};

interface RoundView {
  seq: number;
  payload: RoundEndPayload;
}

const mutedTextStyle = {
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-tertiary)",
};

const labelStyle = { color: "var(--text-tertiary)" };

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
      <div
        className="min-h-screen flex items-center justify-center pb-12"
        style={mutedTextStyle}
      >
        불러오는 중...
      </div>
    );
  }
  if (!detail || !rounds) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 pb-12">
        <span style={mutedTextStyle}>기록이 없습니다.</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/history")}
        >
          기록 목록으로
        </Button>
      </div>
    );
  }

  const nicknameOf = (uid: string) =>
    detail.players.find((p) => p.user_id === uid)?.nickname ?? uid.slice(0, 6);
  const orderedUserIds = [...detail.players]
    .sort((a, b) => a.seat_idx - b.seat_idx)
    .map((p) => p.user_id);

  return (
    <div className="min-h-screen p-4 pb-12">
      <PageHeader
        title="리플레이"
        back={{ label: "← 기록 목록", to: "/history" }}
        maxWidth={896}
      />

      <div className="card mx-auto mb-4" style={{ maxWidth: 896 }}>
        <div
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
          style={{ fontSize: "var(--fs-body-sm)" }}
        >
          <span style={labelStyle}>규칙</span>
          <span style={{ fontWeight: 600 }}>
            {RULESET_LABEL[detail.ruleset] ?? detail.ruleset}
          </span>
          <span style={labelStyle}>·</span>
          <span style={labelStyle}>라운드</span>
          <span style={{ fontWeight: 600 }}>{detail.round_count}</span>
          {detail.ended_at && (
            <>
              <span style={labelStyle}>·</span>
              <span style={labelStyle}>
                {new Date(detail.ended_at).toLocaleString()}
              </span>
            </>
          )}
        </div>
        <div
          className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2"
          style={{ fontSize: "var(--fs-body-sm)" }}
        >
          {detail.players.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between"
              style={{
                background: "var(--bg-sunken)",
                borderRadius: "var(--radius-md)",
                padding: "6px 12px",
              }}
            >
              <span style={{ fontWeight: 600 }} className="truncate">
                {p.nickname}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-secondary)",
                }}
              >
                {p.final_score ?? "-"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {rounds.length === 0 && (
          <div
            className="card"
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "var(--fs-body-sm)",
            }}
          >
            완료된 라운드가 없습니다.
          </div>
        )}
        {rounds.map((r, idx) => (
          <section
            key={r.seq}
            className="card"
            style={{ padding: 12, gap: 8 }}
          >
            <header
              className="flex items-center justify-between"
              style={{ fontSize: "var(--fs-body-sm)" }}
            >
              <span style={{ fontWeight: 600 }}>
                {r.payload.is_bonus_round
                  ? `R${r.payload.round_number} 보너스`
                  : `R${r.payload.round_number}`}
                <span
                  style={{
                    color: "var(--text-tertiary)",
                    fontSize: "var(--fs-caption)",
                    marginLeft: 8,
                  }}
                >
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
