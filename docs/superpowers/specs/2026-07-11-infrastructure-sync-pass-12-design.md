# AcademicPages Infrastructure Sync Pass 12 Design

## Objective

Complete a maintenance-only post-v0.9 cleanup of dormant comment integrations and local repository hygiene without changing the live website. Comments remain disabled, the public route contract remains 220 HTML files, and production makes no comment-provider requests.

## AcademicPages Compatibility Cleanup

- Retain the useful inherited comment boundaries for Disqus, Discourse, Facebook, and custom implementations.
- Remove Google+ because the service no longer exists.
- Remove Staticman because this repository has no configured consumer and the inherited form used a deprecated fixed v1 endpoint.
- Centralize all provider scripts in `comments-providers/scripts.html` and keep provider markup free of loaders.
- Preserve shared comments styling and localization strings to avoid unrelated Sass and translation churn.

## Local Repository Hardening

- Require complete provider configuration before emitting third-party markup or loaders.
- Require HTTPS for all retained remote providers and use canonical absolute page URLs for embedded discussions.
- Validate supported providers statically and verify that the default built artifact contains no comment UI or provider requests.
- Ignore only local dependency caches and editor state: `.bundle/`, root `vendor/bundle/`, root `vendor/cache/`, root `local/`, and `.vscode/`.
- Keep both lockfiles and `_sass/vendor/` tracked as reproducibility and source contracts.

## Interfaces

- `comments.provider` accepts blank, `disqus`, `discourse`, `facebook`, or `custom`.
- Disqus requires `comments.disqus.shortname`.
- Discourse requires an HTTPS `comments.discourse.server`.
- Facebook requires `comments.facebook.appid` and `comments.facebook.sdk_version`.
- `npm run check:comments` validates source and configuration contracts.
- `npm run check:comments:built` validates the disabled default production output.

## Protected Surfaces

Do not modify content, data, CV files or behavior, navigation, routes, dashboards, binaries, Gem files, lockfiles, browser bundles, or scheduled workflows. Preserve `.RData` and `todo` as uncommitted user changes.

## Acceptance

All static contracts, six palette builds, the production build, rendered integration/resource checks, and the exact 220-route artifact contract must pass. The JavaScript bundle, lockfile, content, data, CV, and binary hashes must remain unchanged.
