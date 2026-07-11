---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` and verify each task before proceeding.

**Goal:** Add a reproducible Docker and Dev Container development environment without changing the public website.

**Architecture:** A non-root, multi-runtime image supplies the repository's pinned Ruby and Node toolchains. Compose and Dev Containers share that image and delegate all Jekyll behavior to the existing preview wrapper, while static Node tests enforce the environment contract without adding Docker to deployment.

**Tech Stack:** Docker, Docker Compose, VS Code Dev Containers, Ruby 3.3.4, Bundler 2.5.18, Node 20, npm 10, Jekyll 3.10, Node's built-in test runner.

## Global Constraints

- Work only on `codex/infra-sync-pass-7`; preserve `.RData` and `todo` untouched and unstaged.
- Preserve exactly 241 routes and the current rendered `/cv/` output and selected PDF URL.
- Do not modify content, navigation, data, PDFs, images, fonts, Gem files, lockfiles, JavaScript bundles, or workflows.
- Docker is optional and must not replace the native preview workflow or GitHub Pages deployment.
- Do not commit or push without explicit approval.

## Tasks

- [x] Capture protected-file hashes, the 241-route manifest, and rendered CV baseline.
- [x] Add failing static tests for runtime pins, non-root execution, volume isolation, Dev Container wiring, and preview delegation.
- [x] Add the multi-stage Dockerfile and `.dockerignore` boundary.
- [x] Add deterministic container bootstrap behavior with validated npm-volume reuse keyed to `package.json` and `package-lock.json`.
- [x] Add Docker Compose and Dev Container entry points.
- [x] Add `check:container` and `test:container` commands without changing dependencies or the lockfile.
- [x] Synchronize README and site architecture documentation.
- [x] Run native, container, theme-matrix, route, CV, browser, and protected-path verification.
- [x] Complete independent code review and prepare the approval-only handoff.

## Acceptance Criteria

- `npm test` enforces the static container contract without requiring Docker.
- Docker reports Ruby 3.3.4, Bundler 2.5.18, Node 20.x, npm 10.x, and a non-root UID; occupied host UID/GID values do not prevent image creation.
- Container dependencies are isolated from host gems and `node_modules`.
- `docker compose up --build` serves the existing site on port 4001 through `scripts/local_preview.command`.
- Native and container builds both produce the unchanged 241-route manifest.
- `/cv/` renders the same markup and selected PDF as the baseline.
- Protected files and workflows remain hash-identical.

## Verification Commands

```bash
bash -n scripts/container_bootstrap.command
npm run check:container
npm test
docker compose config
docker compose build --pull
npm run test:container
npm run check:themes
npm run check:scientific
./scripts/local_preview.command --build-only --full-build --skip-data
git diff --check
git status --short
```

## Verification Summary

- `npm test` passes 38/38 tests, with a current deterministic JavaScript bundle and 12/12 container-contract tests.
- `npm run test:container` succeeds from fresh dependency volumes; all six palettes and the final default build produce exactly 241 routes.
- The native full build succeeds with only the known Bundler fallback, Faraday, and stale-data warnings.
- Docker reports Ruby 3.3.4, Bundler 2.5.18, Node 20.x, npm 10.x, non-root execution, and writable isolated dependency caches; a UID/GID 1001 image probe also succeeds.
- The base Compose service becomes healthy without server tracebacks; the Dev Container override disables only that preview health check while its command is replaced.
- Desktop/mobile light/dark browser checks report no console errors, overflow, broken images, or masthead overlap on representative routes.
- The route manifest remains 241 pages; rendered `/cv/` is byte-identical and still selects `BERV_2026_02_02.pdf`.
- `.RData`, `todo`, CV source, Gem files, lockfiles, JavaScript bundle, and workflows remain hash-identical to the Phase 7 baseline.
