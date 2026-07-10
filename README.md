# Jake Berv Website Repository

This repository powers [jakeberv.com](https://jakeberv.com), a Jekyll-based academic website for Jacob S. Berv.

## Repository Structure

Core site content and configuration:

- `_pages/` primary site pages
- `_publications/` publication records (collection items)
- `_news/` news entries (collection items)
- `_research/` research section entries (collection items)
- `_data/` structured data sources used by pages
- `data/career_geo/` generated JSON consumed by the Background page career footprint map
- `files/` downloadable PDFs and other hosted files
- `images/` site images and media assets
- `agents/` bot-oriented specs, templates, and checklists

## Normal Workflow

This repository is primarily maintained with the following workflow:

1. Edit site files locally (commonly from RStudio).
2. Push changes to `master`.
3. GitHub Actions build/deploy runs on `master` and deploys GitHub Pages.
4. Career footprint map data is regenerated from `_news` geo front matter during build.

No special branching workflow is required unless explicitly chosen for a task.

## Local Development (Optional)

Runtime contract:

- Ruby `3.3.4`, matching the published GitHub Pages runtime (`.ruby-version`)
- Bundler `2.5.18`, matching `Gemfile.lock`
- Node.js `20`, matching the deployment workflow (`.node-version`)
- npm `10`, used with the committed `package-lock.json`
- Python 3 when serving locally or regenerating data

The preview launcher prefers Homebrew Ruby 3.3 with Bundler `2.5.18`, then a PATH-provided Bundler at that version. If the pinned executable is unavailable or broken, it may use the same candidate's default Bundler only after `bundle check` confirms that the locked dependencies are satisfied; the launcher prints a warning when it does so and never installs or repairs global gems.

If you want to run the site locally:

1. Run local preview (build + serve):
   - `./scripts/local_preview.command`
2. Open:
   - `http://127.0.0.1:4001/`
3. Stop preview:
   - `Ctrl+C`

Optional:
- Build only (no server): `./scripts/local_preview.command --build-only`
- Force clean full rebuild (skip incremental): `./scripts/local_preview.command --full-build`
- Run geo/impact data regeneration + validation: `./scripts/local_preview.command --with-data`
- Skip geo/impact data regeneration explicitly: `./scripts/local_preview.command --skip-data`
- Preview a supported palette without editing `_config.yml`: `./scripts/local_preview.command --theme air`
- Custom port: `./scripts/local_preview.command --port 4010`
- Always run full data + full build path: `./scripts/local_preview_fullbuild.command`

By default, local preview skips geo/impact data regeneration and uses Jekyll incremental builds for faster iteration. If incremental fails, the script automatically retries once with a full rebuild.

## JavaScript Assets

The shared browser bundle follows the AcademicPages v0.9 asset model with local reproducibility hardening:

- `npm ci` installs the exact Node 20/npm 10 dependency graph.
- `npm run build:js` builds the committed `assets/js/main.min.js` module.
- `npm run check:icons` verifies the Font Awesome version, assets, delivery, markup, and icon-name contract.
- `npm run check:js` verifies the committed bundle without rewriting it.
- `npm run check:scientific` verifies the opt-in MathJax, Mermaid, and Plotly runtime contract.
- `npm run watch:js` rebuilds when the three shared JavaScript sources change.
- `npm run check:themes` verifies the palette, token, markup, and runtime contract.
- `npm run test:themes` builds all six palettes and requires the same 241 routes.
- `npm test` runs the asset, theme, and executable browser-state tests plus bundle verification.

The deterministic builder reads jQuery `3.7.1`, greedy navigation, optional scientific-content renderers, and the shared site interactions in a fixed order. GitHub Actions runs `npm ci`, `npm test`, and the six-theme build matrix before the final Jekyll build, so source, generated assets, and palette support cannot drift.

Jekyll excludes `package-lock.json`, `scripts/`, and root `*_artifacts` directories from `_site`. They are development inputs or ignored local analysis output, not deployable website assets.

## Styling Architecture

The site uses the AcademicPages v0.9 Sass layering model while retaining its established default-light appearance:

- `_sass/_themes.scss` contains typography, breakpoints, grid settings, and shared brand colors.
- `_sass/theme/` contains paired light/dark partials for `default`, `air`, `sunrise`, `mint`, `dirt`, and `contrast`.
- `_sass/_themes.scss` emits 19 core properties plus semantic `--site-*`, `--viz-*`, and syntax roles.
- `_sass/include/` contains reusable Sass mixins and utilities.
- `_sass/layout/` contains the reset, base, navigation, scientific-content, page, sidebar, and other structural partials.
- `_sass/_syntax.scss` remains the syntax-highlighting layer.
- `_sass/_custom.scss` loads last so existing page-specific overrides retain precedence.
- `assets/css/main.scss` is the Jekyll-rendered theme and customization entry point.
- `assets/css/fontawesome.scss` compiles the vendored AcademicPages v0.9 Font Awesome 6.7.2 core, solid, and brands layers into a separately cached stylesheet.
- `assets/webfonts/` contains only the solid and brands TTF/WOFF2 files consumed by that stylesheet; Academicons remains local under its existing asset paths.

`_config.yml` keeps `site_theme: "default"` for deployment. Alternate palettes are build-time choices rather than a visitor-facing selector. Visitors start in light mode and can explicitly toggle dark mode; `localStorage.theme` persists `light` or `dark`, and `site:themechange` notifies custom visualizations. Site markup uses `fa-solid` and `fa-brands`; regular icons and v4 compatibility fonts are intentionally not shipped. JSON CV support and runtime palette selection remain deferred.

Validate the complete styling path with:

- `./scripts/local_preview.command --build-only --full-build --skip-data`
- `npm run check:icons`
- `npm run check:scientific`
- `npm run check:themes`
- `npm run test:themes`

## Scientific Content

Scientific rendering is opt-in so ordinary pages do not request large scientific libraries.

- Add `mathjax: true` to a page's front matter to load MathJax `4.0.0`.
- Use fenced `mermaid` blocks for Mermaid `11.15.0` diagrams.
- Use fenced `plotly` blocks containing JSON with a required `data` array and optional `layout` and `config` objects for Plotly `3.6.0`.
- Mermaid and Plotly renderers use the active `--site-*` and `--viz-*` theme tokens and re-render after `site:themechange`.
- CDN failures preserve the readable source block and add an accessible status message instead of leaving a blank figure.

No Mermaid or Plotly npm package is installed; the pinned runtimes load from CDN only when matching fenced blocks exist.

## UI Experiment Note (Sidebar Rail)

Documented for future iteration; not enabled in current site CSS.

Goal: color the entire fixed left rail on desktop while keeping the top masthead white.

Approach that worked in preview:

```css
@media (min-width: 57.8125em) {
  body {
    --left-rail-w: calc(50vw - 294.5px);
    background-image: linear-gradient(
      to right,
      #eef3f8 0,
      #eef3f8 var(--left-rail-w),
      transparent var(--left-rail-w),
      transparent 100%
    );
    background-repeat: no-repeat;
    background-attachment: fixed;
  }

  .sidebar {
    background-color: #eef3f8;
  }
}

@media (min-width: 80em) {
  body {
    --left-rail-w: calc(50vw - 411px);
  }
}
```

This lets the color rail continue under the fixed white masthead while aligning the rail boundary with the start of page content.

## Career Footprint Data Pipeline

The Background page map reads generated data at:

- `data/career_geo/career_footprint.json`

That file is produced from `_news/*.md` geo front matter by:

- `scripts/build-career-geo-data.mjs`

Validation runs with:

- `scripts/qa/validate-news-geo.mjs`

Runtime map dependencies:

- D3 + TopoJSON from pinned CDN URLs
- World basemap topology from CDN (with fallback URL)

## Impact Reach Data Pipeline

Reach-proxy data for impact news outlets is generated at:

- `data/impact/reach/outlet_reach.json`
- `data/impact/reach/outlet_reach.csv`
- `data/impact/reach/reach_metadata.json`

Builder:

- `scripts/build-impact-reach-data.py`

Default invocation:

- `python3 scripts/build-impact-reach-data.py --repo-root "$ROOT_DIR" --out-dir "$ROOT_DIR/data/impact/reach"`

Source notes:

- Uses `data/impact/exports/news_mentions_clean.json` (or CSV fallback) as outlet-domain input.
- Uses Tranco top-domain ranking as a free reach proxy (with local cache fallback under `data/impact/reach/.cache/`).

## LLM/Bot Collaboration

Repository-level bot operating policy:

- [AGENTS.md](AGENTS.md)

Spec and template index for bot-assisted work:

- [agents/INDEX.md](agents/INDEX.md)

## Attribution

This site is based on the `academicpages` template ecosystem and the `Minimal Mistakes` Jekyll theme.

- Academic Pages: [https://academicpages.github.io/](https://academicpages.github.io/)
- Minimal Mistakes: [https://mmistakes.github.io/minimal-mistakes/](https://mmistakes.github.io/minimal-mistakes/)

License details are available in [LICENSE](LICENSE).
