# Hetzner Production Runbook — diggai.de

End-to-end deploy runbook for the DiggAI Anamnese backend on a Hetzner
Cloud server, with the frontend served from Netlify on `diggai.de`. Last
reviewed: 2026-04-21.

This runbook does NOT execute anything automatically. Every step below
is explicit; the person running the deploy is accountable.

---

## 0. Roles and access

| Resource | Who can change it | Where secrets live |
|---|---|---|
| Hetzner server (`api.diggai.de`) | Dr. Klapproth / Dr. Al-Shdaifat | `~/.ssh/diggai-hetzner` on local admin machine |
| Supabase Postgres (Frankfurt) | Dr. Al-Shdaifat | Supabase dashboard |
| diggai.de DNS | domain registrar admin | registrar dashboard |
| Netlify (frontend) | Dr. Klapproth | `NETLIFY_AUTH_TOKEN` env var |
| SMTP (Tutanota) | Dr. Klapproth | Tutanota account |

---

## 1. Pre-flight checklist (must all be true before you deploy)

On the local admin machine:

- [ ] `git status` shows a clean working tree on `master`
- [ ] `git log --oneline -1` matches the commit you want to ship
- [ ] `npm run type-check` passes
- [ ] `npm run lint` has **0 errors** (warnings are OK)
- [ ] `npm run test:run` passes the service test gate (≥ 90 % pass rate
      — PVS GDT adapter tests may be filesystem-flaky; triage per run)
- [ ] `npm run build` succeeds and `dist/assets/index-*.js` ≤ 250 KB
- [ ] `node scripts/generate-i18n.ts` reports 0 missing keys
- [ ] `npx prisma validate` clean
- [ ] If schema changed: a matching SQL file exists in
      `prisma/migrations_manual/` and has been reviewed

On the Hetzner server:

- [ ] Server reachable: `ssh -i ~/.ssh/diggai-hetzner diggai@SERVER_IP 'uptime'`
- [ ] Disk free: ≥ 20 % (`df -h /`)
- [ ] `/opt/diggai/anamnese-app/.env.production` exists and is readable
      ONLY by the `diggai` user (`ls -l` shows `600`)

---

## 2. Environment variables on the Hetzner server

Path: `/opt/diggai/anamnese-app/.env.production`. Use the template:

```bash
scp -i ~/.ssh/diggai-hetzner \
  .env.hetzner.template \
  diggai@SERVER_IP:/opt/diggai/anamnese-app/.env.production.new
# then ssh in and fill in values; rename to .env.production after review
```

Required values (fail-closed — the app will refuse to start without these):

| Variable | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase dashboard → Connection pooling (Transaction) | Frankfurt region |
| `JWT_SECRET` | stored in password manager | ≥ 32 chars, never regenerate — rotating invalidates every session |
| `ENCRYPTION_KEY` | stored in password manager | exactly 32 chars, never rotate without re-encrypt plan |
| `BACKUP_ENCRYPTION_KEY` | stored in password manager | separate from ENCRYPTION_KEY |
| `ARZT_PASSWORD` | stored in password manager | seed password for staff accounts |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | stored in password manager | web-push; must match what the frontend was built with |
| `SMTP_HOST=mail.tutanota.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM=noreply@diggai.de` | Tutanota | |
| `FRONTEND_URL=https://diggai.de` | fixed | |
| `API_PUBLIC_URL=https://api.diggai.de/api` | fixed | must match Netlify `VITE_API_URL` |

Feature flags (leave `false` unless a deliberate decision is made):

- `TI_ENABLED=false` — gematik TI connector; requires on-site hardware and a zulassung
- `NFC_ENABLED=true`
- `PAYMENT_ENABLED=true`
- `TELEMED_ENABLED=true`

---

## 3. Deploy sequence (backend first, always)

```bash
# On the admin machine, from the repo root:
git pull --ff-only origin master
npm ci
npm run type-check && npm run lint && npm run build

# Ship the server bundle. The Dockerfile in the repo root is the source of truth.
docker build -t diggai/anamnese:$(git rev-parse --short HEAD) -f Dockerfile .
docker save diggai/anamnese:$(git rev-parse --short HEAD) | \
  ssh -i ~/.ssh/diggai-hetzner diggai@SERVER_IP 'docker load'

# On the Hetzner server:
ssh -i ~/.ssh/diggai-hetzner diggai@SERVER_IP
cd /opt/diggai/anamnese-app

# Tag the image that is about to be run so rollback is trivial.
docker tag diggai/anamnese:$(cat CURRENT_SHA 2>/dev/null || echo none) diggai/anamnese:previous || true
echo $(git rev-parse --short HEAD) > CURRENT_SHA

# Apply schema migrations BEFORE restarting the app. Additive-only.
docker compose -f docker-compose.prod.yml run --rm app \
  npx prisma migrate deploy

# If the new commit includes files in prisma/migrations_manual/ that are NOT
# part of the Prisma migrations pipeline (manual SQL — the project uses
# these for Supabase-managed DBs), apply each explicitly:
#   psql "$DATABASE_URL" -f prisma/migrations_manual/<file>.sql

# Restart the app
docker compose -f docker-compose.prod.yml up -d --build app

# Health
curl -fsS https://api.diggai.de/api/health | jq .
curl -fsS https://api.diggai.de/api/live   | jq .
```

---

## 4. Frontend cutover (Netlify)

```bash
# Locally, after the backend is healthy:
npm run deploy          # guided Netlify deploy, uses NETLIFY_AUTH_TOKEN

# Verify:
curl -fsS -I https://diggai.de | grep -i 'strict-transport-security'
```

The frontend's `VITE_API_URL` at build time MUST match `API_PUBLIC_URL`
on the backend. A mismatch causes silent 404s on every API call — users
see a forever-loading UI.

---

## 5. Post-deploy smoke test (customer golden path)

Run against the live `diggai.de`. Pass criteria in brackets.

1. Open `https://diggai.de` in a new incognito window — LandingPage
   renders in German with the nine service tiles. [no raw i18n keys
   like `ui.services.anamnese.title` visible]
2. Click a service tile → questionnaire starts. [loads within 3 s]
3. Finish the questionnaire (use the demo path) → submit. [HTTP 200]
4. Log in as a staff user at `/arzt`, inspect the session. [session
   visible in the queue; status COMPLETED]
5. Open the patient's episode in the dashboard → confirm an
   `AI_SUMMARY` EpisodeNote exists dated within the last minute and
   starts with `# Anamnese-Zusammenfassung`. [the item 7 contract]
6. Switch to Arabic (RTL) on the LandingPage — layout mirrors
   correctly, no text flips into LTR, no overlap. [visual check]

If any of 1–6 fail → rollback (§ 7).

---

## 6. Monitoring to watch for 30 minutes after cutover

- `docker compose logs -f app` on the server — no repeating
  500 responses, no uncaught exception patterns
- Supabase dashboard → Database → Logs — no connection-pool
  exhaustion warnings
- `api.diggai.de/api/health` cadence via uptime monitor
  (Grafana board if set up; ping every 60 s minimum)

---

## 7. Rollback

Rollback is faster than debug. If the smoke test fails or error rate
spikes > 2 % over any 5-minute window in the first 30 minutes:

```bash
ssh -i ~/.ssh/diggai-hetzner diggai@SERVER_IP
cd /opt/diggai/anamnese-app

# Restore the previous image
docker tag diggai/anamnese:previous diggai/anamnese:rollback
docker compose -f docker-compose.prod.yml up -d --build app

# Verify
curl -fsS https://api.diggai.de/api/health | jq .
```

**Schema rollback** is the hard part. The project uses additive-only
migrations. If a migration introduced a required column and the old
image can't write to it, you have three choices:

1. Tolerate: old image ignores the new column (works for most adds) —
   often the safest path. Skip rollback of the schema.
2. Hot-fix-forward: ship a new commit that fixes the bug without
   touching the new column. Preferred over schema rollback.
3. Manual schema revert: only for additive columns that have NO data
   yet. `ALTER TABLE ... DROP COLUMN ...` via psql. Record who ran it.

**Never** drop or alter a migration that has patient data written to it.

---

## 8. What this runbook does NOT cover

- First-time server provisioning (OS hardening, firewall, nginx/Caddy
  TLS, Docker install). See `PILOT_DEPLOYMENT_GUIDE.md`.
- gematik TI connector / ePA real-hardware integration
  (`TI_ENABLED=true`). Requires a separate zulassung review.
- Tenant subdomain onboarding (`praxis1.diggai.de` style). See
  `M365_COPILOT_PLAYBOOK.md` for the subdomain resolution flow.
- DSGVO-DPIA review. Do this before every feature ship that touches
  patient data processing, not at deploy time.

---

## Open blockers for a Run 1 → production cutover

From Run 0/1 baseline, the following are **external** blockers that
this codebase cannot resolve alone:

1. SSH key for the Hetzner server is not present on the local admin
   machine the AI is running on — needed for § 3.
2. `NETLIFY_AUTH_TOKEN` is not in the local environment — needed for
   § 4 (`npm run deploy`).
3. `DATABASE_URL` (Supabase) is intentionally not local — every deploy
   pass must set it on the server only.
4. DNS for `api.diggai.de` (A + AAAA) points to the intended Hetzner
   IP — verify before cutover, not after.

Any one of these missing blocks the whole deploy. Resolve them as
preconditions, not mid-deploy.
