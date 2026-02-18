# Publications tag taxonomy spec

This document defines how `type` and `tags` should be used in `_publications/*.md`.

## Source of truth
- Canonical publication tag taxonomy: `_data/publication_tags.yml`
- Allowed publication format values: `type_values` in `_data/publication_tags.yml`
- Validator: `scripts/validate_publication_tags.sh`

## Why this exists
- Keep publication metadata semantically clean.
- Prevent drift between venue/platform labels and topical tags.
- Make publication filters and topic chips stable over time.

## Tagging rules
- `type` is required and stores publication format (`article`, `preprint`, `chapter`, `thesis`, `software`).
- `tags` must contain topical slugs only, from `_data/publication_tags.yml`.
- `tags` must not repeat `type` values.
- `tags` must not contain venue/platform labels (for example journal names or `biorxiv`).
- Use lowercase, hyphenated slugs only.
- Recommended cardinality: `3-5` tags per publication.

## Front matter pattern
```yaml
type: article
tags: [birds, phylogenomics, macroevolution]
```

## Validation workflow
Run:

```bash
./scripts/validate_publication_tags.sh
```

Expected behavior:
- exits `0` if all publication tags are canonical and valid.
- exits non-zero and prints file-specific errors otherwise.

## Maintenance
- If a genuinely new topical area is needed, first add a new tag slug in `_data/publication_tags.yml`, then use it in publication front matter.
- If tag policy changes, update this file and `agents/INDEX.md` in the same change.
