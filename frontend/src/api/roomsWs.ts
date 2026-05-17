import type { RoomWsClientMsg, RoomWsServerMsg } from "./authTypes";

export interface RoomSocketHandlers {
  onMessage: (msg: RoomWsServerMsg) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class RoomSocket {
  private ws: WebSocket;
  private disposed = false;

  constructor(code: string, token: string, handlers: RoomSocketHandlers) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/rooms/${encodeURIComponent(
      code,
    )}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      // StrictMode가 CONNECTING 중에 close()를 호출한 경우, 여기서 정리.
      if (this.disposed) {
        try {
          this.ws.close();
        } catch {
          // ignore
        }
        return;
      }
      handlers.onOpen?.();
    };
    this.ws.onclose = (ev) => {
      console.log("Room ws closed", {
        code: ev.code,
        reason: ev.reason,
        wasClean: ev.wasClean,
      });
      handlers.onClose?.();
    };
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as RoomWsServerMsg;
        handlers.onMessage(msg);
      } catch (e) {
        console.error("Room WS parse error", e, ev.data);
      }
    };
  }

  send(msg: RoomWsClientMsg): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn("Room WS not open, dropping message", msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.disposed = true;
    // CONNECTING 단계에서 close()를 호출하면 브라우저가
    // "WebSocket is closed before the connection is established" 경고를 띄움.
    // 그래서 onopen에서 disposed 체크 후 닫도록 위임.
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}
