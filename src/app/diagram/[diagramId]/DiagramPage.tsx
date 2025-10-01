"use client"

import { useState, useCallback, useEffect } from "react"
import { BACKEND_API_BASE } from "@/lib/config"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DiagramCanvas } from "@/components/diagram/diagram-canvas"
import { AIChat } from "@/components/ai/ai-chat"
import { ExportPanel } from "@/components/export/export-panel"
import { CollaborationPanel } from "@/components/colaborativo/colaborativo-panel"
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
  const [isChatOpen, setIsChatOpen] = useState(true)
  const BACKEND_URL = BACKEND_API_BASE

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

  // Mantenemos compatibilidad si se envía acción individual
  const handleAIAction = (action: any) => handleAIActions([action])

  // Nuevo: procesamiento batch para que relaciones vean las clases recién creadas
  const handleAIActions = (actions: any[]) => {
    if (!actions || actions.length === 0) return
    let newClasses = [...classes]
    const nameToId = new Map(newClasses.map(c => [c.name, c.id]))

    // 1. Crear clases primero
    actions.filter(a => a.type === 'add_class' && a.data?.name).forEach(a => {
      const name = a.data.name
      if (!nameToId.has(name)) {
        const cls = {
          id: `class-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          name,
          attributes: [] as string[],
          position: { x: 100 + newClasses.length * 60, y: 100 + newClasses.length * 60 },
        }
        newClasses.push(cls)
        nameToId.set(name, cls.id)
      }
    })

    // 2. Agregar atributos
    const attributeActions = actions.filter(a => a.type === 'add_attribute' && a.data?.className && a.data?.attribute)
    if (attributeActions.length) {
      newClasses = newClasses.map(cls => {
        const adds = attributeActions
          .filter(a => a.data.className === cls.name && !cls.attributes.includes(a.data.attribute))
          .map(a => a.data.attribute)
        return adds.length ? { ...cls, attributes: [...cls.attributes, ...adds] } : cls
      })
    }

    // 3. Procesar relaciones
    let newRelationships = [...relationships]
    actions.filter(a => a.type === 'add_relationship' && a.data?.from && a.data?.to).forEach(a => {
      const fromId = nameToId.get(a.data.from)
      const toId = nameToId.get(a.data.to)
      if (!fromId || !toId) return
      const relType = a.data.type || 'association'
      const relName = a.data.name || 'relacion'
      const card = a.data.cardinality && a.data.cardinality.from && a.data.cardinality.to
        ? a.data.cardinality
        : { from: '1', to: '1' }
      const exists = newRelationships.some(r => r.from === fromId && r.to === toId && r.type === relType && (r.name || '') === relName)
      if (!exists) {
        newRelationships.push({
          id: `rel-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          from: fromId,
          to: toId,
            type: relType,
            cardinality: card,
            name: relName
        })
      }
    })

    // Commit final una sola vez
    handleClassesChange(newClasses)
    handleRelationshipsChange(newRelationships)
  }

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
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
            isChatOpen={isChatOpen}
            onToggleChat={toggleChat}
          />
        </div>
        {isChatOpen && (
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <AIChat diagramId={diagramId} onAIAction={handleAIAction} onAIActions={handleAIActions} />
          </div>
        )}
      </div>
    </div>
  )
}
