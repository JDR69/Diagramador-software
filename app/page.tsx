"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DiagramCanvas } from "@/components/diagram/diagram-canvas"
import { AIChat } from "@/components/ai/ai-chat"
import { ExportPanel } from "@/components/export/export-panel"
import { CollaborationPanel } from "@/components/collaboration/collaboration-panel"
import { CursorOverlay } from "@/components/collaboration/cursor-overlay"
import { FileText, Plus, Users } from "lucide-react"
import { useCollaboration } from "@/hooks/use-collaboration"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"


export default function HomePage() {
  // --- Historial de diagramas en localStorage ---
  const DIAGRAM_HISTORY_KEY = "diagram_history"
  function saveDiagramToHistory(id: string) {
    if (typeof window === "undefined") return
    const history = JSON.parse(localStorage.getItem(DIAGRAM_HISTORY_KEY) || "[]")
    if (!history.includes(id)) {
      history.unshift(id)
      localStorage.setItem(DIAGRAM_HISTORY_KEY, JSON.stringify(history.slice(0, 10)))
    }
  }
  function getDiagramHistory(): string[] {
    if (typeof window === "undefined") return []
    return JSON.parse(localStorage.getItem(DIAGRAM_HISTORY_KEY) || "[]")
  }

  const router = useRouter()
  const [currentView, setCurrentView] = useState<"home" | "diagram">("home")
  const [diagramId, setDiagramId] = useState<string | null>(null)
  const [classes, setClasses] = useState<ClassData[]>([])
  const [relationships, setRelationships] = useState<RelationshipData[]>([])
  const [history, setHistory] = useState<string[]>([])

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

  useEffect(() => {
    setHistory(getDiagramHistory())
  }, [])

  const handleNewDiagram = () => {
    const newId = Math.random().toString(36).substring(2, 15)
    setDiagramId(newId)
    setClasses([])
    setRelationships([])
    saveDiagramToHistory(newId)
    setHistory(getDiagramHistory())
    router.push(`/diagram/${newId}`)
  }

  const handleContinueDiagram = (id?: string) => {
  // Si se pasa un id, redirige a ese, si no, usa el último o crea uno nuevo
    const targetId = id || history[0] || Math.random().toString(36).substring(2, 15)
    setDiagramId(targetId)
    saveDiagramToHistory(targetId)
    setHistory(getDiagramHistory())
    router.push(`/diagram/${targetId}`)
  }

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
      if (currentView === "diagram") {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        broadcastCursorMove(x, y)
      }
    },
    [currentView, broadcastCursorMove],
  )

  const handleAIAction = (action: any) => {
    console.log("[v0] Processing AI action:", action)

    try {
      switch (action.type) {
        case "CREATE_CLASS":
          const newClass: ClassData = {
            id: `class-${Date.now()}`,
            name: action.data.name,
            attributes: action.data.attributes || [],
            position: action.data.position || { x: 100 + classes.length * 50, y: 100 + classes.length * 50 },
          }
          console.log("[v0] Creating new class:", newClass)
          handleClassesChange([...classes, newClass])
          break

        case "CREATE_RELATIONSHIP":
          // Buscar o crear clases para la relación
          let fromClass = classes.find((c) => c.name.toLowerCase() === action.data.from.toLowerCase())
          let toClass = classes.find((c) => c.name.toLowerCase() === action.data.to.toLowerCase())

          const newClasses = [...classes]

          if (!fromClass) {
            fromClass = {
              id: `class-${Date.now()}-from`,
              name: action.data.from,
              attributes: [],
              position: { x: 100, y: 100 },
            }
            newClasses.push(fromClass)
            console.log("[v0] Created missing from class:", fromClass)
          }

          if (!toClass) {
            toClass = {
              id: `class-${Date.now()}-to`,
              name: action.data.to,
              attributes: [],
              position: { x: 300, y: 100 },
            }
            newClasses.push(toClass)
            console.log("[v0] Created missing to class:", toClass)
          }

          if (newClasses.length > classes.length) {
            handleClassesChange(newClasses)
          }

          const newRelationship: RelationshipData = {
            id: `rel-${Date.now()}`,
            from: fromClass.id,
            to: toClass.id,
            type: action.data.type || "association",
            cardinality: action.data.cardinality || { from: "1", to: "1" },
            name: action.data.name || "relacion",
          }
          console.log("[v0] Creating new relationship:", newRelationship)
          handleRelationshipsChange([...relationships, newRelationship])
          break

        case "ADD_ATTRIBUTE":
          const updatedClasses = classes.map((cls) => {
            if (cls.name.toLowerCase() === action.data.className.toLowerCase()) {
              return {
                ...cls,
                attributes: [...cls.attributes, action.data.attribute],
              }
            }
            return cls
          })
          console.log("[v0] Adding attribute to class")
          handleClassesChange(updatedClasses)
          break

        case "CREATE_FULL_DIAGRAM":
          const diagramClasses = action.data.classes.map((cls: any, index: number) => ({
            id: `class-${Date.now()}-${index}`,
            name: cls.name,
            attributes: cls.attributes || [],
            position: cls.position || { x: 100 + index * 200, y: 100 },
          }))

          console.log("[v0] Creating full diagram with classes:", diagramClasses)
          handleClassesChange(diagramClasses)

          const diagramRelationships = action.data.relationships.map((rel: any, index: number) => {
            const fromClass = diagramClasses.find((c: ClassData) => c.name === rel.from)
            const toClass = diagramClasses.find((c: ClassData) => c.name === rel.to)

            return {
              id: `rel-${Date.now()}-${index}`,
              from: fromClass?.id || "",
              to: toClass?.id || "",
              type: rel.type || "association",
              cardinality: rel.cardinality || { from: "1", to: "1" },
              name: rel.name || "relacion",
            }
          })

          console.log("[v0] Creating relationships:", diagramRelationships)
          handleRelationshipsChange(diagramRelationships)
          break

        default:
          console.log("[v0] Unknown AI action type:", action.type)
      }
    } catch (error) {
      console.error("[v0] Error processing AI action:", error)
    }
  }

  // Renderizar inicio con historial
  if (currentView === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 text-balance">
              Diagrama de Clases IA
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-pretty">
              Crea diagramas de clase colaborativos con la ayuda de inteligencia artificial
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleNewDiagram}>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">Nuevo Diagrama</CardTitle>
                <CardDescription>Comienza un nuevo diagrama de clases desde cero</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  Crear Diagrama
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">Continuar Diagrama</CardTitle>
                <CardDescription>Accede a tus diagramas guardados anteriormente</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent mb-2" variant="outline" size="lg" onClick={() => handleContinueDiagram()}>
                  Ver Último Diagrama
                </Button>
                {history.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Historial reciente:</div>
                    <ul className="space-y-1">
                      {history.map((id) => (
                        <li key={id}>
                          <Button variant="ghost" className="w-full justify-start text-xs" onClick={() => handleContinueDiagram(id)}>
                            {id}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-16 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
              <Users className="w-5 h-5" />
              <span>Colaboración en tiempo real • IA integrada • Exportación múltiple</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900" onMouseMove={handleMouseMove}>
  {/* Encabezado */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setCurrentView("home")}> 
              ← Inicio
            </Button>
            <h1 className="text-lg font-semibold">Diagrama de Clases</h1>
            {diagramId && <span className="text-sm text-gray-500 dark:text-gray-400">ID: {diagramId}</span>}
          </div>
          <div className="flex items-center gap-2">
            <CollaborationPanel diagramId={diagramId} collaborators={collaborators} isConnected={isConnected} />
            <ExportPanel classes={classes} relationships={relationships} />
          </div>
        </div>
      </header>

  {/* Contenido Principal */}
      <div className="flex-1 flex relative">
  {/* Área del Lienzo */}
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

  {/* Panel de Chat IA */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <AIChat diagramId={diagramId} onAIAction={handleAIAction} />
        </div>
      </div>
    </div>
  )
}
