#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to validate interdisciplinarity braid stats."
  exit 1
fi

cd "$ROOT_DIR"
node scripts/qa/validate-publications-interdisciplinarity-stats.mjs "$@"
