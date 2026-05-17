import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createRoom } from "../api/rooms";
import { Button, Input, Segmented } from "../components/ui";
import { useAuthStore } from "../store/authStore";

type Preset = "pineapple" | "pineapple-short";

const PRESET_OPTIONS = [
  { value: "pineapple", label: "12라운드 · 100점" },
  { value: "pineapple-short", label: "6라운드 · 50점" },
];

const SEAT_OPTIONS = [
  { value: "2", label: "2명" },
  { value: "3", label: "3명" },
];

const PAGE_MAX_WIDTH = 960;

const heroTitleStyle = {
  fontSize: "var(--fs-display)",
  fontWeight: 700,
  letterSpacing: "var(--tracking-tight)",
  margin: 0,
  lineHeight: 1.1,
};

const heroSubtitleStyle = {
  fontSize: "var(--fs-body-lg)",
  color: "var(--text-secondary)",
  margin: "10px 0 0",
};

const fieldLabelStyle = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  color: "var(--text-secondary)",
  letterSpacing: "0.01em",
};

const sectionTitleStyle = {
  fontSize: "var(--fs-body-lg)",
  fontWeight: 600,
  margin: 0,
};

const sectionDescStyle = {
  fontSize: "var(--fs-body-sm)",
  color: "var(--text-secondary)",
  margin: 0,
};

export function Lobby() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [preset, setPreset] = useState<Preset>("pineapple");
  const [maxSeats, setMaxSeats] = useState(2);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleCreate = async () => {
    setCreating(true);
    try {
      const room = await createRoom(preset, maxSeats);
      navigate(`/room/${room.code}`);
    } catch (e) {
      toast.error(`방 생성 실패: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("방 코드는 6자입니다.");
      return;
    }
    navigate(`/room/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 pb-12">
      <div className="w-full" style={{ maxWidth: PAGE_MAX_WIDTH }}>
        <header className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 style={heroTitleStyle}>OFC Online</h1>
            {user && (
              <p style={heroSubtitleStyle}>안녕하세요, {user.nickname}님</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/me")}
            >
              마이페이지
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              로그아웃
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <section className="card">
              <h2 style={sectionTitleStyle}>방 만들기</h2>
              <div className="flex flex-col gap-1.5">
                <div style={fieldLabelStyle}>매치 길이</div>
                <Segmented
                  options={PRESET_OPTIONS}
                  value={preset}
                  onChange={(v) => setPreset(v as Preset)}
                  aria-label="매치 길이"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div style={fieldLabelStyle}>정원</div>
                <Segmented
                  options={SEAT_OPTIONS}
                  value={String(maxSeats)}
                  onChange={(v) => setMaxSeats(Number(v))}
                  aria-label="정원"
                />
              </div>
              <Button
                type="button"
                variant="primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? "생성 중..." : "방 만들기"}
              </Button>
            </section>

            <section className="card">
              <h2 style={sectionTitleStyle}>방 참가</h2>
              <p style={sectionDescStyle}>
                친구가 공유한 6자리 코드를 입력하세요.
              </p>
              <Input
                type="text"
                value={joinCode}
                maxLength={6}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                placeholder="방 코드 (6자)"
                style={{
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.18em",
                  textAlign: "center",
                  fontSize: "var(--fs-body-lg)",
                  height: 48,
                }}
              />
              <Button type="button" variant="primary" onClick={handleJoin}>
                참가하기
              </Button>
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <section className="card">
              <h2 style={sectionTitleStyle}>★ 처음이라면</h2>
              <p style={sectionDescStyle}>
                OFC 룰과 점수 계산을 4개 시나리오로 익혀봅니다.
              </p>
              <Button
                type="button"
                variant="accentOutline"
                onClick={() => navigate("/tutorial")}
              >
                튜토리얼 시작
              </Button>
            </section>

            <section className="card">
              <h2 style={sectionTitleStyle}>내 기록</h2>
              <p style={sectionDescStyle}>지난 게임을 다시 보고 복기합니다.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/history")}
              >
                기록 보기
              </Button>
            </section>

            <section className="card">
              <h2 style={sectionTitleStyle}>연습 모드</h2>
              <p style={sectionDescStyle}>혼자서 매치를 빠르게 돌려봅니다.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate("/practice")}
              >
                연습 시작
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
