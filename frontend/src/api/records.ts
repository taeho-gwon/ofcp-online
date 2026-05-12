import type { Card } from "./types";
import { apiFetch } from "./client";

export interface GameListItem {
  game_id: string;
  room_code: string | null;
  ruleset: string;
  started_at: string;
  ended_at: string | null;
  round_count: number;
}

export interface GameListResponse {
  entries: GameListItem[];
  limit: number;
  offset: number;
}

export interface GamePlayerOut {
  user_id: string;
  nickname: string;
  seat_idx: number;
  final_score: number | null;
  fouled_rounds: number;
  fantasy_rounds: number;
}

export interface GameDetailResponse {
  game_id: string;
  room_code: string | null;
  ruleset: string;
  started_at: string;
  ended_at: string | null;
  round_count: number;
  players: GamePlayerOut[];
}

export interface GameEventOut {
  seq: number;
  ts: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
}

export interface GameEventsResponse {
  game_id: string;
  events: GameEventOut[];
}

export interface RoundEndPayload {
  round_number: number;
  is_bonus_round: boolean;
  boards: Record<
    string,
    { top: Card[]; middle: Card[]; bottom: Card[]; is_foul: boolean }
  >;
  scores: Record<string, number>;
  deltas: Record<string, number>;
  next_fantasy_cards: Record<string, number | null>;
}

export function listMyGames(
  limit = 20,
  offset = 0,
): Promise<GameListResponse> {
  return apiFetch<GameListResponse>(
    `/api/records/users/me/games?limit=${limit}&offset=${offset}`,
  );
}

export function listUserGames(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<GameListResponse> {
  return apiFetch<GameListResponse>(
    `/api/records/users/${encodeURIComponent(userId)}/games?limit=${limit}&offset=${offset}`,
  );
}

export function getGameDetail(gameId: string): Promise<GameDetailResponse> {
  return apiFetch<GameDetailResponse>(
    `/api/records/games/${encodeURIComponent(gameId)}`,
  );
}

export function getGameEvents(gameId: string): Promise<GameEventsResponse> {
  return apiFetch<GameEventsResponse>(
    `/api/records/games/${encodeURIComponent(gameId)}/events`,
  );
}
