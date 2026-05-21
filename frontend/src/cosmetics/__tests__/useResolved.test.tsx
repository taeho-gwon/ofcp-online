// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { GameState } from "../../api/types";
import { useAuthStore } from "../../store/authStore";
import { useCosmeticsStore } from "../../store/cosmeticsStore";
import { useGameStore } from "../../store/gameStore";
import { usePlayerCosmetics } from "../useResolved";

afterEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
  });
  useGameStore.setState({ gameState: null, pendingState: null });
  useCosmeticsStore.setState({
    catalog: [],
    owned: [],
    loadout: null,
    loaded: false,
  });
});

describe("usePlayerCosmetics", () => {
  it("returns default fallback when nothing is set", () => {
    const { result } = renderHook(() => usePlayerCosmetics("anyone"));
    expect(result.current.cardBack.code).toBe("back.navy");
    expect(result.current.cardFace.code).toBe("face.classic");
    expect(result.current.table.code).toBe("table.green");
    expect(result.current.title.code).toBe("title.beginner");
  });

  it("returns opponent cosmetics from gameState.players[].cosmetics", () => {
    useGameStore.setState({
      gameState: {
        players: [
          {
            player_id: "opp",
            cosmetics: {
              card_back: "back.ocean",
              card_face: "face.modern",
              table_theme: "table.walnut",
              title: "title.fl_demon",
            },
          },
        ],
      } as unknown as GameState,
    });

    const { result } = renderHook(() => usePlayerCosmetics("opp"));
    expect(result.current.cardBack.code).toBe("back.ocean");
    expect(result.current.cardFace.code).toBe("face.modern");
    expect(result.current.table.code).toBe("table.walnut");
    expect(result.current.title.code).toBe("title.fl_demon");
  });

  it("falls back when player not in gameState", () => {
    useGameStore.setState({
      gameState: { players: [] } as unknown as GameState,
    });
    const { result } = renderHook(() => usePlayerCosmetics("unknown_player"));
    expect(result.current.cardBack.code).toBe("back.navy");
  });
});
