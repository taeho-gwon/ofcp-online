import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { listMyGames, type GameListItem } from "../api/records";

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
    <div className="min-h-screen flex flex-col items-center bg-slate-100 p-4 pb-12">
      <header className="w-full max-w-2xl flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← 로비
        </button>
        <h1 className="text-xl font-bold">내 기록</h1>
        <span className="w-12" />
      </header>

      <div className="w-full max-w-2xl bg-white rounded-lg shadow">
        {loading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            불러오는 중...
          </div>
        )}
        {!loading && entries && entries.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            아직 완료된 게임이 없습니다.
          </div>
        )}
        {!loading && entries && entries.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {entries.map((g) => (
              <li key={g.game_id}>
                <Link
                  to={`/replay/${g.game_id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-slate-500">
                      {formatDate(g.started_at)}
                    </span>
                    <span className="text-sm">
                      {RULESET_LABEL[g.ruleset] ?? g.ruleset}
                      {" · "}
                      {g.round_count}라운드
                      {g.ended_at == null && (
                        <span className="ml-2 text-xs text-amber-600">
                          진행 중
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-slate-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
