---
published: false
---

# Infrastructure Sync Pass 6 Design

## Goal

Adopt AcademicPages v0.9's scientific-content runtime pattern while preserving the site's content, 241 routes, visual design, theme system, deterministic JavaScript bundle, and GitHub Pages deployment model. Scientific libraries should load only for pages or fenced blocks that actually need them.

## Upstream Baseline

The verified comparison baseline is AcademicPages v0.9 `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. AcademicPages master `482bc2b22db0500a12c2297d96ba5db44e1d0929` remains one data-generator commit ahead, limited to `markdown_generator/talks.py`; that generator change is out of scope for this pass.

## Constraints

- Work only on `codex/infra-sync-pass-6`; preserve `.RData` and `todo` without editing or staging them.
- Keep the carried-over Font Awesome QA fixes as a separate unstaged change group until commit approval is given.
- Preserve content, routes, collection schemas, data, images, fonts, Gem files, package lock, workflows, and the current deployment model.
- Keep jQuery 3.7.1, the existing module bundle delivery, the Phase 4 theme API, and the Phase 5 Font Awesome boundary.
- Do not commit or push without explicit approval.

## Architecture

### Opt-in MathJax 4 (adopted from AcademicPages)

The global MathJax 2.7.4 head dependency is removed. A new `scientific-content` include emits MathJax configuration and the pinned MathJax 4.0.0 runtime only when a page sets `mathjax: true`. The existing 404 page is the only current consumer, so ordinary shared-layout pages no longer request MathJax.

The MathJax configuration keeps the existing LaTeX delimiters, adds single-dollar inline math, enables escaped dollar signs, uses AMS equation numbering, and excludes code-like elements from processing. MathJax output inherits the active theme and can horizontally scroll when equations are wider than the viewport.

### Conditional Mermaid and Plotly runtime (adopted from AcademicPages)

A focused `assets/js/_scientific-content.js` source module is compiled before `_main.js`. It detects `mermaid` and `plotly` fenced code blocks after DOM readiness and loads only the pinned runtime needed by the detected block type:

- Mermaid: `https://cdn.jsdelivr.net/npm/mermaid@11.15.0/dist/mermaid.esm.min.mjs`
- Plotly: `https://cdn.jsdelivr.net/npm/plotly.js@3.6.0/dist/plotly.min.js`

Each loader is promise-cached so multiple blocks never trigger duplicate requests. The source block remains visible until rendering succeeds. Failures keep readable source and add an accessible status message instead of leaving a blank figure.

### Theme integration (local compatibility hardening)

Mermaid and Plotly consume the Phase 4 `--site-*` and `--viz-*` semantic tokens. Mermaid uses strict security and the customizable base theme; Plotly receives a token-derived template while supplied block layout/template values remain authoritative. Both re-render on `site:themechange` without changing content ordering, filters, selections, or interaction state.

The implementation does not add upstream's larger `theme.js`, runtime palette switching, or Plotly npm dependency. CDN delivery is pinned and conditional to keep ordinary page weight low.

### Deterministic verification (local compatibility hardening)

`npm run check:scientific` verifies MathJax opt-in markup, exact CDN pins, block detection, one-time loading, successful rendering, fallback behavior, theme-event rerendering, bundle ordering, and the Pages exclude boundary. `npm test` includes this check so the existing deployment workflow enforces the contract without any workflow edit.

## Public Contract

- Page-level MathJax opt-in: `mathjax: true`.
- Mermaid authoring: fenced code blocks with `mermaid` language.
- Plotly authoring: fenced `plotly` blocks containing JSON with required `data` array and optional `layout` and `config` objects.
- Theme event: existing `site:themechange` with `detail.theme`.
- Theme tokens: existing `--site-*` and `--viz-*` roles.
- Validation command: `npm run check:scientific`.

## Deferred Work

JSON CV generation, GA4 and expanded social metadata, Docker/devcontainer support, runtime palette selection, Font Awesome regular/v4 assets, and the post-v0.9 talks CSV generator remain separate later phases.
