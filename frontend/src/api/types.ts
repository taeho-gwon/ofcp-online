// 백엔드 app/game/schemas.py 와 1:1 미러
// 변경 시 양쪽 함께 수정.

export type Row = "top" | "middle" | "bottom";

export type Phase =
  | "fantasy_turn"
  | "first_turn"
  | "normal_turn"
  | "scoring"
  | "done"
  | "game_over";

// Rank: 2-14 (14=A), Suit: 1=C, 2=D, 3=H, 4=S
export interface Card {
  rank: number;
  suit: number;
}

export interface Board {
  top: Card[];
  middle: Card[];
  bottom: Card[];
  top_count: number;
  middle_count: number;
  bottom_count: number;
}

export interface HandEvaluation {
  rank: number;
  rank_label: string; // 백엔드 enum name (예: "ONE_PAIR")
  label: string;      // 사람 표시 라벨 (예: "원페어 KK")
  royalty: number;
}

export interface BoardEvaluation {
  top: HandEvaluation;
  middle: HandEvaluation;
  bottom: HandEvaluation;
  is_foul: boolean;
  total_royalty: number;
}

export interface Matchup {
  a_id: string;
  b_id: string;
  top_line_a: number;
  top_royalty_a: number;
  top_royalty_b: number;
  middle_line_a: number;
  middle_royalty_a: number;
  middle_royalty_b: number;
  bottom_line_a: number;
  bottom_royalty_a: number;
  bottom_royalty_b: number;
  scoop_a: number;
  foul_a: boolean;
  foul_b: boolean;
  total_a: number;
}

export interface PlayerState {
  player_id: string;
  board: Board;
  hand: Card[]; // 본인이 아니면 빈 배열
  hand_count: number;
  score: number;
  is_fantasy: boolean;
  next_fantasy_cards: number | null;
  evaluation?: BoardEvaluation | null;
  last_round_delta?: number | null;
}

export interface GameState {
  game_id: string;
  phase: Phase;
  dealer_idx: number;
  current_player_idx: number;
  current_player_id: string;
  round_number: number;
  is_bonus_round: boolean;
  max_rounds: number;
  is_game_over: boolean;
  players: PlayerState[];
  matchups?: Matchup[] | null;
}

export interface CreateGameRequest {
  player_ids: string[];
  dealer_idx?: number;
  fantasy_players?: Record<string, number> | null;
}

// WS 인바운드
export type WsServerMsg =
  | { type: "state"; data: GameState }
  | { type: "error"; data: { message: string } };

// WS 아웃바운드
export type WsClientMsg =
  | {
      action: "first_turn";
      player_id: string;
      placements: Record<Row, Card[]>;
    }
  | {
      action: "normal_turn";
      player_id: string;
      placements: Record<Row, Card[]>;
      discard: Card;
    }
  | {
      action: "fantasy_turn";
      player_id: string;
      placements: Record<Row, Card[]>;
      discards: Card[];
    }
  | {
      action: "next_round";
    };

export const ROW_CAPACITY: Record<Row, number> = {
  top: 3,
  middle: 5,
  bottom: 5,
};

export const SUIT_LABEL: Record<number, string> = {
  1: "♣",
  2: "♦",
  3: "♥",
  4: "♠",
};

export const SUIT_IS_RED: Record<number, boolean> = {
  1: false,
  2: true,
  3: true,
  4: false,
};

export const RANK_LABEL: Record<number, string> = {
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "T",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
};

export function cardKey(c: Card): string {
  return `${c.rank}-${c.suit}`;
}
