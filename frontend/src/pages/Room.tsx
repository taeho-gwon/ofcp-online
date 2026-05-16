import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { Room as RoomData } from "../api/authTypes";
import { RoomSocket } from "../api/roomsWs";
import { RoomCode } from "../components/game/RoomCode";
import { PageHeader } from "../components/PageHeader";
import { Badge, Button } from "../components/ui";
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

  const handleCopy = async () => {
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
      <div
        className="min-h-screen flex items-center justify-center pb-12"
        style={{ color: "var(--text-tertiary)" }}
      >
        잘못된 방 링크입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center pb-12">
      <PageHeader
        back={{ label: "← 로비", onClick: leave, disabled: !!countdown }}
        rightActions={
          <Badge tone={connected ? "success" : "danger"} dot>
            {connected ? "연결됨" : "연결 중"}
          </Badge>
        }
        maxWidth={448}
      />
      <div
        className="card flex flex-col gap-4"
        style={{ maxWidth: 448, width: "100%" }}
      >
        <div className="flex items-center justify-between">
          <RoomCode value={code} onCopy={handleCopy} />
        </div>

        {room && (
          <>
            <div
              style={{
                fontSize: "var(--fs-caption)",
                color: "var(--text-tertiary)",
              }}
            >
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
                      className="flex items-center justify-between"
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-md)",
                        border: "1px dashed var(--border-default)",
                        color: "var(--text-tertiary)",
                        fontSize: "var(--fs-body-sm)",
                      }}
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
                    className="flex items-center justify-between"
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-md)",
                      border: isMe
                        ? "1px solid var(--accent-border)"
                        : "1px solid var(--border-subtle)",
                      background: isMe ? "var(--accent-soft)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600 }}>{m.nickname}</span>
                      {memberIsHost && <Badge tone="warning">호스트</Badge>}
                      {isMe && (
                        <span
                          style={{
                            fontSize: "var(--fs-caption)",
                            color: "var(--accent-soft-text)",
                          }}
                        >
                          (나)
                        </span>
                      )}
                    </div>
                    {memberIsHost ? (
                      <Badge tone="warning">시작 권한</Badge>
                    ) : m.ready ? (
                      <Badge tone="success">준비</Badge>
                    ) : (
                      <Badge>대기</Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {countdown ? (
              <div
                style={{
                  background: "var(--accent-soft)",
                  border: "1px solid var(--accent-border)",
                  borderRadius: "var(--radius-lg)",
                  padding: 12,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "var(--accent-soft-text)",
                    fontWeight: 600,
                  }}
                >
                  곧 게임이 시작됩니다
                </div>
                <div
                  style={{
                    fontSize: "var(--fs-display)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    color: "var(--accent-soft-text)",
                    marginTop: 4,
                  }}
                >
                  {countdown.remaining}
                </div>
              </div>
            ) : isHost ? (
              <Button
                type="button"
                variant="primary"
                onClick={startGame}
                disabled={!canStart}
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
              </Button>
            ) : me ? (
              <Button
                type="button"
                variant={me.ready ? "secondary" : "primary"}
                onClick={toggleReady}
              >
                {me.ready ? "준비 해제" : "준비 완료"}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
