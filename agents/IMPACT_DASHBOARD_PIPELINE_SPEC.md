# Impact Dashboard Pipeline Spec

## Scope
Defines how `/impact/` is rendered from generated data and which scripts/workflows own data refresh.

## Page Integration

- Page file: `/Users/cotinga/Documents/jakeberv.github.io/_pages/impact.md`
- Include shell: `/Users/cotinga/Documents/jakeberv.github.io/_includes/impact-dashboard.html`
- Client logic: `/Users/cotinga/Documents/jakeberv.github.io/assets/js/impact-dashboard.js`
- Client styles: `/Users/cotinga/Documents/jakeberv.github.io/assets/css/impact-dashboard.css`

The page is include-driven (no inline chart logic in `impact.md`).

## Data Inputs

The builder reads:

- `/Users/cotinga/Documents/jakeberv.github.io/_publications/*.md`
- `/Users/cotinga/Documents/jakeberv.github.io/_data/scholar_metrics.json`
- `/Users/cotinga/Documents/jakeberv.github.io/_data/map_data.json`
- `/Users/cotinga/Documents/jakeberv.github.io/data/altmetric/raw/*.csv`

## Generated Outputs

Builder script:

- `/Users/cotinga/Documents/jakeberv.github.io/scripts/build-impact-dashboard-data.py`

Default output directory:

- `/Users/cotinga/Documents/jakeberv.github.io/data/impact/`

Generated files:

- `impact_dashboard.json`
- `impact_reconciliation.json`
- `exports/*.json`
- `exports/*.csv`

Dataset catalog links in `impact_dashboard.json` are absolute site paths under `/data/impact/exports/`.

## Build Hooks

Local preview hook:

- `/Users/cotinga/Documents/jakeberv.github.io/scripts/local_preview.command`
- Runs `python3 scripts/build-impact-dashboard-data.py` before `jekyll build`.

Deploy hook:

- `/Users/cotinga/Documents/jakeberv.github.io/.github/workflows/deploy_site.yml`
- Runs `python3 scripts/build-impact-dashboard-data.py` before Jekyll build.

This ensures impact data is regenerated at deploy/build time when source inputs change.

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
