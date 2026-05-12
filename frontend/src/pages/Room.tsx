import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { Room as RoomData } from "../api/authTypes";
import { RoomSocket } from "../api/roomsWs";
import { useAuthStore } from "../store/authStore";

interface Countdown {
  gameId: string;
  remaining: number;
}

export function Room() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [connected, setConnected] = useState(false);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const socketRef = useRef<RoomSocket | null>(null);

  useEffect(() => {
    if (!code || !accessToken) return;
    const sock = new RoomSocket(code, accessToken, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (msg) => {
        if (msg.type === "room") {
          setRoom(msg.data);
        } else if (msg.type === "start") {
          const secs = msg.data.countdown_seconds ?? 0;
          if (secs > 0) {
            setCountdown({ gameId: msg.data.game_id, remaining: secs });
          } else {
            navigate(`/game/${msg.data.game_id}`);
          }
        } else if (msg.type === "closed") {
          toast.error(
            msg.data.reason === "host_left"
              ? "호스트가 떠나 방이 해체되었습니다."
              : "방이 해체되었습니다.",
          );
          navigate("/");
        } else if (msg.type === "error") {
          toast.error(msg.data.message);
        }
      },
    });
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, [code, accessToken, navigate]);

  // 카운트다운 tick
  useEffect(() => {
    if (!countdown) return;
    if (countdown.remaining <= 0) {
      navigate(`/game/${countdown.gameId}`);
      return;
    }
    const t = setTimeout(() => {
      setCountdown((c) => (c ? { ...c, remaining: c.remaining - 1 } : c));
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const me = room?.members.find((m) => m.user_id === user?.id);
  const isHost = !!room && room.host_user_id === user?.id;
  const guests = room ? room.members.filter((m) => m.user_id !== room.host_user_id) : [];
  const allGuestsReady = guests.length > 0 && guests.every((m) => m.ready);
  const canStart = !!room && room.members.length >= 2 && allGuestsReady;

  const toggleReady = () => {
    if (!me || !socketRef.current) return;
    socketRef.current.send({ action: "set_ready", ready: !me.ready });
  };

  const startGame = () => {
    if (!socketRef.current || !canStart) return;
    socketRef.current.send({ action: "start" });
  };

  const leave = () => {
    socketRef.current?.send({ action: "leave" });
    navigate("/");
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("방 코드 복사됨");
    } catch {
      toast.error("복사 실패");
    }
  };

  if (!code) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 pb-12">
        잘못된 방 링크입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center pb-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-5 flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={leave}
            className="text-xs text-slate-500 hover:underline"
            disabled={!!countdown}
          >
            ← 로비
          </button>
          <span className="text-xs">
            {connected ? (
              <span className="text-emerald-600">● 연결됨</span>
            ) : (
              <span className="text-rose-600">● 연결 중</span>
            )}
          </span>
        </header>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">방 코드</div>
            <div className="font-mono text-3xl font-bold tracking-widest">
              {code}
            </div>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs hover:bg-slate-700"
          >
            복사
          </button>
        </div>

        {room && (
          <>
            <div className="text-xs text-slate-500">
              {room.ruleset_name === "pineapple" ? "12라운드" : "6라운드"} ·
              정원 {room.max_seats}명
            </div>

            <div className="flex flex-col gap-2">
              {Array.from({ length: room.max_seats }).map((_, i) => {
                const m = room.members[i];
                if (!m) {
                  return (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center justify-between p-3 rounded border border-dashed border-slate-300 text-slate-400 text-sm"
                    >
                      <span>비어 있음</span>
                    </div>
                  );
                }
                const memberIsHost = m.user_id === room.host_user_id;
                const isMe = m.user_id === user?.id;
                return (
                  <div
                    key={m.user_id}
                    className={`flex items-center justify-between p-3 rounded border ${
                      isMe
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.nickname}</span>
                      {memberIsHost && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                          호스트
                        </span>
                      )}
                      {isMe && (
                        <span className="text-xs text-emerald-700">(나)</span>
                      )}
                    </div>
                    {memberIsHost ? (
                      <span className="text-xs px-2 py-1 rounded bg-amber-500 text-white font-semibold">
                        시작 권한
                      </span>
                    ) : m.ready ? (
                      <span className="text-xs px-2 py-1 rounded bg-emerald-600 text-white font-semibold">
                        준비
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-slate-200 text-slate-600">
                        대기
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {countdown ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-300 p-3 text-center">
                <div className="text-emerald-700 font-semibold">
                  곧 게임이 시작됩니다
                </div>
                <div className="text-4xl font-mono font-bold text-emerald-700 mt-1">
                  {countdown.remaining}
                </div>
              </div>
            ) : isHost ? (
              <button
                type="button"
                onClick={startGame}
                disabled={!canStart}
                className="px-4 py-2 rounded text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                title={
                  !canStart
                    ? room.members.length < 2
                      ? "최소 2명이 필요합니다"
                      : "참가자가 아직 준비하지 않았습니다"
                    : undefined
                }
              >
                {room.members.length < 2
                  ? "참가자 대기 중"
                  : allGuestsReady
                    ? "게임 시작"
                    : "참가자 준비 대기 중"}
              </button>
            ) : me ? (
              <button
                type="button"
                onClick={toggleReady}
                className={`px-4 py-2 rounded text-white ${
                  me.ready
                    ? "bg-slate-500 hover:bg-slate-600"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {me.ready ? "준비 해제" : "준비 완료"}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
