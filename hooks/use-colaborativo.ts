"use client"

import { useEffect, useState, useCallback, useRef } from "react"

// Utilidad simple de throttle
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let lastCall = 0;
  let lastArgs: any;
  let timeout: any;
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    lastArgs = args;
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func.apply(this, lastArgs);
      }, limit - (now - lastCall));
    }
  } as T;
}
import { CollaborationWebSocket } from "@/app/lib/websocket"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  lastSeen: number
}

interface UseCollaborationProps {
  diagramId: string | null
  userId: string
  userName: string
  onClassesChange: (classes: ClassData[]) => void
  onRelationshipsChange: (relationships: RelationshipData[]) => void
}

export function useCollaboration({
  diagramId,
  userId,
  userName,
  onClassesChange,
  onRelationshipsChange,
}: UseCollaborationProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<CollaborationWebSocket | null>(null)
  const lastUpdateRef = useRef<number>(0)
  // Para handshake: mantener el último estado conocido
  const lastClassesRef = useRef<ClassData[]>([])
  const lastRelationshipsRef = useRef<RelationshipData[]>([])

  useEffect(() => {
    if (!diagramId) return

    const ws = new CollaborationWebSocket(diagramId, userId)
    wsRef.current = ws

  // Eventos de conexión

    ws.on("connected", () => {
      setIsConnected(true)
  // Anunciar presencia de usuario
      ws.send("user_joined", {
        name: userName,
        color: generateUserColor(userId),
      })
  // Solicitar estado inicial a otros clientes
      ws.send("request_initial_state", {})
    })
  // Handshake: responder a solicitudes de estado inicial
    ws.on("request_initial_state", (data: any) => {
  // Solo responder si tenemos un estado no vacío y el solicitante no somos nosotros
      if (data.userId !== userId && (lastClassesRef.current.length > 0 || lastRelationshipsRef.current.length > 0)) {
        ws.send("initial_state", {
          toUserId: data.userId,
          classes: lastClassesRef.current,
          relationships: lastRelationshipsRef.current,
        })
      }
    })

  // Recibir estado inicial de otro cliente
    ws.on("initial_state", (data: any) => {
  // Solo aceptar si este mensaje es para nosotros y tenemos un estado vacío
      if (data.toUserId === userId && lastClassesRef.current.length === 0 && lastRelationshipsRef.current.length === 0) {
        onClassesChange(data.classes || [])
        onRelationshipsChange(data.relationships || [])
        lastUpdateRef.current = Date.now()
      }
    })

    ws.on("disconnected", () => {
      setIsConnected(false)
    })

  // Eventos de colaboración
    ws.on("user_joined", (data: any) => {
      setCollaborators((prev) => {
        const existing = prev.find((c) => c.id === data.userId)
        if (existing) return prev

        return [
          ...prev,
          {
            id: data.userId,
            name: data.name,
            color: data.color,
            lastSeen: Date.now(),
          },
        ]
      })
    })

    ws.on("user_left", (data: any) => {
      setCollaborators((prev) => prev.filter((c) => c.id !== data.userId))
    })

    ws.on("cursor_move", (data: any) => {
  if (data.userId === userId) return // Ignorar propio cursor

      setCollaborators((prev) =>
        prev.map((c) => (c.id === data.userId ? { ...c, cursor: data.cursor, lastSeen: Date.now() } : c)),
      )
    })

  // Eventos de actualización de diagrama
    ws.on("class_updated", (data: any) => {
  if (data.userId === userId) return // Ignorar propias actualizaciones
  if (data.timestamp <= lastUpdateRef.current) return // Ignorar actualizaciones antiguas

      onClassesChange(data.classes)
      lastUpdateRef.current = data.timestamp
    })

    ws.on("relationship_updated", (data: any) => {
      if (data.userId === userId) return
      if (data.timestamp <= lastUpdateRef.current) return

      onRelationshipsChange(data.relationships)
      lastUpdateRef.current = data.timestamp
    })

    ws.connect()

    return () => {
      ws.disconnect()
    }
  }, [diagramId, userId, userName])

  const broadcastClassUpdate = useCallback(
    (classes: ClassData[]) => {
      lastClassesRef.current = classes
      if (wsRef.current && isConnected) {
        lastUpdateRef.current = Date.now()
        wsRef.current.send("class_update", { classes })
      }
    },
    [isConnected],
  )

  const broadcastRelationshipUpdate = useCallback(
    (relationships: RelationshipData[]) => {
      lastRelationshipsRef.current = relationships
      if (wsRef.current && isConnected) {
        lastUpdateRef.current = Date.now()
        wsRef.current.send("relationship_update", { relationships })
      }
    },
    [isConnected],
  )


  // Throttle: máximo 30 mensajes por segundo (cada 33ms)
  const throttledSendCursor = useRef(
    throttle((x: number, y: number) => {
      if (wsRef.current && isConnected) {
        wsRef.current.send("cursor_move", { cursor: { x, y } });
      }
    }, 33)
  );

  const broadcastCursorMove = useCallback((x: number, y: number) => {
    throttledSendCursor.current(x, y);
  }, [isConnected]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
  setCollaborators((prev) => prev.filter((c) => now - c.lastSeen < 30000)) // 30 segundos de espera
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return {
    collaborators,
    isConnected,
    broadcastClassUpdate,
    broadcastRelationshipUpdate,
    broadcastCursorMove,
  }
}

function generateUserColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff
  }

  return colors[Math.abs(hash) % colors.length]
}
