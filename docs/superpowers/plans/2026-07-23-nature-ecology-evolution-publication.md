# Nature Ecology & Evolution Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the 20 July 2026 *Nature Ecology & Evolution* article with canonical topic/method metadata, a DOI-backed paper action, and a distinct SharedIt free-access action.

**Architecture:** Extend the existing optional publication-link contract with `free_access_url`, keeping all DOI and `paperurl` behavior backwards-compatible. Add reusable taxonomy values to the YAML registries, then create one structured Markdown publication entry that is validated by the existing topic and method validators.

**Tech Stack:** Jekyll/Liquid, YAML front matter, Markdown, Node.js test runner, repository shell validators.

## Global Constraints

- Work only on branch `codex/add-nee-publication`, based on `master`.
- Do not add or modify PDF, image, font, or other binary assets.
- Keep `.github/workflows/` unchanged.
- Use `paperurl: "https://doi.org/10.1038/s41559-026-03110-5"` and `free_access_url: "https://rdcu.be/fuxB1"` as distinct fields.
- Do not infer volume or page numbers that the publisher has not assigned.
- Preserve existing publication output when `free_access_url` is absent.
- Do not commit or push unless the user explicitly answers yes to the repository's required prompts.

---

### Task 1: Add a backwards-compatible free-access publication action

**Files:**

- Modify: `scripts/qa/content-generators.test.mjs`
- Modify: `_includes/archive-single-pubs-v2.html:116-136`
- Modify: `_layouts/single.html:52-55`
- Modify: `agents/PUBLICATIONS_SPEC_TEMPLATE.md:13-26,103-109,130-141,165-203`

**Interfaces:**

- Consumes: optional `free_access_url: string` from publication front matter.
- Produces: an archive action with accessible label `Free access` and a single-page textual `Free access` link. Entries without the field retain their previous markup.

- [ ] **Step 1: Write a failing renderer contract test**

Add this test after the existing publication breadcrumbs test in `scripts/qa/content-generators.test.mjs`:

```js
test("publication free-access links remain distinct from PDF links", () => {
  const archive = fs.readFileSync(
    path.join(repoRoot, "_includes/archive-single-pubs-v2.html"),
    "utf8",
  );
  const single = fs.readFileSync(path.join(repoRoot, "_layouts/single.html"), "utf8");

  assert.ok(archive.includes("{% if post.free_access_url %}"));
  assert.ok(archive.includes('href="{{ post.free_access_url }}"'));
  assert.ok(archive.includes('title="Free access"'));
  assert.ok(archive.includes('<span class="sr-only">Free access</span>'));
  assert.ok(single.includes("page.free_access_url"));
  assert.ok(single.includes('href="{{ page.free_access_url }}"'));
  assert.ok(single.includes("<u>Free access</u>"));
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```sh
node --test scripts/qa/content-generators.test.mjs
```

Expected: FAIL in `publication free-access links remain distinct from PDF links` because the templates do not yet reference `free_access_url`.

- [ ] **Step 3: Add the archive action**

In `_includes/archive-single-pubs-v2.html`, immediately after the existing `paperurl` action, add:

```liquid
        {% if post.free_access_url %}
          <a href="{{ post.free_access_url }}" class="pub-action" target="_blank" rel="noopener" title="Free access"><i class="fa-solid fa-fw fa-unlock zoom" aria-hidden="true"></i><span class="sr-only">Free access</span></a>
        {% endif %}
```

- [ ] **Step 4: Add the single-page text link**

Replace the publication-link block in `_layouts/single.html` with:

```liquid
        {% assign publication_slides_url = page.slidesurl | default: page.slides_url %}
        {% if page.citation or page.paperurl or page.free_access_url or publication_slides_url or page.bibtexurl %}
          <p>{% if page.citation %}Recommended citation: {{ page.citation }} {% endif %}{% if page.paperurl %}<a href="{{ page.paperurl }}"><u>PDF</u></a>{% endif %}{% if page.free_access_url %}{% if page.paperurl %} · {% endif %}<a href="{{ page.free_access_url }}" target="_blank" rel="noopener"><u>Free access</u></a>{% endif %}{% if publication_slides_url %}{% if page.paperurl or page.free_access_url %} · {% endif %}<a href="{{ publication_slides_url }}"><u>Slides</u></a>{% endif %}{% if page.bibtexurl %}{% if page.paperurl or page.free_access_url or publication_slides_url %} · {% endif %}<a href="{{ page.bibtexurl }}"><u>BibTeX</u></a>{% endif %}</p>
        {% endif %}
```

- [ ] **Step 5: Document the field**

Update `agents/PUBLICATIONS_SPEC_TEMPLATE.md` in four places:

1. Add `free_access_url` to the renderer field list with the description “optional free-to-read publisher or SharedIt link.”
2. Add it to “Additional links (optional).”
3. Add a backwards-compatibility note explaining that `paperurl` remains the PDF-labelled action while `free_access_url` is rendered separately.
4. Add `free_access_url: ""` to the copy/paste template below `paperurl`.

- [ ] **Step 6: Run the focused test and icon contract**

Run:

```sh
node --test scripts/qa/content-generators.test.mjs scripts/qa/fontawesome-contract.test.mjs
```

Expected: PASS, including the new free-access contract and confirmation that `fa-unlock` exists in the deployed icon set.

- [ ] **Step 7: Review checkpoint**

Review the Task 1 diff. Do not commit unless the user has explicitly approved a local commit.

---

### Task 2: Extend the topic and method taxonomies

**Files:**

- Modify: `scripts/qa/content-generators.test.mjs`
- Modify: `_data/publication_tags.yml:8-9,89-113`
- Modify: `_data/research_method_tags.yml:1-6,301-346,466-483`

**Interfaces:**

- Produces topic slug: `macroecology`.
- Produces method IDs: `multivariate_trait_analysis`, `model_shift_analysis`, and `spatial_ecological_modeling`.
- The new publication in Task 3 consumes these exact IDs.

- [ ] **Step 1: Write a failing taxonomy contract test**

Add this test after the free-access renderer contract in `scripts/qa/content-generators.test.mjs`:

```js
test("publication taxonomies expose the new reusable topic and method tags", () => {
  const topics = fs.readFileSync(path.join(repoRoot, "_data/publication_tags.yml"), "utf8");
  const methods = fs.readFileSync(
    path.join(repoRoot, "_data/research_method_tags.yml"),
    "utf8",
  );

  assert.match(topics, /^  - slug: macroecology$/m);
  assert.match(methods, /^  - id: multivariate_trait_analysis$/m);
  assert.match(methods, /^  - id: model_shift_analysis$/m);
  assert.match(methods, /^  - id: spatial_ecological_modeling$/m);
});
```

Run:

```sh
node --test scripts/qa/content-generators.test.mjs
```

Expected: FAIL in `publication taxonomies expose the new reusable topic and method tags` because none of the four IDs exist yet.

- [ ] **Step 2: Add the topical tag**

In `_data/publication_tags.yml`, update the metadata:

```yaml
version: 3
updated: 2026-07-23
```

Add after `macroevolution`:

```yaml
  - slug: macroecology
    label: Macroecology
    group: processes
    description: Broad-scale relationships among biodiversity, traits, geography, and environmental gradients.
```

- [ ] **Step 3: Add the comparative-trait method tags**

In `_data/research_method_tags.yml`, update the metadata:

```yaml
version: 7
last_updated: 2026-07-23
```

Add after `trait_evolution_modeling`:

```yaml
  - id: multivariate_trait_analysis
    label: Multivariate Trait Analysis
    method_family: comparative_trait_modeling
    scope: multi_scale
    analysis_type: inference
    data_modalities: [phenotypic_data, morphological_data, behavioral_data]
    aliases: [multivariate phenotype analysis, high-dimensional trait analysis]
    keywords: [multivariate traits, trait covariance, high-dimensional phenotype]
    priority: core
  - id: model_shift_analysis
    label: Model-Shift Analysis
    method_family: comparative_trait_modeling
    scope: multi_scale
    analysis_type: inference
    data_modalities: [phenotypic_data, morphological_data, behavioral_data]
    aliases: [evolutionary regime-shift analysis, model-regime detection]
    keywords: [model shifts, regime shifts, heterogeneous evolution]
    usage_notes: Use for shifts among evolutionary trait models or regimes; use diversification tags for speciation-extinction rate shifts.
    priority: supporting
```

- [ ] **Step 4: Add the spatial method tag**

Add after `macroecology_macroevolution_linkage`:

```yaml
  - id: spatial_ecological_modeling
    label: Spatial Ecological Modeling
    method_family: biogeographic_inference
    scope: multi_scale
    analysis_type: inference
    data_modalities: [geographic_data, ecological_data, phenotypic_data]
    aliases: [spatial ecological analysis, spatial regression]
    keywords: [spatial autocorrelation, environmental gradients, assemblage modeling]
    priority: core
```

- [ ] **Step 5: Validate the registries through the repository tests**

Run:

```sh
node --test scripts/qa/content-generators.test.mjs
```

Expected: PASS, including the new taxonomy contract and the tests that load and validate canonical topic and method values.

- [ ] **Step 6: Review checkpoint**

Confirm that all three method IDs are reusable rather than tied to SAR-Lag, Louvain, or bifrost implementation details. Do not commit unless the user has explicitly approved a local commit.

---

### Task 3: Add the publication entry

**Files:**

- Create: `_publications/2026-07-20-Berv_et_al_2026.md`

**Interfaces:**

- Consumes: `macroecology`, `multivariate_trait_analysis`, `model_shift_analysis`, `spatial_ecological_modeling`, and the optional `free_access_url` renderer contract.
- Produces: the public route `/publication/2026-07-20-Berv_et_al_2026`.

- [ ] **Step 1: Create the structured front matter**

Create `_publications/2026-07-20-Berv_et_al_2026.md` with:

```yaml
---
title: "Rates of passerine body plan evolution in time and space"
collection: publications
permalink: /publication/2026-07-20-Berv_et_al_2026
excerpt: ""
date: 2026-07-20
venue: "Nature Ecology & Evolution"
paperurl: "https://doi.org/10.1038/s41559-026-03110-5"
free_access_url: "https://rdcu.be/fuxB1"
link: "https://doi.org/10.1038/s41559-026-03110-5"
github: "https://github.com/jakeberv/passerine-bodyplan-evolution"
data_url: "https://doi.org/10.5281/zenodo.19198393"
supplement_url: "https://static-content.springer.com/esm/art%3A10.1038%2Fs41559-026-03110-5/MediaObjects/41559_2026_3110_MOESM1_ESM.pdf"
citation: '<b>Berv, J. S.</b>, Probst, C. M., Claramunt, S., Shipley, J. R., Friedman, M., Smith, S. A., Fouhey, D. F., & Weeks, B. C. (2026). Rates of passerine body plan evolution in time and space. <i>Nature Ecology & Evolution</i>. doi: <a href="https://doi.org/10.1038/s41559-026-03110-5">10.1038/s41559-026-03110-5</a>'
doi: "10.1038/s41559-026-03110-5"
type: article
tags: [birds, macroevolution, morphology, climate-change, macroecology]
method_families:
  - comparative_trait_modeling
  - biogeographic_inference
  - model_selection_uncertainty
  - simulation_and_validation
  - phenotypic_quantification
  - integrative_synthesis
method_tags:
  - phylogenetic_comparative_methods
  - trait_evolution_modeling
  - multivariate_trait_analysis
  - model_shift_analysis
  - spatial_ecological_modeling
  - macroecology_macroevolution_linkage
  - model_selection_information_criteria
  - sensitivity_analysis
  - forward_simulation_studies
  - morphometric_analysis
  - deep_time_hypothesis_testing
method_tag_confidence: high
featured: false
authors:
  - "Berv, J. S."
  - "Probst, C. M."
  - "Claramunt, S."
  - "Shipley, J. R."
  - "Friedman, M."
  - "Smith, S. A."
  - "Fouhey, D. F."
  - "Weeks, B. C."
student_authors:
  - "Probst, C. M."
corresponding_author:
  - "Berv, J. S."
  - "Weeks, B. C."
abstract: |
  The rates and patterns of phenotypic evolution are known to vary dramatically across time and space, yet the drivers of this variation remain poorly understood. Using over 170,000 skeletal measurements across 2,057 species of Passeriformes—the most diverse order of living birds—we reconstruct the evolutionary history of passerine body plan diversification over the past ~50 Myr. We find that the history of passerine body plan evolution is dominated by rare, hierarchically nested bursts of phenotypic innovation near the origins of major taxonomic groups, indicating that such radiations have played a disproportionately large role in shaping global passerine diversity. These bursts are temporally aligned with intervals of increased climatic instability in Earth’s history and are reflected in contemporary latitudinal gradients, where assemblages at higher latitudes host species with elevated mean rates of phenotypic evolution and more modular trait covariation. Together, our findings support the hypothesis that climatic variability may act as a recurring driver of phenotypic diversification, linking deep-time pulses of innovation to broad-scale spatial patterns in evolutionary tempo.
---
```

- [ ] **Step 2: Add the human-readable page body**

Append:

```markdown
[Read the paper with free access](https://rdcu.be/fuxB1){: .btn--research}

**Abstract:** The rates and patterns of phenotypic evolution are known to vary dramatically across time and space, yet the drivers of this variation remain poorly understood. Using over 170,000 skeletal measurements across 2,057 species of Passeriformes—the most diverse order of living birds—we reconstruct the evolutionary history of passerine body plan diversification over the past ~50 Myr. We find that the history of passerine body plan evolution is dominated by rare, hierarchically nested bursts of phenotypic innovation near the origins of major taxonomic groups, indicating that such radiations have played a disproportionately large role in shaping global passerine diversity. These bursts are temporally aligned with intervals of increased climatic instability in Earth’s history and are reflected in contemporary latitudinal gradients, where assemblages at higher latitudes host species with elevated mean rates of phenotypic evolution and more modular trait covariation. Together, our findings support the hypothesis that climatic variability may act as a recurring driver of phenotypic diversification, linking deep-time pulses of innovation to broad-scale spatial patterns in evolutionary tempo.

**Recommended citation:** J. S. Berv, C. M. Probst, S. Claramunt, J. R. Shipley, M. Friedman, S. A. Smith, D. F. Fouhey, B. C. Weeks. 2026. Rates of passerine body plan evolution in time and space. *Nature Ecology & Evolution*. [https://doi.org/10.1038/s41559-026-03110-5](https://doi.org/10.1038/s41559-026-03110-5)
```

- [ ] **Step 3: Run both publication validators**

Run:

```sh
./scripts/validate_publication_tags.sh
./scripts/validate_publication_method_tags.sh
```

Expected: both exit 0 and report valid canonical topic/method metadata for all publications.

- [ ] **Step 4: Review the entry against the publisher metadata**

Confirm the title, eight-author order, publication date, DOI, abstract, corresponding authors, code URL, data DOI, supplement URL, and corrected SharedIt URL. Confirm no volume or page numbers were added.

- [ ] **Step 5: Review checkpoint**

Confirm `git status --short` lists only text source/spec files and no PDF or other binary. Do not commit unless the user has explicitly approved a local commit.

---

### Task 4: Run complete verification

**Files:**

- Verify only; no additional files should be modified.

**Interfaces:**

- Consumes the renderer, taxonomy, documentation, and publication changes from Tasks 1-3.
- Produces evidence that the site contracts remain green.

- [ ] **Step 1: Check patch hygiene**

Run:

```sh
git diff --check
git status --short
```

Expected: no whitespace errors; only the approved Markdown, YAML, Liquid, layout, test, and agent-spec files are modified or untracked.

- [ ] **Step 2: Run focused publication validation**

Run:

```sh
./scripts/validate_publication_tags.sh
./scripts/validate_publication_method_tags.sh
node --test scripts/qa/content-generators.test.mjs scripts/qa/fontawesome-contract.test.mjs
```

Expected: all commands exit 0.

- [ ] **Step 3: Run the complete project suite**

Run:

```sh
npm test
```

Expected: all Node, asset, search, scientific-content, repository-hygiene, theme, and container-contract tests pass.

- [ ] **Step 4: Confirm scope and binary safety**

Run:

```sh
git diff --stat
git diff --numstat
```

Expected: every changed path is in the approved scope and every diff has textual line counts; no binary `-`/`-` entries appear.

- [ ] **Step 5: Request repository completion decisions**

Report the verified changes and ask exactly:

```text
Commit locally? (yes/no)
Push to remote? (yes/no)
```

Take no commit or push action until the user answers.
