// Utilidades de WebSocket
export class CollaborationWebSocket {
  private ws: WebSocket | null = null
  private diagramId: string
  private userId: string
  private callbacks: Map<string, Function[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isSimulated = false // Usar WebSocket real por defecto

  constructor(diagramId: string, userId: string) {
    this.diagramId = diagramId
    this.userId = userId
  }

  connect() {
    try {
      // For demo purposes, simulate WebSocket connection
      if (this.isSimulated) {
        console.log("[app] WebSocket connection simulated (demo mode)")
        setTimeout(() => {
          this.emit("connected", {})
        }, 100)
        return
      }

      // Real WebSocket implementation for production

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
  // For development, use backend port 8010 (Daphne)
  const wsUrl = `${protocol}//localhost:8010/ws/collaboration/${this.diagramId}/?userId=${this.userId}`

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log("[app] WebSocket connected")
        this.reconnectAttempts = 0
        this.emit("connected", {})
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(data.type, data.payload)
        } catch (error) {
          console.error("[app] Error parsing WebSocket message:", error)
        }
      }

      this.ws.onclose = () => {
        console.log("[app] WebSocket disconnected")
        this.emit("disconnected", {})
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error("[app] WebSocket error:", error)
        this.emit("error", { error })
      }
    } catch (error) {
      console.error("[app] Error creating WebSocket:", error)
      // Fallback to simulation mode
      this.isSimulated = true
      this.connect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`[app] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect()
      }, this.reconnectDelay * this.reconnectAttempts)
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
    }

    if (this.isSimulated) {
      // In simulation mode, just log the message
      console.log("[app] WebSocket message (simulated):", message)
      return
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, [])
    }
    this.callbacks.get(event)!.push(callback)
  }

  off(event: string, callback: Function) {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const callbacks = this.callbacks.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  // Method to enable real WebSocket for production
  enableRealWebSocket() {
    this.isSimulated = false
  }
}
