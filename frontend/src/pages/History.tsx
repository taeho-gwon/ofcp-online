import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { listMyGames, type GameListItem } from "../api/records";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui";

const RULESET_LABEL: Record<string, string> = {
  pineapple: "12라운드",
  "pineapple-short": "6라운드",
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

const linkStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border-subtle)",
  color: "var(--text-primary)",
};

export function History() {
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
    <div className="min-h-screen flex flex-col items-center p-4 pb-12">
      <PageHeader
        title="내 기록"
        back={{ label: "← 로비", to: "/" }}
        maxWidth={672}
      />

      <div
        className="card"
        style={{ maxWidth: 672, width: "100%", padding: 0 }}
      >
        {loading && <div style={emptyMessageStyle}>불러오는 중...</div>}
        {!loading && entries && entries.length === 0 && (
          <div style={emptyMessageStyle}>아직 완료된 게임이 없습니다.</div>
        )}
        {!loading && entries && entries.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {entries.map((g, idx) => (
              <li key={g.game_id}>
                <Link
                  to={`/replay/${g.game_id}`}
                  style={{
                    ...linkStyle,
                    borderBottom:
                      idx === entries.length - 1
                        ? "none"
                        : "1px solid var(--border-subtle)",
                  }}
                >
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
  );
}
