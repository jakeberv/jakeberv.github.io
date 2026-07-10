---
published: false
---

# Infrastructure Sync Pass 2 Design

## Goal

Adopt the AcademicPages v0.9 Sass organization and core theme-variable contract while preserving the site's current light appearance, content, URLs, custom components, classic JavaScript behavior, and GitHub Pages compatibility.

## Upstream Baseline

This pass compares the site with AcademicPages master commit `482bc2b22db0500a12c2297d96ba5db44e1d0929` and v0.9 tag `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. Changes are identified as either adopted from AcademicPages or local compatibility hardening.

## Constraints

- Work only on `codex/infra-sync-pass-2`; do not modify `master`.
- Preserve the existing `.RData` and `todo` changes without editing or staging them.
- Keep Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Node 20, and the current Bundler contract.
- Do not modify content, URLs, navigation, collection schemas, data, generated datasets, data scripts, binary assets, JavaScript, package manifests, lockfiles, or GitHub Actions workflows.
- Preserve the existing Font Awesome 5, Magnific Popup, jQuery, FitVids, Stickyfill, smooth-scroll, image-popup, masthead, and sidebar behavior.

## Architecture

### Sass topology (adopted from AcademicPages)

Move reusable helpers to `_sass/include/` and layout/component partials to `_sass/layout/`. Keep syntax highlighting and the site's custom layer at the Sass root. Split the old variables partial into shared settings at `_sass/_themes.scss` and the selected light palette at `_sass/theme/_default_light.scss`.

Fold the small animation and print partials into the base layout partial, matching upstream's organization. The compiled entry point imports shared settings, the selected light theme, layout modules, retained legacy vendor styles, and finally local custom styles.

### Theme contract (adopted from AcademicPages)

The default light theme declares these CSS custom properties: `--global-base-color`, `--global-bg-color`, `--global-footer-bg-color`, `--global-border-color`, `--global-dark-border-color`, `--global-code-background-color`, `--global-code-text-color`, `--global-fig-caption-color`, `--global-link-color`, `--global-link-color-hover`, `--global-link-color-visited`, `--global-masthead-link-color`, `--global-masthead-link-color-hover`, `--global-text-color`, `--global-text-color-light`, and `--global-thead-color`. Core styles consume the properties that replace existing computed colors. `--global-code-text-color` and `--global-link-color-visited` are declared for upstream contract compatibility but remain unused until they can be applied without changing inherited or visited-link rendering.

The build-time `_config.yml` setting `site_theme: "default"` selects `_sass/theme/_default_light.scss`. Only `default` is supported in this phase.

### Visual compatibility (local compatibility hardening)

The default light theme reproduces the current computed palette: base `#7a8288`, background `#fff`, footer and border `#f2f3f3`, dark border `#bdc1c4`, code background `#fafafa`, code text and body text `#494e52`, caption `#777a7d`, link `#2979ab`, link hover `#1f5b80`, visited link `#5f9bc0`, masthead link `#7a8288`, masthead hover `#2979ab`, light text `#9ba1a6`, and table head `#f2f3f3`.

The migration starts from the current partials and ports upstream's variable substitutions into them. It does not copy upstream layout files wholesale because the newer upstream sidebar, masthead, and navigation rules are coupled to newer markup and JavaScript. Current 85px masthead geometry, breakpoints, grid widths, breadcrumbs, figure spacing, sticky sidebar, and greedy navigation remain unchanged.

## Deferred Work

Dark-mode activation is deferred because `_sass/_custom.scss` and the page-specific stylesheets contain hundreds of fixed light-theme colors. Font Awesome 6, alternate palettes, `theme.js`, ES modules, npm modernization, Mermaid, Plotly, and JSON CV styles remain separate future phases.

## Verification

1. Compare the generated route manifest with the Phase 1 baseline and require no URL changes.
2. Build with the GitHub Pages-safe local preview path and require successful Sass compilation.
3. Assert all 16 theme properties and retained Font Awesome 5, Magnific Popup, and custom selectors in the generated stylesheet.
4. Assert the generated HTML retains the classic JavaScript bundle and has no dark-mode or Font Awesome 6 integration.
5. Compare representative desktop and mobile screenshots and computed styles with the pre-migration baseline.
6. Exercise navigation, author links, page visualizations, charts, filters, and image popups without console errors or layout overflow.
7. Audit changed paths, `git diff --check`, and the preserved `.RData` and `todo` changes before handoff.
