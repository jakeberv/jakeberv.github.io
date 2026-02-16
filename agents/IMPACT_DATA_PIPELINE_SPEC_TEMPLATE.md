# Impact data pipeline spec template

This template documents how `/impact/` is populated and maintained.

## Purpose
- Keep citation charts and map data fresh and reproducible.
- Separate automated and manual update paths.
- Define minimum validation before publish.

## Consumers
- Page: `_pages/impact.md`
- Inputs:
  - `_data/scholar_metrics.json` (citations over time bar chart)
  - `_data/map_data.json` (geo bubble map)

## Data contract: scholar metrics
- File: `_data/scholar_metrics.json`
- Required top-level keys:
  - `name`
  - `citations`
  - `h_index`
  - `i10_index`
  - `cites_per_year` (object of year -> count)
  - `generated_at`

### Minimal JSON shape
```json
{
  "name": "Author Name",
  "citations": 0,
  "h_index": 0,
  "i10_index": 0,
  "cites_per_year": {
    "2024": 0,
    "2025": 0
  },
  "generated_at": 0
}
```

## Data contract: citation geography
- File: `_data/map_data.json`
- Expected shape: array of objects with:
  - `address` (string)
  - `publicationCount` (number)
  - `lat` (number)
  - `lon` (number)

### Minimal JSON shape
```json
[
  {
    "address": "City, Country",
    "publicationCount": 1,
    "lat": 0.0,
    "lon": 0.0
  }
]
```

## Update workflows
### Automated scholar refresh
- Workflow file: `.github/workflows/fetch_scholar_data.yml`
- Script: `fetch_scholar_metrics.py`
- Schedule: weekly cron plus manual dispatch
- Commit target: `_data/scholar_metrics.json`

### Manual geography refresh
- Raw source file: `_data/map.txt` (Web of Science export in JS assignment form)
- Parser script: `citation_map_parser.R`
- Output target: `_data/map_data.json`

## Operational checklist
- `cites_per_year` contains current year key.
- `map_data.json` parses as valid JSON array.
- `/impact/` loads both charts without JS console errors.
- If scholar fetch partially fails, previous non-empty metrics are preserved.

## Runbook notes
- If scholar API/proxy fails repeatedly:
  - keep previous `_data/scholar_metrics.json`
  - record retry date/time and failure mode
- If map export format changes:
  - update parser assumptions before overwriting `map_data.json`
