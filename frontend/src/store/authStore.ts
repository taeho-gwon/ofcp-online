import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TokenPair, UserOut } from "../api/authTypes";

interface AuthStore {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  // 신규 가입 도중 임시 보관. /nickname-setup 페이지에서 사용.
  signupToken: string | null;
  signupEmail: string | null;

  setTokens: (tokens: TokenPair, user: UserOut) => void;
  setPendingSignup: (signupToken: string, email: string) => void;
  clearPendingSignup: () => void;
  setUser: (user: UserOut) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      signupToken: null,
      signupEmail: null,

      setTokens: (tokens, user) =>
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          user,
          signupToken: null,
          signupEmail: null,
        }),

      setPendingSignup: (signupToken, email) =>
        set({ signupToken, signupEmail: email }),

      clearPendingSignup: () =>
        set({ signupToken: null, signupEmail: null }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          signupToken: null,
          signupEmail: null,
        }),
    }),
    { name: "ofcp-auth" },
  ),
);
