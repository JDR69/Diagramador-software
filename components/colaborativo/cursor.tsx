// Superposición de cursor
"use client"

import { useEffect, useState } from "react"

interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
}

interface CursorOverlayProps {
  collaborators: Collaborator[]
}

export function CursorOverlay({ collaborators }: CursorOverlayProps) {
  const [visibleCursors, setVisibleCursors] = useState<Collaborator[]>([])

  useEffect(() => {
    setVisibleCursors(collaborators.filter((c) => c.cursor))
  }, [collaborators])

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {visibleCursors.map((collaborator) => (
        <div
          key={collaborator.id}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: collaborator.cursor!.x,
            top: collaborator.cursor!.y,
            transform: "translate(-2px, -2px)",
          }}
        >
          {/* Cursor pointer */}
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-lg">
              <path
                d="M2 2L18 8L8 12L2 18L2 2Z"
                className={`${collaborator.color.replace("bg-", "fill-")} stroke-white stroke-1`}
              />
            </svg>

            {/* User name label */}
            <div
              className={`absolute top-5 left-2 px-2 py-1 rounded text-xs text-white font-medium whitespace-nowrap ${collaborator.color} shadow-lg`}
            >
              {collaborator.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
