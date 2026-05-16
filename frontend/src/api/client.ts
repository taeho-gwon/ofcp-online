import { useAuthStore } from "../store/authStore";
import type { TokenPair } from "./authTypes";
import type { CreateGameRequest, GameState } from "./types";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function _fetch(url: string, init: RequestInit, withAuth: boolean) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (withAuth) {
    const access = useAuthStore.getState().accessToken;
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }
  return fetch(url, { ...init, headers });
}

export async function refreshTokens(): Promise<boolean> {
  const refresh = useAuthStore.getState().refreshToken;
  if (!refresh) return false;
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    useAuthStore.getState().logout();
    return false;
  }
  const pair = (await res.json()) as TokenPair;
  const user = useAuthStore.getState().user;
  if (!user) return false;
  useAuthStore.getState().setTokens(pair, user);
  return true;
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
  { auth = true }: { auth?: boolean } = {},
): Promise<T> {
  let res = await _fetch(url, init, auth);
  if (res.status === 401 && auth) {
    const ok = await refreshTokens();
    if (ok) {
      res = await _fetch(url, init, true);
    }
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // empty body
    }
    throw new ApiError(res.status, `${res.status} ${detail}`);
  }
  return res.json() as Promise<T>;
}

export { ApiError };

export function createGame(req: CreateGameRequest): Promise<GameState> {
  return apiFetch<GameState>("/api/games", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function getGame(gameId: string, viewerId?: string): Promise<GameState> {
  const qs = viewerId ? `?viewer_id=${encodeURIComponent(viewerId)}` : "";
  return apiFetch<GameState>(`/api/games/${encodeURIComponent(gameId)}${qs}`);
}
