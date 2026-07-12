# Site-Wide Search with Actions-Generated Pagefind

## Implementation Checklist

1. Record the feature contract in the design, plan, README, and architecture specification.
2. Pin Pagefind 1.5.2 and expose `build:search`, `check:search`, and `check:search:built`.
3. Add a deterministic Node API builder with stale-output removal, exact route validation, zero-error handling, and atomic output.
4. Add production/dev search configuration and optional page-level search metadata controls.
5. Mark meaningful content in archive, page, research, talk, splash, news, and homepage rendering paths.
6. Suppress duplicate homepage/news/publication/research archive material and explicitly opt utility pages out.
7. Add the persistent compact modal trigger, content filter, custom result template, and keyboard hints.
8. Map Pagefind's theme properties onto the six-palette semantic token system.
9. Add the explicit 209-route manifest and enforce the required content-type totals.
10. Extend local preview with `--with-search` using a temporary config and no automatic dependency installation.
11. Generate and validate Pagefind after the final Jekyll build in the Pages workflow.
12. Run Node 24/npm 11 tests, all palette builds, the production-equivalent search build, resource/artifact checks, and browser interaction checks.

## Search Manifest

- News: 170
- Publications: 26
- Research: 5
- Software: 1
- Talks: 2
- Teaching: 1
- Pages: 4
- Total searchable documents: 209
- Total public HTML routes: 220

The excluded routes are the 404 page, `/about/` aliases, `/resume.html`, unfinished Code and Collaborators pages, Posts and Tags shells, the legacy talk-map redirect, Talks Archive, and Terms.

## Completion Boundary

Generated `_site/pagefind/` files remain untracked. No hosted search provider, crawler account, API key, query analytics, semantic search, or autocomplete service is introduced. No commit or push occurs without explicit approval.
