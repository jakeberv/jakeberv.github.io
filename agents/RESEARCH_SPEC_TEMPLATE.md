# Research entry spec template

This template defines the recommended schema for files in `_research/`.

## Why this exists
- Preserve grid-card rendering on `/research/`.
- Keep manual ordering deterministic.
- Maintain consistent hero/open-graph metadata.

## Current rendering behavior
- `/research/` sorts `site.research` by `order_number`.
- Cards are rendered with `{% include archive-single.html type="grid" %}`.
- Card preview uses `excerpt`, which is currently an inline `<img ...>` snippet.

## Required front matter
- `title` (string)
- `layout: single-portfolio`
- `collection: research`
- `order_number` (integer, unique within collection)
- `excerpt` (HTML snippet for card preview image)

## Recommended front matter
- `header.og_image` (string path under `images/`)

## Body guidance
- Start with a lead visual and short framing paragraph.
- Use section headings for project subtopics.
- Keep outbound links explicit and include paper/software links where relevant.
- End with a consistent "Return to Research Home" link.

## Copy/paste template

```yaml
---
title: "RESEARCH AREA TITLE"
layout: single-portfolio
collection: research
order_number: 99
excerpt: "<img src='/images/research/IMAGE_FILE.jpg' alt='Short alt text'>"
header:
  og_image: "research/IMAGE_FILE.jpg"
---
<figure>
  <img src="/images/research/IMAGE_FILE.jpg" alt="Descriptive alt text"/>
  <figcaption>Short caption.</figcaption>
</figure>

Intro paragraph describing the research area and question.

## Subtopic heading

Details, links, and optional media embeds.

---
[Return to Research Home](https://www.jakeberv.com/research){: .btn--research}
```

## Validation checklist
- `order_number` does not duplicate another `_research` item.
- `excerpt` image path resolves.
- Entry appears in expected position on `/research/`.
