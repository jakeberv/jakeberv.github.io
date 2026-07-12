#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PREVIEW_PORT:-4001}"
MODE="serve"
FORCE_FULL_BUILD=0
SKIP_DATA=1
SAW_SKIP_DATA=0
SAW_WITH_DATA=0
THEME=""
WITH_SEARCH=0

usage() {
  cat <<'EOF'
Usage:
  ./scripts/local_preview.command [--build-only] [--full-build] [--skip-data|--with-data] [--with-search] [--theme NAME] [--port PORT]

Examples:
  ./scripts/local_preview.command
  ./scripts/local_preview.command --build-only
  ./scripts/local_preview.command --full-build
  ./scripts/local_preview.command --skip-data
  ./scripts/local_preview.command --with-data
  ./scripts/local_preview.command --with-search
  ./scripts/local_preview.command --theme air
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
    --with-search)
      WITH_SEARCH=1
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
    --theme)
      THEME="${2:-}"
      if [[ -z "$THEME" ]]; then
        echo "Missing value for --theme"
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

case "$THEME" in
  ""|default|air|sunrise|mint|dirt|contrast)
    ;;
  *)
    echo "Unsupported theme: $THEME"
    echo "Choose one of: default, air, sunrise, mint, dirt, contrast"
    exit 2
    ;;
esac

if [[ "$SAW_SKIP_DATA" -eq 1 && "$SAW_WITH_DATA" -eq 1 ]]; then
  echo "Cannot combine --skip-data and --with-data."
  usage
  exit 2
fi

cd "$ROOT_DIR"

BUNDLER_VERSION="$(
  awk '
    found { print $1; exit }
    /^BUNDLED WITH$/ { found = 1 }
  ' Gemfile.lock
)"

if [[ -z "$BUNDLER_VERSION" ]]; then
  echo "Could not determine the required Bundler version from Gemfile.lock."
  exit 1
fi

select_bundle() {
  local bundle_bin="$1"
  local fallback_version
  local interpreter
  local ruby_bin
  local shebang

  if "$bundle_bin" "_${BUNDLER_VERSION}_" --version >/dev/null 2>&1; then
    BUNDLE_CMD=("$bundle_bin" "_${BUNDLER_VERSION}_")
    return 0
  fi

  ruby_bin="$(dirname "$bundle_bin")/ruby"
  if [[ ! -x "$ruby_bin" ]]; then
    shebang="$(head -n 1 "$bundle_bin" 2>/dev/null || true)"
    interpreter="${shebang#\#!}"
    if [[ "$interpreter" == "/usr/bin/env ruby"* ]]; then
      ruby_bin="$(command -v ruby 2>/dev/null || true)"
    else
      interpreter="${interpreter%% *}"
      if [[ "$(basename "$interpreter")" == ruby* && -x "$interpreter" ]]; then
        ruby_bin="$interpreter"
      else
        ruby_bin=""
      fi
    fi
  fi
  fallback_version=""
  if [[ -x "$ruby_bin" ]]; then
    fallback_version="$("$ruby_bin" -rbundler -e 'print Bundler::VERSION' 2>/dev/null || true)"
  fi

  if [[ -n "$fallback_version" ]] && \
     "$bundle_bin" "_${fallback_version}_" --version >/dev/null 2>&1 && \
     "$bundle_bin" "_${fallback_version}_" check >/dev/null 2>&1; then
    echo "Warning: Bundler $BUNDLER_VERSION is unavailable via $bundle_bin; using compatible Bundler $fallback_version after bundle check succeeded."
    BUNDLE_CMD=("$bundle_bin" "_${fallback_version}_")
    return 0
  fi

  return 1
}

RUBY33_BUNDLE=""
if command -v brew >/dev/null 2>&1; then
  RUBY33_PREFIX="$(brew --prefix ruby@3.3 2>/dev/null || true)"
  if [[ -n "$RUBY33_PREFIX" ]]; then
    RUBY33_BUNDLE="$RUBY33_PREFIX/bin/bundle"
  fi
fi
PATH_BUNDLE="$(command -v bundle 2>/dev/null || true)"

if [[ -x "$RUBY33_BUNDLE" ]] && select_bundle "$RUBY33_BUNDLE"; then
  :
elif [[ -n "$PATH_BUNDLE" && "$PATH_BUNDLE" != "$RUBY33_BUNDLE" ]] && select_bundle "$PATH_BUNDLE"; then
  :
else
  echo "Bundler $BUNDLER_VERSION was not usable with Homebrew Ruby 3.3 or from PATH."
  echo "Install Homebrew Ruby 3.3 and run:"
  echo "  \"\$(brew --prefix ruby@3.3)\"/bin/gem install bundler -v $BUNDLER_VERSION"
  exit 1
fi

file_mtime() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    stat -f "%m" "$1" 2>/dev/null || echo 0
  else
    stat -c "%Y" "$1" 2>/dev/null || echo 0
  fi
}

if [[ "$MODE" == "serve" || "$SKIP_DATA" -eq 0 ]] && ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to serve _site locally."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to run publication/data validation checks."
  exit 1
fi

echo "Validating publications interdisciplinarity braid stats ..."
node scripts/qa/validate-publications-interdisciplinarity-stats.mjs

if [[ "$SKIP_DATA" -eq 1 ]]; then
  echo "Skipping geo/impact data validation and generation (default mode). Use --with-data to run them."
  newest_input_mtime=0
  for source_dir in "$ROOT_DIR/_news" "$ROOT_DIR/data/altmetric/raw"; do
    if [[ -d "$source_dir" ]]; then
      while IFS= read -r source_file; do
        source_mtime="$(file_mtime "$source_file")"
        if (( source_mtime > newest_input_mtime )); then
          newest_input_mtime=$source_mtime
        fi
      done < <(find "$source_dir" -type f 2>/dev/null)
    fi
  done

  stale_outputs=()
  for generated_file in \
    "$ROOT_DIR/data/career_geo/career_footprint.json" \
    "$ROOT_DIR/data/talkmap/talk_events.json" \
    "$ROOT_DIR/data/impact/impact_dashboard.json" \
    "$ROOT_DIR/data/impact/impact_reconciliation.json"; do
    if [[ ! -f "$generated_file" ]]; then
      stale_outputs+=("${generated_file#$ROOT_DIR/} (missing)")
      continue
    fi
    generated_mtime="$(file_mtime "$generated_file")"
    if (( newest_input_mtime > 0 && generated_mtime < newest_input_mtime )); then
      stale_outputs+=("${generated_file#$ROOT_DIR/}")
    fi
  done

  if (( ${#stale_outputs[@]} > 0 )); then
    echo "Warning: generated geo/talk-map/impact data may be stale. Run with --with-data to refresh:"
    for stale_file in "${stale_outputs[@]}"; do
      echo "  - $stale_file"
    done
  fi
else
  echo "Validating _news geo front matter ..."
  node scripts/qa/validate-news-geo.mjs

  echo "Generating career and talk map data ..."
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

CONFIG_FILES="_config.yml,_config.dev.yml"
THEME_CONFIG=""
SEARCH_CONFIG=""
TEMP_CONFIGS=()

cleanup_temp_configs() {
  if (( ${#TEMP_CONFIGS[@]} > 0 )); then
    rm -f "${TEMP_CONFIGS[@]}"
  fi
}
trap cleanup_temp_configs EXIT

if [[ -n "$THEME" ]]; then
  THEME_CONFIG_BASE="$(mktemp "${TMPDIR:-/tmp}/academicpages-theme.XXXXXX")"
  THEME_CONFIG="${THEME_CONFIG_BASE}.yml"
  mv "$THEME_CONFIG_BASE" "$THEME_CONFIG"
  printf 'site_theme: "%s"\n' "$THEME" > "$THEME_CONFIG"
  CONFIG_FILES="$CONFIG_FILES,$THEME_CONFIG"
  TEMP_CONFIGS+=("$THEME_CONFIG")
  echo "Using build-time theme: $THEME"
fi

if [[ "$WITH_SEARCH" -eq 1 ]]; then
  if [[ ! -f "$ROOT_DIR/node_modules/pagefind/package.json" ]] || \
     ! node -e 'const p = require("./node_modules/pagefind/package.json"); process.exit(p.version === "1.5.2" ? 0 : 1)' >/dev/null 2>&1; then
    echo "Pagefind 1.5.2 is required for --with-search. Run:"
    echo "  npm ci"
    exit 1
  fi
  SEARCH_CONFIG_BASE="$(mktemp "${TMPDIR:-/tmp}/academicpages-search.XXXXXX")"
  SEARCH_CONFIG="${SEARCH_CONFIG_BASE}.yml"
  mv "$SEARCH_CONFIG_BASE" "$SEARCH_CONFIG"
  printf 'search:\n  index_enabled: true\n  ui_enabled: true\n' > "$SEARCH_CONFIG"
  CONFIG_FILES="$CONFIG_FILES,$SEARCH_CONFIG"
  TEMP_CONFIGS+=("$SEARCH_CONFIG")
  echo "Enabling the opt-in local search interface."
fi

BUILD_ARGS=(--safe --config "$CONFIG_FILES")
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

if [[ "$WITH_SEARCH" -eq 0 ]]; then
  rm -rf "$ROOT_DIR/_site/pagefind"
fi

if [[ "$WITH_SEARCH" -eq 1 ]]; then
  echo "Generating the local Pagefind index ..."
  npm run build:search
fi

if [[ "$MODE" == "build" ]]; then
  echo "Build complete: $ROOT_DIR/_site"
  exit 0
fi

echo "Preview ready at http://127.0.0.1:${PORT}/"
echo "Press Ctrl+C to stop."
python3 -m http.server "$PORT" --directory "$ROOT_DIR/_site"
