import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createRoom } from "../api/rooms";
import { useAuthStore } from "../store/authStore";

type Preset = "pineapple" | "pineapple-short";

const PRESETS: { value: Preset; label: string; sub: string }[] = [
  { value: "pineapple", label: "12라운드", sub: "100점" },
  { value: "pineapple-short", label: "6라운드", sub: "50점" },
];

const SEATS = [2, 3];

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
    <div className="min-h-screen flex flex-col items-center bg-slate-100 p-4 pb-12">
      <header className="w-full max-w-md flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">OFC Online</h1>
        <div className="text-xs flex items-center gap-2">
          <span className="text-slate-600">{user?.nickname}</span>
          <button
            type="button"
            onClick={logout}
            className="px-2 py-1 rounded bg-slate-200 hover:bg-slate-300"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="w-full max-w-md flex flex-col gap-4">
        <section className="bg-white rounded-lg shadow p-5 flex flex-col gap-3">
          <h2 className="font-semibold">방 만들기</h2>
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-slate-500">매치 길이</div>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = preset === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className={`px-3 py-2 rounded border text-sm flex flex-col items-center ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-xs text-slate-500">{p.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-xs text-slate-500">정원</div>
            <div className="grid grid-cols-2 gap-2">
              {SEATS.map((n) => {
                const active = maxSeats === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxSeats(n)}
                    className={`px-3 py-2 rounded border text-sm ${
                      active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {n}명
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            {creating ? "생성 중..." : "방 만들기"}
          </button>
        </section>

        <section className="bg-white rounded-lg shadow p-5 flex flex-col gap-3">
          <h2 className="font-semibold">방 참가</h2>
          <input
            type="text"
            value={joinCode}
            maxLength={6}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
            placeholder="방 코드 (6자)"
            className="px-3 py-2 border border-slate-300 rounded font-mono tracking-widest text-center text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={handleJoin}
            className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-700"
          >
            참가하기
          </button>
        </section>

        <section className="bg-white rounded-lg shadow p-5 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="px-3 py-2 rounded border border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              내 기록
            </button>
            <button
              type="button"
              onClick={() => navigate("/practice")}
              className="px-3 py-2 rounded border border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              연습 모드
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
