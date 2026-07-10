---
published: false
---

# Infrastructure Sync Pass 4 Design

## Goal

Complete the AcademicPages v0.9 theme system while preserving the site's default-light identity, content, routes, 85px masthead, custom interactions, and GitHub Pages deployment model. Support all six upstream build-time palettes and a visitor-controlled dark mode without treating visual parity as a prohibition on reviewed contrast and consistency improvements.

## Upstream Baseline

The verified comparison baseline is AcademicPages master `482bc2b22db0500a12c2297d96ba5db44e1d0929` and v0.9 tag `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. Master remains one CSV-only data-script commit beyond the release.

## Constraints

- Work only on `codex/infra-sync-pass-4`; preserve `.RData` and `todo` without editing or staging them.
- Preserve the clean 241-route manifest, content, collection schemas, navigation entries, data, fonts, images, and binary assets.
- Keep Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Node 20, npm 10, Font Awesome 5, the module bundle, and current visualization libraries.
- First visits are light even when the operating system prefers dark. Only an explicit toggle persists `light` or `dark` in local storage.
- Do not commit or push without explicit approval.

## Architecture

### Palette matrix (adopted from AcademicPages)

`site_theme` accepts `default`, `air`, `sunrise`, `mint`, `dirt`, or `contrast`. The Sass entry point imports the selected light partial, a compile-alias bridge, and the matching dark partial. The shared emitter publishes the 19 core runtime properties plus local UI, visualization, syntax, and status roles.

The deployed `default` light palette retains the Phase 3 core values. Other palettes begin with upstream v0.9 values and receive minimal accessibility corrections. Dark partials use isolated names and emit runtime CSS only, preventing them from replacing light compile-time values used by legacy Sass helpers.

### Local semantic roles (local compatibility hardening)

Custom cards, controls, overlays, borders, typography, syntax highlighting, dashboards, and inline research visualizations consume `--site-*` and `--viz-*` roles. Institutional brand colors and scientific categorical palettes remain literal. Print media re-emits the selected light palette so dark-mode pages print legibly.

### Theme runtime (adopted and hardened)

A small pre-stylesheet initializer applies a saved dark choice before first paint. The module runtime controls `html[data-theme="dark"]`, the masthead button, Font Awesome 5 icon, ARIA state, browser theme color, and `site:themechange` events. Missing, invalid, or blocked local storage resolves to light; a blocked store does not prevent in-page toggling.

The theme control is a persistent tail item in greedy navigation. The overflow button has a dedicated selector, the logo remains persistent and is inverted in dark mode, and selected navigation links remain usable.

### Visualization behavior (local compatibility hardening)

Chart.js defaults read visualization roles. The impact dashboard reuses `renderAll()`, the teaching chart updates without animation, and the braid, method network, and career map preserve their state while redrawing. Exported braid SVGs contain resolved colors rather than unresolved custom properties.

## Public Contract

- `site_theme`: `default`, `air`, `sunrise`, `mint`, `dirt`, or `contrast`.
- `localStorage.theme`: `light`, `dark`, or absent; absence means light.
- Dark mode selector: `html[data-theme="dark"]`.
- Theme event: `site:themechange` with `detail.theme`.
- Commands: `npm run check:themes`, `npm run test:themes`, and `./scripts/local_preview.command --theme NAME`.

## Deferred Work

Font Awesome 6, Plotly, Mermaid, JSON CV support, runtime palette selection, dependency modernization, and PR-triggered CI remain separate phases.

## Verification Results

- `npm test` passes all 20 asset, runtime, responsive-state, theme-contract, and deterministic-bundle checks.
- `npm run test:themes` builds all six palettes to the same 241 routes and verifies light/dark text, link, code, selection, tooltip, control, status, and visualization contrast.
- The final default build passes through the validated local Bundler fallback with only the known Bundler, Faraday, and stale generated-data warnings.
- The unchanged 241-route manifest was browser-tested in default light and dark at 1440x1000 and 390x844. Five visualization-heavy routes were also tested in both modes for every alternate palette.
- Browser checks found no console errors, failed local assets, horizontal overflow, masthead overlap, or lost visualization state. The logo, greedy navigation, theme persistence/event, charts, map, braid, method network, news controls, standalone SVG export, and light print palette were exercised.
- Default-light screenshot dimensions and layout geometry match the Phase 3 baseline. Visible differences are limited to the theme control, selected-navigation feedback, semantic surface consolidation, and reviewed contrast corrections.
- The route, lockfile, Gem, content, data, generated-data, binary, font, image, and workflow-scope audits pass. `.RData` and `todo` remain the same pre-existing unstaged local modifications.
