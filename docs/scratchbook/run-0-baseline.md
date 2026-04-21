# Run 0 — Baseline (2026-04-21)

Measurement of the project state before the 7-iteration customer-readiness loop.

## Raw Numbers

| Metric | Result |
|---|---|
| `npm run type-check` | ✅ Pass (app + node + server) |
| `npm run lint` | 0 errors, 442 warnings |
| i18n keys | 2707 × 10 locales, 0 gaps |
| `npm run build` | ✅ 54.4s |
| `dist/` total | 13.3 MB |
| Initial JS bundle (`index-*.js`) | 223 KB |
| Largest lazy chunks | `feature-admin` 1001 KB, `feature-mfa` 893 KB |
| Prisma models | 84 |
| Server routes | 35+ |
| Uncommitted diff at start | 3664 lines across 29 files |
| In-progress tasks in registry | 1 (`episode-opsedien-persistence`) |
| Known TODO/FIXME in code | 6 (trivial, in 3 files) |

## Scorecard (Run 0)

| Dimension | Weight | Raw | Score |
|---|---|---|---|
| Feature coverage (20 TODOs done) | 20 % | 0/20 | 0 |
| Test pass rate | 15 % | unknown — not run yet | ~90 est. |
| Lighthouse perf | 15 % | not measured | — |
| Lighthouse a11y | 10 % | not measured | — |
| DSGVO checklist | 15 % | 70 % (docs exist, live-deploy DSGVO banner unverified) | 10.5 |
| API error rate under load | 10 % | not measured | — |
| Mobile TTI | 10 % | not measured | — |
| UX flow completion (Playwright journey) | 5 % | unknown | — |
| **Total (conservative, partial)** | | | **~35 %** |

Unmeasured dimensions carry 0 into the weighted total — lights a clear target for Run 1: instrument measurement first, then improve.

## Commits landed in Run 0

```
2861840 test(py): align translation-compliance e2e with new i18n key structure
91b937d refactor(i18n): move LandingPage service cards to dotted keys + consent/service keys
e79f415 feat(ui): collaborative tone on error and progress states
59f5471 fix(auth): persist staff token across reloads + harden static imports
```

## Real blockers for go-live on diggai.de (Hetzner)

External — cannot be resolved inside the repo:

1. No SSH key for Hetzner server in local env
2. No `NETLIFY_AUTH_TOKEN` in local env (frontend currently on Netlify)
3. `DATABASE_URL` (Supabase Frankfurt) not in local env — by design
4. DNS: diggai.de A/AAAA records status unverified
5. `TI_ENABLED=false` and no gematik TI connector — ePA route is internal, not real TI yet
6. `ARZT_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY`, `BACKUP_ENCRYPTION_KEY`, `VAPID_*` — must be set once on Hetzner, never regenerated

Internal — solvable in the 7-iteration loop:

- `episode-opsedien-persistence` still in-progress (backend start + browser validation)
- Two feature chunks above 1 MB bundle warning
- 442 lint warnings (non-blocking but worth sweeping)
- Patient-to-patient connection model does NOT exist in schema (user requested "customer universe")
- Session-markdown + progress-graph generation: models exist (`EpisodeNote`, `DailySummary`, `MeasureTracking`) but there is no verified customer-visible view chaining them together
