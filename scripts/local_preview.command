#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PREVIEW_PORT:-4001}"
MODE="serve"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/local_preview.command [--build-only] [--port PORT]

Examples:
  ./scripts/local_preview.command
  ./scripts/local_preview.command --build-only
  ./scripts/local_preview.command --port 4010
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)
      MODE="build"
      shift
      ;;
    --port)
      PORT="${2:-}"
      if [[ -z "$PORT" ]]; then
        echo "Missing value for --port"
        usage
        exit 2
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 2
      ;;
  esac
done

RUBY33_BUNDLE="/opt/homebrew/opt/ruby@3.3/bin/bundle"
if [[ -x "$RUBY33_BUNDLE" ]]; then
  BUNDLE_CMD=("$RUBY33_BUNDLE" "_2.5.18_")
elif command -v bundle >/dev/null 2>&1; then
  BUNDLE_CMD=("bundle" "_2.5.18_")
else
  echo "Bundler was not found."
  echo "Install Homebrew Ruby 3.3 and Bundler 2.5.18, then retry."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve _site locally."
  exit 1
fi

cd "$ROOT_DIR"

echo "Building site with: ${BUNDLE_CMD[*]} exec jekyll build ..."
"${BUNDLE_CMD[@]}" exec jekyll build --safe --config _config.yml,_config.dev.yml

if [[ "$MODE" == "build" ]]; then
  echo "Build complete: $ROOT_DIR/_site"
  exit 0
fi

echo "Preview ready at http://127.0.0.1:${PORT}/"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" --directory "$ROOT_DIR/_site"
