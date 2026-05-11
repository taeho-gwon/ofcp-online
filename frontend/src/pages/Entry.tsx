import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createGame } from "../api/client";

export function Entry() {
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{
    gameId: string;
    players: string[];
  } | null>(null);

  const handleCreate = async () => {
    const playerIds = names.map((n) => n.trim()).filter(Boolean);
    if (playerIds.length < 2) {
      toast.error("닉네임은 최소 2명 입력해주세요.");
      return;
    }
    if (playerIds.length > 3) {
      toast.error("최대 3명까지 입력 가능합니다.");
      return;
    }
    if (new Set(playerIds).size !== playerIds.length) {
      toast.error("닉네임이 중복됩니다.");
      return;
    }

    setCreating(true);
    try {
      const state = await createGame({ player_ids: playerIds });
      setCreated({ gameId: state.game_id, players: playerIds });
    } catch (e) {
      toast.error(`방 생성 실패: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  if (created) {
    return <CreatedView gameId={created.gameId} players={created.players} onReset={() => setCreated(null)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold">OFC Online</h1>
        <p className="text-sm text-slate-600">
          닉네임 2~3명을 입력하고 방을 만들면 각자에게 보낼 게임 링크가 생성됩니다.
        </p>
        {names.map((n, i) => (
          <input
            key={i}
            type="text"
            placeholder={i < 2 ? `플레이어 ${i + 1} (필수)` : `플레이어 ${i + 1} (선택)`}
            value={n}
            maxLength={20}
            onChange={(e) => {
              const next = [...names];
              next[i] = e.target.value;
              setNames(next);
            }}
            className="px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        ))}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300"
        >
          {creating ? "생성 중..." : "방 생성"}
        </button>
      </div>
    </div>
  );
}

function CreatedView({
  gameId,
  players,
  onReset,
}: {
  gameId: string;
  players: string[];
  onReset: () => void;
}) {
  const navigate = useNavigate();

  const linkOf = (player: string) =>
    `${window.location.origin}/game/${gameId}?player=${encodeURIComponent(player)}`;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("복사됨");
    } catch {
      toast.error("복사 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold">방이 생성되었습니다</h1>
        <div className="text-sm text-slate-600">
          방 ID: <span className="font-mono">{gameId}</span>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p) => {
            const url = linkOf(p);
            return (
              <div
                key={p}
                className="flex items-center gap-2 p-2 border border-slate-200 rounded"
              >
                <span className="w-20 font-semibold text-sm truncate">{p}</span>
                <input
                  readOnly
                  value={url}
                  className="flex-1 text-xs font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={() => copy(url)}
                  className="px-2 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300"
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/game/${gameId}?player=${encodeURIComponent(p)}`)}
                  className="px-2 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  입장
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="self-start text-xs text-slate-500 hover:underline"
        >
          ← 새 방 만들기
        </button>
      </div>
    </div>
  );
}
