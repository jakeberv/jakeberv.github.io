# Nature Ecology & Evolution publication entry design

## Objective

Add the 20 July 2026 *Nature Ecology & Evolution* article, "Rates of passerine body plan evolution in time and space," to the publications collection without storing a local PDF. Preserve the canonical DOI as the normal paper target and expose the Springer Nature SharedIt URL as a separate free-access action.

## Publication entry

Create `_publications/2026-07-20-Berv_et_al_2026.md` using the current structured publication schema.

Required identity and citation metadata:

- Title: `Rates of passerine body plan evolution in time and space`
- Publication date: `2026-07-20`
- Venue: `Nature Ecology & Evolution`
- DOI: `10.1038/s41559-026-03110-5`
- Canonical `link`: `https://doi.org/10.1038/s41559-026-03110-5`
- `paperurl`: `https://doi.org/10.1038/s41559-026-03110-5`
- `free_access_url`: `https://rdcu.be/fuxB1`
- Type: `article`
- Featured: `false`

Authors, in order:

1. Berv, J. S.
2. Probst, C. M.
3. Claramunt, S.
4. Shipley, J. R.
5. Friedman, M.
6. Smith, S. A.
7. Fouhey, D. F.
8. Weeks, B. C.

Mark Probst as a student author, following the existing site metadata, and record Berv and Weeks as corresponding authors. Include the complete published abstract and a backwards-compatible formatted citation. Because volume and page numbers are not yet assigned on the publisher page, do not invent them.

Additional resources:

- GitHub: `https://github.com/jakeberv/passerine-bodyplan-evolution`
- Data: `https://doi.org/10.5281/zenodo.19198393`
- Supplement: `https://static-content.springer.com/esm/art%3A10.1038%2Fs41559-026-03110-5/MediaObjects/41559_2026_3110_MOESM1_ESM.pdf`

The body should provide a clearly labelled free-access reading button, the abstract, and a recommended citation. No binary or hosted PDF file will be added.

## Topic taxonomy

Use these publication tags:

- `birds`
- `macroevolution`
- `morphology`
- `climate-change`
- `macroecology`

Add `macroecology` to the `processes` group in `_data/publication_tags.yml`. Define it broadly enough for reuse on studies of large-scale relationships among biodiversity, traits, geography, and environmental gradients.

Do not add `functional-traits`, `phylogenetics`, or `biogeography` to this entry. They are defensible adjacent concepts but are either redundant with the selected five tags or describe supporting rather than focal analyses.

## Method taxonomy

Use these method families:

- `comparative_trait_modeling`
- `biogeographic_inference`
- `model_selection_uncertainty`
- `simulation_and_validation`
- `phenotypic_quantification`
- `integrative_synthesis`

Use these method tags:

- `phylogenetic_comparative_methods`
- `trait_evolution_modeling`
- `multivariate_trait_analysis`
- `model_shift_analysis`
- `spatial_ecological_modeling`
- `macroecology_macroevolution_linkage`
- `model_selection_information_criteria`
- `sensitivity_analysis`
- `forward_simulation_studies`
- `morphometric_analysis`
- `deep_time_hypothesis_testing`

Set `method_tag_confidence: high`.

Add three reusable tags to `_data/research_method_tags.yml`:

- `multivariate_trait_analysis`, in `comparative_trait_modeling`: analysis of multiple correlated phenotypic or functional traits.
- `model_shift_analysis`, in `comparative_trait_modeling`: detection and comparison of shifts among evolutionary trait models or regimes. Its usage note must distinguish it from speciation/extinction-rate shift tags.
- `spatial_ecological_modeling`, in `biogeographic_inference`: spatially structured analysis of ecological, environmental, geographic, or assemblage data.

Do not add tags for individual algorithms such as SAR-Lag or Louvain clustering. Do not assign diversification-rate tags because the focal shifts concern phenotypic evolutionary models rather than speciation or extinction.

## Free-access rendering

Add optional `free_access_url` support to the current publication list renderer and publication single-page header.

- Keep the existing DOI and `paperurl` behavior unchanged.
- When `free_access_url` is present, render a separate action labelled accessibly as `Free access` and open it in a new tab with `rel="noopener"`.
- On the publication page, display a compact textual `Free access` link alongside the existing citation/PDF actions.
- Entries without `free_access_url` must render exactly as before.

Document `free_access_url` in `agents/PUBLICATIONS_SPEC_TEMPLATE.md`, including its purpose and distinction from `paperurl`.

## Validation

Run the canonical topic and method validators, then the complete project test suite:

```sh
./scripts/validate_publication_tags.sh
./scripts/validate_publication_method_tags.sh
npm test
```

Verify that:

- the new entry passes both taxonomies;
- the free-access action points to the corrected SharedIt URL;
- the DOI, PDF-labelled action, free-access action, GitHub, data, and supplement links are not conflated;
- no binary file is added;
- existing publication entries retain their current output.

## Scope

This change does not alter CI, deployment, PDFs, research scripts, or unrelated pages. Future volume/page metadata and a repository-hosted PDF can be added separately when available.
