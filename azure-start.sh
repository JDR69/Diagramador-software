#!/usr/bin/env bash
set -euo pipefail

echo "[azure-start] Node version: $(node -v)"

# Instalar deps solo si no existe node_modules
if [ ! -d node_modules ]; then
  echo "[azure-start] Instalando dependencias (npm ci)";
  npm ci --no-audit --no-fund;
else
  echo "[azure-start] node_modules ya existe, saltando install (si necesitas limpio, borra la carpeta).";
fi

# Construir solo si no existe .next/BUILD_ID
if [ ! -f .next/BUILD_ID ]; then
  echo "[azure-start] Ejecutando build de Next";
  npm run build;
else
  echo "[azure-start] Build existente detectado (.next/BUILD_ID), no se recompila.";
fi

echo "[azure-start] Iniciando servidor..."
exec npm run start
