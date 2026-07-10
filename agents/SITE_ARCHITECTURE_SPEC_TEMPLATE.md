# Site Architecture spec template

Use this template to document the current architecture of this Jekyll site before making structural changes.

## 1) Scope
- Project name:
- Primary domain:
- Purpose of site:
- In scope:
- Out of scope:

## 2) Runtime and build stack
- Static site generator: `Jekyll`
- Theme/base: `academicpages` (Minimal Mistakes derived)
- Ruby requirements: Ruby `3.3.4` with Bundler `2.5.18` preferred
- Node requirements: Node.js `20` with npm `10` for preview validation and deterministic JS tooling
- Local run command:
- Production deployment target:

### Local preview runbook (recommended)

Use this workflow to build/preview locally before pushing:

1. Run the preview script from repo root
   - `./scripts/local_preview.command`
2. Open preview in browser
   - `http://127.0.0.1:4001/`
3. Stop server
   - `Ctrl+C` (foreground), or `pkill -f jekyll` if needed

Optional:
- Build-only validation: `./scripts/local_preview.command --build-only`
- Run geo/impact data regeneration + validation: `./scripts/local_preview.command --with-data`
- Skip geo/impact data regeneration explicitly: `./scripts/local_preview.command --skip-data`
- Custom port: `./scripts/local_preview.command --port 4010`
- Always run full data + full build path: `./scripts/local_preview_fullbuild.command`

Notes:
- `scripts/local_preview.command` reads the preferred Bundler version from `Gemfile.lock` and tries Homebrew Ruby 3.3 before a PATH-provided Bundler.
- If the pinned Bundler executable is unavailable or broken, the launcher may use that candidate's default Bundler only when `bundle check` succeeds; it prints a warning and never installs or repairs global gems.
- Stale-data timestamp checks support both BSD/macOS and GNU/Linux `stat` syntax.
- `_config.dev.yml` sets `github: false` for local runs to avoid GitHub metadata API hangs.
- `--safe` mirrors GitHub Pages-safe behavior and is preferred for local preview checks.
- Local output is written to `_site/` (build artifact folder).
- View preview via the local server URL, not by opening `_site/*.html` directly with `file://`.
- `_site/` is ignored by git and should not be committed.
- Local preview commands do not change GitHub Actions/GitHub Pages build behavior.

## 3) Repository map
- Global config: `_config.yml`
- Dev overrides: `_config.dev.yml`
- Layouts: `_layouts/`
- Includes: `_includes/`
- Styles entry point: `assets/css/main.scss`
- Shared Sass settings: `_sass/_themes.scss`
- Supported theme: `_sass/theme/_default_light.scss` selected by `site_theme: "default"`
- Sass helpers: `_sass/include/`
- Structural Sass: `_sass/layout/`
- Local style overrides: `_sass/_syntax.scss` and `_sass/_custom.scss`
- Scripts: `assets/js/`
- Shared JS builder: `scripts/build-js.mjs`
- JS dependency lock: `package-lock.json`
- Collections:
  - `_pages/`
  - `_publications/`
  - `_news/`
  - `_research/`
- Data files: `_data/`
- Static files:
  - `files/`
  - `images/`
  - `assets/`

## 4) Collection and URL model
- Pages:
  - Landing page:
  - Major section pages:
- Publications:
  - Collection name:
  - Permalink pattern:
- News:
  - Collection name:
  - Permalink pattern:
- Research:
  - Collection name:
  - Permalink pattern:
- Talks source:
  - Source file:
  - Display page:

## 5) Rendering flow
- Navigation source: `_data/navigation.yml`
- Page-level rendering behavior:
  - Which layouts are active:
  - Which includes are critical:
  - Any asset-loading conventions (for example local site-relative image URLs in includes, not raw GitHub hotlinks):
- Publications rendering path:
  - Index page:
  - Include used for each record:
- News rendering path:
  - Index page:
  - Sorting/filter logic:
- Talks rendering path:
  - Data source:
  - Sorting/filter logic:

## 6) Data dependencies
- Core `_data` files and consumers:
  - `_data/talks.yml` -> `/talks/`
  - `_data/scholar_metrics.json` -> `/impact/`
  - `_data/map_data.json` -> `/impact/`
- External scripts or workflows:
  - Scheduled workflow(s):
  - Manual scripts:

## 7) Styling and UX notes
- Theme baseline: AcademicPages v0.9 Sass topology with the `default` light theme and 16 core `--global-*` color properties
- Theme selection: `_config.yml` supports only `site_theme: "default"` until dark-mode activation is implemented
- Import behavior: `assets/css/main.scss` loads shared settings, the selected light theme, helpers, layout partials, retained Font Awesome 5 styles, then `_sass/_custom.scss`
- Local overrides: `_sass/_custom.scss` and page-specific styles remain light-only and must load after the core theme
- JavaScript contract: Node 20/npm 10 installs from `package-lock.json`; `scripts/build-js.mjs` combines jQuery 3.7.1, greedy navigation, and shared interactions into the committed module `assets/js/main.min.js`
- JavaScript checks: use `npm run build:js` to regenerate, `npm run check:js` for a non-writing parity check, and `npm test` for asset-contract plus executable responsive-state verification
- Browser compatibility: native sticky positioning, smooth scrolling with reduced-motion handling, and explicit responsive-video CSS replace Stickyfill, jQuery Smooth Scroll, FitVids, and Magnific Popup
- Pages artifact boundary: `_config.yml` excludes `package-lock.json`, `scripts/`, and root `*_artifacts` directories because they are build inputs or ignored local analysis output
- Deferred theme work: tokenize custom/page CSS before adding dark mode, alternate palettes, Font Awesome 6, upstream `theme.js`, Plotly, Mermaid, or JSON CV support
- Page-specific inline styles to keep/avoid:
- Accessibility notes:
- Asset delivery notes (for example optimized web-sized assets in `images/` with high-res originals excluded from build via `_config.yml`):

## 8) SEO and metadata
- Global metadata source:
- Structured data includes:
- Feed behavior:
- Robots/sitemap behavior:

## 9) Operational checks
- Local build passes:
- Broken links check:
- Collection item lint checks:
- Data freshness checks:
- Known risks:

## 10) Change impact checklist
- Files expected to change:
- Pages expected to be affected:
- Backwards compatibility constraints:
- Rollback strategy:
