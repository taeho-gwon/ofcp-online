import type { Phase } from "../api/types";

export function getRequiredPlace(phase: Phase): number {
  if (phase === "first_turn") return 5;
  if (phase === "normal_turn") return 2;
  if (phase === "fantasy_turn") return 13;
  return 0;
}

export function getRequiredDiscard(phase: Phase, handCount: number): number {
  if (phase === "first_turn") return 0;
  if (phase === "normal_turn") return 1;
  if (phase === "fantasy_turn") return Math.max(0, handCount - 13);
  return 0;
}
