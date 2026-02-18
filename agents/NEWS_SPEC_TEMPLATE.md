# News item spec template

This template defines the recommended schema for files in `_news/`.

## Why this exists
- Keep news rendering stable on `/news/` and homepage snippets.
- Ensure each item exposes a clean excerpt for list views.
- Keep sorting/filtering by date predictable.
- Keep event tagging consistent across all news items.

## Current rendering behavior
- News index page reads `site.news`, filters out future-dated items, sorts by date descending, and groups by year.
- Homepage (`/`) reads the same `site.news` source and supports umbrella-category chip filters.
- Homepage optionally renders a `Pinned News` block above `Recent News` when one or more entries include `pinned: true`.
- Pinned block is sorted by date descending and capped at 3 entries.
- Pinned entries may also appear in the `Recent News` list.
- Homepage `All` filter shows the 5 most recent items across all categories.
- Homepage category filters show the 5 most recent items within the selected umbrella category.
- Homepage hides umbrella chips that have zero matching items.
- Homepage list keeps title, date, and excerpt display, and inserts year delimiters when visible items span multiple years.
- Homepage "View all news" link preserves the active umbrella filter via `?category=<umbrella-group-slug>`.
- Excerpt text is split by `<!--news-excerpt-->`.
- News page supports client-side filtering by umbrella category (derived from `_data/news_tags.yml`).
- Active news filter can be shared/persisted with `?category=<umbrella-group-slug>` on `/news/`.

## Required front matter
- `title` (string)
- `date` (YYYY-MM-DD)
- `layout: archive`
- `author_profile: true`
- `excerpt_separator: "<!--news-excerpt-->"`
- `geo` (map-ready geographic encoding; required by CI validator in this repository)

## Optional front matter
- `tags` (array of canonical slugs from `_data/news_tags.yml`)
- `pinned` (boolean; when `true`, item is eligible for homepage `Pinned News`)

## Canonical tag taxonomy
- Source of truth: `_data/news_tags.yml`
- Tag values in news front matter must use `slug` values from that file.
- Front matter must store leaf tags only (for example `publication`, `conference_talk`, `grant`).
- Do not add umbrella/group tags directly to news item front matter.
- Umbrella categories are derived from each leaf tag's `group` value in `_data/news_tags.yml`.
- Recommended usage: `1-3` primary tags per item, plus optional modifier tags.
- Use `student_contribution` (modifier tag) when a student advisee is a notable contributor (for example lead/co-lead author or presenter).

## Geo encoding for map parsing
- Goal: keep all geodata self-contained in each news file front matter for downstream JS parsing.
- Repository policy: every `_news` entry must include a `geo` block so CI validation and map generation succeed.
- Required structure:
  - `geo.version` (integer, must be `1`)
  - `geo.scope` (string: `event`, `global`, or `virtual`)
  - `geo.countries` (array key required for all entries)
  - `geo.localities` (array key required for all entries; may be `[]`)
- `geo.countries[]` fields:
  - `code` (required; ISO 3166-1 alpha-2, uppercase, for example `US`, `EC`, `GB`)
  - `region_m49` (required string; UN M49 3-digit region code, for example `021`)
  - `weight` (optional number; defaults to `1`)
- `geo.localities[]` fields:
  - `name` (required string)
  - `country_code` (required; ISO 3166-1 alpha-2)
  - `lat` (required number)
  - `lon` (required number)
  - `weight` (optional number; defaults to `1`)
- Scope-specific rules enforced by validator:
  - `geo.scope: global` may use an empty `countries` list.
  - non-global scope must include at least one country row.
- Locality-specific rules enforced by validator:
  - use `localities: []` when no locality can be inferred.
  - if `localities:` block is present, each item must include `name`, `country_code`, `lat`, and `lon`.
- Parsing guidance:
  - Choropleth country density should use `geo.countries[].code`.
  - Current career-footprint map aggregates to unique event counts per geography; duplicate country/locality rows within one entry are deduplicated at render time.
  - `geo.scope` is preserved in generated JSON for compatibility, even though current UI aggregates all scopes together.

## Strongly recommended body structure
1. First paragraph: short full item text.
2. Insert `<!--news-excerpt-->`.
3. Second paragraph: concise summary line for list views.

## Copy/paste template

```yaml
---
title: "NEWS TITLE"
date: YYYY-MM-DD
layout: archive
author_profile: true
excerpt_separator: "<!--news-excerpt-->"
# pinned: true
tags:
  - conference_talk
  - invited_talk
geo:
  version: 1
  scope: event
  countries:
    - code: US
      region_m49: "021"
      weight: 1
    - code: EC
      region_m49: "005"
      weight: 1
  localities:
    - name: "Seattle"
      country_code: US
      lat: 47.6062
      lon: -122.3321
      weight: 1
---
Full news text (1-3 sentences) with any links.

<!--news-excerpt-->
One-sentence excerpt used in list pages.
```

## Validation checklist
- Date is valid ISO format and not accidental future date.
- Excerpt separator exists exactly once.
- Item appears in `/news/` year group and homepage recent list.
- If `tags` is present, every tag exists in `_data/news_tags.yml`.
- `geo` exists and includes `version`, `scope`, `countries`, and `localities` keys.
- `geo.version` is `1`, and `geo.scope` is one of `event`, `virtual`, `global`.
- Every country row includes ISO alpha-2 `code` and 3-digit `region_m49`.
- `localities` is either `[]` or a complete list where each item has `name`, `country_code`, `lat`, and `lon`.
