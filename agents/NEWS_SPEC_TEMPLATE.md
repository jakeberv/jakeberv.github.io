# News item spec template

This template defines the recommended schema for files in `_news/`.

## Why this exists
- Keep news rendering stable on `/news/` and homepage snippets.
- Ensure each item exposes a clean excerpt for list views.
- Keep sorting/filtering by date predictable.

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
---
Full news text (1-3 sentences) with any links.

<!--news-excerpt-->
One-sentence excerpt used in list pages.
```

## Validation checklist
- Date is valid ISO format and not accidental future date.
- Excerpt separator exists exactly once.
- Item appears in `/news/` year group and homepage recent list.
