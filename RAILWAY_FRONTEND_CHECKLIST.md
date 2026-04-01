# Railway Frontend Deployment Checklist
## DiggAI Anamnese Final Phase — Frontend Synchronization

**Status**: ✅ Ready for Deployment  
**Backend**: ✅ Online on Railway  
**Database**: ✅ Connected to Supabase  
**Frontend**: 🔧 Deploying Now  

---

## Pre-Deployment Verification

- [ ] Git repo is clean (`git status` shows nothing)
- [ ] All commits pushed to origin/master
- [ ] Backend is online: https://diggai-anamnese.up.railway.app/api/health → 200 OK
- [ ] Supabase database is reachable
- [ ] .env.production updated with:
  - [ ] DATABASE_URL (Supabase pooled connection)
  - [ ] API_PUBLIC_URL (Railway backend API)
  - [ ] VITE_API_URL (for frontend build)
  - [ ] All secrets (JWT_SECRET, ENCRYPTION_KEY, ARZT_PASSWORD)

---

## Step 1: Railway Frontend Service Creation

### 1.1 Open Railway Dashboard

- [ ] Go to: https://railway.app/dashboard
- [ ] Login with GitHub / Email
- [ ] Select project: `illustrious-trust` (production)

### 1.2 Create New Frontend Service

- [ ] Click **New Service** → **GitHub Repository**
- [ ] Select repository: `DiggAiH/diggai-anamnese`
- [ ] Confirm root directory: `anamnese-app`
- [ ] Enable auto-deploy: **YES**

### 1.3 Configure Service Settings

In Railway **Service Settings**:

- [ ] **Build Command**: `npm run build`
- [ ] **Start Command**: `npm run preview`
- [ ] **Port**: `3000`
- [ ] **Dockerfile**: (auto-detected or defaults to Node)

---

## Step 2: Environment Variables Setup

### 2.1 Add to Railway Dashboard

In **Service → Variables**, add:

```
NODE_ENV=production
PORT=3000
VITE_API_URL=https://diggai-anamnese.up.railway.app/api
```

- [ ] NODE_ENV = `production`
- [ ] PORT = `3000`
- [ ] VITE_API_URL = `https://diggai-anamnese.up.railway.app/api`

✅ **IMPORTANT**: Do NOT add secrets (DATABASE_URL, JWT_SECRET, etc.) to frontend.  
These are backend-only and should never reach the client!

### 2.2 Verify Variables in Local .env

- [ ] Check `.env.production` has correct API_PUBLIC_URL
- [ ] Verify `VITE_API_URL` matches frontend expectation

---

## Step 3: Deploy & Build Monitoring

### 3.1 Trigger Initial Deploy

- [ ] In Railway Dashboard: **Depoy Service** or **Trigger Deploy**
- [ ] Monitor build logs:
  ```
  Step 1/N: FROM node:20
  Step 2/N: WORKDIR /app
  ...
  npm install
  npm run build
  npm run preview
  ```

### 3.2 Expected Build Artifacts

- [ ] `dist/` directory created with:
  - [ ] `index.html`
  - [ ] `assets/js/*.js`
  - [ ] `assets/css/*.css`
  - [ ] `assets/locales/` (i18n files)
  - [ ] `assets/icons/` (favicons, manifest)

### 3.3 Build Time & Status

- [ ] Build completes in 2-3 minutes
- [ ] Final status shows: **Running** (green)
- [ ] Railway assigns URL: `https://YOUR-SERVICE-ID.up.railway.app`

---

## Step 4: Smoke Test 1 — Frontend Loads

### 4.1 Access Frontend URL

- [ ] Open `https://YOUR-SERVICE-ID.up.railway.app` in browser
- [ ] Page should load (not blank, no 404)
- [ ] See login page with:
  - [ ] DiggAI logo
  - [ ] Username/password fields
  - [ ] Language selector (dropdown)
  - [ ] "Anmelden" / "Login" button

### 4.2 Check Console for Errors

- [ ] Open DevTools (F12)
- [ ] **Console** tab:
  - [ ] No red errors
  - [ ] Check for API connection errors (should not have errors yet if no login attempt)
- [ ] **Network** tab:
  - [ ] All `.js` and `.css` files load (200 status)
  - [ ] No 404s on images/assets

### 4.3 Verify Static Files Served

- [ ] Logo image loads: `GET /logo.svg` → 200
- [ ] Favicon loads: `GET /favicon.ico` → 200
- [ ] CSS bundles load without 404

---

## Step 5: Smoke Test 2 — Backend Connectivity

### 5.1 Backend Health Check

From browser console on frontend:

```javascript
fetch('https://diggai-anamnese.up.railway.app/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Connected:', d))
  .catch(e => console.error('❌ Error:', e))
```

- [ ] Response shows: `{ "status": "ok", "database": "connected" }`
- [ ] No CORS errors
- [ ] No timeout (< 2 sec response time)

### 5.2 API Version Check

```javascript
fetch('https://diggai-anamnese.up.railway.app/api/v1/version')
  .then(r => r.json())
  .then(d => console.log('Version:', d))
```

- [ ] Returns current API version

---

## Step 6: Smoke Test 3 — Login Test

### 6.1 Admin Login

- [ ] Enter credentials:
  - [ ] Username: `admin`
  - [ ] Password: `SoqzHbOGp2KP2REL`
- [ ] Click **Login**
- [ ] Should redirect to `/admin` dashboard

### 6.2 Verify Admin Dashboard

After successful login:

- [ ] See user list / tenant management
- [ ] No 403 errors
- [ ] JWT token stored in HttpOnly cookie (visible in DevTools → Application → Cookies)
- [ ] **IMPORTANT**: Token should NOT be in localStorage

### 6.3 Check Session

In Browser DevTools → **Application → Cookies**:

- [ ] Cookie name: `__Secure-jwt` or similar
- [ ] HttpOnly: ✅ (checked)
- [ ] Secure: ✅ (checked, HTTPS only)
- [ ] SameSite: Strict or Lax

---

## Step 7: Smoke Test 4 — WebSocket Connection

### 7.1 Login as Arzt

- [ ] New browser tab (or incognito)
- [ ] Login with:
  - [ ] Username: `dr-mustermann`
  - [ ] Password: `SoqzHbOGp2KP2REL`
- [ ] Should see patient queue dashboard

### 7.2 Check WebSocket Connection

In DevTools → **Network → WS (WebSocket)**:

- [ ] Look for: `wss://diggai-anamnese.up.railway.app:443/socket.io/`
- [ ] Status: **101 Switching Protocols** (connected)
- [ ] Messages flowing (heartbeats every ~25 sec)

### 7.3 Real-time Patient Sync Test

- [ ] Keep Arzt dashboard open
- [ ] In another browser (patient):
  - [ ] Refresh frontend
  - [ ] Start new session
  - [ ] Fill first question
- [ ] In Arzt dashboard:
  - [ ] New patient appears **immediately** in queue (no manual refresh)
  - [ ] Patient name shows
  - [ ] Timestamp of session start

---

## Step 8: Smoke Test 5 — Patient Flow End-to-End

### 8.1 Start Patient Session

- [ ] Open new browser tab (incognito)
- [ ] Go to: `https://YOUR-SERVICE-ID.up.railway.app`
- [ ] Click **"Neue Sitzung starten"** (New Session)

### 8.2 Fill Questionnaire

- [ ] Answer at least 5 medical questions
- [ ] Verify:
  - [ ] Questions load from backend
  - [ ] Navigation works (Next/Previous)
  - [ ] Timer shows if applicable
  - [ ] Progress bar updates

### 8.3 Submit Session

- [ ] Click **"Absenden"** (Submit)
- [ ] Should show:
  - [ ] Success message
  - [ ] Session ID saved
  - [ ] Redirect to dashboard or thank you page

### 8.4 Verify in Arzt Dashboard

- [ ] Switch to Arzt window (from Step 7)
- [ ] New session appears in **"Warteschlange"** (Queue)
- [ ] Click patient name
- [ ] See:
  - [ ] Answers to questions
  - [ ] Calculated triage score
  - [ ] Recommended actions

---

## Step 9: Chat Test (Optional but Important)

### 9.1 Send Message from Patient

- [ ] In patient session: click **Chat**
- [ ] Type message: "Hallo Arzt"
- [ ] Click send

### 9.2 Receive in Arzt Dashboard

- [ ] Arzt sees new message **in real-time**
- [ ] Type reply: "Hallo Patient"
- [ ] Send

### 9.3 Verify Message Delivery

- [ ] Patient sees Arzt's reply **immediately** (no page refresh)
- [ ] Chat timestamp is correct
- [ ] No message duplication

---

## Step 10: Security Verification

### 10.1 Check HTTPS/TLS

- [ ] URL starts with `https://`
- [ ] DevTools → Security → Certificate valid
- [ ] No mixed content warnings

### 10.2 Check CSP Headers

In DevTools → **Network → Click index.html → Headers**:

- [ ] Look for: `Content-Security-Policy` header
- [ ] Policy includes:
  - [ ] Self sources allowed
  - [ ] No unsafe-inline (except for style nonce)
  - [ ] External API domain allowed (`diggai-anamnese.up.railway.app`)

### 10.3 Check Security Headers

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `Strict-Transport-Security` present

---

## Step 11: Performance Check

### 11.1 Load Time

- [ ] Frontend loads in < 3 seconds
- [ ] Largest JS bundle < 500 KB
- [ ] CSS bundle < 100 KB

### 11.2 API Response Times

- [ ] `/api/health` → < 200 ms
- [ ] `/api/questions` → < 500 ms
- [ ] Login → < 1 sec

### 11.3 WebSocket Latency

- [ ] Socket.IO connection < 500 ms
- [ ] Message delivery < 100 ms

---

## Step 12: i18n / Localization Verification

### 12.1 Language Switching

- [ ] Click language dropdown
- [ ] Select: **Deutsch** (DE)
- [ ] Page refreshes with German text
- [ ] All UI strings translated

### 12.2 Test Another Language

- [ ] Select: **Türkçe** (TR) or **العربية** (AR)
- [ ] RTL languages (AR, FA) should mirror layout
- [ ] No missing translation keys

---

## Step 13: Commit & Document

### 13.1 Update .env.production

- [ ] `.env.production` has all correct values
- [ ] **NOT COMMITTED** to Git (check .gitignore)

### 13.2 Commit Deployment Changes

```bash
git add RAILWAY_FRONTEND_DEPLOYMENT.md RAILWAY_FRONTEND_CHECKLIST.md
git commit -m "docs: Add Railway frontend deployment guides"
git push origin master
```

- [ ] Changes pushed to origin/master

### 13.3 Update README

- [ ] Add deployment URLs to README
- [ ] Document how to test locally
- [ ] Add troubleshooting section

---

## Step 14: Post-Deployment Setup

### 14.1 Set Up Monitoring

In Railway Dashboard:

- [ ] Enable health checks: `https://YOUR-URL/index.html`
- [ ] Set alert thresholds:
  - [ ] CPU > 80%
  - [ ] Memory > 85%
  - [ ] Errors > 1%

### 14.2 Configure Auto-Scaling (if needed)

- [ ] Instances: 1-2 (for pilot)
- [ ] CPU threshold: 70%
- [ ] Memory threshold: 80%

### 14.3 Set Up Logs

- [ ] Railway captures logs automatically
- [ ] Check:
  - [ ] Application logs (npm run preview output)
  - [ ] Error logs (any 5xx responses)
  - [ ] Performance logs

---

## Final Verification

- [ ] ✅ Frontend loads on Railway
- [ ] ✅ API connectivity works
- [ ] ✅ Login successful (admin + arzt)
- [ ] ✅ WebSocket connected
- [ ] ✅ Patient flow end-to-end works
- [ ] ✅ Chat messaging works
- [ ] ✅ Security headers present
- [ ] ✅ i18n works in multiple languages
- [ ] ✅ Performance acceptable
- [ ] ✅ No console errors

---

## Summary Table

| Component | URL | Status | Check |
|-----------|-----|--------|-------|
| Frontend | `https://YOUR-SERVICE-ID.up.railway.app` | ✅ Running | Load page |
| Backend | `https://diggai-anamnese.up.railway.app/api` | ✅ Running | `/api/health` |
| Database | `db.oanbmfztnzjvkumzpnfb.supabase.co` | ✅ Connected | Login test |

---

**Deployment Date**: 2026-03-31  
**DSGVO Compliant**: ✅ Frankfurt, Encrypted, Audit-ready  
**Supported Languages**: 10 (DE, EN, AR, TR, UK, ES, FA, IT, FR, PL)
