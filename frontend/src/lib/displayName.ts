export function displayName(
  playerId: string,
  playersMeta: Record<string, string> | undefined,
): string {
  return playersMeta?.[playerId] ?? playerId;
}
