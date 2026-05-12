import type { RoomWsClientMsg, RoomWsServerMsg } from "./authTypes";

export interface RoomSocketHandlers {
  onMessage: (msg: RoomWsServerMsg) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export class RoomSocket {
  private ws: WebSocket;

  constructor(code: string, token: string, handlers: RoomSocketHandlers) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/rooms/${encodeURIComponent(
      code,
    )}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => handlers.onOpen?.();
    this.ws.onclose = () => handlers.onClose?.();
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
    this.ws.close();
  }
}
