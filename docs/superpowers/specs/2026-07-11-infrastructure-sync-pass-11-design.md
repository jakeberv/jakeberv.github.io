# AcademicPages Infrastructure Sync Pass 11 Design

## Objective

Complete the final useful AcademicPages v0.9 compatibility work by enforcing rendered-resource integrity, replacing the broken inherited talk map, and supporting dormant BibTeX publication actions without changing existing content, CV behavior, navigation, dashboards, or the 220-route contract.

The comparison baseline is AcademicPages v0.9 `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. After Phases 1-10, the remaining actionable differences were the v0.9 `bibtexurl` interface and two local deployment defects: stale favicon references and a talk map backed by missing Leaflet assets and demo coordinates.

## Adopted from AcademicPages

- Publication `bibtexurl` metadata and a corresponding download action.
- A maintained talk-location capability, adapted from v0.9's `_talks` map direction.
- The streamlined favicon-delivery pattern using a small set of valid icon references.

## Local Compatibility Hardening

- Generate talk-map data deterministically from existing `_news` geo front matter instead of network geocoding.
- Use the site's established D3, TopoJSON, semantic-token, and `site:themechange` interfaces rather than the obsolete Leaflet beta and marker-cluster output.
- Validate rendered HTML, CSS, manifests, local routes, exact path casing, and insecure active resources after every palette and production build.
- Preserve the separately deployed `/bifrost` documentation as an explicit same-origin exception while validating all other local references.
- Retain `slides_url` as generator input and template fallback while emitting the canonical `slidesurl` front-matter key.

## Interfaces

- `npm run check:assets` validates rendered local-resource integrity.
- `npm run check:talkmap` validates deterministic map data and the page-scoped runtime.
- `data/talkmap/talk_events.json` is the generated talk-map dataset.
- Publication generator input accepts `bibtex_url`; generated front matter uses `bibtexurl`.
- `/talkmap.html` is the integrated map, while `/talkmap/map.html` remains a compatibility redirect.

## Protected Surfaces

Do not modify existing content collections, `_data/talks.yml`, publication records, CV files or behavior, navigation, dashboard inputs, binaries, Gem files, `package-lock.json`, the shared JavaScript bundle, or scheduled workflows. Preserve `.RData` and `todo` as uncommitted user changes.

## Acceptance

All static contracts, six palette builds, the production build, rendered integration and asset checks, the exact 220-route artifact contract, and desktop/mobile browser checks must pass. Existing career-map output remains schema-compatible, and no favicon, Leaflet, marker-cluster, or local-resource request may fail.
