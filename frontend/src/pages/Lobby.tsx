import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createRoom } from "../api/rooms";
import { PageHeader } from "../components/PageHeader";
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

const fieldLabelStyle = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  color: "var(--text-secondary)",
  letterSpacing: "0.01em",
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
    <div className="min-h-screen flex flex-col items-center p-4 pb-12">
      <PageHeader
        title="OFC Online"
        maxWidth={448}
        rightActions={
          <>
            <span
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-secondary)",
              }}
            >
              {user?.nickname}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={logout}>
              로그아웃
            </Button>
          </>
        }
      />

      <div
        className="w-full flex flex-col gap-4"
        style={{ maxWidth: 448 }}
      >
        <section className="card">
          <h2
            style={{
              fontSize: "var(--fs-body-lg)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            방 만들기
          </h2>
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
          <h2
            style={{
              fontSize: "var(--fs-body-lg)",
              fontWeight: 600,
              margin: 0,
            }}
          >
            방 참가
          </h2>
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
              height: 44,
            }}
          />
          <Button type="button" variant="primary" onClick={handleJoin}>
            참가하기
          </Button>
        </section>

        <section className="card">
          <Button
            type="button"
            variant="accentOutline"
            onClick={() => navigate("/tutorial")}
          >
            ★ 튜토리얼 — 처음이라면 여기부터
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/history")}
            >
              내 기록
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/practice")}
            >
              연습 모드
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
