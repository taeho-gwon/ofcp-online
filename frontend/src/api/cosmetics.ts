import { apiFetch } from "./client";

export type CosmeticCategory = "card_back" | "card_face" | "table_theme" | "title";

export interface CosmeticOut {
  id: string;
  category: CosmeticCategory;
  code: string;
  name: string;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface LoadoutOut {
  card_back: string;
  card_face: string;
  table_theme: string;
  title: string;
}

export interface MyCosmeticsOut {
  owned: string[];
  loadout: LoadoutOut;
}

export interface LoadoutUpdateIn {
  card_back: string;
  card_face: string;
  table_theme: string;
  title: string;
}

export function getCatalog(): Promise<CosmeticOut[]> {
  return apiFetch<CosmeticOut[]>("/api/cosmetics/catalog", {}, { auth: false });
}

export function getMyCosmetics(): Promise<MyCosmeticsOut> {
  return apiFetch<MyCosmeticsOut>("/api/me/cosmetics");
}

export function updateLoadout(payload: LoadoutUpdateIn): Promise<LoadoutOut> {
  return apiFetch<LoadoutOut>("/api/me/cosmetics/loadout", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
