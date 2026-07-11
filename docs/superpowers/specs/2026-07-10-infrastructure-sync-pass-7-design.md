---
published: false
---

# Infrastructure Sync Pass 7 Design

## Goal

Adopt AcademicPages v0.9's portable Docker and Dev Container development capability while preserving the deployed site's content, 241 routes, appearance, current CV behavior, theme system, and GitHub Pages deployment.

## Upstream Baseline

The comparison baseline is AcademicPages v0.9 `11dbf0d0f5c1437143b40a3c86b8a1b4149c2f0a`. This phase adopts its Docker Compose and Dev Container capability, but not its Ruby 3.2 image, Bundler 2.3.26 pin, root-oriented permissions, redundant Docker Jekyll configuration, or broad `chmod` guidance.

## Infrastructure-Only Contract

- Work only on `codex/infra-sync-pass-7`.
- Preserve `.RData` and `todo` untouched and unstaged.
- Preserve `/cv/`, its automatically selected PDF, all content collections, navigation, generated data, PDFs, images, public routes, visual design, and browser behavior.
- Preserve the native preview workflow and GitHub Pages deployment; Docker remains optional developer tooling.
- Treat v0.9 alignment as capability parity rather than file-for-file copying or activation of optional features.
- Do not modify Gem files, lockfiles, JavaScript bundles, data, binaries, fonts, images, content, or GitHub Actions workflows.

## Architecture

### Portable runtime (adopted from AcademicPages)

A multi-stage Docker image provides Ruby 3.3.4, Bundler 2.5.18, Node 20, npm 10, Python 3, Git, and build tools. Docker Compose bind-mounts the repository, exposes the existing preview at port 4001, accepts host UID/GID build arguments with `1000` defaults, and keeps gems and `node_modules` in named volumes. Only those dependency-cache paths remain writable across Dev Container UID/GID remapping. A VS Code Dev Container attaches to the same service and workspace through a local Compose override that disables the preview-only health check while its command is replaced.

### Runtime validation (local compatibility hardening)

`scripts/container_bootstrap.command` reads `.ruby-version`, `.node-version`, and `Gemfile.lock`, rejects runtime drift, and installs dependencies only inside container volumes before site behavior delegates to `scripts/local_preview.command`. It fingerprints `package.json` and `package-lock.json`; a matching fingerprint is reused only when `npm ls` validates the installed tree, while missing, changed, or incomplete dependencies trigger deterministic `npm ci`. The container runs as an unprivileged user and never changes host-global Ruby or Node state.

### Contract verification (local compatibility hardening)

Docker-independent Node tests validate image pins, non-root execution, Compose volume isolation, Dev Container wiring, and preview delegation. A separate Docker smoke command builds the image and runs the existing npm, theme, and Jekyll checks inside it. The deployment workflow continues to run `npm test` without requiring Docker.

## Public Interfaces

- `docker compose up --build` starts the portable preview at `http://127.0.0.1:4001/`.
- `.devcontainer/devcontainer.json` defines the supported VS Code Dev Container.
- `scripts/container_bootstrap.command` validates and prepares the container runtime.
- `npm run check:container` performs Docker-independent contract checks.
- `npm run test:container` performs the complete container smoke test.

## Deferred Work

JSON CV support, if adopted later, must remain dormant and coexist with the unchanged PDF-based `/cv/`. GA4 compatibility, additional social-profile hooks, content-generator modernization, and other unused v0.9 compatibility assets remain independent later phases.
