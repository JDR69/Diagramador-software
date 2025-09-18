"use client"

import type React from "react"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Editor from "@/components/editor"
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
  const [history, setHistory] = useState<string[]>([])

  const [userId] = useState(() => `user-${Math.random().toString(36).substring(2, 15)}`)
  const [userName] = useState(() => `Usuario ${Math.floor(Math.random() * 1000)}`)



  useEffect(() => {
    setHistory(getDiagramHistory())
  }, [])


  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/app/diagrams"
  const handleNewDiagram = async () => {
    // Crear diagrama en backend
    try {
      const res = await fetch(`${BACKEND_URL}/diagrams/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Nuevo Diagrama", description: "", is_public: false, classes: [], relationships: [] }),
      })
      if (!res.ok) throw new Error("No se pudo crear el diagrama")
      const data = await res.json()
      const newId = data.id
      setDiagramId(newId)
  // El estado ahora lo maneja el Editor
      saveDiagramToHistory(newId)
      setHistory(getDiagramHistory())
      router.push(`/diagram/${newId}`)
    } catch (e) {
      alert("Error creando diagrama: " + e)
    }
  }


  const handleContinueDiagram = async (id?: string) => {
    // Si se pasa un id, redirige a ese, si no, usa el último o crea uno nuevo
    let targetId = id || history[0]
    if (!targetId) {
      await handleNewDiagram()
      return
    }
    // Verificar si existe en backend
    try {
      const res = await fetch(`${BACKEND_URL}/diagrams/${targetId}/`)
      if (res.status === 404) {
        // Si no existe, crearlo
        await handleNewDiagram()
        return
      }
      setDiagramId(targetId)
      saveDiagramToHistory(targetId)
      setHistory(getDiagramHistory())
      router.push(`/diagram/${targetId}`)
    } catch (e) {
      alert("Error accediendo al diagrama: " + e)
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

  // Editor unificado para diagramas
  return <Editor diagramId={diagramId} onBack={() => setCurrentView("home")}/>;
}
