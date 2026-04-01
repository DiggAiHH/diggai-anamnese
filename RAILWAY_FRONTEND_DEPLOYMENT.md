# Railway Frontend Deployment — Final Phase
## DiggAI Anamnese Production — Frontend on Railway

**Status**: Backend ✅ Online | Database ✅ Prod | Frontend 🔧 Deploying Now

---

## Architecture

```
┌─────────────────────┐
│   Browser (User)    │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌──────────────────────────┐
│ Railway Frontend (NEW!)   │
│ diggai-frontend.railway  │
│ npm run preview (Vite)   │
│ PORT 3000               │
└──────────┬───────────────┘
           │ API Calls
           ▼
┌──────────────────────────┐
│ Railway Backend (Existing)│
│ diggai-anamnese.railway  │
│ Express.js / Node.js     │
│ PORT 3001                │
└──────────┬───────────────┘
           │ SQL
           ▼
┌──────────────────────────┐
│ Supabase PostgreSQL      │
│ Frankfurt (eu-central-1) │
│ DSGVO Compliant ✅       │
└──────────────────────────┘
```

---

## Part 1: Railway Frontend Service Setup

### Step 1.1 — Create New Railway Service

1. **Go to**: https://railway.app/dashboard
2. **Select Project**: `illustrious-trust` (production)
3. **New Service** → GitHub Repository
4. **Configure**:
   - Repository: `DiggAiH/diggai-anamnese`
   - Root Directory: `anamnese-app`
   - Auto-deploy: ✅ enabled

### Step 1.2 — Environment Variables in Railway Dashboard

Add these variables in Railway > Service > Variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `VITE_API_URL` | `https://diggai-anamnese.up.railway.app/api` |
| `VITE_ENABLE_GTE_STORAGE` | `true` |
| `VITE_LOG_LEVEL` | `error` |

### Step 1.3 — Build & Start Commands

In Railway Service Settings:

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Start Command | `npm run preview` |

---

## Part 2: Frontend-Backend Synchronization

### Step 2.1 — Verify Backend is Reachable

```bash
# Test backend health check
curl https://diggai-anamnese.up.railway.app/api/health

# Expected response:
# { "status": "ok", "timestamp": "2026-03-31T...", "database": "connected" }
```

### Step 2.2 — CORS Configuration (Already Set)

The backend's `CORS` headers are configured to accept:
- `FRONTEND_URL=https://diggai-drklaproth.netlify.app`
- `FROM_RAILWAY=true` (for new Railway frontend)

No additional CORS changes needed.

### Step 2.3 — WebSocket Security (Socket.IO)

Frontend connects to backend via:
- **Direct API calls**: `https://diggai-anamnese.up.railway.app/api`
- **WebSocket**: `wss://diggai-anamnese.up.railway.app:443` (Socket.IO v4.8)

Both use **HttpOnly Cookies** for JWT — no localStorage tokens.

---

## Part 3: Deploy & Smoke Tests

### Step 3.1 — Trigger Railway Build

1. In Railway Dashboard → Select Frontend Service
2. **Deployments** → **Trigger deploy**
3. Monitor build progress (logs should show):
   - ✅ Installing dependencies
   - ✅ Building Vite (creates `dist/`)
   - ✅ Starting `npm run preview` on PORT 3000

**Expected time**: 2-3 minutes

### Step 3.2 — Smoke Test 1: Frontend Loads

Once Railway shows **Status: Running** (green):

```bash
# Test frontend is accessible
curl -I https://YOUR_RAILWAY_FRONTEND_URL

# Should return:
# HTTP/1.1 200 OK
# Content-Type: text/html
```

Alternatively, open the URL in a browser — should see login page.

### Step 3.3 — Smoke Test 2: API Connection Test

From browser console on the frontend:

```javascript
// Test API connectivity
fetch('https://diggai-anamnese.up.railway.app/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend Connected:', d))
  .catch(e => console.error('❌ Backend Error:', e))
```

**Expected**:
```
✅ Backend Connected: { status: "ok", database: "connected", timestamp: "..." }
```

### Step 3.4 — Smoke Test 3: Login & Dashboard

1. **Open frontend**: https://YOUR_RAILWAY_FRONTEND_URL
2. **Login Page** → should load with:
   - Language selector (10 languages)
   - Logo + branding
   - Form fields for username/password

3. **Credentials**:
   - Username: `admin`
   - Password: `SoqzHbOGp2KP2REL`

4. **Expected Dashboard**:
   - Admin panel with user list
   - Tenant management
   - Real-time patient queue (if patients logged in)

### Step 3.5 — Smoke Test 4: WebSocket / Real-time

1. **Login as `dr-mustermann`** (Arzt):
   - Password: `SoqzHbOGp2KP2REL`
   - Should see patient queue
   - Open browser DevTools → Network → WS
   - Look for Socket.IO connection (should be `wss://diggai-anamnese...`)

2. **From another browser** (incognito):
   - Go to frontend as patient
   - Start a new session
   - Fill in first question

3. **Back in Arzt Dashboard**:
   - New patient should appear **live** in the queue (no page refresh needed)

### Step 3.6 — Smoke Test 5: Patient Flow

As patient (incognito window):

1. Open frontend → Start Session
2. Fill questionnaire (at least 5 questions)
3. Submit → should show "Session saved" message
4. Session should appear in Arzt dashboard **immediately** (WebSocket)

---

## Part 4: Environment Variables Checklist

### Backend (Railway) — Already Configured

| Variable | Value | Status |
|----------|-------|--------|
| DATABASE_URL | `postgresql://postgres.oanbmfztnzjvkumzpnfb:...@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | ✅ Set |
| JWT_SECRET | `6245c506199be7d96cb3c3dea47d3d7eb5de373239b1b4b947f442c68ec51d9d` | ✅ Set |
| ENCRYPTION_KEY | `4872143ab787f8a0a0bed6016e64726c` | ✅ Set |
| ARZT_PASSWORD | `SoqzHbOGp2KP2REL` | ✅ Set |
| NODE_ENV | `production` | ✅ Set |
| PORT | `3001` | ✅ Set |
| FRONTEND_URL | `https://diggai-drklaproth.netlify.app` | ✅ Set |
| API_PUBLIC_URL | `https://diggai-anamnese.up.railway.app/api` | ✅ Set |

### Frontend (Railway) — Configure Now

| Variable | Value | Status |
|----------|-------|--------|
| VITE_API_URL | `https://diggai-anamnese.up.railway.app/api` | 🔧 Set in Step 1.2 |
| NODE_ENV | `production` | 🔧 Set in Step 1.2 |
| PORT | `3000` | 🔧 Set in Step 1.2 |

---

## Part 5: Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| 404 on frontend URL | Railway frontend not deployed | Check Railway Deployments tab — rebuild if needed |
| API returns 403 | CORS blocked | Verify `FRONTEND_URL` env in backend matches exactly |
| WebSocket fails | Socket.IO can't connect | Check `API_PUBLIC_URL` is correct; verify WSS port open |
| Login fails | Database unreachable | Test backend `/api/health` — Supabase must be online |
| Patient data not syncing | WebSocket not established | Check browser console for Socket.IO errors |
| Images 404 | Static files not served | Verify `npm run build` creates `dist/` with all assets |
| Blank page | Vite build failed | Check Railway build logs — look for TypeScript errors |

---

## Part 6: Next Steps (After Verification)

### Update DNS & CDN (if needed)

If moving from Netlify to Railway frontend:

```bash
# Current setup: Netlify frontend + Railway backend
# Update frontend URL everywhere:
# - Update FRONTEND_URL in backend env vars
# - Update any documentation
# - Update client-facing URLs
```

### Database Backup Schedule

```bash
# Auto-backup Supabase (set in dashboard)
# Manual backup command:
pg_dump postgresql://postgres.oanbmfztnzjvkumzpnfb:FU4q87J4fpcu3BcE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true > backup-$(date +%Y%m%d).sql
```

### Monitoring & Alerting

Set up in Railway Dashboard:
1. **Health Checks**: https://diggai-anamnese.up.railway.app/api/health
2. **Alert Thresholds**:
   - Response time > 2 sec
   - Error rate > 1%
   - CPU > 80%

---

## Summary

| Phase | Status | URL | Check |
|-------|--------|-----|-------|
| Database | ✅ Online | Supabase (Frankfurt) | `psql $DATABASE_URL` |
| Backend | ✅ Online | https://diggai-anamnese.up.railway.app | `/api/health` |
| Frontend | 🔧 Deploying | Railway (TBD) | Will add once deployed |

**You are here**: Step 3 (Deploy & Smoke Tests) — Follow Part 3 above to validate.

---

**Last Updated**: 2026-03-31  
**Deployment By**: DevOps Assistant  
**DSGVO Status**: ✅ Frankfurt region, encrypted, audit-ready
