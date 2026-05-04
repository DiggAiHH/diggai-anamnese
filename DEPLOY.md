# DiggAI Anamnese — Deploy Single Source of Truth

> **Status.** This is the canonical deploy doc. Any other deploy file in the repo is **superseded** unless it specifically references this document.
> **Last verified.** 2026-05-04 by claude-code (Opus 4.7) — see "Verification gaps" below for items I could not check from the workspace.
> **Scope.** Service 4 (Anamnese Platform). Sibling project `DiggAI-HZV-Rural/` has its own deploy.

---

## 1. The actual current pipeline (one paragraph)

`master` → GitHub Actions `.github/workflows/deploy.yml` → SSH into Hetzner VPS → `git pull` inside an Alpine container → `docker compose --project-name diggai build app && up -d --force-recreate --no-deps app` → health-check `http://localhost:3001/api/health`. Frontend builds separately and goes to **Netlify** (manual `npm run deploy` calls `scripts/deploy-guided.mjs`). Database is **Supabase Postgres** (Frankfurt) — schema migrations run via the manual workflow `.github/workflows/migrate-production-once.yml` against Supabase, **not** against the Postgres container in `docker-compose.yml`. The local `diggai-postgres` Docker container is for local dev / fallback only.

**Live endpoints:**
- Frontend: `https://diggai.de` and `https://diggai-drklaproth.netlify.app`
- Backend API: `https://api.diggai.de/api` (Hetzner, behind system nginx → Docker app on port 3001)
- DB: Supabase project `oanbmfztnzjvkumzpnfb` at `aws-1-eu-central-1.pooler.supabase.com:5432`

---

## 2. Where every key lives — single index

### 2.1 GitHub repo secrets (verified via `gh secret list`)

| Secret | Used by | Notes |
|---|---|---|
| `VPS_HOST` | `deploy.yml` | Hetzner IP / DNS |
| `VPS_USER` | `deploy.yml` | SSH user (typically `diggai`) |
| `VPS_SSH_KEY` | `deploy.yml` | Private key, full PEM |
| `VPS_SSH_PORT` | `deploy.yml` | Optional, defaults to 22 |
| `JWT_SECRET` | `migrate-production-once.yml` | 64-hex string |
| `ENCRYPTION_KEY` | `migrate-production-once.yml` | Exactly 32 chars (AES-256-GCM) |
| `ARZT_PASSWORD` | `migrate-production-once.yml` | Default seed password for first arzt account |
| `SUPABASE_DB_PASS` | `migrate-production-once.yml` | Postgres password for `postgres.oanbmfztnzjvkumzpnfb` user |
| `DATABASE_URL_MIGRATION` | (legacy?) | TODO: confirm if still used |

**Missing on GitHub** (the deploy/runtime needs them but they live on the VPS itself in `/opt/diggai/anamnese-app/.env.production`):
`DATABASE_URL`, `FRONTEND_URL`, `API_PUBLIC_URL`, `REDIS_URL`, `BACKUP_ENCRYPTION_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `SMTP_*`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.

### 2.2 VPS-side secrets (`/opt/diggai/anamnese-app/.env.production`)

The deploy workflow has a self-healing path:
1. If `.env.production` is missing on the VPS → restore from `/opt/diggai/.env.production.bak`.
2. If backup is missing → extract from a running `*-app` container's env.
3. If neither → **deploy aborts** with a `DATABASE_URL missing` error.
4. After every successful deploy → backup is refreshed at `/opt/diggai/.env.production.bak`.

So the VPS holds the canonical runtime secrets and must be backed up out-of-band (`scp` to local) regularly.

### 2.3 Netlify environment

Set in **Netlify Dashboard → Site configuration → Environment variables** (NOT in repo):
- `VITE_API_URL` = `https://api.diggai.de/api` (also pinned in `netlify.toml [context.production.environment]`)
- `VITE_PRACTICE_*` (white-label per site)
- `VITE_TENANT_ID`
- `NETLIFY_AUTH_TOKEN` for `npm run deploy` from a developer machine

### 2.4 Supabase

- Project ref: `oanbmfztnzjvkumzpnfb` (visible in `migrate-production-once.yml`)
- Pooler host: `aws-1-eu-central-1.pooler.supabase.com:5432`
- DB user: `postgres.oanbmfztnzjvkumzpnfb`
- Password: GitHub secret `SUPABASE_DB_PASS`
- Service-role key + anon key: live in **Supabase Dashboard → Project Settings → API** (not committed)

---

## 3. Netlify Site IDs — drift to fix

The repo currently lists THREE different Netlify Site IDs. **This is the single biggest source of deploy confusion.**

| Site ID | Source | Plausible meaning | Action |
|---|---|---|---|
| `4e24807c-6ea8-482e-8bef-6c688f7172bb` | `netlify.toml` (build env) and `scripts/deploy-guided.mjs` default | **CANONICAL** — what the actual prod build uses | Keep |
| `aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa` | `docs/DEPLOYMENTS.md` (2026-04-19) | Possibly the older / branded "Klaproth" site | **Verify in Netlify dashboard, then either retire or document the second site** |
| `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90` | `CLAUDE.md` and `.env.example` | Stale / wrong | **Replace with `4e24807c-...` everywhere** |

Until verified in the Netlify dashboard, treat **`4e24807c-6ea8-482e-8bef-6c688f7172bb`** as the production site (because that's what the build actually pushes to via `netlify.toml`).

---

## 4. Hosting configs in the repo and what they actually do

| File | Purpose | Status |
|---|---|---|
| `netlify.toml` | Frontend build + headers + canonical `VITE_API_URL` | **ACTIVE** |
| `Dockerfile` | Backend container image for VPS | **ACTIVE** |
| `docker-compose.yml` | Base services (app + postgres + redis) | **ACTIVE on VPS** |
| `docker-compose.prod.yml` | Adds RabbitMQ + Python Agent-Core | **OPTIONAL** (`--profile agents`) |
| `docker-compose.local.yml` | Dev-only postgres + redis | Dev only |
| `docker-compose.gematik.yml` | Gematik TI components | Disabled (`TI_ENABLED=false`) |
| `docker-compose.monitoring.yml` | Prometheus + Grafana | Optional |
| `.github/workflows/deploy.yml` | Master push → VPS deploy | **ACTIVE** |
| `.github/workflows/migrate-production-once.yml` | Manual Supabase migration | **ACTIVE** (workflow_dispatch only) |
| `.github/workflows/ci.yml`, `test.yml`, `playwright.yml`, `lighthouse.yml`, `security-scan.yml`, `performance-budget.yml` | CI quality gates | Active |
| `.github/workflows/debug-logs.yml`, `reset-passwords.yml` | One-off ops tools | On-demand |
| `railway.toml` | Railway backend config | **VESTIGIAL** — pilot stack, not used in production. Safe to delete. |
| `render.yaml` | Render.com backend config | **VESTIGIAL** — alternative pilot stack. Safe to delete. |
| `vercel.json` | Vercel frontend config | **VESTIGIAL** — superseded by Netlify. Safe to delete. |

---

## 5. Env templates — three exist, only one is current

| Template | Targets | Status |
|---|---|---|
| `.env.example` | Local development | **Active** but contains a leaked token (see §8). Update needed. |
| `.env.pilot.example` | Pilot stack (Netlify + Railway + Supabase) | **Superseded** — pilot is no longer the prod path. Mark as historical. |
| `.env.hetzner.template` | Production on Hetzner VPS | **Active** — copy this to `.env.production` on the VPS. |
| `server/.env.example` | Server-only example | Active reference |

**Rule going forward:** keep only `.env.example` (dev) + `.env.hetzner.template` (prod). Delete `.env.pilot.example` after confirming nobody references it.

---

## 6. Documentation drift — what to read, what to ignore

The 10 documents the user is referring to all describe slightly different stacks because the project migrated through pilot stacks before settling on Hetzner+Netlify+Supabase.

| Doc | Date | Stack described | Action |
|---|---|---|---|
| **`DEPLOY.md`** (this file) | 2026-05-04 | Hetzner VPS + Netlify + Supabase | **CANONICAL** |
| `docs/DEPLOYMENT.md` | undated | Netlify + Docker VPS + Postgres-in-Docker | Outdated re: DB. Mark superseded. |
| `docs/DEPLOYMENTS.md` | 2026-04-19 | Multi-site overview (Klaproth + Hatami) | Useful overview. Update Site IDs. |
| `PILOT_DEPLOYMENT_GUIDE.md` | (top-level) | Netlify + Railway + Supabase | **Superseded.** Pilot path no longer prod. |
| `PRODUCTION_SETUP_CHECKLIST.md` | 2026-03-31 | Supabase + Railway + Netlify | **Superseded.** Backend moved off Railway. |
| `RAILWAY_FRONTEND_DEPLOYMENT.md` | (top-level) | Frontend on Railway | **Superseded.** Frontend is on Netlify. |
| `RAILWAY_FRONTEND_CHECKLIST.md` | (top-level) | Frontend on Railway | **Superseded.** |
| `docs/BILLING_DEPLOYMENT.md` | undated | Stripe-specific | Keep, scope-limited. |
| `docs/DISASTER_RECOVERY.md` | undated | DR runbook | Read alongside this doc. |
| `CLAUDE.md` (project) | living | Includes Netlify Site ID `d4c9bba2-…` | **Wrong Site ID — fix.** |

After this PR merges, the four `*Pilot*` / `*Railway*` docs and old DEPLOYMENT.md should get a `> ⚠️ SUPERSEDED — see workspace-root DEPLOY.md` banner at the top.

---

## 7. Day-to-day deploy recipes

### 7.1 Backend (Hetzner) — production deploy
Just push to master.
```bash
git push origin master
# Wait for Actions: build → deploy → health check
gh run watch
```
If the deploy fails, the `.env.production` self-heal logic in deploy.yml usually saves it. If health check fails, see app logs:
```bash
gh workflow run debug-logs.yml
```

### 7.2 Backend — manual hotfix on VPS
```bash
ssh diggai@$VPS_HOST
cd /opt/diggai/anamnese-app
git pull origin master
docker compose --project-name diggai build app
docker compose --project-name diggai up -d --force-recreate --no-deps app
docker logs diggai-app --tail 100
```

### 7.3 Frontend (Netlify) — production deploy
```bash
# Local prerequisite: NETLIFY_AUTH_TOKEN env var set
npm run build
npm run deploy            # uses scripts/deploy-guided.mjs, defaults to Site 4e24807c-…
# Or preview:
npm run deploy:preview
```

### 7.4 Database migrations (Supabase)
**Never** run `prisma migrate dev` against production. Use the workflow:
```bash
gh workflow run migrate-production-once.yml
```
This runs `scripts/migrate-production.sh` with the `SUPABASE_DB_PASS` GitHub secret. The script uses `prisma db push` because the original migrations were generated for SQLite (legacy quirk — see migrate-production.sh header).

### 7.5 Local development
```bash
cp .env.example .env       # then edit
docker-compose -f docker-compose.local.yml up -d   # postgres + redis
npx prisma migrate dev
npm run db:seed:demo
npm run dev:all            # frontend :5173 + backend :3001
```

---

## 8. ⚠️ SECURITY: leaked Netlify token

`.env.example` (committed at `Ananmese/diggai-anamnese-master/.env.example:67`) and the local `.env` (gitignored, ok) contain a real-looking Netlify auth token:
```
NETLIFY_AUTH_TOKEN="nfp_btSUL1DBNt2YkKv5EBYUccBX2egCRwgec7b3"
```
This token has been in git history since at least the previous commit. **Required actions:**

1. **Rotate immediately** in Netlify Dashboard → User settings → Applications → New access token. Revoke the leaked one.
2. The redacted placeholder in `.env.example` is being applied in this PR.
3. Consider running `git filter-repo` or BFG to scrub the token from history (low priority — rotation makes the leaked value useless).
4. Audit `git log -p -S "nfp_"` to find any other token spills.

---

## 9. Verification gaps (could not check from workspace alone)

The following cannot be confirmed without dashboard access. Mark them resolved when you verify:

- [ ] Confirm Netlify Site ID `4e24807c-6ea8-482e-8bef-6c688f7172bb` is the production site
- [ ] Confirm whether `aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa` is a separate live site (white-label?) or stale
- [ ] Confirm `d4c9bba2-71cc-48a1-81a4-14cb9ac5cb90` is dead (delete the site if so)
- [ ] Confirm `DATABASE_URL_MIGRATION` GitHub secret is still consumed by anything
- [ ] Confirm `Hatami` / DiggAI-HZV-Rural deploy path (DEPLOYMENTS.md says it lives at `/hatami/*` — proxy or separate site?)
- [ ] Confirm the leaked Netlify token has been rotated

---

## 10. When deploy goes wrong — quick triage

| Symptom | First-look-here |
|---|---|
| Backend deploy hangs at "Health check" | `gh workflow run debug-logs.yml` then read app container logs |
| `DATABASE_URL missing from .env.production!` | `.env.production` was wiped; restore from `.env.production.bak` on VPS or extract from running container |
| `cannot lock ref` on git push | GitHub server-side lock; retry once. Verify with `git ls-remote --heads origin`. |
| TypeScript SIGABRT (exit 134) in pre-push | Set `NODE_OPTIONS="--max-old-space-size=8192"` |
| Netlify deploys to wrong site | Check `NETLIFY_SITE_ID` env var; the script default is `4e24807c-…` |
| Migration fails with SQLite syntax error | `migrate-production.sh` uses `prisma db push` to bypass legacy SQLite migrations; do NOT `prisma migrate dev` against Supabase |
| Frontend can't reach API after deploy | Check `VITE_API_URL` in Netlify dashboard matches `https://api.diggai.de/api` |

---

## 11. Open follow-up tasks (track in PRs separately)

- Delete vestigial configs: `railway.toml`, `render.yaml`, `vercel.json`, `.env.pilot.example`
- Add `> ⚠️ SUPERSEDED — see /DEPLOY.md` banner to the 4 outdated deploy docs
- Replace stale Netlify Site ID in `CLAUDE.md`
- Add periodic backup script for `.env.production` (currently only inline backup in deploy.yml)
- Document VAPID key rotation (push notifications)
- Document Stripe key promotion path test → live
