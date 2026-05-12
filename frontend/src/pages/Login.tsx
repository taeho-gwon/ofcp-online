import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { googleLogin } from "../api/auth";
import { useAuthStore } from "../store/authStore";

export function Login() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setPendingSignup = useAuthStore((s) => s.setPendingSignup);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
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
      </div>
    </div>
  );
}
