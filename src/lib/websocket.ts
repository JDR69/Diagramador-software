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
  private isSimulated = false; // fallback
  private handshakeTimer: any = null;
  private handshakeTimeoutMs = 4000;

  constructor(diagramId: string, userId: string) {
    this.diagramId = diagramId;
    this.userId = userId;

    // Permite desactivar WS reales desde variable de entorno (útil en planes sin soporte)
    if (process.env.NEXT_PUBLIC_DISABLE_REAL_WS === "true") {
      this.isSimulated = true;
      console.warn("[app] Real WebSocket disabled via NEXT_PUBLIC_DISABLE_REAL_WS");
    }
  }

  connect() {
    try {
      if (this.isSimulated) {
        console.log("[app] WebSocket running in simulation mode");
        setTimeout(() => this.emit("connected", {}), 50);
        return;
      }

      const wsUrl = collaborationWsUrl(this.diagramId);
      console.log("[app] Connecting WebSocket →", wsUrl);
      this.ws = new WebSocket(wsUrl);

      // Handshake timeout (si no abre, marcamos error y fallback)
      this.handshakeTimer = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.warn("[app] WebSocket handshake timeout – falling back to simulation");
          this.enableSimulationFallback();
        }
      }, this.handshakeTimeoutMs);

      this.ws.onopen = () => {
        clearTimeout(this.handshakeTimer);
        console.log("[app] WebSocket connected");
        this.reconnectAttempts = 0;
        this.emit("connected", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error("[app] Error parsing WebSocket message:", error, event.data);
        }
      };

      this.ws.onclose = (e) => {
        clearTimeout(this.handshakeTimer);
        const reason = CLOSE_REASONS[e.code] || "Unknown";
        console.warn(
          `[app] WebSocket closed code=${e.code} (${reason}) clean=${e.wasClean} attempts=${this.reconnectAttempts}`
        );
        this.emit("disconnected", { code: e.code, reason });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[app] WebSocket error:", error);
        this.emit("error", { error });
      };
    } catch (error) {
      console.error("[app] Error creating WebSocket:", error);
      this.enableSimulationFallback();
    }
  }

  private enableSimulationFallback() {
    if (!this.isSimulated) {
      console.warn("[app] Enabling simulation fallback for collaboration features");
      this.isSimulated = true;
      this.disconnect();
      this.connect();
    }
  }

  private attemptReconnect() {
    if (this.isSimulated) return; // no reconectar en modo simulado
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.baseReconnectDelay * this.reconnectAttempts;
      console.log(`[app] Reconnecting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.warn("[app] Max WebSocket reconnect attempts reached – switching to simulation");
      this.enableSimulationFallback();
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

    if (this.isSimulated) {
      console.log("[app] (simulated WS send)", message);
      return;
    }

    if (!this.ws) {
      console.warn("[app] Cannot send – WebSocket not initialized", message);
      return;
    }
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[app] Cannot send – readyState=", this.ws.readyState, message);
      return;
    }

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

  enableRealWebSocket() {
    this.isSimulated = false;
  }
}
