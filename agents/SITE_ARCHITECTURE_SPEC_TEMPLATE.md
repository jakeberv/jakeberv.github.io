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
- Node requirements: Node.js `24` with npm `11` for preview validation and deterministic JS tooling
- Content-generator requirements: Python `3.10` or newer, standard library only, with no exact patch-version pin
- Container runtime: Docker runs the service as the non-root `vscode` user with Ruby `3.3.4`, Bundler `2.5.18`, Node `24`, npm `11`, and Python 3
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
  - Data source: `_data/talks.yml` for `/talks/`; generated `data/talkmap/talk_events.json` from speaking-tagged `_news` geo records for `/talkmap.html`
  - Sorting/filter logic:

## 6) Data dependencies
- Core `_data` files and consumers:
  - `_data/talks.yml` -> `/talks/`
  - `_data/scholar_metrics.json` -> `/impact/`
  - `_data/map_data.json` -> `/impact/`
  - `data/talkmap/talk_events.json` -> `/talkmap.html`
- External scripts or workflows:
  - Scheduled workflow(s): `fetch_scholar_data.yml` runs the tracked repository source `fetch_scholar_metrics.py` with Python 3.12; the source is excluded from `_site`. `refresh_impact_reach_data.yml` refreshes reach datasets. Both retain direct pushes to `master`.
  - Manual scripts:

## 7) Styling and UX notes
- Theme baseline: AcademicPages v0.9 Sass topology with paired light/dark palettes for `default`, `air`, `sunrise`, `mint`, `dirt`, and `contrast`
- Theme selection: `_config.yml` selects the build-time palette; deployment remains `default`, and the visitor toggle stores only `light` or `dark`
- Theme runtime: first visits are light; dark mode uses `html[data-theme="dark"]` and emits `site:themechange` with `detail.theme`
- Theme properties: 19 core `--global-*` properties plus stable `--site-*`, `--viz-*`, syntax, and status roles
- Import behavior: `assets/css/main.scss` loads shared settings, the selected light palette, compile aliases, the selected dark palette, helpers, layouts including scientific-content and talk-map styling, then `_sass/_custom.scss`; Font Awesome 6.7.2 compiles separately from `assets/css/fontawesome.scss`
- Icon contract: site markup uses `fa-solid` and `fa-brands`; only solid and brands TTF/WOFF2 assets ship from `assets/webfonts/`. Academicons 1.9.4 is an independent stylesheet backed only by preloaded WOFF and TTF files under `assets/fonts/`.
- Local overrides: custom and page-specific presentation colors consume semantic roles; scientific categorical and institutional brand palettes remain literal
- JavaScript contract: Node 24/npm 11 installs from `package-lock.json`; `scripts/build-js.mjs` combines jQuery 3.7.1, greedy navigation, optional scientific-content renderers, and shared interactions into the committed module `assets/js/main.min.js`
- Scientific content contract: `mathjax: true` loads MathJax 4.0.0 for a page; fenced `mermaid` blocks load Mermaid 11.15.0; fenced `plotly` blocks load Plotly 3.6.0 from JSON with required `data` and optional `layout`/`config`
- Scientific fallback behavior: failed Mermaid/Plotly loads or parses keep the source block visible and add an accessible status message; successful renderers consume `--site-*` and `--viz-*` tokens and re-render after `site:themechange`
- Identity contract: full-URL profile fields are `academia`, `arxiv`, `inspire-hep`, `mastodon`, `medium`, `scopus`, `semantic`, `ssrn`, `telegram`, and `zotero`; handle fields include `artstation`, `bluesky`, `goodreads`, `kaggle`, `twitter`, and `zhihu`. Blank values render no link.
- Sharing contract: sharing-enabled pages render Bluesky, Facebook, LinkedIn, Mastodon, and X in that order using independently encoded canonical URLs and titles. The legacy `twitter` configuration key remains for Twitter Card compatibility, while visible links use X.
- Analytics contract: `analytics.providers` is the preferred ordered, de-duplicated list; scalar `analytics.provider` is a fallback when the list is absent, and explicit scalar `false` is the global kill switch used by local preview. GoatCounter remains active in production. GA4 renders only when `analytics.google.tracking_id` contains a nonblank `G-...` value, and `page.analytics: false` disables all providers for one page.
- Comments contract: comments are disabled when `comments.provider` is blank. Supported values are `disqus`, `discourse`, `facebook`, and `custom`; Disqus requires a shortname, Discourse an HTTPS server URL, and Facebook an app ID plus explicit SDK version. Provider scripts are centralized under `comments-providers/scripts.html`. Google+ and Staticman are unsupported, and activation requires a separate privacy and moderation decision.
- Asset checks: use `npm run build:js`, `npm run check:js`, `npm run check:academicons`, `npm run check:assets` after builds, `npm run check:comments`, `npm run check:comments:built` after production builds, `npm run check:icons`, `npm run check:integrations`, `npm run check:integrations:built` after production builds, `npm run check:scientific`, `npm run check:site-artifact`, `npm run check:talkmap`, `npm run check:themes`, `npm run test:themes`, and `npm test`
- Browser compatibility: native sticky positioning, smooth scrolling with reduced-motion handling, and explicit responsive-video CSS replace Stickyfill, jQuery Smooth Scroll, FitVids, and Magnific Popup
- Content-authoring contract: the standard-library publication and talk CLIs expose read-only `check` and explicit-output `generate`; generation requires `--output-dir`, collisions require `--overwrite`, and publication output must pass the canonical topic and method validators
- Publication action contract: generator inputs `slides_url` and `bibtex_url` emit canonical `slidesurl` and `bibtexurl`; list and detail actions remain dormant when those fields are blank
- Talks authoring boundary: the optional generator targets `_talks` collection documents and never reads or modifies `_data/talks.yml`, which remains the source for `/talks/`
- Content-authoring check: use `npm run check:generators`; the generated-content schemas and exit codes are documented in `markdown_generator/readme.md`
- Route contract: `scripts/qa/expected-html-routes.txt` lists the exact 220 intended public HTML outputs. `scripts/qa/site-artifact-contract.mjs` checks those routes case-sensitively after every palette and production build; no path canonicalization is permitted.
- Rendered-resource contract: `scripts/qa/rendered-asset-contract.mjs` validates local HTML references, CSS URLs, manifest icons, pretty routes, exact path casing, and insecure active resources after every palette and production build; `/bifrost` is an explicit same-origin external deployment.
- Talk-map contract: `/talkmap.html` uses pinned D3 7.9.0, TopoJSON Client 3.1.0, World Atlas 2.0.2, `--site-*`/`--viz-*` tokens, and `site:themechange`; `/talkmap/map.html` remains a compatibility redirect and no geocoder is used.
- Pages artifact boundary: `_config.yml` excludes internal agent/spec documents, lockfiles, notebooks, R/RDS/RStudio state, Python and command sources, `scripts/`, `markdown_generator/`, source-only shared JavaScript files, and root `*_artifacts` directories. The validator rejects protected prefixes, filenames, and development extensions in `_site`.
- Repository ignore boundary: local `.bundle/`, root `vendor/bundle/`, root `vendor/cache/`, root `local/`, `.vscode/`, `.RData`, root RDS outputs, and `todo` are ignored; `Gemfile.lock`, `package-lock.json`, R source under `scripts/analysis/`, and `_sass/vendor/` remain trackable.
- Scholar source boundary: `fetch_scholar_metrics.py` remains tracked and workflow-executable but is never a public Pages asset.
- Pull-request lifecycle: the Pages workflow runs npm contracts, data validation/generation, all six themes, the default build, rendered-integration validation, and artifact validation for PRs with read-only contents permission. Artifact upload and Pages/OIDC permissions are deployment-only.
- Deferred theme work: runtime palette selection and JSON CV support
- Infrastructure policy: Phase 7 is infrastructure-only; optional AcademicPages v0.9 capabilities remain inactive
- Protected surfaces: content, navigation, data, the 220 intended public routes, rendered `/cv/` and its PDF behavior, images, fonts, generated assets, JavaScript bundles, Gem files and lockfiles; internal repository-document routes and raw development sources are intentionally excluded
- Future JSON CV constraint: any JSON CV infrastructure must coexist with the unchanged PDF-based `/cv/` and cannot activate or replace it without approval
- Page-specific inline styles to keep/avoid:
- Accessibility notes:
- Asset delivery notes: `main.css`, `fontawesome.css`, and `academicons.css` are separate cacheable outputs; Academicons WOFF and the local solid/brands WOFF2 files are preloaded before their blocking icon stylesheets to avoid missing-icon flashes

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
