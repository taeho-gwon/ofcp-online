import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { checkNickname, signup } from "../api/auth";
import { ApiError } from "../api/client";
import { Button, Input } from "../components/ui";
import { useAuthStore } from "../store/authStore";

const NICKNAME_RE = /^[\w가-힣]{2,16}$/u;

type FormatState = "empty" | "invalid" | "valid";
type RemoteState = "idle" | "checking" | "available" | "taken";

interface NetResult {
  nickname: string;
  available: boolean;
}

export function NicknameSetup() {
  const navigate = useNavigate();
  const signupToken = useAuthStore((s) => s.signupToken);
  const signupEmail = useAuthStore((s) => s.signupEmail);
  const setTokens = useAuthStore((s) => s.setTokens);
  const clearPendingSignup = useAuthStore((s) => s.clearPendingSignup);

  const [nickname, setNickname] = useState("");
  const [netResult, setNetResult] = useState<NetResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = nickname.trim();
  const format: FormatState = useMemo(() => {
    if (trimmed.length === 0) return "empty";
    return NICKNAME_RE.test(trimmed) ? "valid" : "invalid";
  }, [trimmed]);

  const remote: RemoteState = useMemo(() => {
    if (format !== "valid") return "idle";
    if (netResult && netResult.nickname === trimmed) {
      return netResult.available ? "available" : "taken";
    }
    return "checking";
  }, [format, trimmed, netResult]);

  useEffect(() => {
    if (!signupToken) navigate("/login", { replace: true });
  }, [signupToken, navigate]);

  useEffect(() => {
    if (format !== "valid") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await checkNickname(trimmed);
        if (!cancelled) {
          setNetResult({ nickname: trimmed, available: res.available });
        }
      } catch {
        // 네트워크 오류 시 결과를 지워 표시는 checking으로 남는다
        if (!cancelled) setNetResult(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [trimmed, format]);

  const handleSubmit = async () => {
    if (!signupToken) return;
    if (format !== "valid") {
      toast.error("닉네임은 2~16자의 한글/영문/숫자/_ 조합이어야 합니다.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signup(signupToken, trimmed);
      setTokens(res.tokens, res.user);
      navigate("/");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("로그인이 만료되었습니다. 다시 로그인해주세요.");
        clearPendingSignup();
        navigate("/login", { replace: true });
        return;
      }
      toast.error(`가입 실패: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const hint = (() => {
    if (format === "empty") return null;
    if (format === "invalid")
      return {
        text: "2~16자의 한글/영문/숫자/_ 조합",
        color: "var(--warning)",
      };
    switch (remote) {
      case "checking":
        return { text: "확인 중...", color: "var(--text-tertiary)" };
      case "available":
        return { text: "사용 가능", color: "var(--success)" };
      case "taken":
        return { text: "이미 사용 중", color: "var(--danger)" };
      default:
        return null;
    }
  })();

  const canSubmit = format === "valid" && remote === "available" && !submitting;
  const inputError = format === "invalid" || remote === "taken";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pb-12">
      <div
        className="card flex flex-col gap-4"
        style={{ maxWidth: 360, width: "100%" }}
      >
        <h1
          style={{
            fontSize: "var(--fs-h3)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-tight)",
            margin: 0,
          }}
        >
          닉네임 설정
        </h1>
        {signupEmail && (
          <div
            style={{
              fontSize: "var(--fs-caption)",
              color: "var(--text-tertiary)",
            }}
          >
            {signupEmail}
          </div>
        )}
        <div className="field">
          <Input
            autoFocus
            type="text"
            value={nickname}
            maxLength={16}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) handleSubmit();
            }}
            placeholder="닉네임"
            error={inputError}
          />
          {hint && (
            <span className="field-hint" style={{ color: hint.color }}>
              {hint.text}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? "가입 중..." : "가입 완료"}
        </Button>
      </div>
    </div>
  );
}
