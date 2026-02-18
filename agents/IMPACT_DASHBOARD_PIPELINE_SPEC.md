# Impact Dashboard Pipeline Spec

## Scope
Defines how `/impact/` is rendered from generated data and which scripts/workflows own data refresh.

## Page Integration

- Page file: `_pages/impact.md`
- Include shell: `_includes/impact-dashboard.html`
- Client logic: `assets/js/impact-dashboard.js`
- Client styles: `assets/css/impact-dashboard.css`

The page is include-driven (no inline chart logic in `impact.md`).

## Data Inputs

Impact dashboard builder reads:

- `_publications/*.md`
- `_data/scholar_metrics.json`
- `_data/map_data.json`
- `data/altmetric/raw/*.csv`

Impact reach builder reads:

- `data/impact/exports/news_mentions_clean.json` (preferred) or `.csv`
- Tranco top-domain list + historical date snapshots (network fetch with local cache fallback)

## Generated Outputs

Builder script:

- `scripts/build-impact-dashboard-data.py`

Reach script:

- `scripts/build-impact-reach-data.py`

Default output directory:

- `data/impact/`

Generated files:

- `impact_dashboard.json`
- `impact_reconciliation.json`
- `exports/*.json`
- `exports/*.csv`
- `reach/outlet_reach.json`
- `reach/outlet_reach.csv`
- `reach/reach_metadata.json`
- `reach/time_adjusted_mentions_reach.json`
- `reach/time_adjusted_mentions_reach.csv`
- `reach/time_adjusted_outlet_reach.json`
- `reach/time_adjusted_outlet_reach.csv`
- `reach/tranco_snapshots_used.json`
- `reach/tranco_snapshots_used.csv`

Historical Tranco lookup guardrails (default behavior):

- Uses cache first (`reach/.cache/tranco_cache_index.json` and cached zip files).
- Applies request pacing: `--historical-date-api-delay-ms` (default `250`).
- Applies per-run lookup cap: `--historical-max-date-lookups` (default `250`, `0` disables cap).
- Uses bounded nearest-date probing: `--historical-window-days` (default `10`).

Dataset catalog links in `impact_dashboard.json` are absolute site paths under `/data/impact/exports/`.

## Build Hooks

Local preview hook:

- `scripts/local_preview.command`
- Runs `python3 scripts/build-impact-dashboard-data.py` before `jekyll build`.
- Uses committed reach datasets (no Tranco API calls during preview).

Deploy hook:

- `.github/workflows/deploy_site.yml`
- Runs `python3 scripts/build-impact-dashboard-data.py` before Jekyll build.
- Verifies committed reach datasets exist before Jekyll build.

Reach refresh hook:

- `.github/workflows/refresh_impact_reach_data.yml`
- Scheduled weekly (`cron: 17 6 * * 1`) and manual (`workflow_dispatch`).
- Runs `python3 scripts/build-impact-reach-data.py` with conservative historical lookup defaults.
- Commits and pushes updated `data/impact/reach/*` outputs only when values changed.

This keeps deploy/build deterministic while still refreshing API-backed reach data on a controlled cadence.

## Runtime Dependencies

Loaded by include:

- Chart.js (CDN)
- topojson-client (CDN)
- chartjs-chart-geo (CDN)

Client data-fetch behavior:

- `assets/js/impact-dashboard.js` loads dashboard JSON with default browser fetch caching (no explicit `cache: "no-store"`).
- `_includes/impact-dashboard.html` appends `?v={{ site.time | date: '%Y%m%d%H%M%S' }}` to JSON/CSS/JS URLs to force fresh assets after each build/deploy.

World topojson fetch order in client:

1. `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`
2. `https://unpkg.com/world-atlas@2/countries-110m.json`

## Notes

- `Mention countries` uses a log-scaled choropleth ramp to reduce US dominance.
- `Citing authors (WOS)` remains unchanged as a bubble map.
- Reconciliation and export tables are rendered client-side from generated JSON.
