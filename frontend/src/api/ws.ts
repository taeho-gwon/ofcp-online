import type { WsClientMsg, WsServerMsg } from "./types";

export type ConnectionStatus =
  | "connecting"
  | "open"
  | "reconnecting"
  | "terminated";

export type TerminationKind =
  | "replaced" // 다른 곳에서 접속해 서버가 이전 연결을 끊음
  | "auth_failed" // 토큰 만료 + refresh 실패 등 인증 불가
  | "forbidden" // 4403: 게임 참가자가 아님
  | "not_found" // 4404: 게임 없음(TTL 만료 포함)
  | "gave_up" // 재연결 한도 초과
  | "closed"; // 외부에서 close() 호출

export interface GameSocketHandlers {
  onMessage: (msg: WsServerMsg) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onTerminated?: (kind: TerminationKind) => void;
}

// 백오프(ms). 끝에 도달하면 gave_up. 총 ~2분 반 + 즉시 0번.
const BACKOFFS_MS = [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000];
const REPLACED_REASON = "replaced by new connection";

export class GameSocket {
  private gameId: string;
  private getToken: () => string | null;
  private refresh: () => Promise<boolean>;
  private handlers: GameSocketHandlers;

  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "connecting";
  private attempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(
    gameId: string,
    getToken: () => string | null,
    refresh: () => Promise<boolean>,
    handlers: GameSocketHandlers,
  ) {
    this.gameId = gameId;
    this.getToken = getToken;
    this.refresh = refresh;
    this.handlers = handlers;
    this.openSocket();
  }

  send(msg: WsClientMsg): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open, dropping message", msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearRetryTimer();
    this.ws?.close();
    this.setStatus("terminated");
    this.handlers.onTerminated?.("closed");
  }

  private setStatus(s: ConnectionStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.handlers.onStatusChange?.(s);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private terminate(kind: TerminationKind): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearRetryTimer();
    this.setStatus("terminated");
    this.handlers.onTerminated?.(kind);
  }

  private openSocket(): void {
    if (this.disposed) return;
    const token = this.getToken();
    if (!token) {
      this.terminate("auth_failed");
      return;
    }
    this.setStatus(this.attempt === 0 ? "connecting" : "reconnecting");
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/games/${encodeURIComponent(
      this.gameId,
    )}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      if (this.disposed) return;
      this.attempt = 0;
      this.setStatus("open");
    };
    ws.onmessage = (ev) => {
      if (this.disposed) return;
      try {
        const msg = JSON.parse(ev.data) as WsServerMsg;
        this.handlers.onMessage(msg);
      } catch (e) {
        console.error("WS parse error", e, ev.data);
      }
    };
    ws.onclose = (ev) => {
      void this.handleClose(ev.code, ev.reason);
    };
  }

  private async handleClose(code: number, reason: string): Promise<void> {
    if (this.disposed) return;
    this.ws = null;

    // 다른 곳에서 접속 → 사용자에게 안내해야 함. 자동 재연결 X.
    if (code === 1000 && reason === REPLACED_REASON) {
      this.terminate("replaced");
      return;
    }
    // 토큰 만료/무효 → refresh 시도 후 즉시 재연결.
    if (code === 4401) {
      const ok = await this.refresh();
      if (this.disposed) return;
      if (ok) {
        this.attempt = 0;
        this.openSocket();
      } else {
        this.terminate("auth_failed");
      }
      return;
    }
    // 회복 불가 — 안내만 하고 끝.
    if (code === 4403) {
      this.terminate("forbidden");
      return;
    }
    if (code === 4404) {
      this.terminate("not_found");
      return;
    }

    // 그 외(네트워크, 서버 재시작 등): 백오프 재시도.
    if (this.attempt >= BACKOFFS_MS.length) {
      this.terminate("gave_up");
      return;
    }
    const delay = BACKOFFS_MS[this.attempt];
    this.attempt += 1;
    this.setStatus("reconnecting");
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.openSocket();
    }, delay);
  }
}
