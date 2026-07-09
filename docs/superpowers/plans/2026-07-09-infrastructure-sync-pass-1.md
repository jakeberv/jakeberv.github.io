# AcademicPages Infrastructure Upgrade Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the site's low-risk infrastructure against AcademicPages master `482bc2b` and v0.9 while preserving content, URLs, custom styling, dashboards, and GitHub Pages compatibility.

**Architecture:** Selectively port independent upstream fixes into the customized Jekyll site. Keep the GitHub Pages dependency model and legacy theme/asset pipeline intact, while hardening local runtime discovery and limiting browser dependencies to their consumers.

**Tech Stack:** Jekyll 3.10, `github-pages` 232, Ruby 3.3.4, Bundler 2.5.18, Node 20, Liquid, Bash, and classic browser JavaScript.

## Global Constraints

- Work only on `codex/infra-sync-pass-1`; do not modify `master`.
- Preserve the existing `.RData` and `todo` changes without editing or staging them.
- Do not stage, commit, or push without explicit user approval.
- Do not modify content collections, binary assets, generated datasets, data-generation scripts, `Gemfile`, `Gemfile.lock`, `package.json`, or `.github/workflows/`.
- Defer theme switching, Sass reorganization, JavaScript modules, npm modernization, new social integrations, Docker, CV generation, and workflow changes.

---

### Task 1: Record the contract and runtime pins

- [x] Update the design with the upstream commit/tag, dynamic manifest, and Bundler fallback.
- [x] Add `.ruby-version` containing `3.3.4` and `.node-version` containing `20`.
- [x] Verify the files contain exactly the specified values.

### Task 2: Harden local preview and synchronize documentation

- [x] Make `scripts/local_preview.command` read the Bundler version from `Gemfile.lock`.
- [x] Prefer the pinned Homebrew/PATH Bundler and allow a validated default-Bundler fallback with a warning.
- [x] Update `README.md` and `agents/SITE_ARCHITECTURE_SPEC_TEMPLATE.md` with the runtime and fallback contract.
- [x] Run `bash -n scripts/local_preview.command` and `./scripts/local_preview.command --build-only --skip-data`.

### Task 3: Port low-risk upstream include and dependency fixes

- [x] Remove obsolete mobile/cleartype metadata and global Chart.js from `_includes/head.html`.
- [x] Normalize the comments include and convert footer HTTP links to HTTPS.
- [x] Load pinned Chart.js 4.4.1 only on the impact and teaching pages.
- [x] Build and assert exact Chart.js reference counts in rendered output.

### Task 4: Adopt the dynamic web manifest

- [x] Render `images/manifest.json` through Jekyll using `_config.yml` identity fields.
- [x] Reference the existing 192px and 512px Android Chrome icons.
- [x] Remove the stale manifest cache suffix without changing other custom head behavior.
- [x] Build, parse the generated JSON, and assert all required fields and icon files.

### Task 5: Complete verification and handoff

- [x] Run the full local build, rendered-output assertions, and browser checks.
- [x] Run `git diff --check` and audit changed paths against the global constraints.
- [x] Request an independent whole-branch review and address important findings.
- [x] Ask `Commit locally? (yes/no)` and `Push to remote? (yes/no)`.
