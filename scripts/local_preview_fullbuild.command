#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Always run data validation/generation + full (non-incremental) Jekyll build.
exec "$ROOT_DIR/scripts/local_preview.command" "$@" --with-data --full-build
