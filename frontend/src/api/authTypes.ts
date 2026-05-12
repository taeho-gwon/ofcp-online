// 백엔드 app/auth/schemas.py, app/users/schemas.py 와 1:1 미러.

export interface UserOut {
  id: string;
  email: string;
  nickname: string;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
}

export interface GoogleLoginResponse {
  needs_signup: boolean;
  tokens: TokenPair | null;
  user: UserOut | null;
  signup_token: string | null;
  email: string | null;
}

export interface SignupResponse {
  tokens: TokenPair;
  user: UserOut;
}

export interface DevLoginResponse {
  tokens: TokenPair;
  user: UserOut;
}

export interface NicknameAvailability {
  available: boolean;
}

// rooms 도메인 (백엔드 app/rooms/schemas.py 미러)

export interface RoomMember {
  user_id: string;
  nickname: string;
  ready: boolean;
}

export interface Room {
  code: string;
  host_user_id: string;
  ruleset_name: string;
  max_seats: number;
  members: RoomMember[];
  game_id: string | null;
  created_at: string;
}

export type RoomWsServerMsg =
  | { type: "room"; data: Room }
  | {
      type: "start";
      data: { game_id: string; countdown_seconds?: number };
    }
  | { type: "closed"; data: { reason: string } }
  | { type: "error"; data: { message: string } };

export type RoomWsClientMsg =
  | { action: "set_ready"; ready: boolean }
  | { action: "start" }
  | { action: "leave" };
