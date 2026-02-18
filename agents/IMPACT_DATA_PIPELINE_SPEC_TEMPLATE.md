# Impact data pipeline spec template

This template documents how `/impact/` dashboard data is generated and maintained.

## Purpose
- Keep dashboard outputs reproducible and deploy-safe.
- Define upstream data dependencies and generated runtime artifacts.
- Define minimum validation checks before publish.

## Runtime consumer
- Page shell: `_pages/impact.md`
- Include shell: `_includes/impact-dashboard.html`
- Client logic: `assets/js/impact-dashboard.js`
- Client styles: `assets/css/impact-dashboard.css`
- Runtime datasets loaded by the client:
  - `data/impact/impact_dashboard.json`
  - `data/impact/impact_reconciliation.json`
- Client fetch/cache expectations:
  - JSON fetch uses default browser caching behavior in `assets/js/impact-dashboard.js`.
  - Include URLs for dashboard JSON/CSS/JS should use a build-time version query (for example `?v={{ site.time | date: '%Y%m%d%H%M%S' }}`) to invalidate stale caches after deploy.

## Build-time generator
- Script: `scripts/build-impact-dashboard-data.py`
- Default invocation:
  - `python3 scripts/build-impact-dashboard-data.py --repo-root "$ROOT_DIR" --out-dir "$ROOT_DIR/data/impact"`
- Reach refresh script (API-backed; run on controlled schedule/manual trigger):
  - `scripts/build-impact-reach-data.py`
  - `python3 scripts/build-impact-reach-data.py --repo-root "$ROOT_DIR" --out-dir "$ROOT_DIR/data/impact/reach"`

## Upstream inputs
- `_publications/*.md` (canonical publication registry + metadata)
- `_data/scholar_metrics.json` (citation summary + cites-per-year series)
- `_data/map_data.json` (WOS citation geography points)
- `data/altmetric/raw/*.csv` (Altmetric mention exports)

## Generated outputs
- `data/impact/impact_dashboard.json`
- `data/impact/impact_reconciliation.json`
- `data/impact/exports/*.json`
- `data/impact/exports/*.csv`
- `data/impact/reach/outlet_reach.json`
- `data/impact/reach/outlet_reach.csv`
- `data/impact/reach/reach_metadata.json`
- `data/impact/reach/time_adjusted_mentions_reach.json`
- `data/impact/reach/time_adjusted_mentions_reach.csv`
- `data/impact/reach/time_adjusted_outlet_reach.json`
- `data/impact/reach/time_adjusted_outlet_reach.csv`
- `data/impact/reach/tranco_snapshots_used.json`
- `data/impact/reach/tranco_snapshots_used.csv`

Dataset links in `impact_dashboard.json` should remain site-absolute (`/data/impact/exports/...`) so downloads resolve in local preview and on deployed Pages.

## Data contract: dashboard payload
- File: `data/impact/impact_dashboard.json`
- Required top-level keys:
  - `generated_at_utc`
  - `description`
  - `metrics`
  - `reconciliation_counts`
  - `citation_series`
  - `donut_series`
  - `citation_geography`
  - `altmetric_geography`
  - `canonical_publications`
  - `mentions`
  - `outlets`
  - `stories`
  - `derived_insights`
  - `dataset_catalog`

### Minimal JSON shape
```json
{
  "generated_at_utc": "2026-01-01T00:00:00Z",
  "description": "Build metadata for this dataset.",
  "metrics": {},
  "reconciliation_counts": {},
  "citation_series": {},
  "donut_series": {},
  "citation_geography": {},
  "altmetric_geography": {},
  "canonical_publications": [],
  "mentions": [],
  "outlets": [],
  "stories": [],
  "derived_insights": {},
  "dataset_catalog": []
}
```

## Data contract: reconciliation payload
- File: `data/impact/impact_reconciliation.json`
- Required top-level keys:
  - `generated_at_utc`
  - `summary`
  - `scholar_unmatched`
  - `scholar_ignored_non_research`
  - `altmetric_unmatched`
  - `altmetric_alias_matched`
  - `tracked_doi_count`
  - `tracked_dois`

### Minimal JSON shape
```json
{
  "generated_at_utc": "2026-01-01T00:00:00Z",
  "summary": {},
  "scholar_unmatched": [],
  "scholar_ignored_non_research": [],
  "altmetric_unmatched": [],
  "altmetric_alias_matched": [],
  "tracked_doi_count": 0,
  "tracked_dois": []
}
```

## Update workflows
### Deploy-time generation
- Workflow file: `.github/workflows/deploy_site.yml`
- Required behavior: run `scripts/build-impact-dashboard-data.py` before `jekyll build`.
- Required behavior: verify committed reach datasets exist before `jekyll build`.

### Local preview generation
- Script: `scripts/local_preview.command`
- Required behavior: run `scripts/build-impact-dashboard-data.py` before local `jekyll build`.
- Required behavior: use committed reach datasets (do not run API-backed reach refresh).

### Reach refresh generation
- Workflow file: `.github/workflows/refresh_impact_reach_data.yml`
- Required behavior: run `scripts/build-impact-reach-data.py` on schedule and manual trigger.
- Required behavior: apply conservative lookup controls (`--historical-window-days`, `--historical-max-date-lookups`, `--historical-date-api-delay-ms`).
- Required behavior: commit only `data/impact/reach/*` outputs when they changed.

### Upstream source refreshes
- Scholar refresh workflow: `.github/workflows/fetch_scholar_data.yml` updates `_data/scholar_metrics.json`.
- Citation geography refresh: `citation_map_parser.R` parses `_data/map.txt` to `_data/map_data.json`.
- Altmetric refresh: add/update CSV exports under `data/altmetric/raw/`.

## Operational checklist
- Builder exits successfully.
- `data/impact/impact_dashboard.json` and `data/impact/impact_reconciliation.json` parse as valid JSON.
- `dataset_catalog` paths correspond to files present under `data/impact/exports/`.
- `data/impact/reach/reach_metadata.json` reports non-zero ranked domains when network or cache is available.
- `/impact/` loads charts/tables without console errors.
- Deploy and local preview paths avoid live API refresh for reach data.
- Reach refresh workflow updates committed reach outputs on controlled cadence.

## Runbook notes
- If upstream source formats change, update parser/normalization logic in `scripts/build-impact-dashboard-data.py` before regenerating outputs.
- If scholar/map refresh jobs fail, preserve prior valid upstream input files and rerun generation once inputs are healthy.
