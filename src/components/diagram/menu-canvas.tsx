// Barra de herramientas del lienzo
"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Plus, Link, ArrowLeft, MessageSquare, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface CanvasToolbarProps {
  onAddClass: () => void
  isConnecting: boolean
  onToggleConnection: () => void
  isChatOpen: boolean
  onToggleChat: () => void
}

export function CanvasToolbar({ onAddClass, isConnecting, onToggleConnection, isChatOpen, onToggleChat }: CanvasToolbarProps) {
  const router = useRouter()

  const handleGoBack = () => {
    router.push("/")
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleGoBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <Separator orientation="vertical" className="h-6" />

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

        <Separator orientation="vertical" className="h-6" />

        <Button
          variant={isChatOpen ? "default" : "outline"}
          size="sm"
          onClick={onToggleChat}
          className={isChatOpen ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
        >
          {isChatOpen ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cerrar Chat
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              IA Chat
            </>
          )}
        </Button>

        {isConnecting && (
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Haz clic en dos clases para conectarlas o presiona ESC para cancelar
          </div>
        )}

      
      </div>
    </div>
  )
}
