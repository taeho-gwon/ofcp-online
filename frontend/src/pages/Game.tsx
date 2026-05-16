import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { refreshTokens } from "../api/client";
import {
  GameSocket,
  type ConnectionStatus,
  type TerminationKind,
} from "../api/ws";
import { OfcTable, type OfcSession } from "../components/OfcTable";
import { PageHeader } from "../components/PageHeader";
import { RulesModal } from "../components/RulesModal";
import { Badge, Button, Modal } from "../components/ui";
import { useAuthStore } from "../store/authStore";
import { useGameStore } from "../store/gameStore";

export function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const user = useAuthStore((s) => s.user);
  const playerId = user?.id ?? "";
  const navigate = useNavigate();

  const gameState = useGameStore((s) => s.gameState);
  const connected = useGameStore((s) => s.connected);
  const setGameState = useGameStore((s) => s.setGameState);
  const commitPendingState = useGameStore((s) => s.commitPendingState);
  const setConnected = useGameStore((s) => s.setConnected);
  const setError = useGameStore((s) => s.setError);
  const reset = useGameStore((s) => s.reset);

  const socketRef = useRef<GameSocket | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [termination, setTermination] = useState<TerminationKind | null>(null);
  // 사용자가 "다시 연결"을 누르면 ++ — useEffect 재실행으로 새 소켓 생성.
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    if (!useAuthStore.getState().accessToken) return;

    reset();

    const sock = new GameSocket(
      gameId,
      () => useAuthStore.getState().accessToken,
      refreshTokens,
      {
        onMessage: (msg) => {
          if (msg.type === "state") {
            setGameState(msg.data);
          } else if (msg.type === "error") {
            setError(msg.data.message);
            toast.error(msg.data.message);
          }
        },
        onStatusChange: (s) => {
          setStatus(s);
          setConnected(s === "open");
        },
        onTerminated: (kind) => {
          if (kind !== "closed") setTermination(kind);
        },
      },
    );
    socketRef.current = sock;
    return () => {
      sock.close();
      socketRef.current = null;
    };
  }, [gameId, retryNonce, setConnected, setGameState, setError, reset]);

  const session: OfcSession = useMemo(
    () => ({
      gameState,
      myPlayerId: playerId,
      connected,
      confirm: (msg) => socketRef.current?.send(msg),
      resultClose: () => commitPendingState(),
      newRoom: () => navigate("/"),
    }),
    [gameState, playerId, connected, commitPendingState, navigate],
  );

  if (!gameId || !playerId) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pb-12"
        style={{ color: "var(--text-tertiary)" }}
      >
        잘못된 게임 링크입니다.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col gap-3 pb-12">
      <PageHeader
        back={{ label: "← 로비", to: "/" }}
        title={
          gameState ? (
            <div className="flex items-center gap-2">
              {gameState.is_game_over ? (
                <Badge>GAME OVER</Badge>
              ) : (
                <>
                  {gameState.is_bonus_round && (
                    <Badge tone="accent">★ FantasyLand</Badge>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--fs-body-sm)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    R {gameState.round_number}
                    <span style={{ color: "var(--text-tertiary)" }}>
                      /{gameState.max_rounds}
                    </span>
                  </span>
                </>
              )}
              <span style={{ color: "var(--text-tertiary)" }}>·</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-caption)",
                  color: "var(--text-tertiary)",
                }}
              >
                {gameId}
              </span>
            </div>
          ) : null
        }
        rightActions={
          <>
            <ConnectionBadge status={status} />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRulesOpen(true)}
              title="룰 보기"
            >
              룰
            </Button>
          </>
        }
      />

      <OfcTable session={session} />

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {termination && (
        <TerminationModal
          kind={termination}
          onRetry={() => {
            setTermination(null);
            setRetryNonce((n) => n + 1);
          }}
          onLobby={() => navigate("/")}
          onLogin={() => navigate("/login")}
        />
      )}
    </div>
  );
}

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  if (status === "open") {
    return (
      <Badge tone="success" dot>
        연결됨
      </Badge>
    );
  }
  if (status === "reconnecting") {
    return (
      <Badge tone="warning" dot>
        재연결 중...
      </Badge>
    );
  }
  if (status === "connecting") {
    return <Badge dot>연결 중...</Badge>;
  }
  return (
    <Badge tone="danger" dot>
      연결 끊김
    </Badge>
  );
}

interface ModalProps {
  kind: TerminationKind;
  onRetry: () => void;
  onLobby: () => void;
  onLogin: () => void;
}

function TerminationModal({ kind, onRetry, onLobby, onLogin }: ModalProps) {
  const config = TERMINATION_CONFIG[kind];
  if (!config) return null;
  return (
    <Modal
      open
      onClose={() => {}}
      title={config.title}
      actions={
        <>
          {config.lobby && (
            <Button type="button" variant="secondary" onClick={onLobby}>
              로비로
            </Button>
          )}
          {config.retry && (
            <Button type="button" variant="primary" onClick={onRetry}>
              다시 연결
            </Button>
          )}
          {config.login && (
            <Button type="button" variant="primary" onClick={onLogin}>
              다시 로그인
            </Button>
          )}
        </>
      }
    >
      {config.body}
    </Modal>
  );
}

interface TerminationConfig {
  title: string;
  body: string;
  retry: boolean;
  lobby: boolean;
  login: boolean;
}

const TERMINATION_CONFIG: Partial<Record<TerminationKind, TerminationConfig>> = {
  replaced: {
    title: "다른 곳에서 접속되었습니다",
    body: "다른 브라우저 또는 기기에서 이 게임에 접속해 현재 연결이 끊겼습니다.",
    retry: true,
    lobby: true,
    login: false,
  },
  auth_failed: {
    title: "세션이 만료되었습니다",
    body: "보안을 위해 다시 로그인해 주세요.",
    retry: false,
    lobby: false,
    login: true,
  },
  forbidden: {
    title: "참가할 수 없는 게임입니다",
    body: "이 게임의 참가자가 아닙니다.",
    retry: false,
    lobby: true,
    login: false,
  },
  not_found: {
    title: "게임을 찾을 수 없습니다",
    body: "게임이 종료되었거나 만료되었습니다.",
    retry: false,
    lobby: true,
    login: false,
  },
  gave_up: {
    title: "연결에 실패했습니다",
    body: "네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
    retry: true,
    lobby: true,
    login: false,
  },
};
