"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Settings } from "lucide-react"
import type { RelationshipData } from "./diagram-canvas"

interface RelationshipLineProps {
  data: RelationshipData
  fromPosition: { x: number; y: number }
  toPosition: { x: number; y: number }
  onUpdate: (updates: Partial<RelationshipData>) => void
  onDelete: () => void
}

export function RelationshipLine({ data, fromPosition, toPosition, onUpdate, onDelete }: RelationshipLineProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [relationshipName, setRelationshipName] = useState(data.name || "")
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 })

  const classWidth = 384
  const classHeight = 160

  // Calcular los puntos centrales de cada clase
  const fromCenterX = fromPosition.x + classWidth / 2
  const fromCenterY = fromPosition.y + classHeight / 2
  const toCenterX = toPosition.x + classWidth / 2
  const toCenterY = toPosition.y + classHeight / 2

  // Calcular el vector de dirección
  const deltaX = toCenterX - fromCenterX
  const deltaY = toCenterY - fromCenterY
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  // Normalizar el vector de dirección
  const unitX = deltaX / distance
  const unitY = deltaY / distance

  // Calcular los puntos de conexión en los bordes de los rectángulos
  const getConnectionPoint = (centerX: number, centerY: number, dirX: number, dirY: number, isSource: boolean) => {
    const halfWidth = classWidth / 2
    const halfHeight = classHeight / 2

  // Calcular la intersección con los bordes del rectángulo
    let connectionX = centerX
    let connectionY = centerY

  // Cálculo mejorado de intersección de bordes
    const absUnitX = Math.abs(dirX)
    const absUnitY = Math.abs(dirY)

  // Usar un cálculo más preciso para la intersección de bordes
    if (absUnitX === 0) {
  // Línea puramente vertical
      connectionX = centerX
      connectionY = centerY + (dirY > 0 ? halfHeight : -halfHeight)
    } else if (absUnitY === 0) {
  // Línea puramente horizontal
      connectionX = centerX + (dirX > 0 ? halfWidth : -halfWidth)
      connectionY = centerY
    } else {
  // Línea diagonal - verificar con qué borde intersecta primero
      const slopeToRightEdge = halfWidth / absUnitX
      const slopeToTopEdge = halfHeight / absUnitY

      if (slopeToRightEdge < slopeToTopEdge) {
  // Intersecta con el borde izquierdo o derecho
        connectionX = centerX + (dirX > 0 ? halfWidth : -halfWidth)
        connectionY = centerY + (dirX > 0 ? halfWidth : -halfWidth) * (dirY / dirX)
      } else {
  // Intersecta con el borde superior o inferior
        connectionX = centerX + (dirY > 0 ? halfHeight : -halfHeight) * (dirX / dirY)
        connectionY = centerY + (dirY > 0 ? halfHeight : -halfHeight)
      }
    }

    return { x: connectionX, y: connectionY }
  }

  const fromConnection = getConnectionPoint(fromCenterX, fromCenterY, unitX, unitY, true)
  const toConnection = getConnectionPoint(toCenterX, toCenterY, -unitX, -unitY, false)

  const centerX = (fromConnection.x + toConnection.x) / 2
  const centerY = (fromConnection.y + toConnection.y) / 2

  const angle = Math.atan2(toConnection.y - fromConnection.y, toConnection.x - fromConnection.x) * (180 / Math.PI)

  const renderArrowMarker = (type: RelationshipData["type"]) => {
    const markerId = `arrow-${type}-${data.id}`

    switch (type) {
      case "association":
        return null
      case "inheritance":
        return (
          <marker
            id={markerId}
            markerWidth="16"
            markerHeight="16"
            refX="14"
            refY="8"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0,8 12,3 12,13" fill="white" stroke="#374151" strokeWidth="1.5" />
          </marker>
        )
      case "composition":
        return (
          <marker
            id={markerId}
            markerWidth="18"
            markerHeight="18"
            refX="16"
            refY="9"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0,9 6,4 12,9 6,14" fill="#374151" stroke="#374151" strokeWidth="1.5" />
          </marker>
        )
      case "aggregation":
        return (
          <marker
            id={markerId}
            markerWidth="18"
            markerHeight="18"
            refX="16"
            refY="9"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0,9 6,4 12,9 6,14" fill="white" stroke="#374151" strokeWidth="1.5" />
          </marker>
        )
      default:
        return (
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <polygon points="0,6 10,2 10,10" fill="#374151" />
          </marker>
        )
    }
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPosition({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }

  const handleContextMenuClose = () => {
    setShowContextMenu(false)
  }

  const getCardinalityPositions = () => {
  const offsetDistance = 25 // Distancia desde el punto de conexión
    const lineLength = Math.sqrt((toConnection.x - fromConnection.x) ** 2 + (toConnection.y - fromConnection.y) ** 2)
    const unitX = (toConnection.x - fromConnection.x) / lineLength
    const unitY = (toConnection.y - fromConnection.y) / lineLength

  // Desplazamiento perpendicular para mejor visibilidad
    const perpX = -unitY * 15
    const perpY = unitX * 15

    return {
      from: {
        x: fromConnection.x + unitX * offsetDistance + perpX,
        y: fromConnection.y + unitY * offsetDistance + perpY,
      },
      to: {
        x: toConnection.x - unitX * offsetDistance + perpX,
        y: toConnection.y - unitY * offsetDistance + perpY,
      },
    }
  }

  const cardinalityPositions = getCardinalityPositions()

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          width: "100%",
          height: "100%",
        }}
      >
        <defs>{renderArrowMarker(data.type)}</defs>

  {/* Línea principal de relación */}
        <line
          x1={fromConnection.x}
          y1={fromConnection.y}
          x2={toConnection.x}
          y2={toConnection.y}
          stroke="#4f46e5"
          className="pointer-events-auto cursor-pointer hover:stroke-blue-600 transition-all duration-200 drop-shadow-sm"
          strokeWidth="3"
          strokeDasharray={data.type === "aggregation" ? "8,4" : "none"}
          markerEnd={data.type !== "association" ? `url(#arrow-${data.type}-${data.id})` : undefined}
          onContextMenu={handleRightClick}
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
          }}
        />

        {data.cardinality?.from && (
          <g>
            <circle
              cx={cardinalityPositions.from.x}
              cy={cardinalityPositions.from.y}
              r="16"
              fill="white"
              stroke="#4f46e5"
              strokeWidth="2"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              }}
            />
            <text
              x={cardinalityPositions.from.x}
              y={cardinalityPositions.from.y + 1}
              className="text-indigo-700 dark:text-indigo-600 text-sm font-bold"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              style={{ fontSize: "13px", fontWeight: "600" }}
            >
              {data.cardinality.from}
            </text>
          </g>
        )}

        {data.cardinality?.to && (
          <g>
            <circle
              cx={cardinalityPositions.to.x}
              cy={cardinalityPositions.to.y}
              r="16"
              fill="white"
              stroke="#4f46e5"
              strokeWidth="2"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))",
              }}
            />
            <text
              x={cardinalityPositions.to.x}
              y={cardinalityPositions.to.y + 1}
              className="text-indigo-700 dark:text-indigo-600 text-sm font-bold"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="currentColor"
              style={{ fontSize: "13px", fontWeight: "600" }}
            >
              {data.cardinality.to}
            </text>
          </g>
        )}
      </svg>

  {/* Controles de relación */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: centerX - 50,
          top: centerY - 25,
          zIndex: 15,
        }}
      >
        {isEditing ? (
          <Card className="p-3 shadow-xl border-2 border-indigo-200 bg-white/95 backdrop-blur-sm">
            <CardContent className="p-0 space-y-2">
              <Input
                value={relationshipName}
                onChange={(e) => setRelationshipName(e.target.value)}
                onBlur={() => onUpdate({ name: relationshipName })}
                placeholder="Nombre de relación"
                className="h-6 text-xs"
              />

              <Select value={data.type} onValueChange={(value: RelationshipData["type"]) => onUpdate({ type: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="association">Asociación →</SelectItem>
                  <SelectItem value="inheritance">Herencia ▷</SelectItem>
                  <SelectItem value="composition">Composición ◆</SelectItem>
                  <SelectItem value="aggregation">Agregación ◇</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-1">
                <div className="text-xs text-gray-600 dark:text-gray-400">Cardinalidad:</div>
                <div className="flex gap-1 items-center">
                  <div className="text-xs text-gray-500">Origen:</div>
                  <Input
                    value={data.cardinality?.from || ""}
                    onChange={(e) =>
                      onUpdate({
                        cardinality: { ...data.cardinality, from: e.target.value, to: data.cardinality?.to || "" },
                      })
                    }
                    placeholder="1"
                    className="h-6 text-xs w-12"
                  />
                  <div className="text-xs text-gray-500">Destino:</div>
                  <Input
                    value={data.cardinality?.to || ""}
                    onChange={(e) =>
                      onUpdate({
                        cardinality: { from: data.cardinality?.from || "", to: e.target.value },
                      })
                    }
                    placeholder="*"
                    className="h-6 text-xs w-12"
                  />
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs bg-transparent"
                  onClick={() => setIsEditing(false)}
                >
                  OK
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 bg-transparent"
                  onClick={onDelete}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 bg-white/90 backdrop-blur-sm shadow-lg border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
              onClick={() => setIsEditing(true)}
            >
              <Settings className="w-4 h-4 text-indigo-600" />
            </Button>

            {data.name && (
              <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm border-2 border-indigo-200 shadow-lg font-medium text-indigo-700">
                {data.name}
              </div>
            )}

            {data.cardinality && (
              <div className="bg-indigo-100/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm border-2 border-indigo-300 shadow-lg font-bold text-indigo-800">
                {data.cardinality.from}:{data.cardinality.to}
              </div>
            )}
          </div>
        )}
      </div>

      {showContextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleContextMenuClose} />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
            style={{
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
          >
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                onUpdate({ type: "association" })
                handleContextMenuClose()
              }}
            >
              <span>→</span> Asociación
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                onUpdate({ type: "inheritance" })
                handleContextMenuClose()
              }}
            >
              <span>▷</span> Herencia
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                onUpdate({ type: "composition" })
                handleContextMenuClose()
              }}
            >
              <span>◆</span> Composición
            </button>
            <button
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              onClick={() => {
                onUpdate({ type: "aggregation" })
                handleContextMenuClose()
              }}
            >
              <span>◇</span> Agregación
            </button>
            <hr className="my-1 border-gray-200 dark:border-gray-700" />
            <button
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => {
                onDelete()
                handleContextMenuClose()
              }}
            >
              Eliminar relación
            </button>
          </div>
        </>
      )}
    </>
  )
}
