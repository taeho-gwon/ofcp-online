import { GoogleLogin } from "@react-oauth/google";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { devLogin, googleLogin } from "../api/auth";
import type { Card as CardType } from "../api/types";
import { CardView } from "../components/Card";
import { Alert, Badge, Button, Field, Input } from "../components/ui";
import { useAuthStore } from "../store/authStore";

const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_AUTH === "true";

interface FanItem {
  card: CardType;
  rotate: number;
  offsetX: number;
  offsetY: number;
}

const HERO_FAN: FanItem[] = [
  { card: { rank: 14, suit: 4 }, rotate: -16, offsetX: 0, offsetY: 28 },
  { card: { rank: 13, suit: 3 }, rotate: -5, offsetX: 60, offsetY: 4 },
  { card: { rank: 12, suit: 2 }, rotate: 5, offsetX: 130, offsetY: 4 },
  { card: { rank: 11, suit: 1 }, rotate: 16, offsetX: 190, offsetY: 28 },
];

function HeroCardFan() {
  return (
    <div
      aria-hidden
      style={{
        position: "relative",
        width: 280,
        height: 160,
        marginTop: 8,
      }}
    >
      {HERO_FAN.map((h, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: h.offsetX,
            top: h.offsetY,
            transform: `rotate(${h.rotate}deg)`,
            transformOrigin: "center bottom",
          }}
        >
          <CardView card={h.card} size="md" />
        </div>
      ))}
    </div>
  );
}

const heroTitleStyle = {
  fontSize: "var(--fs-display)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
  color: "var(--text-primary)",
  lineHeight: 1.1,
};

const heroSubtitleStyle = {
  fontSize: "var(--fs-body-lg)",
  color: "var(--text-secondary)",
  margin: "10px 0 0",
};

const heroListStyle = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  fontSize: "var(--fs-body)",
  color: "var(--text-secondary)",
};

const formTitleStyle = {
  fontSize: "var(--fs-h3)",
  fontWeight: 600,
  margin: 0,
};

const dividerWithLabel = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "var(--text-tertiary)",
  fontSize: "var(--fs-caption)",
} as const;

const dividerLine = {
  flex: 1,
  height: 1,
  background: "var(--border-subtle)",
};

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
    <div className="min-h-screen flex items-center justify-center p-6 pb-12">
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center w-full"
        style={{ maxWidth: 1080 }}
      >
        <div className="flex flex-col gap-6">
          <div>
            <h1 style={heroTitleStyle}>OFC Online</h1>
            <p style={heroSubtitleStyle}>Pineapple OFC 멀티플레이</p>
          </div>
          <ul style={heroListStyle}>
            <li>· 실시간 2~3인 대전</li>
            <li>· 12라운드 / 6라운드 모드</li>
            <li>· 튜토리얼 4개 시나리오로 룰 학습</li>
          </ul>
          <HeroCardFan />
        </div>

        <div
          className="card"
          style={{ width: "100%", maxWidth: 420, justifySelf: "center", padding: 28, gap: 18 }}
        >
          <h2 style={formTitleStyle}>로그인</h2>

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

          <div style={dividerWithLabel}>
            <span style={dividerLine} />
            <span>또는</span>
            <span style={dividerLine} />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/practice")}
          >
            로그인 없이 연습 모드 →
          </Button>

          {DEV_AUTH_ENABLED && (
            <div
              className="flex flex-col gap-3"
              style={{
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: 16,
                marginTop: 4,
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
        </div>
      </div>
    </div>
  );
}
