---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the AcademicPages v0.9 JavaScript foundation with a reproducible Node 20/npm 10 build while preserving the current site experience and GitHub Pages model.

**Architecture:** Build the committed module from npm-provided jQuery 3.7.1 and two local shared sources. Remove obsolete plugins only where native CSS and current markup provide behavioral parity, and verify source/bundle consistency locally and during deployment.

**Tech Stack:** Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Bundler 2.5.18 with validated fallback, Node 20, npm 10, jQuery 3.7.1, UglifyJS 3.19.3, Liquid, Sass, and Playwright CLI.

## Global Constraints

- Work only on `codex/infra-sync-pass-3`; do not commit directly to `master`; merge through a PR.
- Preserve `.RData` and `todo` without editing or staging them.
- Do not commit or push without explicit user approval.
- Preserve content, URLs, navigation, collection schemas, visual identity, custom dashboards, and GitHub Pages compatibility.
- Use baseline screenshots to detect regressions, not to force pixel identity. Permit documented, upgrade-driven visual or usability improvements that preserve the site's identity.
- Do not modify data, generated datasets, data scripts, Gem files, binary assets, fonts, or images.
- Modify only the Pages deployment workflow, and only to verify the committed shared bundle.
- Do not add dark mode, alternate palettes, upstream `theme.js`, Font Awesome 6, Plotly, Mermaid, or JSON CV support.

---

### Task 1: Capture the Phase 2 baseline

- [x] Build the site and save the 243-route manifest, generated stylesheet, legacy bundle, screenshots, and layout metrics under `/tmp/academicpages-phase3-baseline`.
- [x] Confirm the generated site has zero direct image-file links.
- [x] Confirm `.RData` and `todo` are the only pre-existing working-tree changes.

### Task 2: Create the deterministic npm build

- [x] Add red tests for deterministic generation and non-writing stale-bundle detection.
- [x] Pin Node 20/npm 10, jQuery 3.7.1, UglifyJS 3.19.3, and `onchange` 7.1.0 in the package contract and lockfile.
- [x] Add `scripts/build-js.mjs` with fixed inputs and build/check modes.
- [x] Generate the bundle twice and require identical SHA-256 hashes.

### Task 3: Migrate the shared browser runtime

- [x] Add red tests for module delivery, persistent navigation, plugin removal, and native CSS parity.
- [x] Update shared interactions and greedy navigation for jQuery 3.7.1 without adopting upstream theme or 70px layout assumptions.
- [x] Remove vendored jQuery and the four obsolete plugin layers.
- [x] Add native scrolling, reduced-motion, sticky positioning, and responsive-video parity.

### Task 4: Enforce and document the contract

- [x] Add a red workflow test, then make the Pages build run `npm ci` and `npm run check:js` under Node 20.
- [x] Update repository and agent architecture documentation.
- [x] Record adopted upstream behavior, local hardening, exclusions, and deferred phases.

### Task 5: Complete regression verification and handoff

- [x] Run npm tests, bundle checks, dependency audit, workflow parsing, and the full safe Jekyll build.
- [x] Compare routes, screenshots, and computed layout metrics with the saved baseline; classify every visible delta as an intentional improvement or a regression to fix.
- [x] Exercise representative pages and interactions at desktop and mobile viewports.
- [x] Run `git diff --check`, audit changed paths, and confirm `.RData` and `todo` remain untouched and unstaged.
- [x] Prepare the required `Commit locally? (yes/no)` and `Push to remote? (yes/no)` handoff prompts.
