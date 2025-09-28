#!/bin/bash
set -euo pipefail

echo "[startup] Iniciando script de despliegue Next.js (monorepo)"

# 1. Entrar al subdirectorio del frontend
cd class-diagram-software
echo "[startup] Directorio actual: $(pwd)"

# 2. Instalar TODAS las dependencias (NO omitir dev, Next build necesita tailwind, typescript, postcss)
if [ -f package-lock.json ]; then
  echo "[startup] Usando npm ci"
  npm ci
else
  echo "[startup] Usando npm install"
  npm install
fi

# 3. Build (aunque exista postinstall, forzamos)
echo "[startup] Ejecutando build de producción"
npm run build

# 4. Verificación de build
if [ ! -f .next/BUILD_ID ]; then
  echo "[startup][ERROR] No se generó .next/BUILD_ID. Falló el build. Revisar logs anteriores." >&2
  exit 1
fi
echo "[startup] Build OK ($(cat .next/BUILD_ID))"

# 5. Lanzar servidor
PORT_ENV=${PORT:-3000}
echo "[startup] Iniciando Next en puerto $PORT_ENV"
exec node node_modules/next/dist/bin/next start -p "$PORT_ENV" -H 0.0.0.0
