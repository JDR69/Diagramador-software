"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DiagramCanvas } from "@/components/diagram/diagram-canvas"
import { AIChat } from "@/components/ai/ai-chat"
import { ExportPanel } from "@/components/export/export-panel"
import { CollaborationPanel } from "@/components/colaborativo/colaborativo-panel"
import { CursorOverlay } from "@/components/colaborativo/cursor"
import { useCollaboration } from "@/hooks/use-colaborativo"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

export default function DiagramPage() {
  const params = useParams();
  const diagramId = typeof params.diagramId === "string" ? params.diagramId : Array.isArray(params.diagramId) ? params.diagramId[0] : ""
  const router = useRouter();
  const [classes, setClasses] = useState<ClassData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [userId] = useState(() => `user-${Math.random().toString(36).substring(2, 15)}`)
  const [userName] = useState(() => `Usuario ${Math.floor(Math.random() * 1000)}`)
  const [notFound, setNotFound] = useState(false)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/app/diagrams"

  // Cargar diagrama desde el backend al montar
  useEffect(() => {
    async function fetchDiagram() {
      try {
        const res = await fetch(`${BACKEND_URL}/diagrams/${diagramId}/`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (!res.ok) return
        const data = await res.json()
        setClasses(
          (data.classes || []).map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            attributes: (cls.attributes || []).map((a: any) => a.name),
            position: cls.position || { x: 0, y: 0 },
          }))
        )
        setRelationships(
          (data.relationships || []).map((rel: any) => ({
            id: rel.id,
            from: rel.from_class,
            to: rel.to_class,
            type: rel.relationship_type,
            cardinality: rel.cardinality,
            name: rel.name || ""
          }))
        )
      } catch (e) {
        console.error("Error cargando diagrama:", e)
      }
    }
    if (diagramId) fetchDiagram()
  }, [diagramId])

  const { collaborators, isConnected, broadcastClassUpdate, broadcastRelationshipUpdate, broadcastCursorMove } =
    useCollaboration({
      diagramId,
      userId,
      userName,
      onClassesChange: setClasses,
      onRelationshipsChange: setRelationships,
    })

  // Guardar automáticamente en el backend cuando cambian clases o relaciones (siempre, aunque estén vacíos)
  useEffect(() => {
    if (!diagramId) return
    // Solo enviar clases vacías si el usuario realmente eliminó todas
    const shouldSendEmptyClasses = classes.length === 0 && relationships.length > 0;
    if (classes.length === 0 && !shouldSendEmptyClasses) return;
    const save = async () => {
      try {
        await fetch(`${BACKEND_URL}/diagrams/${diagramId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classes: classes.map(cls => ({
              id: cls.id,
              name: cls.name,
              attributes: cls.attributes,
              position: cls.position,
            })),
            relationships: relationships.map(rel => ({
              id: rel.id,
              from: rel.from,
              to: rel.to,
              type: rel.type,
              cardinality: rel.cardinality,
              name: rel.name,
            })),
          }),
        })
      } catch (e) {
        console.error("Error guardando diagrama:", e)
      }
    }
    save()
  }, [diagramId, classes, relationships])

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
    if (!action || !action.type) return;
    if (action.type === "add_class" && action.data?.name) {
      // Evitar duplicados
      if (!classes.some(cls => cls.name === action.data.name)) {
        setClasses(prev => [
          ...prev,
          {
            id: `class-${Date.now()}`,
            name: action.data.name,
            attributes: [],
            position: { x: 100 + prev.length * 50, y: 100 + prev.length * 50 },
          },
        ])
      }
    }
    if (action.type === "add_relationship" && action.data?.from && action.data?.to) {
      const fromClass = classes.find(cls => cls.name === action.data.from)
      const toClass = classes.find(cls => cls.name === action.data.to)
      if (fromClass && toClass) {
        setRelationships(prev => [
          ...prev,
          {
            id: `rel-${Date.now()}`,
            from: fromClass.id,
            to: toClass.id,
            type: action.data.type || "association",
            cardinality: { from: "1", to: "1" },
            name: "relacion",
          },
        ])
      }
    }
    if (action.type === "add_attribute" && action.data?.className && action.data?.attribute) {
      setClasses(prev => prev.map(cls =>
        cls.name === action.data.className && !cls.attributes.includes(action.data.attribute)
          ? { ...cls, attributes: [...cls.attributes, action.data.attribute] }
          : cls
      ))
    }
  }

  if (notFound) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold mb-4">Diagrama no encontrado</h1>
        <p className="mb-4">El diagrama solicitado no existe o fue eliminado.</p>
        <Button onClick={() => router.push("/")}>Volver al inicio</Button>
      </div>
    )
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
