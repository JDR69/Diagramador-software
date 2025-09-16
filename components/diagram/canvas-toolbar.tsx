// Barra de herramientas del lienzo
"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Link, Move, ZoomIn, ZoomOut, RotateCcw, MousePointer } from "lucide-react"

interface CanvasToolbarProps {
  onAddClass: () => void
  isConnecting: boolean
  onToggleConnection: () => void
}

export function CanvasToolbar({ onAddClass, isConnecting, onToggleConnection }: CanvasToolbarProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddClass}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Clase
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant={isConnecting ? "default" : "outline"}
          size="sm"
          onClick={onToggleConnection}
          className={isConnecting ? "bg-green-600 hover:bg-green-700 text-white animate-pulse" : ""}
        >
          <Link className="w-4 h-4 mr-2" />
          {isConnecting ? "Modo Conexión Activo" : "Crear Relaciones"}
        </Button>

        {isConnecting && (
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Haz clic en dos clases para conectarlas o presiona ESC para cancelar
          </div>
        )}

        <Separator orientation="vertical" className="h-6" />

        <Button variant="outline" size="sm" disabled>
          <MousePointer className="w-4 h-4 mr-2" />
          Seleccionar
        </Button>

        <Button variant="outline" size="sm" disabled>
          <Move className="w-4 h-4 mr-2" />
          Mover
        </Button>

        <Button variant="outline" size="sm" disabled>
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="sm" disabled>
          <ZoomOut className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="sm" disabled>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
