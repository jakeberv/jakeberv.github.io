---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 5 Implementation Plan

**Goal:** Replace embedded Font Awesome 5.5 with AcademicPages v0.9's Font Awesome 6.7.2 source, a separately cached stylesheet, modern local webfonts, canonical markup prefixes, and reproducible verification.

**Architecture:** Compile Font Awesome core, solid, and brands through a dedicated Jekyll entry point. Load the stylesheet normally after local Academicons, preload its WOFF2 files, and enforce the complete asset and markup boundary through Node tests.

## Constraints

- Work only on `codex/infra-sync-pass-5`; preserve `.RData` and `todo` untouched and unstaged.
- Preserve 241 routes, content, navigation, themes, page geometry, data, images, Academicons, JavaScript, Gem files, lockfiles, and workflows.
- Limit binary changes to the four approved Font Awesome 6 font files replacing the legacy Font Awesome 5 set.
- Do not commit or push without approval.

## Tasks

- [x] Capture route, hash, font-inventory, computed-icon, and screenshot baselines under `/tmp`.
- [x] Add a failing Font Awesome contract test and observe the intended Phase 4 failures.
- [x] Replace the vendored Font Awesome Sass with the upstream 6.7.2 source.
- [x] Replace legacy font formats with the solid and brands TTF/WOFF2 pairs.
- [x] Split Font Awesome into its own Jekyll-rendered stylesheet and add stable head delivery.
- [x] Migrate static and dynamic markup prefixes plus dependent local Sass selectors.
- [x] Add `npm run check:icons` and include it in the explicit npm test command.
- [x] Synchronize repository and architecture documentation.
- [x] Run final Node, Jekyll, palette, browser, visual, route, hash, and repository audits.
- [x] Prepare the approval-only commit/push handoff.

## Acceptance Criteria

- All 237 shared-layout pages load one `main.css` and one `fontawesome.css`; three redirect documents and the standalone talk-map HTML artifact remain intentionally headless.
- `main.css` contains no Font Awesome source; `fontawesome.css` identifies 6.7.2 and references only deployed fonts.
- The site contains exactly four Font Awesome font files and no legacy EOT, SVG, or WOFF assets.
- Every referenced static or configured dynamic icon resolves in the Font Awesome 6 variable map.
- All six palettes build the same 241 routes, with no missing icons, failed assets, overflow, or unexplained geometry changes.
- `assets/js/main.min.js` and `package-lock.json` remain byte-identical to the Phase 4 baseline.

## Verification Summary

- 26/26 Node tests pass and the committed JavaScript bundle is current.
- All six palettes build 241 unchanged routes; the final default build also passes.
- All 237 shared-layout pages load the separated stylesheet, while the four known headless artifacts remain unchanged.
- Chromium confirms the FA6 solid and brands families, valid rendered glyphs, the syntax icon at weight 900, theme-toggle persistence, and zero local asset failures or overflow on the tested desktop/mobile routes.
- The four deployed Font Awesome files total 913,808 bytes, compared with the 2.6 MB legacy set.
- The route manifest, JavaScript bundle, and package lock remain byte-identical; no excluded content, data, image, Gem, workflow, or dependency-lock paths changed.
