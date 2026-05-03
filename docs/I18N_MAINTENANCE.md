# I18N Maintenance Guide

This document defines the minimum maintenance workflow to prevent untranslated key leakage (for example `consent.signature_hint`) in production.

## Source of truth

- German (`de`) is the canonical source locale.
- Every user-facing key added to `public/locales/de/translation.json` must exist in all supported target locales.
- For the current blocker scope, the maintained target set is:
  - `de`, `en`, `tr`, `ar`, `uk`, `es`, `fa`, `it`, `fr`, `pl`

## Required checks before deploy

Run the following in repository root:

```bash
node scripts/generate-i18n.ts
npm run test:run -- src/i18n/translation-completeness.test.ts
npm run test:e2e -- e2e/i18n-raw-keys.spec.ts
npm run preflight
```

Expected behavior:

- `translation-completeness.test.ts` fails if any key from German source is missing in a target locale.
- `i18n-raw-keys.spec.ts` fails if raw i18n key tokens are visible on critical routes/consent flow.
- `npm run preflight` now includes the translation completeness test and fails hard if it fails.

## High-risk keys (blocker set)

These keys must always exist in all maintained locales:

- `consent.signature_hint`
- `consent.error_checkboxes`
- `consent.submit`
- `service.start_cta`

## Operational notes

- Keep locale trees in sync for all deployment entry points.
- If adding new keys during feature work, update locales first and run checks in the same branch.
- Do not bypass preflight for release branches.
