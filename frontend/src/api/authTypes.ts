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

export interface NicknameAvailability {
  available: boolean;
}
