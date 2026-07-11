# AcademicPages Infrastructure Sync Pass 10 Design

## Objective

Complete the remaining useful AcademicPages v0.9 identity and integration capabilities without changing site content, routes, CV behavior, dashboards, or the established visual system.

Phase 10 is limited to academic icon assets, analytics-provider compatibility, dormant author-profile hooks, and modern sharing. The deployed configuration remains GoatCounter-only because the GA4 measurement ID is intentionally blank.

## Adopted from AcademicPages

- Academicons 1.9.4 and its expanded academic-service glyph map.
- The `google-analytics-4` provider name and pinned `gtag` initialization pattern.
- Pronouns, profile-image fetch priority, and expanded academic/social profile hooks.
- Bluesky, Mastodon, and X sharing/profile capabilities.

## Local Compatibility Hardening

- Keep only WOFF and TTF Academicons assets, preload WOFF, and remove unused legacy formats and minified CSS.
- Support an ordered, de-duplicated analytics provider list while retaining the inherited scalar provider interface.
- Keep GoatCounter active alongside dormant GA4 capability and suppress GA4 output unless a valid-looking `G-...` ID is configured.
- Preserve the custom Scholar metrics block, author-menu markup, Font Awesome 6.7.2 boundary, theme tokens, and button geometry.
- Validate both source contracts and rendered production output before deployment.

## Interfaces

- `analytics.providers` is the preferred ordered provider interface; `analytics.provider` remains a fallback when the list is absent.
- `analytics.google.tracking_id` activates GA4 only when populated with a `G-...` value.
- Academicons 1.9.4 is delivered by `/assets/css/academicons.css` with WOFF and TTF font files.
- The author schema accepts dormant v0.9 academic and social profile fields.
- Share controls are Bluesky, Facebook, LinkedIn, Mastodon, and X.

## Protected Surfaces

Do not modify content collections, page content, navigation, CV files, data, generated datasets, images, dashboard behavior, Gem files, JavaScript sources or bundle, package-lock dependencies, or the 220-route manifest. Preserve `.RData` and `todo` as uncommitted user changes.

## Acceptance

All static contracts, six theme builds, the full production build, rendered integration validation, and browser checks must pass. Default production pages must emit GoatCounter exactly once and must not emit GA4. The only accepted visible differences are X branding and the two additional share actions.
