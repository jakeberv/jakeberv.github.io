---
published: false
---

# Infrastructure Sync Pass 5 Design

## Goal

Adopt AcademicPages v0.9's Font Awesome 6.7.2 foundation while preserving the site's content, routes, navigation, brand labels, six-palette theme system, 85px masthead, and GitHub Pages deployment model. Isolate icon CSS from the theme stylesheet and retire obsolete font formats without introducing missing-icon flashes.

## Upstream Baseline

The verified comparison baseline is AcademicPages master `482bc2b22db0500a12c2297d96ba5db44e1d0929` and v0.9 tag `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. Master remains one CSV-only `markdown_generator/talks.py` commit beyond the release.

## Constraints

- Work only on `codex/infra-sync-pass-5`; preserve `.RData` and `todo` without editing or staging them.
- Preserve the 241-route manifest, content, collection schemas, navigation entries, data, images, Academicons, and page geometry.
- Keep Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Node 20, npm 10, the deterministic module bundle, and all workflows unchanged.
- Limit binary changes to the explicitly approved Font Awesome replacement.
- Do not commit or push without explicit approval.

## Architecture

### Font Awesome source (adopted from AcademicPages)

The vendored Font Awesome directory is replaced with the 19 upstream 6.7.2 Sass partials. A dedicated Jekyll entry point imports core, solid, and brands exactly once. Regular and v4-shim layers remain available as source references but are not compiled because the site has no consumers for them.

Only the solid and brands TTF/WOFF2 pairs deploy from `assets/webfonts/`. The Font Awesome 5 EOT, SVG, TTF, WOFF, and WOFF2 files are removed from `assets/fonts/`; Academicons remains local and unchanged.

### Stable asset delivery (local compatibility hardening)

`main.css` no longer embeds Font Awesome. The local Academicons stylesheet loads first, the two always-used WOFF2 files are preloaded, and `fontawesome.css` loads as a normal stylesheet. This preserves stable first-paint icon rendering while allowing browser caches to retain the icon layer when theme CSS changes.

The shared head applies to 237 generated pages. Existing redirect documents and the standalone talk-map artifact remain headless because they do not render the site chrome or icons.

### Markup and styling contract (adopted and hardened)

Site markup uses `fa-solid` and `fa-brands` style prefixes. Existing icon-name aliases remain where they preserve the current glyph and brand meaning. Dynamic TOC icons use the solid prefix. Decorative icons retain `aria-hidden="true"`, and the theme toggle keeps its semantic button and ARIA behavior.

Local utility, footer, and publication-action selectors target the FA6 prefixes so colors, spacing, hover behavior, and theme inheritance remain intact. The JavaScript source and committed bundle do not change; their sun/moon glyph-class updates continue to operate beneath the stable solid prefix.

### Asset verification (local compatibility hardening)

`npm run check:icons` verifies the vendor version, imports, head ordering, font inventory, markup prefixes, configured dynamic icons, and icon-name resolution. `npm test` includes this contract, so the existing deployment test step enforces the migration without a workflow change.

## Public Contract

- Stylesheet: `/assets/css/fontawesome.css`.
- Fonts: `/assets/webfonts/fa-solid-900.*` and `/assets/webfonts/fa-brands-400.*`.
- Markup prefixes: `fa-solid` and `fa-brands`, with supported Font Awesome utility classes.
- Validation command: `npm run check:icons`.
- Regular icons and v4 compatibility fonts are unsupported until deliberately imported and tested.

## Deferred Work

Mermaid, Plotly, JSON CV support, GA4 support, containers, runtime palette selection, broader dependency modernization, and the post-v0.9 talks generator remain separate phases.

## Verification Results

- `npm test` passes all 26 asset, runtime, responsive-state, theme, icon-contract, and deterministic-bundle checks.
- `npm run test:themes` builds all six palettes to the same 241 routes.
- The final default build passes through the validated local Bundler fallback with only the known Bundler, Faraday, and stale generated-data warnings.
- All 237 shared-layout pages load exactly one `main.css` and one `fontawesome.css`; the three redirect documents and standalone talk-map HTML artifact remain intentionally headless.
- `main.css` contains no Font Awesome family or version marker. `fontawesome.css` identifies 6.7.2, contains two font faces, and resolves every font URL.
- The deployed Font Awesome boundary is four files totaling 913,808 bytes, reduced from the 2.6 MB Font Awesome 5 set.
- Seven published routes pass desktop and mobile browser checks with loaded solid/brands faces, valid glyph content, no console errors, no failed local assets, and no horizontal overflow.
- The theme toggle preserves dark-mode persistence, icon state, and ARIA state. The syntax pseudo-icon resolves through the FA6 family interface at weight 900.
- The stable Publications screenshot differs only at the migrated glyph pixels; no layout geometry changed. Home comparisons contain additional expected noise from asynchronously rendered imagery.
- The 241-route manifest, JavaScript bundle, and package lock remain byte-identical to the Phase 4 baseline.
- `git diff --check` and the changed-path audit pass. `.RData` and `todo` remain the same protected unstaged modifications.
