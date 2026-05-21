import { useMemo } from "react";
import { useAuthStore } from "../store/authStore";
import { useCosmeticsStore } from "../store/cosmeticsStore";
import { useGameStore } from "../store/gameStore";
import { DEFAULT_CODES, type CosmeticCategory } from "./defaults";
import { resolveCardBack } from "./registry/cardBacks";
import { resolveCardFace } from "./registry/cardFaces";
import { resolveTableTheme } from "./registry/tableThemes";
import { resolveTitle } from "./registry/titles";
import type {
  CardBackVariant,
  CardFaceVariant,
  TableThemeVariant,
  TitleVariant,
} from "./types";

export interface ResolvedCosmetics {
  cardBack: CardBackVariant;
  cardFace: CardFaceVariant;
  table: TableThemeVariant;
  title: TitleVariant;
}

/**
 * playerId의 코스메틱을 resolve.
 * 우선순위:
 * 1) 본인 → cosmeticsStore.loadout(id) → catalog로 code 변환
 * 2) 상대 → gameState.players[].cosmetics(code map)
 * 3) 미등록·미도착 → DEFAULT_CODES
 */
export function usePlayerCosmetics(playerId: string): ResolvedCosmetics {
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const loadout = useCosmeticsStore((s) => s.loadout);
  const catalog = useCosmeticsStore((s) => s.catalog);
  const gameState = useGameStore((s) => s.gameState);

  const codes = useMemo(() => {
    const map: Record<CosmeticCategory, string> = {
      card_back: DEFAULT_CODES.card_back,
      card_face: DEFAULT_CODES.card_face,
      table_theme: DEFAULT_CODES.table_theme,
      title: DEFAULT_CODES.title,
    };

    if (playerId && myId && playerId === myId && loadout && catalog.length > 0) {
      const idToCode = new Map(catalog.map((c) => [c.id, c.code]));
      map.card_back = idToCode.get(loadout.card_back) ?? map.card_back;
      map.card_face = idToCode.get(loadout.card_face) ?? map.card_face;
      map.table_theme = idToCode.get(loadout.table_theme) ?? map.table_theme;
      map.title = idToCode.get(loadout.title) ?? map.title;
      return map;
    }

    if (gameState?.players) {
      const p = gameState.players.find((pl) => pl.player_id === playerId);
      const c = p?.cosmetics;
      if (c) {
        if (c.card_back) map.card_back = c.card_back;
        if (c.card_face) map.card_face = c.card_face;
        if (c.table_theme) map.table_theme = c.table_theme;
        if (c.title) map.title = c.title;
      }
    }

    return map;
  }, [playerId, myId, loadout, catalog, gameState]);

  return useMemo(
    () => ({
      cardBack: resolveCardBack(codes.card_back),
      cardFace: resolveCardFace(codes.card_face),
      table: resolveTableTheme(codes.table_theme),
      title: resolveTitle(codes.title),
    }),
    [codes],
  );
}

export function usePlayerCardSkin(playerId: string) {
  const { cardBack, cardFace } = usePlayerCosmetics(playerId);
  return {
    Back: cardBack.Component,
    Face: cardFace.Face,
    EmptySlot: cardFace.EmptySlot,
  };
}
