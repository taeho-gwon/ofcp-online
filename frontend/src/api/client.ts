import type { CreateGameRequest, GameState } from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // empty body
    }
    throw new Error(`${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export function createGame(req: CreateGameRequest): Promise<GameState> {
  return jsonFetch<GameState>("/api/games", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getGame(gameId: string, viewerId?: string): Promise<GameState> {
  const qs = viewerId ? `?viewer_id=${encodeURIComponent(viewerId)}` : "";
  return jsonFetch<GameState>(`/api/games/${encodeURIComponent(gameId)}${qs}`);
}
