# Research Method Tags Data Spec

Canonical file: `_data/research_method_tags.yml`

## Purpose
- Define a single source of truth for:
  - method families
  - detailed method tags
  - display-group subsets for UI contexts
  - software-to-tag crosswalks

## Top-level schema (current)
- `version` (integer)
- `canonical_name` (string)
- `description` (string)
- `last_updated` (date string)
- `registry_rules` (object)
- `method_family_order` (array of method-family IDs)
- `method_families` (array of objects)
- `tags` (array of objects)
- `display_groups` (object)
- `quick_tag_sets` (object)
- `software_to_tag_map` (object)

## Method family object
- `id` (string, stable key)
- `label` (string)
- `short_label` (string)
- `description` (string)
- `example_tags` (array of tag IDs)
- `requires_any_tags` (array of tag IDs; optional soft constraint used by validator warnings)

## Tag object
- `id` (string, stable key)
- `label` (string)
- `method_family` (method-family ID)
- `scope` (enum from registry rules)
- `analysis_type` (enum from registry rules)
- `data_modalities` (array of strings)
- `aliases` (array of strings)
- `keywords` (array of strings)
- `priority` (`core` | `supporting` | `emerging`)
- `requires_any` (array of tag IDs; optional soft co-tag constraint used by validator warnings)
- `usage_notes` (string; optional assignment guidance)

## Publication-level linkage location
Paper linkage is stored in publication front matter, not in this taxonomy file.

Recommended fields in `_publications/*.md`:
- `method_families` (array of method-family IDs)
- `method_tags` (array of tag IDs)
- `method_tag_confidence` (`high` | `medium` | `low`, optional)

## Maintenance rules
- Keep IDs stable; treat renames as migrations.
- If adding/removing method families or tags, update:
  - `method_family_order`
  - any affected `display_groups`
  - `quick_tag_sets` if relevant
  - `software_to_tag_map` if tool coverage changes
- If paper-linkage mappings change, update publication front matter in `_publications/*.md`.
- Validator behavior:
  - no deprecated alias fallback; publication front matter must use canonical method IDs
  - unknown IDs, family mismatches, missing co-tag constraints, and orphan method families are hard failures
