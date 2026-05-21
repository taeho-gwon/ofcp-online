import { create } from "zustand";
import type {
  CosmeticOut,
  LoadoutOut,
  LoadoutUpdateIn,
  MyCosmeticsOut,
} from "../api/cosmetics";
import {
  getCatalog,
  getMyCosmetics,
  updateLoadout as updateLoadoutApi,
} from "../api/cosmetics";

interface CosmeticsStore {
  catalog: CosmeticOut[];
  owned: string[];
  loadout: LoadoutOut | null;
  loaded: boolean;
  hydrate: () => Promise<void>;
  save: (payload: LoadoutUpdateIn) => Promise<void>;
}

export const useCosmeticsStore = create<CosmeticsStore>((set) => ({
  catalog: [],
  owned: [],
  loadout: null,
  loaded: false,

  hydrate: async () => {
    const [catalog, mine]: [CosmeticOut[], MyCosmeticsOut] = await Promise.all([
      getCatalog(),
      getMyCosmetics(),
    ]);
    set({
      catalog,
      owned: mine.owned,
      loadout: mine.loadout,
      loaded: true,
    });
  },

  save: async (payload) => {
    const loadout = await updateLoadoutApi(payload);
    set({ loadout });
  },
}));
