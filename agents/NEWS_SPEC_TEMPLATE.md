# News item spec template

This template defines the recommended schema for files in `_news/`.

## Why this exists
- Keep news rendering stable on `/news/` and homepage snippets.
- Ensure each item exposes a clean excerpt for list views.
- Keep sorting/filtering by date predictable.
- Keep event tagging consistent across all news items.

## Current rendering behavior
- News index page reads `site.news`, filters out future-dated items, sorts by date descending, and groups by year.
- Homepage shows latest items with title, date, and excerpt.
- Excerpt text is split by `<!--news-excerpt-->`.

## Required front matter
- `title` (string)
- `date` (YYYY-MM-DD)
- `layout: archive`
- `author_profile: true`
- `excerpt_separator: "<!--news-excerpt-->"`

## Optional front matter
- `tags` (array of canonical slugs from `_data/news_tags.yml`)

## Canonical tag taxonomy
- Source of truth: `_data/news_tags.yml`
- Tag values in news front matter must use `slug` values from that file.
- Recommended usage: `1-3` primary tags per item, plus optional modifier tags.

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
tags:
  - conference_talk
  - invited_talk
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
