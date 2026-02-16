# Jake Berv Website Repository

This repository powers [jakeberv.com](https://jakeberv.com), a Jekyll-based academic website for Jacob S. Berv.

## Repository Structure

Core site content and configuration:

- `_pages/` primary site pages
- `_publications/` publication records (collection items)
- `_news/` news entries (collection items)
- `_research/` research section entries (collection items)
- `_data/` structured data sources used by pages
- `files/` downloadable PDFs and other hosted files
- `images/` site images and media assets
- `agents/` bot-oriented specs, templates, and checklists

## Normal Workflow

This repository is primarily maintained with the following workflow:

1. Edit site files locally (commonly from RStudio).
2. Push changes to `main`.
3. Existing GitHub Actions and GitHub Pages deployment handle build/deploy.

No special branching workflow is required unless explicitly chosen for a task.

## Local Development (Optional)

If you want to run the site locally:

1. Install dependencies with `bundle install`.
2. Serve the site with `bundle exec jekyll serve`.
3. Open `http://localhost:4000`.

If dependency resolution fails, remove `Gemfile.lock` and reinstall.

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
