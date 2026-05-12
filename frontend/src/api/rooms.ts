import type { Room } from "./authTypes";
import { apiFetch } from "./client";

export function createRoom(
  rulesetName: string,
  maxSeats: number,
): Promise<Room> {
  return apiFetch<Room>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ ruleset_name: rulesetName, max_seats: maxSeats }),
  });
}

export function getRoom(code: string): Promise<Room> {
  return apiFetch<Room>(`/api/rooms/${encodeURIComponent(code)}`);
}
