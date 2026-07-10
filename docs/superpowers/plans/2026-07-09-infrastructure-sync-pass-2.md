---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the AcademicPages v0.9 Sass foundation while preserving the site's current light appearance, content, URLs, custom components, and GitHub Pages deployment model.

**Architecture:** Reorganize the existing Sass into upstream-style theme, include, and layout layers. Port the upstream CSS custom-property contract into the current behavioral styles rather than replacing them wholesale, retaining legacy JavaScript and vendor compatibility until later phases.

**Tech Stack:** Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Bundler 2.5.18 with validated fallback, Node 20, Liquid, Sass, classic browser JavaScript, and Playwright CLI verification.

## Global Constraints

- Work only on `codex/infra-sync-pass-2`; do not modify `master`.
- Preserve `.RData` and `todo` without editing or staging them.
- Do not commit or push without explicit user approval.
- Preserve all content, URLs, navigation, collection schemas, visual identity, dashboards, and GitHub Pages compatibility.
- Do not modify data, generated datasets, data scripts, binary assets, JavaScript, package manifests, lockfiles, Gem files, or `.github/workflows/`.
- Do not add dark-mode activation, alternate palettes, Font Awesome 6, JavaScript modules, npm modernization, Mermaid, Plotly, or JSON CV support.

---

### Task 1: Capture and record the Phase 1 baseline

- [x] Run the full safe Jekyll build.
- [x] Save the 243-route manifest, generated stylesheet, desktop/mobile screenshots, and computed-style snapshots under `/tmp/academicpages-phase2-baseline`.
- [x] Verify the new Sass topology and theme-contract assertions fail before implementation.

### Task 2: Reorganize the Sass source tree

- [x] Move helper partials into `_sass/include/` and layout partials into `_sass/layout/`.
- [x] Split shared settings and the default light palette into `_themes.scss` and `theme/_default_light.scss`.
- [x] Fold animation and print rules into `layout/_base.scss` and remove obsolete root partials.
- [x] Rebuild `assets/css/main.scss` with the approved import order and local custom styles last.

### Task 3: Port the theme-variable contract

- [x] Add `site_theme: "default"` to `_config.yml`.
- [x] Declare all 16 approved `--global-*` values in the default light theme.
- [x] Replace core theme-color uses with the matching custom properties while preserving layout and JavaScript-coupled behavior.
- [x] Build and inspect the stylesheet for missing variables, duplicate imports, and retained compatibility selectors.

### Task 4: Synchronize architecture documentation

- [x] Update `README.md` with the Sass architecture, supported theme setting, validation command, and deferred phases.
- [x] Update `agents/SITE_ARCHITECTURE_SPEC_TEMPLATE.md` with the same operating contract.
- [x] Confirm no `agents/INDEX.md` update is required.

### Task 5: Complete regression verification and handoff

- [x] Rebuild with `./scripts/local_preview.command --build-only --full-build --skip-data`.
- [x] Compare routes, computed styles, and screenshots with the saved baseline.
- [x] Run browser smoke tests for representative pages and interactions at desktop and mobile viewports.
- [x] Run `git diff --check` and audit changed paths against the global constraints.
- [x] Prepare the required `Commit locally? (yes/no)` and `Push to remote? (yes/no)` handoff prompts.
