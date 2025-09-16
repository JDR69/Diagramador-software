// Panel de Colaboración
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Users, Copy, Check, Wifi, WifiOff } from "lucide-react"

interface CollaborationPanelProps {
  diagramId: string | null
  collaborators?: Array<{
    id: string
    name: string
    color: string
    lastSeen: number
  }>
  isConnected?: boolean
}

export function CollaborationPanel({ diagramId, collaborators = [], isConnected = false }: CollaborationPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState("")

  useEffect(() => {
    if (diagramId && typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/diagram/${diagramId}`)
    }
  }, [diagramId])

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error("Failed to copy link:", error)
      }
    }
  }

  const activeCollaborators = collaborators.filter((c) => Date.now() - c.lastSeen < 30000)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          {isConnected ? (
            <Wifi className="w-4 h-4 mr-2 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 mr-2 text-red-600" />
          )}
          Colaborar
          {activeCollaborators.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {activeCollaborators.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-600">Conectado en tiempo real</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-red-600">Desconectado</span>
              </>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Compartir Diagrama</h4>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="text-sm"
                placeholder={diagramId ? "Generando enlace..." : "Sin diagrama activo"}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="flex-shrink-0 bg-transparent"
                disabled={!shareUrl}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Comparte este enlace para colaborar en tiempo real</p>
          </div>

          {activeCollaborators.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Colaboradores Activos</h4>
              <div className="space-y-2">
                {activeCollaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${collaborator.color}`} />
                    <span className="text-sm flex-1">{collaborator.name}</span>
                    <Badge variant="outline" className="text-xs">
                      En línea
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCollaborators.length === 0 && isConnected && (
            <div className="text-center py-4">
              <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Comparte el enlace para invitar colaboradores</p>
            </div>
          )}

          {!isConnected && (
            <div className="text-center py-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <WifiOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">Sin conexión. Intentando reconectar...</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
