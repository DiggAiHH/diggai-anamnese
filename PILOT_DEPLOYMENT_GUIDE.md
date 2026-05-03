> ⚠️ **SUPERSEDED — see workspace-root [`DEPLOY.md`](./DEPLOY.md)**  Kept for historical reference; do not follow these steps for new deploys.

# DiggAI Anamnese — Pilot Deployment Guide
## Stack: Netlify (Frontend) + Railway (Backend) + Supabase (Database)

---

## Overview

```
Browser
  └─→ Netlify CDN  (https://diggai-drklaproth.netlify.app)
          └─→ Railway Container  (https://YOUR_PROJECT.up.railway.app)
                    └─→ Supabase PostgreSQL  (db.xxxx.supabase.co:5432)
```

---

## Phase 1 — Supabase Database Setup

1. Go to **https://supabase.com** → New Project
   - Name: `anamnese-pilot`
   - Region: **Frankfurt (eu-central-1)** — required for DSGVO
   - Password: generate a strong password, save it

2. Wait for the project to provision (~2 min)

3. In Supabase Dashboard → **Project Settings → Database → Connection string**
   - Select tab: **URI**
   - Copy the string (looks like `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`)
   - Replace `[YOUR-PASSWORD]` with your actual DB password
   - **Save this as `DATABASE_URL`**

4. (Recommended) Create a dedicated Prisma role:
   ```sql
   -- Run in Supabase Dashboard → SQL Editor
   CREATE ROLE prisma WITH LOGIN PASSWORD 'STRONG_PASSWORD_HERE';
   GRANT ALL PRIVILEGES ON DATABASE postgres TO prisma;
   GRANT ALL ON SCHEMA public TO prisma;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prisma;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prisma;
   ```
   Then use `postgresql://prisma:STRONG_PASSWORD@db.[REF].supabase.co:5432/postgres` as `DATABASE_URL`

---

## Phase 2 — Generate Production Secrets

Run these locally (Node.js required):

```bash
# JWT_SECRET (32+ chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (exactly 32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex').slice(0,32))"

# ARZT_PASSWORD (strong password for seed user)
node -e "console.log(require('crypto').randomBytes(12).toString('base64'))"
```

Save all three values — you will need them in Phase 3 and Phase 4.

---

## Phase 3 — Backend Deployment on Railway

1. Go to **https://railway.app** → New Project → Deploy from GitHub
   - Connect your GitHub account and select the `Anamnese-kimi` repo

2. Railway will auto-detect the `Dockerfile` in `anamnese-app/`
   - If asked for root directory, set it to `anamnese-app`

3. In Railway Dashboard → Your Service → **Variables**, add ALL of these:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |
   | `DATABASE_URL` | Your Supabase URI from Phase 1 |
   | `JWT_SECRET` | Generated in Phase 2 |
   | `ENCRYPTION_KEY` | Generated in Phase 2 (exactly 32 chars) |
   | `FRONTEND_URL` | `https://diggai-drklaproth.netlify.app` |
   | `API_PUBLIC_URL` | `https://YOUR_PROJECT.up.railway.app/api` (fill after first deploy) |
   | `ARZT_PASSWORD` | Generated in Phase 2 |
   | `BACKEND_PROFILE` | `monolith` |
   | `LOG_LEVEL` | `info` |

4. Click **Deploy** → wait for health check at `/api/health` to pass (green)

5. Copy the Railway service URL: `https://YOUR_PROJECT.up.railway.app`

6. Go back to Variables and set `API_PUBLIC_URL` to `https://YOUR_PROJECT.up.railway.app/api`

---

## Phase 4 — Run Database Migrations & Seed

From the `anamnese-app/` directory on your local machine with `DATABASE_URL` pointing to Supabase:

```bash
# Copy the pilot env template and fill in all values
cp .env.pilot.example .env.production

# Edit .env.production: set DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, ARZT_PASSWORD

# Set DATABASE_URL for the migration commands
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# Apply all migrations to Supabase
npx prisma migrate deploy

# Seed: creates 270+ medical questions + admin/arzt/mfa users
npx prisma db seed

# Verify the schema is correct
npx prisma migrate status
```

Expected seed output:
```
Seeding database...
Created tenant: demo-praxis
Created admin user: admin
Created arzt user: dr-mustermann
Created mfa user: mfa
Seeded 271 questions
Done.
```

---

## Phase 5 — Frontend Deployment on Netlify

1. Go to **https://app.netlify.com** → Site `diggai-drklaproth`

2. **Site configuration → Environment variables → Add a variable:**

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://YOUR_PROJECT.up.railway.app/api` |

3. **Deploys → Trigger deploy → Deploy site**
   - Build command: `npm run build` (from `netlify.toml`)
   - Publish directory: `dist`

4. After deploy, open https://diggai-drklaproth.netlify.app — the frontend should load

---

## Phase 6 — Smoke Tests (Manual)

Test each dashboard in order:

### Health Check
```
GET https://YOUR_PROJECT.up.railway.app/api/health
→ Expected: { "status": "ok", ... }
```

### Admin Dashboard
1. Open https://diggai-drklaproth.netlify.app
2. Navigate to `/admin` or login page
3. Login with: username `admin`, password = ARZT_PASSWORD from Phase 2
4. Verify: User list shows, can create tenant

### Arzt Dashboard
1. Login with: username `dr-mustermann`, password = ARZT_PASSWORD
2. Verify: Patient queue shows, triage alerts visible
3. Verify: Realtime WebSocket connection (Socket.IO) — patients appear live

### MFA Dashboard
1. Login with: username `mfa`, password = ARZT_PASSWORD
2. Verify: Queue management works, can assign sessions

### Patient Flow
1. Open https://diggai-drklaproth.netlify.app (as patient)
2. Start a new session, fill in questionnaire
3. Submit → verify session appears in Arzt and MFA dashboards

### Chat
1. In Arzt Dashboard → open a patient session → Chat
2. Send message → verify delivery via WebSocket

---

## Phase 7 — Run Automated E2E Tests

```bash
# In anamnese-app/ — set the E2E credentials
export E2E_ARZT_PASSWORD="YOUR_ARZT_PASSWORD"
export PLAYWRIGHT_BASE_URL="https://diggai-drklaproth.netlify.app"

# Run the full Playwright suite (34 specs)
npx playwright test --reporter=html

# Open the HTML report
npx playwright show-report
```

For server unit tests against Supabase:
```bash
export DATABASE_URL="postgresql://..."
npm run test:server
```

---

## Render.com Alternative (if Railway not preferred)

If you prefer Render.com over Railway:

1. Go to https://render.com → New → Web Service
2. Connect GitHub repo, set root directory to `anamnese-app`
3. Render will detect `render.yaml` and pre-fill settings
4. Add the same environment variables from Phase 3 in Render Dashboard
5. Deploy — URL will be `https://anamnese-backend.onrender.com`
6. Note: Free tier on Render sleeps after 15 min inactivity (not suitable for production)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Railway deploy fails with `tsx not found` | Already fixed in Dockerfile (`npm install tsx`) |
| Prisma migration fails | Check DATABASE_URL has correct password; check Supabase firewall allows Railway IP |
| CORS error in browser | Verify `FRONTEND_URL` in Railway vars matches exact Netlify URL (no trailing slash) |
| CSP blocks WebSocket | Already added `wss://*.up.railway.app` to netlify.toml CSP |
| Socket.IO can't connect | Railway must have PORT=3001; ensure `API_PUBLIC_URL` is set correctly |
| `ENCRYPTION_KEY must be exactly 32 chars` | Use the generate command from Phase 2 |
| Seed fails | Run `npx prisma generate` first, then `npx prisma db seed` |

---

## After Pilot — Move to Hetzner

When ready to move off Railway/Supabase to Hetzner + self-hosted Postgres:

1. Export Supabase DB: `pg_dump DATABASE_URL > pilot_backup.sql`
2. Provision Hetzner VPS (CX21 minimum for pilot, CX31 for production)
3. Install Docker + docker-compose
4. Copy `docker-compose.prod.yml` to server
5. Replace `DATABASE_URL` with self-hosted Postgres
6. Import dump: `psql DATABASE_URL < pilot_backup.sql`
7. Run `npx prisma migrate deploy` against new DB
8. Update `FRONTEND_URL` and `API_PUBLIC_URL` to new Hetzner domain
9. Update Netlify `VITE_API_URL` → trigger redeploy
10. Update `netlify.toml` CSP `connect-src` to add new Hetzner domain

No application code changes needed — just environment variables.
