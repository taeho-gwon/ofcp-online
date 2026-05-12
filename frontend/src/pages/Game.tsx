import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { GameSocket } from "../api/ws";
import { OfcTable, type OfcSession } from "../components/OfcTable";
import { RulesModal } from "../components/RulesModal";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const playerId = user?.id ?? "";
  const navigate = useNavigate();

  const gameState = useGameStore((s) => s.gameState);
  const connected = useGameStore((s) => s.connected);
  const setGameState = useGameStore((s) => s.setGameState);
  const commitPendingState = useGameStore((s) => s.commitPendingState);
  const setConnected = useGameStore((s) => s.setConnected);
  const setError = useGameStore((s) => s.setError);

  const socketRef = useRef<GameSocket | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!gameId || !accessToken) return;
    const sock = new GameSocket(gameId, accessToken, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (msg) => {
        if (msg.type === "state") {
          setGameState(msg.data);
        } else if (msg.type === "error") {
          setError(msg.data.message);
          toast.error(msg.data.message);
        }
      },
    });
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, [gameId, accessToken, setConnected, setGameState, setError]);

  const session: OfcSession = useMemo(
    () => ({
      gameState,
      myPlayerId: playerId,
      connected,
      confirm: (msg) => socketRef.current?.send(msg),
      resultClose: () => commitPendingState(),
      newRoom: () => navigate("/"),
    }),
    [gameState, playerId, connected, commitPendingState, navigate],
  );

  if (!gameId || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 pb-12">
        잘못된 게임 링크입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-3 pb-12">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-slate-500 hover:underline"
        >
          ← 로비
        </button>
        <div className="flex items-center gap-3 text-sm">
          {gameState && (
            <div className="flex items-center gap-2">
              {gameState.is_game_over ? (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-xs font-semibold">
                  GAME OVER
                </span>
              ) : (
                <>
                  {gameState.is_bonus_round && (
                    <span className="px-2 py-0.5 rounded bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold">
                      ★ FantasyLand
                    </span>
                  )}
                  <span className="font-mono text-slate-700">
                    R {gameState.round_number}
                    <span className="text-slate-400">/{gameState.max_rounds}</span>
                  </span>
                </>
              )}
              <span className="text-slate-300">·</span>
              <span className="font-mono text-xs text-slate-500">{gameId}</span>
            </div>
          )}
          <span className="text-xs">
            {connected ? (
              <span className="text-emerald-600">● 연결됨</span>
            ) : (
              <span className="text-rose-600">● 연결 끊김</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            className="text-xs px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-600"
            title="룰 보기"
          >
            룰
          </button>
        </div>
        <span className="w-16" />
      </header>

      <OfcTable session={session} />

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
