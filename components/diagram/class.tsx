"use client"

import React from "react"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, GripVertical, Link } from "lucide-react"
import type { ClassData } from "./diagram-canvas"

interface ClassNodeProps {
  data: ClassData
  isSelected: boolean
  isConnecting: boolean
  onSelect: () => void
  onUpdate: (updates: Partial<ClassData>) => void
  onDelete: () => void
  onStartConnection: () => void
  onCompleteConnection: () => void
  onRequestSuggestions?: (className: string) => void
}

export function ClassNode({
  data,
  isSelected,
  isConnecting,
  onSelect,
  onUpdate,
  onDelete,
  onStartConnection,
  onCompleteConnection,
  onRequestSuggestions,
}: ClassNodeProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingAttribute, setIsEditingAttribute] = useState<number | null>(null)
  const [newAttributeName, setNewAttributeName] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const nodeRef = useRef<HTMLDivElement>(null)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLInputElement) return

    onSelect()
    setIsDragging(true)
    const rect = nodeRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const canvas = nodeRef.current?.parentElement
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()
    const newX = e.clientX - canvasRect.left - dragOffset.x
    const newY = e.clientY - canvasRect.top - dragOffset.y

    onUpdate({
      position: {
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      },
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsEditingName(false)
  }

  const handleAddAttribute = () => {
    if (newAttributeName.trim()) {
      onUpdate({
        attributes: [...data.attributes, newAttributeName.trim()],
      })
      setNewAttributeName("")
    }
  }

  const handleUpdateAttribute = (index: number, newValue: string) => {
    const updatedAttributes = [...data.attributes]
    updatedAttributes[index] = newValue
    onUpdate({ attributes: updatedAttributes })
    setIsEditingAttribute(null)
  }

  const handleDeleteAttribute = (index: number) => {
    const updatedAttributes = data.attributes.filter((_, i) => i !== index)
    onUpdate({ attributes: updatedAttributes })
  }

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(" Node clicked:", data.name, "isConnecting:", isConnecting)
    if (isConnecting) {
      onCompleteConnection()
    } else {
      onSelect()
    }
  }

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log(" Connection button clicked for:", data.name)
    onStartConnection()
  }

  const handleNameChange = async (newName: string) => {
    onUpdate({ name: newName })

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (newName.trim() && onRequestSuggestions) {
      const timer = setTimeout(async () => {
        try {
          console.log(" Requesting AI suggestions for:", newName.trim())
          const response = await fetch("/api/ai/sugerencias-class", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ className: newName.trim() }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.suggestions && data.suggestions.length > 0) {
              console.log(" Received suggestions:", data.suggestions)
              setSuggestions(data.suggestions)
              setShowSuggestions(true)
            }
          } else {
            console.log(" API response not ok:", response.status, response.statusText)
          }
        } catch (error) {
          console.log(" Error getting AI suggestions:", error)
        }
      }, 1000)

      setDebounceTimer(timer)
    }
  }

  const handleSuggestionAccept = (suggestion: string) => {
    if (onRequestSuggestions) {
      onRequestSuggestions(suggestion)
    }
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && showSuggestions && suggestions.length > 0) {
      e.preventDefault()
  handleSuggestionAccept(suggestions[0]) // Aceptar la primera sugerencia
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  React.useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return (
    <div
      ref={nodeRef}
      className={`absolute select-none ${isDragging ? "cursor-grabbing" : isConnecting ? "cursor-pointer" : "cursor-grab"}`}
      style={{
        left: data.position.x,
        top: data.position.y,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleNodeClick}
      onKeyDown={handleKeyDown}
    >
      <Card
        className={`min-w-48 shadow-lg transition-all ${
          isSelected
            ? "ring-2 ring-blue-500 shadow-xl"
            : isConnecting
              ? "ring-2 ring-green-500 hover:ring-green-600 cursor-pointer animate-pulse"
              : "hover:shadow-xl"
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <GripVertical className="w-4 h-4 text-gray-400" />
              {isEditingName ? (
                <form onSubmit={handleNameSubmit} className="flex-1">
                  <Input
                    value={data.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    className="h-6 text-sm font-semibold"
                    autoFocus
                  />
                </form>
              ) : (
                <h3
                  className="font-semibold text-sm cursor-pointer hover:text-blue-600 flex-1"
                  onDoubleClick={() => setIsEditingName(true)}
                >
                  {data.name}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 transition-colors ${
                  isConnecting
                    ? "text-green-600 hover:text-green-700 bg-green-50 dark:bg-green-900/20"
                    : "text-blue-600 hover:text-blue-700"
                }`}
                onClick={handleConnectionClick}
                title={isConnecting ? "Haz clic en otra clase para conectar" : "Crear relación"}
              >
                <Link className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
            <div className="space-y-1">
              {data.attributes.map((attribute, index) => (
                <div key={index} className="flex items-center justify-between group">
                  {isEditingAttribute === index ? (
                    <Input
                      value={attribute}
                      onChange={(e) => handleUpdateAttribute(index, e.target.value)}
                      onBlur={() => setIsEditingAttribute(null)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          setIsEditingAttribute(null)
                        }
                      }}
                      className="h-6 text-xs"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:text-blue-600 flex-1"
                      onDoubleClick={() => setIsEditingAttribute(index)}
                    >
                      {attribute}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteAttribute(index)
                    }}
                  >
                    <Trash2 className="w-2 h-2" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newAttributeName}
                  onChange={(e) => setNewAttributeName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddAttribute()
                    }
                  }}
                  placeholder="Nuevo atributo"
                  className="h-6 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                  onClick={handleAddAttribute}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-2 min-w-[200px] z-20">
          <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            Tablas sugeridas (Enter para agregar):
          </div>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-2"
              onClick={() => handleSuggestionAccept(suggestion)}
            >
              <span className="text-blue-600">+</span>
              {suggestion}
            </button>
          ))}
          <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-1">
            Presiona Enter para agregar la primera sugerencia
          </div>
        </div>
      )}
    </div>
  )
}
