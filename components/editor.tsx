"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DiagramCanvas } from "@/components/diagram/diagram-canvas"
import { AIChat } from "@/components/ai/ai-chat"
import { ExportPanel } from "@/components/export/export-panel"
import { CollaborationPanel } from "@/components/colaborativo/colaborativo-panel"
import { CursorOverlay } from "@/components/colaborativo/cursor"
import { useCollaboration } from "@/hooks/use-colaborativo"
import type { ClassData, RelationshipData } from "@/components/diagram/diagram-canvas"

interface EditorProps {
	diagramId: string | null
	onBack?: () => void
	onNotFound?: () => void
	mode?: "edit" | "new"
}

export default function Editor({ diagramId, onBack, onNotFound, mode = "edit" }: EditorProps) {
	const router = useRouter()
	const [classes, setClasses] = useState<ClassData[]>([])
	const [relationships, setRelationships] = useState<RelationshipData[]>([])
	const [userId] = useState(() => `user-${Math.random().toString(36).substring(2, 15)}`)
	const [userName] = useState(() => `Usuario ${Math.floor(Math.random() * 1000)}`)
	const [notFound, setNotFound] = useState(false)

	const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "/api/app/diagrams"

	// Cargar diagrama si hay id y es modo edición
	useEffect(() => {
		if (!diagramId || mode === "new") return
		async function fetchDiagram() {
			try {
				const res = await fetch(`${BACKEND_URL}/diagrams/${diagramId}/`)
				if (res.status === 404) {
					setNotFound(true)
					onNotFound && onNotFound()
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
		fetchDiagram()
	}, [diagramId, mode])

	// Guardar automáticamente en el backend cuando cambian clases o relaciones (solo si editando)
	useEffect(() => {
		if (!diagramId || mode === "new") return
		if (classes.length === 0 && relationships.length === 0) return
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
	}, [diagramId, classes, relationships, mode])

		const { collaborators, isConnected, broadcastClassUpdate, broadcastRelationshipUpdate, broadcastCursorMove } =
			useCollaboration({
				diagramId: diagramId ?? null,
				userId,
				userName,
				onClassesChange: setClasses,
				onRelationshipsChange: setRelationships,
			})

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

	const handleAIAction = (action: any) => {
		// Puedes copiar la lógica de IA de la página principal si lo deseas
	}

	if (notFound) {
		return (
			<div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
				<h1 className="text-2xl font-bold mb-4">Diagrama no encontrado</h1>
				<p className="mb-4">El diagrama solicitado no existe o fue eliminado.</p>
				<Button onClick={onBack || (() => router.push("/"))}>Volver al inicio</Button>
			</div>
		)
	}

	return (
		<div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900" onMouseMove={handleMouseMove}>
			<header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
				<div className="flex items-center gap-4">
					<h1 className="text-lg font-semibold">Diagrama de Clases</h1>
					{diagramId && <span className="text-sm text-gray-500 dark:text-gray-400">ID: {diagramId}</span>}
				</div>
				<div className="flex items-center gap-2 mt-2">
					  <CollaborationPanel diagramId={diagramId ?? null} collaborators={collaborators} isConnected={isConnected} />
					<ExportPanel classes={classes} relationships={relationships} />
				</div>
			</header>
			<div className="flex-1 flex relative">
				<div className="flex-1 relative">
								<DiagramCanvas
									diagramId={diagramId ?? null}
									classes={classes}
									relationships={relationships}
									onClassesChange={handleClassesChange}
									onRelationshipsChange={handleRelationshipsChange}
								/>
					<CursorOverlay collaborators={collaborators} />
				</div>
				<div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
					  <AIChat diagramId={diagramId ?? null} onAIAction={handleAIAction} />
				</div>
			</div>
		</div>
	)
}
