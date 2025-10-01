// Utilidades de WebSocket
import { collaborationWsUrl } from "@/lib/config";

// Helper para mapear códigos de cierre comunes (para debug)
const CLOSE_REASONS: Record<number, string> = {
  1000: "Normal closure",
  1001: "Going away",
  1002: "Protocol error",
  1003: "Unsupported data",
  1005: "No status received",
  1006: "Abnormal closure",
  1007: "Invalid frame payload data",
  1008: "Policy violation",
  1009: "Message too big",
  1010: "Mandatory extension missing",
  1011: "Internal server error",
  1012: "Service restart",
  1013: "Try again later",
  1015: "TLS handshake failure",
};

export class CollaborationWebSocket {
  private ws: WebSocket | null = null;
  private diagramId: string;
  private userId: string;
  private callbacks: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // ms
  private handshakeTimer: any = null;
  private handshakeTimeoutMs = 4000;

  constructor(diagramId: string, userId: string) {
    this.diagramId = diagramId;
    this.userId = userId;
  }

  connect() {
    try {
      const wsUrl = collaborationWsUrl(this.diagramId);
      this.ws = new WebSocket(wsUrl);

      // Handshake timeout
      this.handshakeTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close();
        }
      }, this.handshakeTimeoutMs);

      this.ws.onopen = () => {
        clearTimeout(this.handshakeTimer);
        this.reconnectAttempts = 0;
        this.emit("connected", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error("[WebSocket] Error parsing message:", error);
        }
      };

      this.ws.onclose = (e) => {
        clearTimeout(this.handshakeTimer);
        this.emit("disconnected", { code: e.code, reason: CLOSE_REASONS[e.code] || "Unknown" });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        this.emit("error", { error });
      };
    } catch (error) {
      console.error("[WebSocket] Error creating connection:", error);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.baseReconnectDelay * this.reconnectAttempts;
      setTimeout(() => this.connect(), delay);
    }
  }

  send(type: string, payload: any) {
    const message = {
      type,
      payload: {
        ...payload,
        userId: this.userId,
        diagramId: this.diagramId,
        timestamp: Date.now(),
      },
    };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(JSON.stringify(message));
  }

  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) this.callbacks.set(event, []);
    this.callbacks.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const list = this.callbacks.get(event);
    if (!list) return;
    const i = list.indexOf(callback);
    if (i > -1) list.splice(i, 1);
  }

  private emit(event: string, data: any) {
    const list = this.callbacks.get(event);
    if (list) list.forEach((cb) => cb(data));
  }

  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
