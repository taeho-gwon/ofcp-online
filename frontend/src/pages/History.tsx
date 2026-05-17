import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { listMyGames, type GameListItem } from "../api/records";
import { Badge, Button } from "../components/ui";

const PAGE_MAX_WIDTH = 720;

const RULESET_LABEL: Record<string, string> = {
  pineapple: "12라운드",
  "pineapple-short": "6라운드",
};

const heroTitleStyle = {
  fontSize: "var(--fs-display)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
  lineHeight: 1.1,
};

const heroSubtitleStyle = {
  fontSize: "var(--fs-body-lg)",
  color: "var(--text-secondary)",
  margin: "10px 0 0",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const yy = d.getFullYear().toString().slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
}

const emptyMessageStyle = {
  padding: 24,
  textAlign: "center" as const,
  color: "var(--text-tertiary)",
  fontSize: "var(--fs-body-sm)",
};

export function History() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<GameListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyGames(50, 0)
      .then((res) => setEntries(res.entries))
      .catch((e) => {
        toast.error(`기록을 불러올 수 없습니다: ${(e as Error).message}`);
        setEntries([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>내 기록</h1>
            <p style={heroSubtitleStyle}>지난 게임을 다시 보고 복기합니다.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            ← 로비
          </Button>
        </header>

        <div className="card" style={{ padding: 0 }}>
          {loading && <div style={emptyMessageStyle}>불러오는 중...</div>}
          {!loading && entries && entries.length === 0 && (
            <div style={emptyMessageStyle}>아직 완료된 게임이 없습니다.</div>
          )}
          {!loading && entries && entries.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {entries.map((g) => (
                <li key={g.game_id}>
                  <Link to={`/replay/${g.game_id}`} className="list-item">
                    <div className="flex flex-col">
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--fs-caption)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {formatDate(g.started_at)}
                      </span>
                      <span style={{ fontSize: "var(--fs-body-sm)" }}>
                        {RULESET_LABEL[g.ruleset] ?? g.ruleset}
                        {" · "}
                        {g.round_count}라운드
                        {g.ended_at == null && (
                          <span style={{ marginLeft: 8 }}>
                            <Badge tone="warning">진행 중</Badge>
                          </span>
                        )}
                      </span>
                    </div>
                    <span style={{ color: "var(--text-tertiary)" }}>›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
