---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 8 Design

## Objective

Adopt AcademicPages v0.9's command-line CSV/TSV publication-generation direction while making both inherited generators safe and compatible with this site's richer publication metadata. This phase adds authoring capacity without changing existing publications, the YAML-backed talks page, the CV, navigation, styling, or intended public routes.

## Adopted from AcademicPages

- Standard-library delimited-file parsing replaces the pandas requirement in the supported publication generator.
- CSV and TSV become explicit command-line inputs.
- Generated filenames and permalinks retain the AcademicPages date-and-slug convention.

## Local Compatibility Hardening

- Publication input includes the site's canonical type, topic-tag, author, abstract, and research-method metadata.
- Existing Node taxonomy validators remain the single policy authority and can validate a staged publication directory.
- Both generators expose read-only `check` and explicit-output `generate` commands, reject unsafe slugs and duplicate targets, and refuse collisions without `--overwrite`.
- Generated talk records emit both `type` and `talk_type`, while the visible `_data/talks.yml` workflow remains separate and unchanged.
- `markdown_generator/` becomes build-only. Removing its accidentally rendered index leaves 240 intended HTML routes and prevents notebooks, spreadsheet data, and source scripts from being deployed.

## Interfaces And Data Flow

The CLIs read UTF-8 or UTF-8-with-BOM `.csv` and `.tsv` files. Headers are name-based and order-independent. A shared Python core validates every row and renders all target documents before any persistent directory is created.

Publication validation writes the rendered documents to a temporary directory and invokes both canonical taxonomy validators against that directory. Generation proceeds only after structural and taxonomy validation pass. Talk validation remains Python-only because the optional `_talks` collection has no site taxonomy contract.

Generation requires `--output-dir`. Preflight checks reject every existing target before writing. Non-overwrite publication uses an atomic no-clobber operation so a target created after preflight is not replaced. `--overwrite` permits atomic replacement of generated target names, preserves existing permissions, and never deletes unrelated files.

## Protected Surfaces

The phase must not modify `_publications/`, `_data/talks.yml`, `_pages/`, CV PDFs or selection logic, navigation, taxonomy data, generated data, images, fonts, browser assets, Gem files, lockfiles, or workflows. The one intentional public change is removal of the unlinked `/markdown_generator/` route and its development artifacts.

## Verification

Node contract tests spawn the real Python CLIs with temporary CSV/TSV fixtures and cover deterministic output, taxonomy integration, no-clobber publication, normal file permissions, invalid inputs, and working-directory independence. Native and container tests must pass, all six palettes must match the tracked 240-route manifest, and `_site/markdown_generator` must be absent.
