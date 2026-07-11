---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 9 Implementation Plan

> **For agentic workers:** Use test-driven development for contract changes and fresh verification before claiming completion.

**Goal:** Establish a production-grade deployment lifecycle and a strict public artifact boundary without changing the visitor-facing website.

**Architecture:** A reusable Node validator owns both the exact HTML route manifest and a typed denylist for repository-only sources. The same validator runs after every palette build and after the production build. GitHub Actions uses Node 24/npm 11 and applies production-equivalent validation to pull requests while isolating deployment permissions.

**Tech Stack:** Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Bundler 2.5.18, Node 24 LTS, npm 11, Node's built-in test runner, Docker, and GitHub Actions.

## Constraints

- Work only on `codex/infra-sync-pass-9`.
- Preserve `.RData`, `todo`, and `fetch_scholar_metrics.py` byte-for-byte and unstaged.
- Preserve all intended public content, URLs, visual behavior, data, binaries, Gem files, and browser bundle behavior.
- Keep both scheduled data workflows behaviorally unchanged apart from official action-major updates.
- Do not commit or push without explicit approval.

## Tasks

- [x] Capture route, bundle, lockfile, Scholar source, and user-file baselines.
- [x] Add failing artifact, route, Node 24, container, and workflow contract tests.
- [x] Exclude repository-only files and reduce the intended route manifest from 240 to 220.
- [x] Add the reusable site-artifact validator and integrate it with all palette and production builds.
- [x] Upgrade package and container contracts to Node 24/npm 11 without changing dependency versions.
- [x] Modernize official actions and add read-only pull-request validation.
- [x] Synchronize README and architecture documentation.
- [x] Run native, palette, deterministic-bundle, artifact, workflow, and container verification.

## Acceptance Criteria

- Exactly 220 case-sensitive HTML routes are produced for all six palettes and the final default build.
- No protected documentation, analysis source, lockfile, notebook, R/RDS/RStudio state, Python source, command script, or Node QA source enters `_site`.
- `fetch_scholar_metrics.py` remains tracked, unchanged, and invoked by the Python 3.12 Scholar workflow, but is absent from `_site`.
- Pull requests run the full build with read-only contents permission and cannot upload or deploy Pages.
- Pages/OIDC permissions are scoped to the deployment job.
- Node 24/npm 11 native and container contracts pass with unchanged npm dependency versions and browser-bundle bytes.

## Verification Commands

```bash
npm ci
npm test
npm run check:site-artifact
npm run test:themes
npm run build:js
npm run check:js
./scripts/local_preview.command --build-only --full-build --skip-data
npm run test:container
git diff --check
git status --short
```
