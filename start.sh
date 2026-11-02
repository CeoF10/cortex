#!/bin/bash
# Script de inicio nativo para CapCut Desktop
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

ELECTRON="$DIR/node_modules/electron/dist/electron"

notify() {
  command -v notify-send >/dev/null && notify-send "CapCut" "$1"
}

# Si faltan dependencias o el binario de Electron (npm a veces omite el postinstall), repararlos
if [ ! -x "$ELECTRON" ]; then
  notify "Preparando dependencias, espera un momento…"
  [ -d "$DIR/node_modules/electron" ] || npm install --no-audit --no-fund >/dev/null 2>&1
  node "$DIR/node_modules/electron/install.js" >/dev/null 2>&1
fi

# Compilar la interfaz si no existe dist/
if [ ! -f "$DIR/dist/index.html" ] && [ -x "$DIR/node_modules/.bin/vite" ]; then
  "$DIR/node_modules/.bin/vite" build >/dev/null 2>&1
fi

if [ ! -x "$ELECTRON" ]; then
  notify "No se pudo iniciar: falta Electron. Ejecuta 'npm install' en $DIR"
  exit 1
fi

# Ejecutar el binario nativo de Electron directamente sin depender de variables de terminal
exec "$ELECTRON" "$DIR" "$@"
