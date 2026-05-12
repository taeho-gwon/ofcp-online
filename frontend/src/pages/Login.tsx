import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { devLogin, googleLogin } from "../api/auth";
import { useAuthStore } from "../store/authStore";

const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_AUTH === "true";

export function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setPendingSignup = useAuthStore((s) => s.setPendingSignup);
  const [loading, setLoading] = useState(false);
  const [devNickname, setDevNickname] = useState("");
  const [devLoading, setDevLoading] = useState(false);

  const handleSuccess = async (idToken: string) => {
    setLoading(true);
    try {
      const res = await googleLogin(idToken);
      if (res.needs_signup) {
        if (!res.signup_token || !res.email) {
          toast.error("서버 응답이 올바르지 않습니다.");
          return;
        }
        setPendingSignup(res.signup_token, res.email);
        navigate("/nickname-setup");
      } else {
        if (!res.tokens || !res.user) {
          toast.error("서버 응답이 올바르지 않습니다.");
          return;
        }
        setTokens(res.tokens, res.user);
        navigate("/");
      }
    } catch (e) {
      toast.error(`로그인 실패: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    const nick = devNickname.trim();
    if (nick.length < 2) {
      toast.error("닉네임은 2자 이상이어야 합니다.");
      return;
    }
    setDevLoading(true);
    try {
      const res = await devLogin(nick);
      setTokens(res.tokens, res.user);
      navigate("/");
    } catch (e) {
      toast.error(`dev 로그인 실패: ${(e as Error).message}`);
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 pb-12">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 flex flex-col gap-6 items-center">
        <h1 className="text-2xl font-bold">OFC Online</h1>
        <p className="text-sm text-slate-600 text-center">
          Google 계정으로 로그인합니다.
        </p>
        {loading ? (
          <div className="text-sm text-slate-500">로그인 중...</div>
        ) : (
          <GoogleLogin
            onSuccess={(cred) => {
              if (!cred.credential) {
                toast.error("Google 응답에 credential이 없습니다.");
                return;
              }
              handleSuccess(cred.credential);
            }}
            onError={() => toast.error("Google 로그인이 취소되었습니다.")}
          />
        )}
        {DEV_AUTH_ENABLED && (
          <div className="w-full border-t border-slate-200 pt-4 flex flex-col gap-2">
            <div className="text-xs text-amber-700 font-semibold text-center">
              ⚠ DEV 모드 — 닉네임만으로 로그인
            </div>
            <input
              type="text"
              value={devNickname}
              maxLength={16}
              onChange={(e) => setDevNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDevLogin();
              }}
              placeholder="닉네임 (2~16자)"
              className="px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleDevLogin}
              disabled={devLoading}
              className="px-3 py-2 rounded bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:bg-slate-300"
            >
              {devLoading ? "로그인 중..." : "dev 로그인"}
            </button>
          </div>
        )}
        <div className="w-full border-t border-slate-200 pt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/practice")}
            className="text-sm text-slate-600 underline hover:text-slate-900"
          >
            로그인 없이 연습 모드 →
          </button>
        </div>
      </div>
    </div>
  );
}
