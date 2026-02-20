# Publications Interdisciplinarity Braid Spec

Canonical feature files:
- `_includes/publications-interdisciplinarity-braid.html`
- `_pages/publications.md` (include insertion point)
- `_data/publications_interdisciplinarity_stats.json` (canonical stat-pill values)

## Purpose
- Provide a portfolio-level visual summary of methodological interdisciplinarity on `/publications/`.
- Show flow from inference scales -> method families -> research focus areas.
- Keep outputs fully data-driven from canonical publication and method tag front matter.

## Data dependencies
- Publications collection:
  - `site.publications`
  - front matter fields: `tags`, `method_tags`, `date`, `title`, `url`
- Publication taxonomy:
  - `_data/publication_tags.yml`
  - used keys: `groups[].slug`, `groups[].label`, `tags[].slug`, `tags[].group`
- Method taxonomy:
  - `_data/research_method_tags.yml`
  - used keys: `method_family_order`, `method_families[].id`, `method_families[].short_label`, `method_families[].label`, `tags[].id`, `tags[].method_family`, `tags[].scope`
- Braid stat snapshot:
  - `_data/publications_interdisciplinarity_stats.json`
  - fields: `tagged_outputs`, `method_families_represented`, `avg_method_tags_per_output`, `avg_theme_groups_per_output`

## Rendering behavior
- Panel is rendered on `/publications/` via include:
  - `{% include publications-interdisciplinarity-braid.html methods=site.data.research_method_tags publication_tags=site.data.publication_tags %}`
- Panel includes anchor id for deep-linking:
  - `#publications-interdisciplinarity-braid`
- The include computes weighted flow client-side:
  - Per publication, total group->family contribution is normalized to `1.0`.
  - Per publication, total family->scope contribution is normalized to `1.0`.
- The panel surfaces:
  - summary chips (tagged outputs, represented families, avg method tags/output, avg theme groups/output)
  - static legend line (`node height` / `ribbon width` semantics)
  - `Order` toggle (default vs heuristic family ordering)
  - `Download SVG` action button for presentation export
  - SVG braid visualization
  - right-column terminology override: publication group slug `methods` is rendered as `Methods-Oriented`
  - cross-link to `/research/#method-co-use-network`

## Accessibility and responsiveness
- Include root section has an explicit aria-label.
- SVG includes `role="img"` and an aria-label.
- Layout applies compact label scaling and side insets on narrower viewports (`max-width: 1080px`).
- Hover focus cue appears only during active hover state and clears on mouse leave.

## Change constraints
- Do not hardcode publication content; all data must come from front matter + taxonomies.
- Keep class names scoped with `pub-braid-` prefix to avoid style collisions.
- Preserve backwards compatibility with existing publication list rendering in `_pages/publications.md`.

## Validation and build hooks
- Build-time stat validation script:
  - `scripts/qa/validate-publications-interdisciplinarity-stats.mjs`
  - compares computed braid stats against `_data/publications_interdisciplinarity_stats.json`
  - `--write` mode regenerates canonical snapshot
- Wrapper script:
  - `scripts/validate_publications_interdisciplinarity_stats.sh`
- Local preview integration:
  - `scripts/local_preview.command` runs the braid stats validator before Jekyll build.

## Validation checklist
- `bundle exec jekyll build` succeeds without Liquid/JS syntax errors.
- `/publications/` renders the braid panel before yearly publication lists.
- With current dataset, panel shows non-empty stats and non-empty flows.
- Download button exports a valid SVG in both order states.
- `/research/` panel cross-links to `/publications/#publications-interdisciplinarity-braid`.
- If no qualifying records exist, panel fails gracefully (empty-state text, no JS error).
