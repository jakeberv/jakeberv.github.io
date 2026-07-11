---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` and verify each task before proceeding.

**Goal:** Add deterministic, validation-first publication and talk authoring tools without modifying existing site content.

**Architecture:** A shared standard-library Python core parses and renders CSV/TSV records. Publication output is staged through the site's existing Node taxonomy validators, while explicit output directories and collision preflight keep all generation opt-in.

**Tech Stack:** Python standard library, Node 20 built-in test runner, Jekyll 3.10, existing publication taxonomy validators.

## Global Constraints

- Work only on `codex/infra-sync-pass-8`; preserve `.RData` and `todo` untouched and unstaged.
- Do not modify existing publications, `_data/talks.yml`, pages, CV files, navigation, taxonomies, data, binaries, browser assets, Gem files, lockfiles, or workflows.
- Remove only the unintended `/markdown_generator/` route; preserve exactly 240 intended HTML routes.
- Do not commit or push without explicit approval.

## Tasks

- [x] Capture protected hashes, the 241-route baseline, and the published generator inventory.
- [x] Add failing CLI, taxonomy, deterministic-output, collision, and artifact-boundary tests.
- [x] Add the shared Python generator core and replace both pandas entry points.
- [x] Extend publication validators to accept staged directories while preserving defaults.
- [x] Exclude generator tooling from Pages and update the route invariant to 240.
- [x] Synchronize generator, README, and architecture documentation.
- [x] Run native, palette, container, route, artifact, and protected-path verification.
- [x] Complete independent code review and prepare the approval-only handoff.

## Acceptance Criteria

- `check` performs no persistent writes; `generate` requires `--output-dir`.
- Publication output satisfies both canonical taxonomy validators before it can be written.
- CSV and TSV inputs produce deterministic, site-compatible Markdown.
- Collisions fail before writes unless `--overwrite` is explicit; a target created after preflight is not replaced, existing permissions survive overwrite, and unrelated files are preserved.
- `_data/talks.yml` and existing collection content remain byte-identical.
- All six palettes build 240 intended routes and `_site/markdown_generator` is absent.

## Verification Commands

```bash
npm run check:generators
npm test
npm run check:themes
npm run test:themes
npm run test:container
./scripts/local_preview.command --build-only --full-build --skip-data
git diff --check
git status --short
```

## Verification Summary

- `npm test` passes 55/55 primary tests, the deterministic JavaScript check, and 26/26 static container-contract tests.
- `npm run check:generators` passes 17/17 CLI tests, including taxonomy failures, malformed/invalid encoding, CRLF normalization, case-insensitive duplicate targets, atomic no-clobber behavior, permissions, overwrite preservation, and strict validator option parsing.
- Native and container six-palette matrices match the tracked 240-route manifest and never publish `markdown_generator/`.
- The full Docker test path and final native Jekyll build pass with only the known Faraday and stale-data warnings.
- The only route removed from the 241-route baseline is the unintended `/markdown_generator/index.html` development page.
- Existing publications, `_data/talks.yml`, CV and page sources, taxonomies, data, assets, JavaScript bundle, Gem files, lockfiles, and workflows remain unchanged.
