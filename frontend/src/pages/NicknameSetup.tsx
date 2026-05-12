import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { checkNickname, signup } from "../api/auth";
import { ApiError } from "../api/client";
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
        color: "text-amber-600",
      };
    switch (remote) {
      case "checking":
        return { text: "확인 중...", color: "text-slate-500" };
      case "available":
        return { text: "사용 가능", color: "text-emerald-600" };
      case "taken":
        return { text: "이미 사용 중", color: "text-red-600" };
      default:
        return null;
    }
  })();

  const canSubmit = format === "valid" && remote === "available" && !submitting;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow p-6 flex flex-col gap-4">
        <h1 className="text-xl font-bold">닉네임 설정</h1>
        {signupEmail && (
          <div className="text-xs text-slate-500">{signupEmail}</div>
        )}
        <input
          autoFocus
          type="text"
          value={nickname}
          maxLength={16}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSubmit) handleSubmit();
          }}
          placeholder="닉네임"
          className="px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {hint && <div className={`text-xs ${hint.color}`}>{hint.text}</div>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300"
        >
          {submitting ? "가입 중..." : "가입 완료"}
        </button>
      </div>
    </div>
  );
}
