# AcademicPages Infrastructure Upgrade Phase 10

## Implementation Plan

1. Capture the 220-route, asset-hash, rendered-markup, and screenshot baseline under `/tmp`.
2. Add failing Academicons and integration contracts and verify their pre-upgrade failures.
3. Replace Academicons 1.8.0 with the v0.9 1.9.4 CSS, WOFF, and TTF boundary; add preload delivery and remove unused legacy assets.
4. Add ordered analytics provider dispatch, guarded GA4 support, and keep GoatCounter as the sole active production provider.
5. Add dormant author-profile hooks, correct GitLab and employer markup, and modernize active Twitter-facing links to X.
6. Replace the three-action sharing surface with encoded Bluesky, Facebook, LinkedIn, Mastodon, and X actions and responsive theme-compatible styling.
7. Add source and built-output QA commands, include them in npm/deployment validation, and synchronize developer documentation.
8. Run all static, build, theme, production, artifact, and browser checks; audit protected paths and verify `.RData` and `todo` are untouched.

## Constraints

- No content, route, CV, navigation, dashboard, data, Gem, JavaScript, or dependency-version changes.
- No GA4 request until a separate change supplies a measurement ID.
- No commit or push without explicit approval.
