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
- Tranco top-domain list (network fetch with local cache fallback)

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

Dataset catalog links in `impact_dashboard.json` are absolute site paths under `/data/impact/exports/`.

## Build Hooks

Local preview hook:

- `scripts/local_preview.command`
- Runs `python3 scripts/build-impact-dashboard-data.py` before `jekyll build`.
- Runs `python3 scripts/build-impact-reach-data.py` before `jekyll build`.

Deploy hook:

- `.github/workflows/deploy_site.yml`
- Runs `python3 scripts/build-impact-dashboard-data.py` before Jekyll build.
- Runs `python3 scripts/build-impact-reach-data.py` before Jekyll build.

This ensures impact and reach datasets are regenerated at deploy/build time when source inputs change.

## Runtime Dependencies

Loaded by include:

- Chart.js (CDN)
- topojson-client (CDN)
- chartjs-chart-geo (CDN)

World topojson fetch order in client:

1. `https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json`
2. `https://unpkg.com/world-atlas@2/countries-110m.json`

## Notes

- `Mention countries` uses a log-scaled choropleth ramp to reduce US dominance.
- `Citing authors (WOS)` remains unchanged as a bubble map.
- Reconciliation and export tables are rendered client-side from generated JSON.
