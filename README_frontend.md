# Frontend (Next.js 14) - Diagramador

## Variables de entorno
Crear `.env.local` (no commitear) con:
```
NEXT_PUBLIC_BACKEND_URL=https://<tu-backend>.azurewebsites.net
NEXT_PUBLIC_WS_BASE_URL=wss://<tu-backend>.azurewebsites.net
# (Opcional si se usa solo en server components)
GROQ_API_KEY=xxx
```

## Monorepo en Azure App Service (un solo App)
Usamos `startup.sh` en la raíz para entrar al subfolder y arrancar:
1. `cd class-diagram-software`
2. `npm ci --omit=dev`
3. `npm run build`
4. `next start -p $PORT -H 0.0.0.0`

Configurar en Portal Azure > App Service > General Settings:
Startup Command:
```
bash startup.sh
```

## Despliegue limpio (recomendado)
Separar front y back en distintos App Services / Static Web Apps para escalado independiente.

## Scripts útiles
```
npm run dev      # desarrollo local
npm run build    # build de producción
npm start        # start (usa binario next via node)
```

## Troubleshooting
| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| `next: not found` | App Service en raíz sin entrar al subfolder | Usar `startup.sh` o App Service separado |
| 404 a `/api/app/diagrams` | BACKEND_URL mal definido | Revisar NEXT_PUBLIC_BACKEND_URL |
| WebSocket falla | WS base URL sin wss o backend sin daphne | Verificar daphne y variable NEXT_PUBLIC_WS_BASE_URL |

## Seguridad
- No expongas GROQ_API_KEY al cliente si es sensible. Mueve llamadas a API Routes.
- Revisar CORS en backend.
