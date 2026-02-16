# Talks data spec template

This template defines the recommended schema for `_data/talks.yml`.

## Why this exists
- Talks page (`/talks/`) is data-driven from YAML, not collection posts.
- Stable keys keep cards, chips, and links rendering correctly.
- ISO dates enable reliable newest-first sorting.

## Current rendering behavior
- Talks are sorted by `date` descending in `_pages/talks.md`.
- Watch link uses:
  - `video_id` if present
  - else `youtube_id` converted to a YouTube watch URL
- Optional chip rows:
  - `key_topics`
  - `software_tools`
  - `audience`
- Description is collapsible and hidden if value is `update` (case-insensitive).

## Required fields per talk item
- `title` (string)
- `date` (YYYY-MM-DD)
- At least one of:
  - `video_id` (full URL)
  - `youtube_id` (YouTube ID)

## Recommended fields
- `event` (string)
- `location` (string)
- `description` (string)
- `key_topics` (list of strings)
- `software_tools` (list of strings)
- `audience` (list of strings)
- `slides_url` (string URL)

## Copy/paste template item

```yaml
- title: "TALK TITLE"
  date: "YYYY-MM-DD"
  event: "EVENT OR SERIES"
  location: "CITY, REGION, COUNTRY"
  video_id: "https://www.youtube.com/watch?v=VIDEO_ID"
  # youtube_id: "VIDEO_ID"
  description: "1-3 sentence summary."
  key_topics:
    - "Topic A"
    - "Topic B"
  software_tools:
    - "Tool A"
  audience:
    - "Audience segment"
  slides_url: "https://example.com/slides.pdf"
```

## Validation checklist
- Date format is strict ISO (`YYYY-MM-DD`).
- At least one watch-link field exists (`video_id` or `youtube_id`).
- YAML indentation is valid (2 spaces per nested level).
