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
3. GitHub Actions validates pull requests; pushes to `master` and manual dispatches also deploy GitHub Pages.
4. Career footprint map data is regenerated from `_news` geo front matter during build.

No special branching workflow is required unless explicitly chosen for a task.

## Local Development (Optional)

Runtime contract:

- Ruby `3.3.4`, matching the published GitHub Pages runtime (`.ruby-version`)
- Bundler `2.5.18`, matching `Gemfile.lock`
- Node.js `24`, matching the deployment workflow (`.node-version`)
- npm `11`, used with the committed `package-lock.json`
- Python `3.10` or newer when serving locally or running the content generators; no exact Python patch version is pinned

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

### Containerized development (optional)

Docker is optional developer tooling. Native preview and GitHub Pages deployment are unchanged. The Compose service runs as the non-root `vscode` user with Ruby `3.3.4`, Bundler `2.5.18`, Node `24`, and npm `11`; the repository is bind-mounted while the named `bundle` and `node_modules` volumes isolate container dependencies from the host. Those two cache paths remain recursively writable after Dev Container UID/GID remapping, without making the repository world-writable. Bootstrap runs Bundler in frozen mode so it cannot rewrite the host lockfile, then fingerprints `package.json`, `package-lock.json`, and the installed npm file/symlink tree; a mismatch or failed dependency check runs `npm ci`. Git enforces LF endings for executable `.command` files so Windows checkouts remain Linux-container compatible. The existing preview wrapper reuses `_config.dev.yml`.

To start the portable preview:

1. Run `docker compose up --build`.
2. Open `http://127.0.0.1:4001/`.
3. Stop the foreground Compose process with `Ctrl+C`.
4. Remove the stopped service and network with `docker compose down`.

Compose defaults the container user to UID/GID `1000`. On a Linux host using different positive IDs, preserve bind-mount ownership with `USER_UID="$(id -u)" USER_GID="$(id -g)" docker compose up --build`. Root or nonnumeric IDs are rejected; occupied positive IDs retain the `vscode` account. The published preview port is bound to `127.0.0.1` rather than exposed to the local network.

To explicitly reset the dependency volumes, run `docker compose down --volumes`. This removes the isolated Bundler and `node_modules` caches, so the next startup must bootstrap those dependencies again.

For VS Code, use **Dev Containers: Reopen in Container**. The Dev Container attaches to the Compose service and runs `./scripts/container_bootstrap.command` as its post-create step. Its `overrideCommand: true` setting prevents the Compose preview command from racing that bootstrap, and its local Compose override disables the preview-only health check until the preview is started manually. Start it with the normal wrapper, for example `./scripts/local_preview.command --full-build --skip-data --port 4001`.

The Docker-independent contract check is `npm run check:container`. The Docker-required end-to-end validation is `npm run test:container`, which builds and exercises the container.

The portable environment remains infrastructure-only. Protected surfaces include content, navigation, public data and routes, rendered `/cv/` and its PDF behavior, images, fonts, generated assets, JavaScript bundles, and Gem files. Phase 9 modernizes action versions and pull-request validation without changing scheduled data commands or outputs. Optional AcademicPages v0.9 capabilities remain inactive. Any future JSON CV infrastructure must coexist with the unchanged PDF-based `/cv/` and cannot activate or replace it without approval.

## Content Authoring Tools

Phase 8 provides dependency-free, validation-first Python generators for future publication and optional talk collection records. Existing publications and the visible YAML-backed talks page are not generated or changed.

- `python3 markdown_generator/publications.py check INPUT.csv` validates publication metadata and both canonical taxonomies without persistent output.
- `python3 markdown_generator/publications.py generate INPUT.csv --output-dir DIR` writes reviewed publication Markdown to an explicit staging directory.
- `python3 markdown_generator/talks.py check INPUT.tsv` validates optional `_talks` collection metadata.
- `python3 markdown_generator/talks.py generate INPUT.tsv --output-dir DIR` writes optional talk collection documents without touching `_data/talks.yml`.
- Add `--overwrite` only to replace colliding target filenames; unrelated files are never removed.
- Run `npm run check:generators` for the complete CLI and safety contract.

Inputs may be UTF-8 CSV or TSV with headers in any order. Pipe-delimited fields represent publication tags, authors, student authors, method families, and method tags. Full schemas and exit-code behavior are documented in `markdown_generator/readme.md`.

The generator directory is development-only and excluded from `_site`, including its historical notebooks, spreadsheet, sample inputs, and BibTeX script. Phase 8 removed its accidentally rendered index; Phase 9's complete repository boundary leaves 220 intended public HTML routes by also removing 20 unlinked internal documentation routes.

## JavaScript Assets

The shared browser bundle follows the AcademicPages v0.9 asset model with local reproducibility hardening:

- `npm ci` installs the exact Node 24/npm 11 dependency graph.
- `npm run build:js` builds the committed `assets/js/main.min.js` module.
- `npm run check:generators` verifies the safe content-authoring CLI contract.
- `npm run check:academicons` verifies the Academicons version, font inventory, delivery order, and academic glyph contract.
- `npm run check:icons` verifies the Font Awesome version, assets, delivery, markup, and icon-name contract.
- `npm run check:integrations` verifies analytics dispatch, author-profile hooks, X presentation, and modern sharing.
- `npm run check:integrations:built` verifies analytics and sharing in the rendered production site.
- `npm run check:js` verifies the committed bundle without rewriting it.
- `npm run check:scientific` verifies the opt-in MathJax, Mermaid, and Plotly runtime contract.
- `npm run check:site-artifact` verifies the exact route manifest and rejects repository-only sources from `_site`.
- `npm run watch:js` rebuilds when the three shared JavaScript sources change.
- `npm run check:themes` verifies the palette, token, markup, and runtime contract.
- `npm run test:themes` builds all six palettes and requires the same 220 intended routes and artifact boundary.
- `npm test` runs the asset, content-generator, theme, executable browser-state, and Docker-independent container-contract tests plus bundle verification.

The deterministic builder reads jQuery `3.7.1`, greedy navigation, optional scientific-content renderers, and the shared site interactions in a fixed order. GitHub Actions runs `npm ci`, `npm test`, the six-theme build matrix, the final Jekyll build, rendered-integration validation, and artifact validation for pull requests and production, so source, generated assets, integrations, palette support, and the tracked intended-route manifest cannot drift. Pull requests are read-only and never upload or deploy Pages.

Jekyll excludes internal agent/spec documents, lockfiles, notebooks, R/RDS/RStudio state, Python and command sources, `scripts/`, `markdown_generator/`, and root `*_artifacts` directories from `_site`. They are repository inputs, not deployable website assets. `fetch_scholar_metrics.py` remains tracked because the scheduled Scholar workflow runs it under Python 3.12, but it is explicitly excluded and the artifact contract verifies that it is absent from `_site`.

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
- `assets/webfonts/` contains only the solid and brands TTF/WOFF2 files consumed by that stylesheet.
- `assets/css/academicons.css` provides Academicons `1.9.4` separately, backed only by local WOFF and TTF files under `assets/fonts/`; the WOFF file is preloaded before the blocking stylesheet.

`_config.yml` keeps `site_theme: "default"` for deployment. Alternate palettes are build-time choices rather than a visitor-facing selector. Visitors start in light mode and can explicitly toggle dark mode; `localStorage.theme` persists `light` or `dark`, and `site:themechange` notifies custom visualizations. Site markup uses `fa-solid` and `fa-brands`; regular icons and v4 compatibility fonts are intentionally not shipped. JSON CV support and runtime palette selection remain deferred.

Validate the complete styling path with:

- `./scripts/local_preview.command --build-only --full-build --skip-data`
- `npm run check:academicons`
- `npm run check:icons`
- `npm run check:scientific`
- `npm run check:themes`
- `npm run test:themes`

## Identity, Sharing, and Analytics

The author profile supports the AcademicPages v0.9 academic identity fields without activating accounts by default. `academia`, `arxiv`, `inspire-hep`, `mastodon`, `medium`, `scopus`, `semantic`, `ssrn`, `telegram`, and `zotero` are complete profile URLs. `artstation`, `bluesky`, `goodreads`, `kaggle`, `twitter`, and `zhihu` are service handles. The existing `twitter` key remains for Twitter Card compatibility, while visible profile/footer links use X.

Pages with sharing enabled expose Bluesky, Facebook, LinkedIn, Mastodon, and X actions. Each action receives an independently encoded canonical page URL and title. Brand colors remain literal while button layout and contrast continue to use the shared light/dark theme architecture.

Analytics uses an ordered `analytics.providers` list. The deployed list contains `goatcounter` and `google-analytics-4`, but the GA4 include emits nothing while `analytics.google.tracking_id` is blank. GoatCounter therefore remains the only active production provider. A legacy scalar `analytics.provider` remains supported when the list is absent; setting it to `false` disables analytics globally for local preview, while `page.analytics: false` disables all providers for one page. Activating GA4 later requires a `G-...` measurement ID plus a separate privacy review.

Validate these contracts with `npm run check:integrations`; after a production build, run `npm run check:integrations:built`.

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
