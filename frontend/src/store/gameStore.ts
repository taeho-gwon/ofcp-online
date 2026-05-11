import { create } from "zustand";
import type { GameState, Row } from "../api/types";

export interface PlacedSlot {
  handIdx: number;
  row: Row;
}

interface GameStore {
  gameState: GameState | null;
  // 결과 phase(done/game_over) 표시 중에 다음 라운드 state가 도착하면 여기 보류.
  // 사용자가 "계속"을 누르면 commitPendingState가 gameState로 승격시킨다.
  pendingState: GameState | null;
  connected: boolean;
  error: string | null;

  // 인터랙션 상태 (서버 상태 갱신 시 자동 초기화)
  selectedRow: Row | null;
  selectedCardIdx: number | null;
  placed: PlacedSlot[];

  setGameState: (s: GameState) => void;
  commitPendingState: () => void;
  setConnected: (c: boolean) => void;
  setError: (e: string | null) => void;

  selectRow: (row: Row | null) => void;
  selectCard: (idx: number | null) => void;
  commitPlacement: (handIdx: number, row: Row) => void;
  unplace: (handIdx: number) => void;
  clearPending: () => void;
}

function isResultPhase(s: GameState | null): boolean {
  return !!s && (s.phase === "done" || s.phase === "game_over");
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  pendingState: null,
  connected: false,
  error: null,
  selectedRow: null,
  selectedCardIdx: null,
  placed: [],

  setGameState: (s) => {
    const cur = get().gameState;
    if (isResultPhase(cur) && !isResultPhase(s)) {
      // 결과 표시 중에 다음 라운드 state가 도착했다 → 화면 갱신 보류.
      set({ pendingState: s, error: null });
      return;
    }
    set({
      gameState: s,
      pendingState: null,
      selectedRow: null,
      selectedCardIdx: null,
      placed: [],
      error: null,
    });
  },
  commitPendingState: () => {
    const pending = get().pendingState;
    if (!pending) return;
    set({
      gameState: pending,
      pendingState: null,
      selectedRow: null,
      selectedCardIdx: null,
      placed: [],
    });
  },
  setConnected: (c) => set({ connected: c }),
  setError: (e) => set({ error: e }),

  selectRow: (row) => set({ selectedRow: row }),
  selectCard: (idx) => set({ selectedCardIdx: idx }),

  commitPlacement: (handIdx, row) => {
    const { placed } = get();
    if (placed.some((p) => p.handIdx === handIdx)) return;
    set({
      placed: [...placed, { handIdx, row }],
      selectedRow: null,
      selectedCardIdx: null,
    });
  },

  unplace: (handIdx) => {
    const { placed } = get();
    set({ placed: placed.filter((p) => p.handIdx !== handIdx) });
  },

  clearPending: () =>
    set({ selectedRow: null, selectedCardIdx: null, placed: [] }),
}));
