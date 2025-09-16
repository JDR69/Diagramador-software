"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DiagramCanvas } from "@/components/diagram/diagram-canvas"
import { AIChat } from "@/components/ai/ai-chat"
import { ExportPanel } from "@/components/export/export-panel"
import { CollaborationPanel } from "@/components/collaboration/collaboration-panel"
import { CursorOverlay } from "@/components/collaboration/cursor-overlay"
import { useCollaboration } from "@/hooks/use-collaboration"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

export default function DiagramPage({ params }: { params: { diagramId: string } }) {
  const { diagramId } = params
  const [classes, setClasses] = useState<ClassData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [userId] = useState(() => `user-${Math.random().toString(36).substring(2, 15)}`)
  const [userName] = useState(() => `Usuario ${Math.floor(Math.random() * 1000)}`)

  const { collaborators, isConnected, broadcastClassUpdate, broadcastRelationshipUpdate, broadcastCursorMove } =
    useCollaboration({
      diagramId,
      userId,
      userName,
      onClassesChange: setClasses,
      onRelationshipsChange: setRelationships,
    })

  const handleClassesChange = useCallback(
    (newClasses: ClassData[]) => {
      setClasses(newClasses)
      broadcastClassUpdate(newClasses)
    },
    [broadcastClassUpdate],
  )

  const handleRelationshipsChange = useCallback(
    (newRelationships: RelationshipData[]) => {
      setRelationships(newRelationships)
      broadcastRelationshipUpdate(newRelationships)
    },
    [broadcastRelationshipUpdate],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      broadcastCursorMove(x, y)
    },
    [broadcastCursorMove],
  )

  const handleAIAction = (action: any) => {
  // Puedes copiar la lógica de IA de la página principal si lo deseas
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900" onMouseMove={handleMouseMove}>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Diagrama de Clases</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">ID: {diagramId}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <CollaborationPanel diagramId={diagramId} collaborators={collaborators} isConnected={isConnected} />
          <ExportPanel classes={classes} relationships={relationships} />
        </div>
      </header>
      <div className="flex-1 flex relative">
        <div className="flex-1 relative">
          <DiagramCanvas
            diagramId={diagramId}
            classes={classes}
            relationships={relationships}
            onClassesChange={handleClassesChange}
            onRelationshipsChange={handleRelationshipsChange}
          />
          <CursorOverlay collaborators={collaborators} />
        </div>
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <AIChat diagramId={diagramId} onAIAction={handleAIAction} />
        </div>
      </div>
    </div>
  )
}
