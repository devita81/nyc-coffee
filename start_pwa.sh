#!/usr/bin/env bash
# NYC Coffee + Hotel Explorer - PWA local launcher (macOS / Linux)
set -e
cd "$(dirname "$0")"
PORT=8765
URL="http://localhost:${PORT}/"

echo
echo "============================================================"
echo " NYC Coffee + Hotel Explorer - PWA"
echo "============================================================"
echo " Servidor local rodando em: $URL"
echo " Para parar: Ctrl+C"
echo "============================================================"
echo

# Abre o browser em 1.5s em segundo plano
(
  sleep 1.5
  if command -v open >/dev/null 2>&1; then open "$URL"; \
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"; fi
) &

# Tenta python3 ou python
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT" --bind 127.0.0.1
else
  echo "ERRO: Python nao encontrado. Instale Python 3."
  exit 1
fi
