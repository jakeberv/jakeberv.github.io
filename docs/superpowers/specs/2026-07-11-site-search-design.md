# Site-Wide Search Design

## Status

Approved for implementation on `codex/site-search` on 2026-07-11. This is a requirement-driven feature, not an AcademicPages parity phase.

## Goals

- Search all meaningful public content without sending queries to a hosted service.
- Generate the production index after Jekyll in GitHub Actions.
- Keep ordinary local, Docker, Dev Container, and palette previews free of indexing work.
- Preserve the 220-route public contract and the committed shared JavaScript bundle.
- Provide an accessible, palette-aware masthead modal with content-type filtering.

## Pagefind Adoption

- Pin Pagefind `1.5.2` under Node 24/npm 11.
- Use the Node API to index the explicit 209-route manifest after Jekyll.
- Write the generated browser API, component UI, language indexes, fragments, and runtime atomically to `_site/pagefind/`.
- Keep generated search files untracked and omit the Pagefind playground.
- Compose Pagefind's modal, input, filter, summary, results, and keyboard-hint components rather than maintaining custom focus-management code.

## Local Compatibility Hardening

- Mark only meaningful content regions with `data-pagefind-body` and emit stable title, description, canonical URL, date, and type metadata.
- Keep profile/navigation/footer/share UI and repeated archive lists outside search excerpts.
- Freeze the searchable set at 209 documents and the public site at 220 HTML routes.
- Use seven stable filter values: News, Publications, Research, Software, Talks, Teaching, and Pages.
- Map Pagefind custom properties to the established semantic theme tokens for six palettes and both modes.
- Extend the rendered-resource validator to ignore inert `text/pagefind-template` bodies while still checking live links.
- Validate dependency pins, markup, workflow order, generated assets, route membership, and type totals through static and built contracts.

## Runtime Flow

1. Jekyll renders the production site with the search trigger, modal, metadata, and body markers.
2. `scripts/build-search.mjs` removes stale output and reads `expected-search-routes.txt`.
3. Each expected HTML document is passed to Pagefind with a stable public URL.
4. Pagefind writes to a temporary sibling directory; validation succeeds before the directory is retained as `_site/pagefind/`.
5. The built search, rendered resources, and complete Pages artifact are validated before upload.

Local preview follows the same path only when `--with-search` is supplied. That flag writes a temporary config override, requires an existing `npm ci` installation, and never changes `_config.yml`.

## Protected Surfaces

Content prose, CV files and behavior, datasets, images, fonts, Gem files, scheduled workflows, visualizations, public routes, analytics behavior, and `assets/js/main.min.js` remain unchanged. Search queries are not sent to GA4, GoatCounter, or any other service.
