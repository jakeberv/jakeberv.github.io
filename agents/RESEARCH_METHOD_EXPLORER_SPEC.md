# Research Method Explorer Spec (Deferred Advanced Version)

Status: Deferred (not currently live)

## Purpose
- Capture a future-ready design for a richer method explorer on `/research/`.
- Preserve implementation ideas from the matrix prototype without keeping the complexity on the live page.

## Live implementation (current)
- The live page uses a compact coverage-first method explorer include:
  - top-level method families displayed as overview cards with:
    - paper count per family
    - used-tags/total-tags count per family
    - tag coverage percent per family
  - click-to-expand family details
  - sub-tags are sorted client-side by linked paper count (descending)
  - default condensed view shows top tags only, with a `Show all tags` toggle
  - each sub-tag expands to:
    - representative linked papers (top 3, newest first)
    - optional `View all tagged papers` expansion when more than 3 exist
  - publication links are generated dynamically from `site.publications` via `method_tags`

## Deferred concept summary
- A `method x research area` matrix with interactive filtering.
- Interactions:
  - click family row to filter areas/cards
  - click area column to filter by area
  - click cell to apply combined family+area filter
  - optional sub-tag rail when a family is active

## Product goals for deferred version
- Show method breadth quickly.
- Surface overlap between methods and research areas.
- Keep interactions lightweight and mobile-safe.
- Retain URL-shareable filter state.

## Data dependencies
- Canonical method taxonomy in `_data/research_method_tags.yml`.
- Research-area mapping in `_research/*.md` via:
  - `method_families`
  - `method_tags`

## Accessibility and layout constraints
- No horizontal overflow on mobile.
- Keyboard-operable controls (`button` elements with `aria-pressed` for toggles).
- Clear reset affordance.

## Suggested implementation files (when reactivated)
- `_includes/research-method-explorer.html` (matrix markup + scoped CSS)
- `assets/js/research-method-explorer.js` (interactive state + URL sync)
- `_includes/archive-single-research-grid.html` (data attributes for filtering badges/state)

## Reactivation checklist
- Re-add client script include in `_pages/research.md`.
- Reintroduce card data attributes in `_includes/archive-single-research-grid.html`.
- Verify compact behavior on desktop + mobile.
- Confirm defaults are non-filtered and visually low-noise.
