// Centraliza configuración de URLs públicas del backend
// Solo se usan dos variables: NEXT_PUBLIC_BACKEND_URL (HTTP) y NEXT_PUBLIC_WS_BASE_URL (WS)

export const BACKEND_HTTP_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '') // quitar slash final

export const BACKEND_API_BASE = `${BACKEND_HTTP_BASE}/api/app/diagrams`;

export const BACKEND_WS_BASE = (
  process.env.NEXT_PUBLIC_WS_BASE_URL || BACKEND_HTTP_BASE.replace(/^http/, 'ws')
).replace(/\/$/, '')

// Construye URL de WebSocket de colaboración
export const collaborationWsUrl = (diagramId: string) => `${BACKEND_WS_BASE}/ws/collaboration/${diagramId}/`;

export const buildDiagramUrl = (id: string) => `${BACKEND_API_BASE}/diagrams/${id}/`;
// Endpoint bulk positions action (detail action in DiagramViewSet)
export const buildDiagramPositionsUrl = (id: string) => `${BACKEND_API_BASE}/diagrams/${id}/positions/`;