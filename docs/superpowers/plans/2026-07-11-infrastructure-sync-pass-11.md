# AcademicPages Infrastructure Upgrade Phase 11

## Implementation Plan

1. Capture branch, route, protected-file, bundle, lockfile, and current rendered-asset baselines under `/tmp`.
2. Add failing rendered-asset, talk-map, and publication-generator contracts and verify the intended failures.
3. Normalize shared favicon declarations to existing assets and add the reusable rendered-resource validator.
4. Extend the news-geo builder with fixed-date deterministic talk-map output while preserving career-footprint schema and behavior.
5. Replace the broken iframe and Leaflet demo with a responsive, accessible, theme-aware D3 map and a legacy route redirect.
6. Add canonical slides and BibTeX publication metadata/actions without modifying current publication records.
7. Run asset validation after every palette and production build, synchronize developer documentation, and preserve scheduled workflows.
8. Run all static, native, production, palette, browser, artifact, and protected-surface checks before requesting commit or push approval.

## Constraints

- Keep exactly 220 public HTML routes.
- Do not add npm dependencies or change `package-lock.json`.
- Do not use a geocoding service or reactivate upstream talk scraping.
- Do not modify content collections, `_data/talks.yml`, CV files, binaries, Gem files, the shared JavaScript bundle, or scheduled workflows.
- Do not commit or push without explicit approval.
