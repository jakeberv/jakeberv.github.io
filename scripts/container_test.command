#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Container tests must run as a non-root user."
  exit 1
fi

cd "$ROOT_DIR"
./scripts/container_bootstrap.command
npm test
npm run test:themes
./scripts/local_preview.command --build-only --full-build --skip-data
