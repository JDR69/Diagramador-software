"use client"

import React from "react"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ClassNode } from "./class-node"
import { RelationshipLine } from "./relationship-line"
import { CanvasToolbar } from "./canvas-toolbar"
import { Plus } from "lucide-react"

interface DiagramCanvasProps {
  diagramId: string | null
  classes: ClassData[]
  relationships: RelationshipData[]
  onClassesChange: (classes: ClassData[]) => void
  onRelationshipsChange: (relationships: RelationshipData[]) => void
}

export interface ClassData {
  id: string
  name: string
  attributes: string[]
  position: { x: number; y: number }
}

export interface RelationshipData {
  id: string
  from: string
  to: string
  type: "association" | "inheritance" | "composition" | "aggregation"
  cardinality?: { from: string; to: string }
  name?: string
}

export function DiagramCanvas({
  diagramId,
  classes,
  relationships,
  onClassesChange,
  onRelationshipsChange,
}: DiagramCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedClass, setSelectedClass] = React.useState<string | null>(null)
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [connectingFrom, setConnectingFrom] = React.useState<string | null>(null)

  const handleAddClass = () => {
    const newClass: ClassData = {
      id: `class-${Date.now()}`,
      name: "NuevaClase",
      attributes: [],
      position: { x: 100 + classes.length * 50, y: 100 + classes.length * 50 },
    }
    onClassesChange([...classes, newClass])
  }

  const handleAddSuggestedClass = (className: string) => {
    const newClass: ClassData = {
      id: `class-${Date.now()}`,
      name: className,
      attributes: [],
      position: {
        x: 150 + classes.length * 60,
        y: 150 + classes.length * 60,
      },
    }
    onClassesChange([...classes, newClass])
    console.log("[v0] Added suggested class:", className)
  }

  const handleUpdateClass = (id: string, updates: Partial<ClassData>) => {
    onClassesChange(classes.map((cls) => (cls.id === id ? { ...cls, ...updates } : cls)))
  }

  const handleDeleteClass = (id: string) => {
    onClassesChange(classes.filter((cls) => cls.id !== id))
    onRelationshipsChange(relationships.filter((rel) => rel.from !== id && rel.to !== id))
  }

  const handleStartConnection = (classId: string) => {
    console.log("[v0] Starting connection from class:", classId)
    setIsConnecting(true)
    setConnectingFrom(classId)
    setSelectedClass(classId)
  }

  const handleCompleteConnection = (toClassId: string) => {
    console.log("[v0] Completing connection to class:", toClassId, "from:", connectingFrom)
    if (connectingFrom && connectingFrom !== toClassId) {
      const newRelationship: RelationshipData = {
        id: `rel-${Date.now()}`,
        from: connectingFrom,
        to: toClassId,
        type: "association",
        cardinality: { from: "1", to: "1" },
        name: "relacion",
      }
      onRelationshipsChange([...relationships, newRelationship])
      console.log("[v0] Created new relationship:", newRelationship)
    }
    setIsConnecting(false)
    setConnectingFrom(null)
  }

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedClass(null)
      if (isConnecting) {
        console.log("[v0] Cancelling connection mode")
        setIsConnecting(false)
        setConnectingFrom(null)
      }
    }
  }

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isConnecting) {
        console.log("[v0] Escape pressed, cancelling connection")
        setIsConnecting(false)
        setConnectingFrom(null)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isConnecting])

  return (
    <div className="h-full flex flex-col">
      <CanvasToolbar
        onAddClass={handleAddClass}
        isConnecting={isConnecting}
        onToggleConnection={() => setIsConnecting(!isConnecting)}
      />

      <div
        ref={canvasRef}
        data-canvas="true"
        className="flex-1 relative overflow-auto bg-white dark:bg-gray-900 cursor-crosshair diagram-canvas"
        onClick={handleCanvasClick}
      >
  {/* Fondo de cuadrícula */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

  {/* Clases */}
        {classes.map((classData) => (
          <ClassNode
            key={classData.id}
            data={classData}
            isSelected={selectedClass === classData.id}
            isConnecting={isConnecting}
            onSelect={() => setSelectedClass(classData.id)}
            onUpdate={(updates) => handleUpdateClass(classData.id, updates)}
            onDelete={() => handleDeleteClass(classData.id)}
            onStartConnection={() => handleStartConnection(classData.id)}
            onCompleteConnection={() => handleCompleteConnection(classData.id)}
            onRequestSuggestions={handleAddSuggestedClass}
          />
        ))}

  {/* Relaciones */}
        {relationships.map((relationship) => {
          const fromClass = classes.find((c) => c.id === relationship.from)
          const toClass = classes.find((c) => c.id === relationship.to)

          if (!fromClass || !toClass) return null

          return (
            <RelationshipLine
              key={relationship.id}
              data={relationship}
              fromPosition={fromClass.position}
              toPosition={toClass.position}
              onUpdate={(updates) => {
                onRelationshipsChange(
                  relationships.map((rel) => (rel.id === relationship.id ? { ...rel, ...updates } : rel)),
                )
              }}
              onDelete={() => {
                onRelationshipsChange(relationships.filter((rel) => rel.id !== relationship.id))
              }}
            />
          )
        })}

  {/* Ayuda de conexión */}
        {isConnecting && connectingFrom && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-10">
            <p className="text-sm">Haz clic en otra clase para crear la relación o presiona ESC para cancelar</p>
          </div>
        )}

  {/* Estado vacío */}
        {classes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Card className="p-8 text-center">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Comienza tu diagrama</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Agrega tu primera clase o usa el chat IA para generar el diagrama
              </p>
              <Button onClick={handleAddClass}>Agregar Clase</Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
