#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PREVIEW_PORT:-4001}"
MODE="serve"
FORCE_FULL_BUILD=0
SKIP_DATA=1
SAW_SKIP_DATA=0
SAW_WITH_DATA=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/local_preview.command [--build-only] [--full-build] [--skip-data|--with-data] [--port PORT]

Examples:
  ./scripts/local_preview.command
  ./scripts/local_preview.command --build-only
  ./scripts/local_preview.command --full-build
  ./scripts/local_preview.command --skip-data
  ./scripts/local_preview.command --with-data
  ./scripts/local_preview.command --port 4010
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)
      MODE="build"
      shift
      ;;
    --full-build)
      FORCE_FULL_BUILD=1
      shift
      ;;
    --skip-data)
      SKIP_DATA=1
      SAW_SKIP_DATA=1
      shift
      ;;
    --with-data)
      SKIP_DATA=0
      SAW_WITH_DATA=1
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

if [[ "$SAW_SKIP_DATA" -eq 1 && "$SAW_WITH_DATA" -eq 1 ]]; then
  echo "Cannot combine --skip-data and --with-data."
  usage
  exit 2
fi

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

if [[ "$MODE" == "serve" || "$SKIP_DATA" -eq 0 ]] && ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve _site locally."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to run publication/data validation checks."
  exit 1
fi

cd "$ROOT_DIR"

echo "Validating publications interdisciplinarity braid stats ..."
node scripts/qa/validate-publications-interdisciplinarity-stats.mjs

if [[ "$SKIP_DATA" -eq 1 ]]; then
  echo "Skipping geo/impact data validation and generation (default mode). Use --with-data to run them."
  newest_input_mtime=0
  for source_dir in "$ROOT_DIR/_news" "$ROOT_DIR/data/altmetric/raw"; do
    if [[ -d "$source_dir" ]]; then
      while IFS= read -r source_file; do
        source_mtime=$(stat -f "%m" "$source_file" 2>/dev/null || echo 0)
        if (( source_mtime > newest_input_mtime )); then
          newest_input_mtime=$source_mtime
        fi
      done < <(find "$source_dir" -type f 2>/dev/null)
    fi
  done

  stale_outputs=()
  for generated_file in \
    "$ROOT_DIR/data/career_geo/career_footprint.json" \
    "$ROOT_DIR/data/impact/impact_dashboard.json" \
    "$ROOT_DIR/data/impact/impact_reconciliation.json"; do
    if [[ ! -f "$generated_file" ]]; then
      stale_outputs+=("${generated_file#$ROOT_DIR/} (missing)")
      continue
    fi
    generated_mtime=$(stat -f "%m" "$generated_file" 2>/dev/null || echo 0)
    if (( newest_input_mtime > 0 && generated_mtime < newest_input_mtime )); then
      stale_outputs+=("${generated_file#$ROOT_DIR/}")
    fi
  done

  if (( ${#stale_outputs[@]} > 0 )); then
    echo "Warning: generated geo/impact data may be stale. Run with --with-data to refresh:"
    for stale_file in "${stale_outputs[@]}"; do
      echo "  - $stale_file"
    done
  fi
else
  echo "Validating _news geo front matter ..."
  node scripts/qa/validate-news-geo.mjs

  echo "Generating career geo map data ..."
  node scripts/build-career-geo-data.mjs

  echo "Generating impact dashboard data ..."
  python3 scripts/build-impact-dashboard-data.py --repo-root "$ROOT_DIR" --out-dir "$ROOT_DIR/data/impact"

  echo "Using committed impact reach data (no API refresh during local preview)."
  for required in \
    "$ROOT_DIR/data/impact/reach/outlet_reach.json" \
    "$ROOT_DIR/data/impact/reach/reach_metadata.json" \
    "$ROOT_DIR/data/impact/reach/time_adjusted_mentions_reach.json" \
    "$ROOT_DIR/data/impact/reach/time_adjusted_outlet_reach.json" \
    "$ROOT_DIR/data/impact/reach/tranco_snapshots_used.json"; do
    if [[ ! -f "$required" ]]; then
      echo "Missing reach dataset: $required"
      echo "Run scripts/build-impact-reach-data.py manually before preview."
      exit 1
    fi
  done
fi

BUILD_ARGS=(--safe --config _config.yml,_config.dev.yml)
BUILD_CMD=("${BUNDLE_CMD[@]}" exec jekyll build "${BUILD_ARGS[@]}")
INCREMENTAL_BUILD_CMD=("${BUILD_CMD[@]}" --incremental)

if [[ "$FORCE_FULL_BUILD" -eq 1 ]]; then
  echo "Building site (full rebuild) with: ${BUILD_CMD[*]}"
  "${BUILD_CMD[@]}"
else
  echo "Building site (incremental) with: ${INCREMENTAL_BUILD_CMD[*]}"
  if ! "${INCREMENTAL_BUILD_CMD[@]}"; then
    echo "Incremental build failed. Retrying full rebuild ..."
    "${BUILD_CMD[@]}"
  fi
fi

if [[ "$MODE" == "build" ]]; then
  echo "Build complete: $ROOT_DIR/_site"
  exit 0
fi

echo "Preview ready at http://127.0.0.1:${PORT}/"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" --directory "$ROOT_DIR/_site"
