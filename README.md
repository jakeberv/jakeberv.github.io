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

If you want to run the site locally:

1. Run local preview (build + serve):
   - `./scripts/local_preview.command`
2. Open:
   - `http://127.0.0.1:4001/`
3. Stop preview:
   - `Ctrl+C`

Optional:
- Build only (no server): `./scripts/local_preview.command --build-only`
- Custom port: `./scripts/local_preview.command --port 4010`

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
