import { create } from "zustand";
import type { GameState } from "../api/types";

interface GameStore {
  gameState: GameState | null;
  // 결과 phase(done/game_over) 표시 중에 다음 라운드 state가 도착하면 여기 보류.
  // 사용자가 "계속"을 누르면 commitPendingState가 gameState로 승격시킨다.
  pendingState: GameState | null;
  connected: boolean;
  error: string | null;

  setGameState: (s: GameState) => void;
  commitPendingState: () => void;
  setConnected: (c: boolean) => void;
  setError: (e: string | null) => void;
}

function isResultPhase(s: GameState | null): boolean {
  return !!s && (s.phase === "done" || s.phase === "game_over");
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  pendingState: null,
  connected: false,
  error: null,

  setGameState: (s) => {
    const cur = get().gameState;
    if (isResultPhase(cur) && !isResultPhase(s)) {
      // 결과 표시 중에 다음 라운드 state가 도착했다 → 화면 갱신 보류.
      set({ pendingState: s, error: null });
      return;
    }
    set({ gameState: s, pendingState: null, error: null });
  },
  commitPendingState: () => {
    const pending = get().pendingState;
    if (!pending) return;
    set({ gameState: pending, pendingState: null });
  },
  setConnected: (c) => set({ connected: c }),
  setError: (e) => set({ error: e }),
}));
