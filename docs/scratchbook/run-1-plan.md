# Run 1 — Plan (2026-04-21)

Goal: instrument measurement, close the high-impact customer-visible gaps, leave the codebase in a shippable state so Runs 2–7 have something to improve on.

## 20-Point Customer-Oriented TODO

Priority ranking: what does the patient or the practice feel first? Auth + account-creation → visible questionnaire quality → ePA/Diary content → the "universe" connection and longitudinal view last.

| # | Item | Acceptance criterion | Files / routes | Est. min |
|---|---|---|---|---|
| 1 | Patient self-registration on diggai.de | A new patient can create an account with email + password at `/register`, gets an email-verification link, and is routed to the questionnaire | `server/routes/auth.ts`, `src/pages/Register.tsx`, `prisma/schema.prisma` (add `PatientAccount` or reuse `Patient`) | 45 |
| 2 | Email verification flow | Clicking the link sets `verifiedAt`, lets the patient log in | `server/routes/auth.ts`, SMTP via existing `tutanota` config | 25 |
| 3 | Patient login + password reset | Login works; forgot-password sends reset link; reset lands on new password form | `src/pages/Login.tsx`, `src/pages/ResetPassword.tsx` | 30 |
| 4 | Patient portal home after login | Landing shows: my appointments, last anamnesis, my ePA count, diary button | `src/pages/patient/PortalHome.tsx` | 35 |
| 5 | Diary entry: create/list/edit | Patient can write a daily diary entry, list past entries, edit the last 24h entry | `server/routes/diary.ts`, `src/pages/patient/Diary.tsx`, uses existing `DiaryEntry` model | 40 |
| 6 | ePA read-only patient view | Patient sees their own ePA documents list, can download, upload is staff-only for now | `src/pages/patient/MyEpa.tsx`, existing `server/routes/epa.ts` | 25 |
| 7 | Session-markdown auto-generation after anamnesis | When a session is closed, a markdown summary is written to `EpisodeNote`, viewable by patient in the portal | `server/services/session-summary.service.ts`, hooks into session-close | 35 |
| 8 | Next-session agent reads prior markdowns as context | On new session start, last ≤5 `EpisodeNote` markdowns are loaded into the agent prompt | `server/services/agent/agent.service.ts`, `server/services/ai/prompt-templates.ts` | 30 |
| 9 | Health-progress graph — MVP | Portal has a page with a sparkline per tracked metric (pain, mood, weight, BP) from `DiaryEntry` + `MeasureTracking`, 30/90/365-day toggle | `src/pages/patient/Progress.tsx`, react-chartjs-2 or recharts (already in deps?) | 45 |
| 10 | Patient-to-patient connection model | Schema: `PatientConnection { requesterId, targetId, status, scope, consentedAt }` with pending/accepted/rejected/revoked | `prisma/schema.prisma`, `prisma/migrations/<ts>_add_patient_connections` | 20 |
| 11 | Connection request + accept flow UI | Patient can request a connection by email (recipient gets notification), accept or reject in portal | `src/pages/patient/Connections.tsx`, `server/routes/connections.ts` | 40 |
| 12 | Customer-facing landing copy polish | LandingPage service tiles use new dotted keys — add real human German translations (already fell back to German source in Run 0) + English | `public/locales/de/translation.json`, `public/locales/en/translation.json` | 15 |
| 13 | Questionnaire progress-bar encouragement tied to real answer count | ProgressBar shows "Fast geschafft" at ≥75 % of estimated total atoms, not raw clamped value | `src/components/ProgressBar.tsx`, caller in `Questionnaire.tsx` | 10 |
| 14 | Arabic + Farsi RTL spot-check | Open LandingPage, Questionnaire, Diary in RTL locales, fix any obvious layout breaks | manual + Playwright | 20 |
| 15 | Bundle-size cut: lazy-load `feature-admin` page chunks | Split `feature-admin` chunk (1001 KB) by admin sub-tab to land under the 1 MB warning | `src/pages/AdminDashboard.tsx` (already mostly lazy — audit one stuck import) | 20 |
| 16 | Bundle-size cut: lazy-load `feature-mfa` chunk | Same treatment for MFA dashboard (893 KB) | `src/pages/MFADashboard.tsx` | 15 |
| 17 | Playwright e2e smoke: register → questionnaire → session-markdown | Green e2e covering the customer golden path | `e2e/customer-golden-path.spec.ts` | 40 |
| 18 | Hetzner deploy runbook | Step-by-step runbook including env-var checklist, docker compose command, DNS cutover check, rollback | `docs/runbook-hetzner.md` | 25 |
| 19 | DSGVO consent audit on registration | Registration blocks unless DSGVO consent + AV-contract boxes are checked + signature captured; stored in `ConsentLog` | `src/pages/Register.tsx`, `server/routes/auth.ts`, existing `ConsentLog` model | 20 |
| 20 | Resolve in-progress `episode-opsedien-persistence` task | Backend starts clean, session auto-link to episode works in a browser | existing `server/routes/sessions.ts`, `server/services/episode.service.ts` | 30 |

Total estimated: ~545 min ≈ 9 hours.

## Run 1 strategy — pick the sharp edge

Not all 20 are realistic in Run 1. Run 1 focuses on **measurement + the backend/data enablement that unblocks later runs**:

- Items 10 (patient-connection model + migration) — unblocks 11 later
- Item 7 (session summary service) — unblocks 8 and graph later
- Item 15 + 16 (bundle trim) — measurable perf improvement immediately
- Item 20 (episode-opsedien resume) — closes the only open registry task
- Item 18 (Hetzner runbook) — gives user the deploy path

Items 1–6, 11, 17, 19 get queued for Run 2–4.
Items 8–9 for Run 3–5.

## Measurement targets for end-of-Run-1

| Metric | Run 0 | Run 1 target |
|---|---|---|
| Feature coverage (20 TODOs) | 0/20 | 5/20 |
| Type-check | pass | pass |
| Lint errors | 0 | 0 |
| Lint warnings | 442 | ≤ 435 |
| i18n gaps | 0 | 0 |
| Build time | 54.4s | ≤ 60s |
| Largest lazy chunk | 1001 KB | ≤ 700 KB |
| Open registry tasks | 1 in-progress | 0 in-progress |
| Scorecard total | ~35 % | ≥ 45 % |

## What I am NOT doing in Run 1

- No prod deploys. Hetzner runbook only.
- No destructive migrations. Only additive schema changes for item 10.
- No TriageEngine changes (CLAUDE.md says clinical sign-off required).
- No TI/gematik real-hardware connector — remains `TI_ENABLED=false`.
