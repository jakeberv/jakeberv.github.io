---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 9 Design

## Objective

Complete the deployment-lifecycle foundation around AcademicPages v0.9 by defining a strict public artifact boundary, moving JavaScript tooling to Node 24 LTS and npm 11, modernizing supported GitHub Actions, and validating pull requests with the same production build path used for Pages.

This is an infrastructure phase. Content, appearance, navigation, dashboards, CV behavior, browser code, data products, and intended visitor-facing URLs remain unchanged. The route count changes only because repository documentation that was never intended as site content stops being rendered.

## AcademicPages Lifecycle Alignment

- Keep GitHub Pages-safe Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, and Bundler 2.5.18.
- Retain the established npm-driven browser-asset validation and committed deterministic bundle.
- Use current supported major releases of the official checkout, Node setup, Python setup, Pages upload, and Pages deployment actions.
- Validate pull requests through the complete site build instead of discovering integration failures only after merge.

## Local Deployment Hardening

- `_config.yml` excludes agent instructions, implementation records, notebooks, R/RDS/RStudio state, lockfiles, root development scripts, and other repository-only inputs.
- `scripts/qa/site-artifact-contract.mjs` is the single route and artifact validator for local builds, all six palette builds, pull requests, and production deployment.
- The contract compares HTML files case-sensitively against the tracked 220-route manifest and rejects protected prefixes, filenames, and development extensions with actionable diagnostics.
- `fetch_scholar_metrics.py` remains tracked and executable by `.github/workflows/fetch_scholar_data.yml`, but the artifact contract rejects it from `_site` like every other Python source file.
- The temporary `AGENTS/` casing canonicalizer is removed because internal agent documents no longer enter the Jekyll output.

## Runtime And Workflow Model

Node 24 and npm 11 are the only supported JavaScript toolchain majors. The package dependencies remain jQuery 3.7.1, UglifyJS 3.19.3, and onchange 7.1.0. The lockfile is regenerated under the new runtime without changing those versions, and repeated browser-bundle builds must remain byte-identical.

The Pages workflow runs on pushes to `master`, manual dispatches, and pull requests. Every event installs locked npm dependencies, runs all contracts and data validation, builds all six themes, performs the final default build, and validates `_site`. Pull requests receive read-only repository permission and never upload or deploy a Pages artifact. Pages and OIDC permissions exist only on the deployment job. Per-PR/per-ref concurrency prevents validation from cancelling production.

The Scholar and impact-refresh workflows retain their schedules, Python 3.12 runtimes, generated files, commands, and direct pushes to `master`; only official action majors change.

## Protected Surfaces

Do not modify content collections, page content, navigation, public data, generated datasets, PDFs, images, fonts, browser behavior, Gem files, or `fetch_scholar_metrics.py`. Preserve `/talkmap/`, feeds, redirects, sitemap, robots, `CNAME`, public downloads, and dashboard JSON/CSV assets.

## Verification

The phase is accepted when Node 24/npm 11 tests pass, six palettes and the default production build each produce exactly 220 routes, forbidden repository inputs are absent from `_site`, the browser bundle is byte-identical, Scholar source remains tracked and workflow-referenced, and all protected user files retain their initial hashes.
