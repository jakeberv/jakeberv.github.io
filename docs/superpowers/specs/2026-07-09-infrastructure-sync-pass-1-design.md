# Infrastructure Sync Pass 1 Design

## Goal

Modernize the site's low-risk infrastructure while preserving its content, URLs, data schemas, visual identity, and GitHub Pages compatibility.

## Upstream Baseline

This pass compares the site with AcademicPages master commit `482bc2b22db0500a12c2297d96ba5db44e1d0929` and v0.9 tag `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. Changes below are labeled as either adopted from AcademicPages or local compatibility hardening.

## Constraints

- Keep the `github-pages` dependency model and Jekyll 3.10 compatibility.
- Do not modify site content, collection entries, binary assets, generated datasets, data-generation scripts, or files under `.github/workflows/`.
- Do not adopt the upstream theme system, dark-mode toggle, Sass reorganization, JavaScript module conversion, Docker setup, or CV generator in this pass.
- Preserve the existing uncommitted `.RData` and `todo` changes without editing or staging them.

## Changes

### Runtime contract (local compatibility hardening)

Add `.ruby-version` with Ruby `3.3.4`, matching the GitHub Pages dependency baseline, and `.node-version` with Node `20`, matching the repository's deployment workflow. Document these versions and Bundler `2.5.18` in `README.md` so local setup and deployment use an explicit, reproducible toolchain.

Update the local preview launcher to read the preferred Bundler version from `Gemfile.lock`. It first tries that version with Homebrew Ruby 3.3 and then a PATH-provided Bundler. If the pinned executable is unavailable or broken, it may use the same candidate's default Bundler only when `bundle check` succeeds, with a warning that names both versions. The launcher never installs or repairs global gems.

### Head and dependency loading (adopted from AcademicPages)

Remove the obsolete `HandheldFriendly`, `MobileOptimized`, and `cleartype` metadata from `_includes/head.html`, following AcademicPages v0.9. Keep the standard responsive viewport declaration.

Remove the unversioned global Chart.js script from the shared head. The impact dashboard already loads pinned Chart.js `4.4.1` before its own deferred script. Add that same pinned, deferred dependency to the teaching page, the only other Chart.js consumer. This keeps script ordering deterministic and avoids downloading Chart.js on unrelated pages.

### Shared includes and footer links (adopted from AcademicPages)

Normalize the comments-provider include path in `_includes/scripts.html` by removing its leading slash, matching current Jekyll include conventions and upstream AcademicPages. Keep `main.min.js` as a classic script in this pass because converting the custom legacy bundle to ES modules has a larger compatibility surface.

Change the footer's GitHub, Bitbucket, and Jekyll links from HTTP to HTTPS. No footer copy or visible navigation changes are included.

### Dynamic web manifest (adopted from AcademicPages)

Convert `images/manifest.json` into a Jekyll-rendered JSON document whose identity fields come from `_config.yml`. Keep the existing Android Chrome icon files and do not modify binary assets. Remove the obsolete cache-busting suffix from the manifest link while preserving the site's favicon, Academicons, theme color, and MathJax setup.

## Data Flow and Failure Behavior

Jekyll continues to render the same layouts and collections. Shared pages load only the existing site bundle; the impact and teaching pages load pinned Chart.js before their page-specific initialization code. If Chart.js fails to load, the teaching script's existing guard exits cleanly, while the impact dashboard retains its existing error behavior. The generated web manifest reflects the existing site identity without duplicating it in a static JSON file.

## Verification

1. Confirm the branch contains no changes to content collections, binary assets, generated data, data scripts, or GitHub Actions workflows.
2. Run `./scripts/local_preview.command --build-only --skip-data` and require a successful Jekyll build.
3. Inspect rendered `teaching` and `impact` pages to verify each references Chart.js exactly once and ordinary pages do not reference it.
4. Parse the rendered manifest and verify its identity, language, start URL, and two existing icon references.
5. Run `git diff --check` and review the final diff independently of the pre-existing `.RData` and `todo` changes.

## Deferred Passes

Later passes may separately evaluate the AcademicPages theme system and dark mode, modernize the legacy JavaScript/npm asset pipeline, add broader build and browser QA, and improve content-adjacent metadata automation. Each remains independent so this pass can be reviewed and reverted without affecting site content.
