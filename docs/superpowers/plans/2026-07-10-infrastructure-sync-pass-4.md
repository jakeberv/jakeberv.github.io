---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 4 Implementation Plan

**Goal:** Complete the upstream theme foundation with six build-time palettes, explicit light/dark mode, fully themed custom components, and reproducible verification.

**Architecture:** Emit shared core and semantic custom properties from isolated palette maps. Apply saved dark mode before paint, publish one theme-change event, and let each visualization redraw through its existing render path.

## Constraints

- Work only on `codex/infra-sync-pass-4`; preserve `.RData` and `todo` untouched and unstaged.
- Preserve 241 routes, content, navigation, data, binaries, images, fonts, and the 85px masthead.
- Keep first visits light and support alternate palettes only as build-time configuration.
- Do not commit or push without approval.

## Tasks

- [x] Capture route, hash, screenshot, and computed-style baselines under `/tmp/academicpages-phase4-baseline`.
- [x] Add isolated light/dark partials for `default`, `air`, `sunrise`, `mint`, `dirt`, and `contrast`.
- [x] Add the 19-property core contract and semantic UI, visualization, syntax, and status roles.
- [x] Add the pre-paint initializer, accessible masthead toggle, persistent navigation behavior, and theme event.
- [x] Tokenize custom, dashboard, filter, syntax, and inline visualization styles.
- [x] Make Chart.js, the braid, method network, and career map respond to theme changes.
- [x] Add `--theme`, static theme tests, the six-palette build matrix, and deployment enforcement.
- [x] Synchronize repository and architecture documentation.
- [x] Run final Node, Jekyll, palette, browser, contrast, route, and repository audits.
- [x] Prepare the approval-only commit/push handoff.

## Verification Summary

- 20/20 Node tests pass and the committed JavaScript bundle is current.
- All six palettes build 241 unchanged routes and satisfy the expanded light/dark contrast matrix.
- Default light/dark browser checks pass on 11 primary routes at desktop and mobile sizes; all five alternate palettes pass both modes on the five visualization-heavy routes.
- Default-light geometry matches the captured baseline, and the tested theme interactions preserve visualization and navigation state.
- No excluded content, data, binary, dependency-lock, Gem, or unrelated workflow path changed.
