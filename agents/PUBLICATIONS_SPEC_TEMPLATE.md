# Publications metadata spec & template (backwards-compatible)

This file documents the **recommended front-matter schema** for publication pages in this site, while preserving **maximum backwards compatibility** with the existing rendering pipeline (`site.publications` and the include that renders each entry).

## Why this exists
- Keep old publications rendering **unchanged**
- Add structured fields that enable future features (filters, “featured” lists, consistent formatting, better cards) without breaking old entries

## Current data flow (what the site already uses)
Your publications index page groups and renders items from the `publications` collection:

- The publications list page iterates over `site.publications`, sorts by `date`, and groups by year.
- Each item is rendered by an include that expects these fields when present:
  - `title` (required)
  - `date` (required; also used for year grouping)
  - `doi` (optional but preferred; drives DOI text/link and Altmetric badge)
  - `citation` (optional but widely used; currently rendered as HTML)
  - `link` (optional; used as fallback external link, and DOI fallback source when it is a `doi.org` URL)
  - `paperurl` (optional; PDF icon)
  - `code` (optional; code icon)
  - `github` (optional; GitHub icon)
  - `authors`, `student_authors`, `equal_contrib` (optional; structured author line + contribution markers/notes)
  - `type`, `tags` (optional; topic line, with duplicate `type` values removed from displayed tags)
  - `abstract` (optional; displayed in a collapsible `<details>` block)

✅ **Compatibility rule:** keep existing fields (`citation`, `link`, `paperurl`, `code`, `github`) even if you add new structured fields.

---

## Required fields (new and existing files)
These should always be present for consistent site behavior:

- `title` *(string)*
- `collection: publications` *(string; required for the collection)*
- `permalink` *(string; stable URL for the paper page)*
- `date` *(YYYY-MM-DD)*
- `venue` *(string; journal / outlet name)*

Recommended (but historically used in many files):
- `citation` *(string; HTML allowed)*

---

## Strongly recommended fields (for future flexibility)
These are optional today, but recommended for **new** entries:

### Identity & classification
- `type` *(string; e.g., `article`, `preprint`, `chapter`, `dataset`, `software`, `thesis`)*
- `tags` *(list of topical slugs from `_data/publication_tags.yml`; do not repeat `type` or venue/platform labels)*
- `featured` *(boolean; for homepage/featured sections later)*

### Canonical publication tags
- Source of truth: `_data/publication_tags.yml`
- `type` must use one of `type_values` in `_data/publication_tags.yml`
- `tags` must use `slug` values in `_data/publication_tags.yml`
- Keep `type` and `tags` semantically separate:
  - `type`: publication format (`article`, `preprint`, `chapter`, `thesis`, `software`)
  - `tags`: topical descriptors (for example `birds`, `phylogenomics`, `macroevolution`)
- Validate with:
  - `./scripts/validate_publication_tags.sh`

### DOI / identifiers
- `doi` *(string; bare DOI, e.g. `10.1016/j.ympev.2014.09.001`)*  
  Keep `link` as the DOI URL for backwards compatibility:
  - `link: https://doi.org/<doi>`
- Renderer fallback: if `doi` is missing and `link` points to `doi.org`, DOI is inferred from `link` for DOI display and Altmetric.
- Optional identifiers (use when available):
  - `pmid`, `pmcid`, `arxiv`, `isbn`

### Authors (structured)
- `authors` *(list of strings, in display order; no HTML)*  
- Optional:
  - `student_authors` *(list of author strings; subset of `authors` to mark advisee/student contributors without HTML color tags)*
  - `equal_contrib` *(list of author strings)*  
  - `corresponding_author` *(string or list)*

Rendering note:
- New list renderers can annotate `student_authors` with `†` and `equal_contrib` with `*`, while preserving `citation` fallback for legacy entries.
- `student_authors` and `equal_contrib` entries should exactly match values in `authors` (including punctuation and any `*` marker) so annotations resolve correctly.

### Abstract (structured)
- `abstract` *(YAML block scalar; preferred so the publications list can show it)*

### Additional links (optional)
- `data_url`
- `supplement_url`
- `slides_url`
- `video_url`
- `project_url`

---

## Backwards compatibility notes (important)
### 1) Keep `citation` as-is
Many existing pages use `citation` with HTML (e.g., bolding your name). Keep that working.

Later, you can migrate to structured citations, but don’t remove `citation` until templates stop depending on it.

### 2) Keep `doi` + `link` compatibility for DOI/Altmetric and external-link rendering
The current include resolves DOI in this order:
- `post.doi` (preferred)
- derived from `post.link` only when `link` is a `doi.org` URL

If DOI resolves, the list renders DOI text/link, DOI icon, and Altmetric badge.
If DOI does not resolve but `link` exists, the list renders a generic external link.

**Recommendation:**  
- Store `doi` as bare DOI string (future-friendly)
- Store `link` as `https://doi.org/<doi>` for backwards compatibility

### 3) Keep `paperurl`, `code`, `github`
Even if you add `pdf`, `repo`, etc., keep the legacy keys for existing templates.

### 4) Prefer repository-mirrored PDFs for `paperurl`
For consistency with current entries, prefer:
- `paperurl: https://github.com/jakeberv/jakeberv.github.io/raw/master/files/pdf/papers/<FILE>.pdf`

This avoids brittle publisher/session URLs and keeps download buttons stable.

---

## File naming convention (recommended)
Use:
- `YYYY-MM-DD-ShortKey.md`

Keep `permalink` stable. If you change filenames later, keep permalinks unchanged to avoid breaking links.

---

## Copy/paste template (new publication)

Replace placeholders in ALL CAPS.

```yaml
---
title: "FULL PAPER TITLE"
collection: publications
permalink: /publication/YYYY-MM-DD-SLUG
date: YYYY-MM-DD
venue: "JOURNAL / OUTLET"

# Backwards-compatible links (keep these)
link: "https://doi.org/DOI_GOES_HERE"            # external link; used by icons + altmetric
paperurl: "https://github.com/jakeberv/jakeberv.github.io/raw/master/files/pdf/papers/FILE.pdf"  # preferred PDF mirror

# Optional legacy icons (keep if used)
code: "URL_TO_CODE_OR_REPO"
github: "URL_TO_GITHUB_REPO"

# Existing citation string (HTML allowed; keep for compatibility)
citation: "AUTHORS (YEAR). TITLE. <i>JOURNAL</i>. https://doi.org/DOI"

# New structured fields (recommended)
doi: "DOI_GOES_HERE"                             # bare DOI string
type: article                                    # article | preprint | chapter | dataset | software | thesis
tags: [TAG1, TAG2]                               # avoid repeating `type` in tags
featured: false

authors:
  - "LAST, F. M."
  - "LAST, F. M."
student_authors: []                              # optional subset of authors to highlight as student advisees
equal_contrib: []                                # optional
corresponding_author: ""                         # optional

abstract: |
  Paste abstract here as plain text.
  Use a YAML block scalar so it can be shown in the publications list.

# Optional extras
data_url: ""
supplement_url: ""
slides_url: ""
video_url: ""
project_url: ""
---
```

### Body content (optional)
You can keep the body minimal, or include a download button and a “recommended citation” section.

Example body:

```markdown
Download paper here: URL_TO_PDF

Recommended citation: AUTHORS (YEAR). TITLE. JOURNAL. https://doi.org/DOI
```

---

## Minimal example (works today)
At minimum, this will render correctly in your current publications list:

```yaml
---
title: "TITLE"
collection: publications
permalink: /publication/YYYY-MM-DD-SLUG
date: YYYY-MM-DD
venue: "OUTLET"
link: "https://doi.org/DOI"
paperurl: "https://github.com/jakeberv/jakeberv.github.io/raw/master/files/pdf/papers/FILE.pdf"
citation: "..."
---
```
