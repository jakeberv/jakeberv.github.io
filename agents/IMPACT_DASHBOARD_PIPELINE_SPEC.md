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
- Default path skips impact data regeneration for faster UI/content iteration.
- Data-refresh path: run `./scripts/local_preview.command --with-data` to execute `python3 scripts/build-impact-dashboard-data.py` before `jekyll build`.
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
- `assets/js/impact-dashboard.js` also loads reach datasets for the outlet impact ranking:
  - `/data/impact/reach/time_adjusted_mentions_reach.json`
  - `/data/impact/reach/reach_metadata.json`
- `_includes/impact-dashboard.html` appends `?v={{ site.time | date: '%Y%m%d%H%M%S' }}` to JSON/CSS/JS URLs to force fresh assets after each build/deploy.

World topojson fetch order in client:

1. `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`
2. `https://unpkg.com/world-atlas@2/countries-110m.json`

## Notes

- `Mention countries` uses a log-scaled choropleth ramp to reduce US dominance.
- `Citing authors (WOS)` remains unchanged as a bubble map.
- `Outlet impact ranking` uses a horizontal bar chart:
  - Rank: top normalized outlets by impact score (`mentions * mean publish-time reach / 100`)
  - Excludes syndicated/proxy domains from the ranked score
  - Color: reach level (mean publish-time reach score)
  - Tooltip: domains observed, mentions, reach score, publication spread, rank coverage
- `Estimated Impressions` side panel uses a model-based proxy per outlet:
  - Visits model: `visits = 500M * rank^-0.62` (rank from time-adjusted Tranco snapshot)
  - Per-mention article-share bounds: `0.02%` (low), `0.05%` (mid), `0.10%` (high)
  - Displays low/high ranges as horizontal intervals with a mid-point marker
  - Uses a logarithmic x-axis so lower-impression outlets remain readable
  - Uses the same top-outlet set and order as outlet impact ranking
  - Uses same syndication/proxy exclusions as outlet impact ranking
- Reconciliation and export tables are rendered client-side from generated JSON.
