# Pages spec template

This template defines the recommended schema and conventions for files in `_pages/`.

## Why this exists

- Keep page-level behavior consistent across layouts and navigation.
- Reduce front matter drift between pages.
- Make bot-generated page edits predictable.

## Canonical Front Matter

### Required fields

- `permalink` (string)
- `title` (string)

### Common optional fields

- `layout` (string; if omitted, site defaults apply from `_config.yml`)
- `author_profile` (boolean)
- `excerpt` (string)
- `header` (object; e.g., `og_image`, `overlay_image`, `overlay_filter`)
- `redirect_from` (list)
- `read_more` (string; e.g., `enabled`)
- `published` (boolean)
- `modified` (date)
- `sitemap` (boolean)

## Layout patterns in this repo

- `archive`: list and section pages (examples: news, publications, research, talks archive)
- `about`: homepage/about presentation
- `single`: content pages with standard article wrapper
- `talk`: talk-detail style page when needed

Use an existing layout pattern unless there is an explicit reason to add a new one.
If `layout` is omitted, Jekyll defaults in `_config.yml` currently apply `layout: single` for pages.

## Permalink conventions

- Keep permalinks stable once published.
- Use trailing slash style for section pages where established (`/research/`, `/publications/`).
- For root page, use `/`.

## Navigation integration notes

- Main nav is defined in `_data/navigation.yml`.
- When adding a page intended for nav, add or update the corresponding navigation entry.
- For non-nav utility pages, keep them discoverable via internal links.

## Copy/paste starter template

```yaml
---
layout: archive
permalink: /example/
title: "Example"
author_profile: true
header:
  og_image: "research/example.jpg"
redirect_from:
  - /example.html
---
Page content goes here.
```

## Validation checklist

- Required fields are present and valid.
- Permalink does not conflict with an existing page.
- If `layout` is set, it matches page intent.
- If `layout` is omitted, default page layout behavior in `_config.yml` is intended.
- Any nav-intended page is reflected in `_data/navigation.yml`.
- Embedded iframes use responsive width behavior (`width:100%`, `max-width:100%`) rather than fixed-width attributes that can cause mobile overflow.
- Links and media paths resolve.
