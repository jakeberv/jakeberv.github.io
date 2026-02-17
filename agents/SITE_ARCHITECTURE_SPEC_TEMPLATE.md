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
- Ruby requirements:
- Node requirements (if JS assets are rebuilt):
- Local run command:
- Production deployment target:

### Local preview runbook (recommended)

Use these commands to build/preview locally before pushing:

1. Ensure Homebrew Ruby 3.3 is on PATH
   - `export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH"`
2. Install gems (once per dependency change)
   - `bundle _2.5.18_ install`
3. Build locally (quick validation)
   - `bundle _2.5.18_ exec jekyll build --safe --quiet --config _config.yml,_config.dev.yml`
4. Serve locally for preview
   - `bundle _2.5.18_ exec jekyll serve --safe --config _config.yml,_config.dev.yml --host 127.0.0.1 --port 4001`
5. Open preview in browser
   - `http://127.0.0.1:4001/`
6. Stop server
   - `Ctrl+C` (foreground), or `pkill -f jekyll` if needed

Notes:
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
- Styles: `_sass/` and `assets/css/main.scss`
- Scripts: `assets/js/`
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
- Theme baseline:
- Local overrides:
- Page-specific inline styles to keep/avoid:
- Accessibility notes:

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
