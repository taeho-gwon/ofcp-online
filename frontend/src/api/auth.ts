import type {
  GoogleLoginResponse,
  NicknameAvailability,
  SignupResponse,
  UserOut,
} from "./authTypes";
import { apiFetch } from "./client";

export function googleLogin(idToken: string): Promise<GoogleLoginResponse> {
  return apiFetch<GoogleLoginResponse>(
    "/api/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    },
    { auth: false },
  );
}

export function signup(
  signupToken: string,
  nickname: string,
): Promise<SignupResponse> {
  return apiFetch<SignupResponse>(
    "/api/auth/signup",
    {
      method: "POST",
      body: JSON.stringify({ signup_token: signupToken, nickname }),
    },
    { auth: false },
  );
}

export function getMe(): Promise<UserOut> {
  return apiFetch<UserOut>("/api/users/me");
}

export function changeNickname(nickname: string): Promise<UserOut> {
  return apiFetch<UserOut>("/api/users/me/nickname", {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });
}

export function checkNickname(nickname: string): Promise<NicknameAvailability> {
  const qs = `?nickname=${encodeURIComponent(nickname)}`;
  return apiFetch<NicknameAvailability>(
    `/api/users/check-nickname${qs}`,
    {},
    { auth: false },
  );
}
