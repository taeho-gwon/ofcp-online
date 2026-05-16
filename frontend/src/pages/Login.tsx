import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { devLogin, googleLogin } from "../api/auth";
import { Alert, Badge, Button, Field, Input } from "../components/ui";
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
    <div className="min-h-screen flex items-center justify-center p-4 pb-12">
      <div
        className="card flex flex-col gap-6 items-center"
        style={{ maxWidth: 360, width: "100%" }}
      >
        <h1
          style={{
            fontSize: "var(--fs-h2)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
            margin: 0,
          }}
        >
          OFC Online
        </h1>
        <p
          style={{
            fontSize: "var(--fs-body-sm)",
            color: "var(--text-secondary)",
            textAlign: "center",
            margin: 0,
          }}
        >
          Google 계정으로 로그인합니다.
        </p>
        {loading ? (
          <Badge>로그인 중...</Badge>
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
          <div
            className="w-full flex flex-col gap-3"
            style={{
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 16,
            }}
          >
            <Alert tone="warning" title="DEV 모드">
              닉네임만으로 로그인합니다.
            </Alert>
            <Field>
              <Input
                type="text"
                value={devNickname}
                maxLength={16}
                onChange={(e) => setDevNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDevLogin();
                }}
                placeholder="닉네임 (2~16자)"
              />
            </Field>
            <Button
              type="button"
              variant="primary"
              onClick={handleDevLogin}
              disabled={devLoading}
            >
              {devLoading ? "로그인 중..." : "dev 로그인"}
            </Button>
          </div>
        )}
        <div
          className="w-full"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: 16,
            textAlign: "center",
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate("/practice")}
          >
            로그인 없이 연습 모드 →
          </Button>
        </div>
      </div>
    </div>
  );
}
