---
published: false
---

# AcademicPages Infrastructure Upgrade Phase 6 Implementation Plan

**Goal:** Replace global MathJax 2 with opt-in MathJax 4 and add conditional, theme-aware Mermaid and Plotly rendering without changing content, routes, visual design, or the deployment model.

**Architecture:** Move scientific library bootstrapping out of the head and into a conditional include plus a deterministic bundled source module. Only pages with `mathjax: true`, fenced `mermaid`, or fenced `plotly` blocks request the corresponding pinned CDN runtime.

## Constraints

- Work only on `codex/infra-sync-pass-6`; preserve `.RData` and `todo` untouched and unstaged.
- Keep carried-over Font Awesome QA changes separate from Phase 6 changes.
- Preserve 241 routes, content collections, data, images, fonts, Gem files, package lock, workflows, and existing visualization behavior.
- Do not commit or push without approval.

## Tasks

- [x] Capture merged baseline routes, bundle hash/size, MathJax request count, and representative screenshots under `/tmp`.
- [x] Add a failing scientific-content contract test and observe the intended Phase 5 failures.
- [x] Move MathJax 4 into an opt-in include and mark only the 404 page as a consumer.
- [x] Add the conditional Mermaid/Plotly source module with safe source-preserving fallbacks.
- [x] Integrate scientific-content Sass, bundle ordering, watch paths, and Pages exclude rules.
- [x] Add `npm run check:scientific` and include it in the explicit npm test command.
- [x] Synchronize README and architecture documentation.
- [x] Rebuild the deterministic JavaScript bundle.
- [x] Run Node, Jekyll, palette, browser, route, lockfile, protected-file, and repository audits.
- [x] Prepare the approval-only commit/push handoff.

## Acceptance Criteria

- No rendered page references MathJax 2.
- Only `/404.html` loads MathJax 4; ordinary pages reference no MathJax, Mermaid, or Plotly CDN runtime.
- Mermaid and Plotly runtimes load only when matching fenced blocks exist and load at most once per page.
- Rendering failures preserve readable source and expose an accessible error/status message.
- Mermaid and Plotly consume `--site-*` and `--viz-*` tokens and re-render after `site:themechange`.
- `assets/js/_scientific-content.js` is compiled into `assets/js/main.min.js` and excluded from the Pages artifact.
- `package-lock.json` and workflows remain byte-identical.
- The route manifest remains exactly 241 HTML pages.

## Verification Plan

- Run `npm run check:scientific`, `npm test`, `npm run check:themes`, and `npm run test:themes`.
- Run `npm run build:js` twice and require byte-identical output, followed by `npm run check:js`.
- Run `./scripts/local_preview.command --build-only --full-build --skip-data` and compare the route manifest against the baseline.
- Inspect rendered HTML for MathJax, Mermaid, Plotly, module bundle, and uncompiled source boundaries.
- Serve `_site` and browser-test the 404 page plus primary routes in light and dark modes.
- Use a temporary, untracked browser fixture for valid and invalid Mermaid/Plotly blocks.
- Run `git diff --check`; audit changed paths against the exclusions; confirm `.RData` and `todo` remain untouched and unstaged.

## Verification Summary

- `npm run check:scientific` passes 8/8 tests.
- `npm test` passes 37/37 tests and confirms the committed bundle is current.
- `npm run check:icons`, `npm run check:themes`, and `npm run test:themes` pass; all six palettes build 241 routes.
- `npm run build:js` is deterministic across repeated runs, with bundle SHA `87dad0172273315f10e2dd011c62c35342d52bb50ee3ef42a8511b718ff760da`.
- `./scripts/local_preview.command --build-only --full-build --skip-data` passes with the known Bundler fallback, Faraday, and stale-data warnings.
- Rendered output retains the 241-route manifest; only `/404.html` loads MathJax 4; no rendered HTML loads MathJax 2.
- Primary route smoke tests show no scientific runtime requests, console errors, local asset failures, or horizontal overflow.
- A temporary `_site` browser fixture confirms Mermaid/Plotly rendering, invalid Plotly fallback, and theme-event rerendering.
- `git diff --check` passes; `package-lock.json`, workflows, Gem files, data, images, fonts, generated datasets, and content collections remain unchanged except for `_pages/404.md` adding `mathjax: true`.
- `.RData`, `todo`, and the carried-over Font Awesome QA file remain hash-identical to the pre-Phase-6 baseline and unstaged.
