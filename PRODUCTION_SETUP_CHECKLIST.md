# DiggAI Anamnese — Production Setup Checklist
**Stack:** Supabase (DB) + Railway (Backend) + Netlify (Frontend)
**Generated:** 2026-03-31

---

## Prerequisites

- [ ] Node.js 20+ installed locally
- [ ] `npx` available
- [ ] Git repo connected to GitHub
- [ ] Accounts created: supabase.com | railway.app | netlify.com | sentry.io (optional)

---

## Phase 1 — Supabase Production Database

### 1.1 Create Project
- [ ] Go to https://supabase.com → New Project
  - Name: `anamnese-production`
  - Region: **Frankfurt (eu-central-1)** — DSGVO required
  - Password: generate strong password, save it
- [ ] Wait ~2 min for provisioning

### 1.2 Get Connection String
- [ ] Supabase Dashboard → Project Settings → Database → Connection string → **URI tab**
- [ ] Copy the URI (Session Pooler, port 5432)
  - Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`
- [ ] Paste into `.env.production` at the `DATABASE_URL` line
- [ ] Also save `DIRECT_URL` (direct connection, port 5432, from "Direct connection" tab) — needed for migrations if pooler blocks DDL

### 1.3 Enable Backups
- [ ] Supabase Dashboard → Project Settings → **Database** → Point-in-Time Recovery: **Enable**
  (requires Pro plan — $25/mo — mandatory for DSGVO production data)

### 1.4 Create Dedicated Prisma Role (Recommended)
Run in Supabase Dashboard → SQL Editor:
```sql
CREATE ROLE prisma WITH LOGIN PASSWORD 'STRONG_PRISMA_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE postgres TO prisma;
GRANT ALL ON SCHEMA public TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prisma;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
```
Then update `DATABASE_URL` to use `prisma` role instead of `postgres`.

### 1.5 Run Database Migration (Local)
```bash
cd anamnese-app/

# Set DATABASE_URL from .env.production
export DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
export ARZT_PASSWORD="SoqzHbOGp2KP2REL"
export JWT_SECRET="6245c506199be7d96cb3c3dea47d3d7eb5de373239b1b4b947f442c68ec51d9d"
export ENCRYPTION_KEY="4872143ab787f8a0a0bed6016e64726c"

# Run the automated setup (generates client, pushes schema, seeds data)
bash scripts/migrate-production.sh
```

Expected output at end:
```
=== Production Database Setup Complete ===
  Admin:  username=admin         password=SoqzHbOGp2KP2REL
  Arzt:   username=dr-mustermann password=SoqzHbOGp2KP2REL
  MFA:    username=mfa           password=SoqzHbOGp2KP2REL
```

- [ ] Migration ran successfully
- [ ] Seed ran successfully (271 questions + 3 users)

---

## Phase 2 — Railway Backend

### 2.1 Create Service
- [ ] Go to https://railway.app → New Project → Deploy from GitHub Repo
- [ ] Select `Anamnese-kimi` repository
- [ ] Set root directory: `anamnese-app`
- [ ] Railway auto-detects `Dockerfile`

### 2.2 Set Environment Variables
In Railway Dashboard → Your Service → Variables, add ALL of these:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `BACKEND_PROFILE` | `monolith` |
| `LOG_LEVEL` | `info` |
| `APP_VERSION` | `3.0.0` |
| `DATABASE_URL` | Your Supabase Session Pooler URI |
| `JWT_SECRET` | `6245c506199be7d96cb3c3dea47d3d7eb5de373239b1b4b947f442c68ec51d9d` |
| `ENCRYPTION_KEY` | `4872143ab787f8a0a0bed6016e64726c` |
| `ARZT_PASSWORD` | `SoqzHbOGp2KP2REL` |
| `FRONTEND_URL` | `https://diggai-drklaproth.netlify.app` |
| `API_PUBLIC_URL` | `https://YOUR_PROJECT.up.railway.app/api` ← fill after deploy |
| `VAPID_PUBLIC_KEY` | `BNBWMDOF81Lwet3NTSIJxX2O20om77s95wukEYhANMWBa3MeJM_UWHHDkxf-GCDhoQGzRrznyZ8SezYW5B5Qba4` |
| `VAPID_PRIVATE_KEY` | `WBj0GzwBPmG-SlS9ny9X6uFIGWfq4hm2bHZqsF9rbS8` |
| `SENTRY_DSN` | (from Phase 4 — Sentry setup) |
| `NFC_ENABLED` | `false` |
| `PAYMENT_ENABLED` | `false` |
| `TELEMED_ENABLED` | `false` |
| `TI_ENABLED` | `false` |

### 2.3 Configure Replicas (Pro Plan)
- [ ] Railway Dashboard → Your Service → Settings → **Replicas: 2**
  (Note: `numReplicas = 2` is already set in `railway.toml` — requires Railway Pro plan)
  (Use 1 replica on Hobby plan)

### 2.4 Deploy + Health Check
- [ ] Click Deploy
- [ ] Wait for health check at `/api/health` to pass (green checkmark)
- [ ] Copy service URL: `https://YOUR_PROJECT.up.railway.app`
- [ ] Update `API_PUBLIC_URL` variable to `https://YOUR_PROJECT.up.railway.app/api`
- [ ] Redeploy to apply the updated `API_PUBLIC_URL`

---

## Phase 3 — Netlify Frontend

### 3.1 Set Environment Variable
- [ ] Netlify Dashboard → Site `diggai-drklaproth` → Site configuration → Environment variables
- [ ] Add variable:
  - Key: `VITE_API_URL`
  - Value: `https://YOUR_PROJECT.up.railway.app/api` (from Phase 2.4)
  - Scope: **Production** only

### 3.2 Disable Branch Deploys
- [ ] Netlify Dashboard → Site configuration → Build & deploy → **Branches and deploy contexts**
  - Branch deploys: **None** (main branch only)
  - Deploy Previews: **None** (medical data — no previews)

### 3.3 Deploy
- [ ] Netlify Dashboard → Deploys → **Trigger deploy → Deploy site**
- [ ] Wait for build to complete
- [ ] Open https://diggai-drklaproth.netlify.app — frontend should load

---

## Phase 4 — Monitoring (Sentry)

### 4.1 Create Sentry Projects
- [ ] Go to https://sentry.io → New Project
  - Backend: **Node.js** → name: `anamnese-backend`
  - Frontend: **React** → name: `anamnese-frontend`
- [ ] Copy DSN for each project

### 4.2 Set Sentry DSNs
- [ ] Railway Dashboard → Variables:
  - `SENTRY_DSN` = `https://...@o....ingest.sentry.io/...` (Node.js DSN)
- [ ] Netlify Dashboard → Environment variables:
  - `VITE_SENTRY_DSN` = `https://...@o....ingest.sentry.io/...` (React DSN)
- [ ] Redeploy both Railway and Netlify

### 4.3 Verify Error Tracking
- [ ] Trigger a test error and verify it appears in Sentry

---

## Phase 5 — Smoke Tests

### Health Check
```bash
curl https://YOUR_PROJECT.up.railway.app/api/health
# Expected: {"status":"ok","timestamp":"...","database":"connected",...}
```

### Login Flow (Admin)
- [ ] Open https://diggai-drklaproth.netlify.app
- [ ] Login: username `admin`, password `SoqzHbOGp2KP2REL`
- [ ] Verify: Admin dashboard loads, user list visible

### Login Flow (Arzt)
- [ ] Login: username `dr-mustermann`, password `SoqzHbOGp2KP2REL`
- [ ] Verify: Patient queue visible, triage alerts visible
- [ ] Verify: Socket.IO connected (realtime updates)

### Login Flow (MFA)
- [ ] Login: username `mfa`, password `SoqzHbOGp2KP2REL`
- [ ] Verify: Queue management works

### Patient Journey
- [ ] Open app as patient (no login)
- [ ] Start new session, fill questionnaire, submit
- [ ] Verify: Session appears in Arzt + MFA dashboards

---

## Phase 6 — E2E Tests (Playwright)

```bash
cd anamnese-app/
export E2E_ARZT_PASSWORD="SoqzHbOGp2KP2REL"
export PLAYWRIGHT_BASE_URL="https://diggai-drklaproth.netlify.app"

npx playwright test --reporter=html
npx playwright show-report
```

- [ ] All critical path tests pass (0 failures)

---

## Post-Launch Checklist

- [ ] Change `ARZT_PASSWORD` to a new value (rotate seed credentials after launch)
- [ ] Set a calendar reminder to rotate JWT_SECRET + ENCRYPTION_KEY in 90 days (2026-06-29)
- [ ] Verify Supabase PITR (Point-in-Time Recovery) is enabled
- [ ] Configure Railway auto-sleep: **disabled** (production service must always be on)
- [ ] Set up Railway alerts: CPU > 80%, Memory > 80%, Error rate > 1%
- [ ] Add Netlify domain alias for custom domain (if applicable)
- [ ] Test DSGVO data export endpoint: `GET /api/pwa/profile/export`
- [ ] Test DSGVO data delete endpoint: `DELETE /api/pwa/profile`

---

## Secret Rotation Schedule

| Secret | Next Rotation | Command |
|--------|---------------|---------|
| JWT_SECRET | 2026-06-29 | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| ENCRYPTION_KEY | 2026-06-29 | `node -e "console.log(require('crypto').randomBytes(16).toString('hex').slice(0,32))"` |
| ARZT_PASSWORD | After first login | Set manually in Railway vars |
| VAPID keys | 2027-03-31 | `npx web-push generate-vapid-keys` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `P1001: Can't reach database` | Supabase project not ready or wrong URL. Check Project Settings > Database > URI. |
| `migration_lock.toml provider mismatch` | Fixed by `migrate-production.sh` — uses `db push` instead of `migrate deploy`. |
| `ENCRYPTION_KEY must be exactly 32 chars` | Use value from `.env.production` — already 32 chars. |
| Railway deploy fails: `tsx not found` | Already fixed in Dockerfile (`npm install tsx`). |
| CORS error in browser | `FRONTEND_URL` in Railway vars must exactly match Netlify URL (no trailing slash). |
| Socket.IO won't connect | Verify `API_PUBLIC_URL` is set and redeployed after first Railway deploy. |
| Prisma seed fails | Run `npx prisma generate` first, then check `ARZT_PASSWORD` is set. |
| Netlify CSP blocks new Railway URL | Update `connect-src` in `netlify.toml` to include the new Railway hostname. |
