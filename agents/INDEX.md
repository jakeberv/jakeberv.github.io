# Agents Docs Index

This directory contains spec templates and process guides for bot-assisted and human-assisted changes in this repository.

## Recommended Reading Order

1. [`AGENTS.md`](../AGENTS.md)  
   Purpose: repository-wide operating policy for bots.

2. [`agents/INDEX.md`](INDEX.md)  
   Purpose: map of available specs/templates and when to use them.

3. Task-specific templates below  
   Purpose: apply the right schema/checklist for the requested work.

## Specs and Templates

### Architecture and data flow

- [`agents/SITE_ARCHITECTURE_SPEC_TEMPLATE.md`](SITE_ARCHITECTURE_SPEC_TEMPLATE.md)  
  Use when documenting or planning structural/site-wide changes.

- [`agents/IMPACT_DATA_PIPELINE_SPEC_TEMPLATE.md`](IMPACT_DATA_PIPELINE_SPEC_TEMPLATE.md)  
  Use when planning updates to impact metrics inputs (`_data/scholar_metrics.json`, `_data/map_data.json`) and related scripts/workflows.

### Content models

- [`agents/PUBLICATIONS_SPEC_TEMPLATE.md`](PUBLICATIONS_SPEC_TEMPLATE.md)  
  Use for publication entry schema and compatibility expectations.

- [`agents/NEWS_SPEC_TEMPLATE.md`](NEWS_SPEC_TEMPLATE.md)  
  Use for `_news` item structure and excerpt conventions.

- [`agents/RESEARCH_SPEC_TEMPLATE.md`](RESEARCH_SPEC_TEMPLATE.md)  
  Use for `_research` entry schema and ordering/card conventions.

- [`agents/TALKS_DATA_SPEC_TEMPLATE.md`](TALKS_DATA_SPEC_TEMPLATE.md)  
  Use for `_data/talks.yml` schema used by the talks page.

- [`agents/PAGES_SPEC_TEMPLATE.md`](PAGES_SPEC_TEMPLATE.md)  
  Use for `_pages` schema and page-level front matter/body conventions.

### Process and quality

- [`agents/WORKFLOWS_SPEC_TEMPLATE.md`](WORKFLOWS_SPEC_TEMPLATE.md)  
  Use to plan workflow changes before touching `.github/workflows/*` (explicit request required).

- [`agents/CHANGE_REQUEST_TEMPLATE.md`](CHANGE_REQUEST_TEMPLATE.md)  
  Use to define precise task requests for bots (scope, constraints, acceptance criteria, git preferences).

- [`agents/REVIEW_CHECKLIST.md`](REVIEW_CHECKLIST.md)  
  Use before handoff/merge to verify scope, policy, and quality requirements.

## Maintenance

- If you add, rename, or remove files in `agents/`, update this index in the same change.
- Keep links relative so they work for all collaborators and in GitHub UI previews.
