import { create } from "zustand";
import type { GameState, Row } from "../api/types";

export interface PlacedSlot {
  handIdx: number;
  row: Row;
}

interface GameStore {
  gameState: GameState | null;
  connected: boolean;
  error: string | null;

  // 인터랙션 상태 (서버 상태 갱신 시 자동 초기화)
  selectedRow: Row | null;
  placed: PlacedSlot[];

  setGameState: (s: GameState) => void;
  setConnected: (c: boolean) => void;
  setError: (e: string | null) => void;

  selectRow: (row: Row | null) => void;
  placeCard: (handIdx: number) => void;
  unplace: (handIdx: number) => void;
  clearPending: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  connected: false,
  error: null,
  selectedRow: null,
  placed: [],

  setGameState: (s) =>
    set({
      gameState: s,
      selectedRow: null,
      placed: [],
      error: null,
    }),
  setConnected: (c) => set({ connected: c }),
  setError: (e) => set({ error: e }),

  selectRow: (row) => set({ selectedRow: row }),

  placeCard: (handIdx) => {
    const { selectedRow, placed } = get();
    if (selectedRow === null) return;
    if (placed.some((p) => p.handIdx === handIdx)) return;
    set({ placed: [...placed, { handIdx, row: selectedRow }] });
  },

  unplace: (handIdx) => {
    const { placed } = get();
    set({ placed: placed.filter((p) => p.handIdx !== handIdx) });
  },

  clearPending: () => set({ selectedRow: null, placed: [] }),
}));
