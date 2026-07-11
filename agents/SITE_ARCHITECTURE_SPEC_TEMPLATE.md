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
- Content-generator requirements: Python `3.10` or newer, standard library only, with no exact patch-version pin
- Container runtime: Docker runs the service as the non-root `vscode` user with Ruby `3.3.4`, Bundler `2.5.18`, Node `20`, npm `10`, and Python 3
- Dependency isolation: Compose named volumes `bundle` and `node_modules`; only those cache paths remain recursively writable across Dev Container UID/GID remapping, while the repository remains a bind mount. Bundler runs frozen so bootstrap cannot rewrite the host lockfile. Bootstrap reuses `node_modules` only when `package.json`, `package-lock.json`, and the installed npm file/symlink tree fingerprints match and `npm ls` validates the tree; otherwise it runs `npm ci`. Git enforces LF endings for executable `.command` files.
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

### Container preview (optional)

Docker is optional developer tooling; the native preview workflow and GitHub Pages deployment remain unchanged.

1. Start the Compose preview with `docker compose up --build`.
2. Open `http://127.0.0.1:4001/`.
3. Stop the foreground process with `Ctrl+C`, then clean up with `docker compose down`.
4. Use `docker compose down --volumes` only for an explicit dependency-volume reset; it removes the isolated `bundle` and `node_modules` volumes, so the next startup re-installs dependencies.

Compose defaults to UID/GID `1000`. On Linux hosts with different positive IDs, run `USER_UID="$(id -u)" USER_GID="$(id -g)" docker compose up --build` so the bind-mounted workspace remains writable. Root or nonnumeric IDs are rejected; occupied positive IDs retain the `vscode` identity. The host preview port binds only to `127.0.0.1`.

The VS Code Dev Container uses the same Compose service. `overrideCommand: true` prevents the Compose preview command from racing the `postCreateCommand` bootstrap, while `.devcontainer/docker-compose.devcontainer.yaml` disables the inherited preview-only health check. After the container is created, start preview manually with the normal wrapper: `./scripts/local_preview.command --full-build --skip-data --port 4001`.

The wrapper reuses `_config.dev.yml`. `npm run check:container` is Docker-independent static contract validation; `npm run test:container` is Docker-required end-to-end validation.

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
- Icon styles entry point: `assets/css/fontawesome.scss`
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
- Theme baseline: AcademicPages v0.9 Sass topology with paired light/dark palettes for `default`, `air`, `sunrise`, `mint`, `dirt`, and `contrast`
- Theme selection: `_config.yml` selects the build-time palette; deployment remains `default`, and the visitor toggle stores only `light` or `dark`
- Theme runtime: first visits are light; dark mode uses `html[data-theme="dark"]` and emits `site:themechange` with `detail.theme`
- Theme properties: 19 core `--global-*` properties plus stable `--site-*`, `--viz-*`, syntax, and status roles
- Import behavior: `assets/css/main.scss` loads shared settings, the selected light palette, compile aliases, the selected dark palette, helpers, layouts including scientific-content styling, then `_sass/_custom.scss`; Font Awesome 6.7.2 compiles separately from `assets/css/fontawesome.scss`
- Icon contract: site markup uses `fa-solid` and `fa-brands`; only solid and brands TTF/WOFF2 assets ship from `assets/webfonts/`, while Academicons remains local and independent
- Local overrides: custom and page-specific presentation colors consume semantic roles; scientific categorical and institutional brand palettes remain literal
- JavaScript contract: Node 20/npm 10 installs from `package-lock.json`; `scripts/build-js.mjs` combines jQuery 3.7.1, greedy navigation, optional scientific-content renderers, and shared interactions into the committed module `assets/js/main.min.js`
- Scientific content contract: `mathjax: true` loads MathJax 4.0.0 for a page; fenced `mermaid` blocks load Mermaid 11.15.0; fenced `plotly` blocks load Plotly 3.6.0 from JSON with required `data` and optional `layout`/`config`
- Scientific fallback behavior: failed Mermaid/Plotly loads or parses keep the source block visible and add an accessible status message; successful renderers consume `--site-*` and `--viz-*` tokens and re-render after `site:themechange`
- Asset checks: use `npm run build:js`, `npm run check:js`, `npm run check:icons`, `npm run check:scientific`, `npm run check:themes`, `npm run test:themes`, and `npm test`
- Browser compatibility: native sticky positioning, smooth scrolling with reduced-motion handling, and explicit responsive-video CSS replace Stickyfill, jQuery Smooth Scroll, FitVids, and Magnific Popup
- Content-authoring contract: the standard-library publication and talk CLIs expose read-only `check` and explicit-output `generate`; generation requires `--output-dir`, collisions require `--overwrite`, and publication output must pass the canonical topic and method validators
- Talks authoring boundary: the optional generator targets `_talks` collection documents and never reads or modifies `_data/talks.yml`, which remains the source for `/talks/`
- Content-authoring check: use `npm run check:generators`; the generated-content schemas and exit codes are documented in `markdown_generator/readme.md`
- Route contract: `scripts/qa/expected-html-routes.txt` lists the exact 240 intended HTML outputs checked for every palette; the matrix canonicalizes macOS's case-insensitive `AGENTS/` and `agents/` output collision to the case-sensitive production URLs and also requires `_site/markdown_generator` to be absent
- Pages artifact boundary: `_config.yml` excludes `package-lock.json`, `scripts/`, `markdown_generator/`, source-only shared JavaScript files, and root `*_artifacts` directories because they are build inputs or ignored local analysis output
- Deferred theme work: runtime palette selection and JSON CV support
- Infrastructure policy: Phase 7 is infrastructure-only; optional AcademicPages v0.9 capabilities remain inactive
- Protected surfaces: content, navigation, data, the 240 intended routes, rendered `/cv/` and its PDF behavior, images, fonts, generated assets, JavaScript bundles, Gem files and lockfiles, and GitHub Actions workflows; the former unlinked `/markdown_generator/` development route is intentionally excluded
- Future JSON CV constraint: any JSON CV infrastructure must coexist with the unchanged PDF-based `/cv/` and cannot activate or replace it without approval
- Page-specific inline styles to keep/avoid:
- Accessibility notes:
- Asset delivery notes: `main.css` and `fontawesome.css` are separate cacheable outputs; the local solid and brands WOFF2 files are preloaded before the blocking icon stylesheet to avoid missing-icon flashes

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
