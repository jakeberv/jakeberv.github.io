# Career Footprint Pipeline Spec

## Purpose

Define how the `/background/` Global Career Footprint map is built from `_news` geo front matter and deployed with GitHub Actions.

## Inputs

- Source collection: `_news/*.md`
- Required schema anchor: `geo:` block in front matter (validated by `scripts/qa/validate-news-geo.mjs`)
- Non-inputs: `data/altmetric/*` and other impact dashboard sources are not used by this pipeline.

## Build-Time Generator

- Script: `scripts/build-career-geo-data.mjs`
- Output: `data/career_geo/career_footprint.json`
- Output contract:
  - top-level: `generated_at`, `source`, `entry_count`, `entries`
  - each entry: `id`, `title`, `url`, `date`, `year`, `scope`, `countries[]`, `localities[]`, `excerpt`
  - country row: `code`, `name`, `region_m49`, `weight`
  - locality row: `name`, `country_code`, `lat`, `lon`, `weight`

## Runtime Consumer

- Page insertion: `_pages/background.md` includes `_includes/career-footprint-map.html`
- JS renderer: `assets/js/career-footprint-map.js`
- Styles: `_sass/_custom.scss` scoped under `.bg-career-footprint`
- Runtime controls:
  - mode: `Country Footprint` / `Locality Hotspots`
  - time window: `All Time` / `Last 10y` / `Last 5y`
  - optional `Exclude US`
  - log scaling is fixed (no user toggle)
  - in-person and virtual events are aggregated together (no scope toggle)
- Counting semantics:
  - country/locality values represent unique event counts (`entries.size`) per geography
  - duplicate rows inside a single entry are deduplicated before aggregation

## External Runtime Dependencies

- D3 and TopoJSON libraries are loaded from pinned CDN URLs in the include.
- World basemap topology is loaded from CDN with fallback:
  1. jsDelivr
  2. unpkg
- Site-specific data (`career_footprint.json`) and app logic remain repository-contained.

## Local Preview Workflow

Default local preview fast path:

- `scripts/local_preview.command` skips geo validation/generation for faster UI/content iteration.

When geo/news data changes, run:

1. `node scripts/qa/validate-news-geo.mjs`
2. `node scripts/build-career-geo-data.mjs`
3. Jekyll build/serve

Equivalent one-command path:

- `./scripts/local_preview.command --with-data`

## GitHub Actions Workflow

- Workflow: `.github/workflows/deploy_site.yml`
- Steps:
  1. checkout `master`
  2. setup node
  3. validate geo front matter
  4. validate publication tags
  5. validate publication method tags
  6. generate `career_footprint.json`
  7. Jekyll build
  8. upload + deploy GitHub Pages artifact

## Operational Notes

- Changes to `_news` geo fields must preserve validator compatibility.
- If geo schema changes, update:
  - `scripts/qa/validate-news-geo.mjs`
  - `scripts/build-career-geo-data.mjs`
  - this spec
