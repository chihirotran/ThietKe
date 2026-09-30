#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if command -v node >/dev/null 2>&1; then
  node_exec="$(command -v node)"
else
  node_exec="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi

if [[ ! -x "$node_exec" ]]; then
  echo "Node.js is required. Install Node.js 20.19+ or 22.12+." >&2
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  echo "Dependencies are missing. Run npm install first." >&2
  exit 1
fi

exec "$node_exec" node_modules/vite/bin/vite.js --host 127.0.0.1 "$@"
