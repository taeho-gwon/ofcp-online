import type { WsClientMsg, WsServerMsg } from "./types";

export interface GameSocketHandlers {
  onMessage: (msg: WsServerMsg) => void;
  onClose?: () => void;
  onOpen?: () => void;
}

export class GameSocket {
  private ws: WebSocket;

  constructor(gameId: string, playerId: string, handlers: GameSocketHandlers) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws/games/${encodeURIComponent(
      gameId,
    )}?player_id=${encodeURIComponent(playerId)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => handlers.onOpen?.();
    this.ws.onclose = () => handlers.onClose?.();
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as WsServerMsg;
        handlers.onMessage(msg);
      } catch (e) {
        console.error("WS parse error", e, ev.data);
      }
    };
  }

  send(msg: WsClientMsg): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open, dropping message", msg);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  close(): void {
    this.ws.close();
  }
}
