# AcademicPages Infrastructure Upgrade Phase 12

## Implementation Plan

1. Create the Phase 12 branch and capture route and protected-file baselines under `/tmp`.
2. Add failing static and built-output comment contracts before changing provider behavior.
3. Remove Google+ and Staticman configuration, dispatch, markup, loaders, and the dormant author-profile field.
4. Harden Disqus, Discourse, and Facebook with complete configuration guards, HTTPS loaders, canonical URLs, and centralized script dispatch; preserve the custom include boundary.
5. Add narrowly anchored dependency-cache and editor-state ignores while keeping lockfiles and `_sass/vendor/` trackable.
6. Add npm entry points, include the static contract in `npm test`, and run built-output validation in the Pages workflow after the production build.
7. Synchronize README and architecture documentation without changing public content or styling.
8. Run static, palette, production, rendered-output, route, hash, and path-audit checks before requesting commit or push approval.

## Constraints

- Keep comments disabled and exactly 220 public HTML routes.
- Do not add dependencies or change `package-lock.json`.
- Do not modify content, data, CV files, binaries, Gem files, browser bundles, or scheduled workflows.
- Do not remove shared comment Sass or localization strings.
- Do not commit or push without explicit approval.
