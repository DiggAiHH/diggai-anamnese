# DEPLOYMENT.md — Operations & Deployment Guide

## Architecture Overview

| Component | Hosting | Config File |
|---|---|---|
| Frontend (React SPA) | Netlify CDN | `netlify.toml` |
| Backend (Express API) | Docker VPS | `docker-compose.prod.yml` |
| Database | PostgreSQL 16 (Docker) | `docker-compose.prod.yml` |
| Cache | Redis 7 (Docker, optional) | `docker-compose.local.yml` |
| Reverse Proxy | Nginx | `docker/nginx.conf` |

---

## Local Development Setup

### Prerequisites

- Node.js 22+
- Docker Desktop
- Git

### First-time setup

```bash
# 1. Clone and install
git clone <repo-url>
cd anamnese-app
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET (32+ chars), ENCRYPTION_KEY (exactly 32 chars)

# 3. Start local infrastructure (PostgreSQL + Redis)
docker-compose -f docker-compose.local.yml up -d

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed the database (270+ questions + admin user)
npx prisma db seed

# 6. Start development server
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001 (via Vite proxy)
```

### Optional local services

```bash
# Add Ollama LLM support
docker-compose -f docker-compose.local.yml --profile llm up -d

# Add Gematik TI proxy (for TI/ePA testing)
docker-compose -f docker-compose.local.yml --profile ti up -d

# Add RabbitMQ for agent messaging
docker-compose -f docker-compose.local.yml --profile rabbitmq up -d
```

---

## Frontend Deploy (Netlify)

### Automatic deploy (recommended)

Push to `main` branch → Netlify auto-builds and deploys:
```bash
git push origin main
```

### Manual deploy

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### Netlify configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

The redirect rule is critical — without it, deep links and page refreshes return 404.

### Environment variables on Netlify

Set these in Netlify dashboard (Site Settings → Environment Variables):
```
VITE_API_URL=https://api.your-domain.de/api
```

---

## Backend Deploy (Docker VPS)

### First deployment

```bash
# On your VPS:
git clone <repo-url> /opt/anamnese-app
cd /opt/anamnese-app

# Create production .env
cp anamnese-app/.env.example anamnese-app/.env.production
# Edit with production values

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed (first deploy only)
docker-compose -f docker-compose.prod.yml exec backend npx prisma db seed
```

### Rolling update (subsequent deploys)

```bash
cd /opt/anamnese-app
git pull origin main
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate

# Run any new migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

**Important**: Always use `migrate deploy` (not `migrate dev`) in production.

---

## Database Migration Procedure

### Development

```bash
# After changing prisma/schema.prisma:
npx prisma migrate dev --name describe-what-changed
npx prisma generate
```

### Production

```bash
# NEVER run migrate dev in production
# Deploy your migration files via git, then:
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Pending migration (Modul 5-6 extensions)

```bash
# This migration has NOT yet been run in production:
npx prisma migrate dev --name modul5-6-extensions
# Adds: PatientAccount, MedicationReminder, ReminderLog WebAuthn fields
```

---

## Rollback Procedure

### Frontend rollback (Netlify)

1. Go to Netlify dashboard → Site → Deploys
2. Find the last known-good deploy
3. Click "Publish deploy"

### Backend rollback

```bash
# On VPS:
cd /opt/anamnese-app
git checkout <previous-commit-hash>
docker-compose -f docker-compose.prod.yml up -d --force-recreate
# Do NOT rollback migrations — they are forward-only
# If schema rollback needed, create a new reverse migration
```

---

## Health Check

```bash
# Full system health check
curl https://api.your-domain.de/api/system/health

# Expected response (healthy):
{
  "status": "ok",
  "version": "3.0.0",
  "timestamp": "2026-03-07T12:00:00.000Z",
  "environment": "production",
  "db": "connected",
  "redis": "connected",
  "uptime": 12345,
  "agents": [
    { "name": "orchestrator", "online": true, "busy": false },
    { "name": "empfang", "online": true, "busy": false }
  ],
  "reminderWorker": "running"
}

# Degraded (Redis unavailable but DB ok — acceptable):
{
  "status": "ok",
  "db": "connected",
  "redis": "disconnected"
}

# Error (DB unavailable — ALERT REQUIRED):
{
  "status": "degraded",
  "db": "error"
}
```

---

## Docker Compose Files Reference

| File | Purpose |
|---|---|
| `docker-compose.local.yml` | Local development: PostgreSQL + Redis + optional profiles |
| `docker-compose.prod.yml` | Production: full stack with Nginx |
| `docker-compose.yml` | Base configuration |
| `docker-compose.gematik.yml` | Gematik TI integration environment |

---

## All Environment Variables

### Required

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/anamnese"
JWT_SECRET="minimum-32-character-random-signing-key"
ENCRYPTION_KEY="exactly-32-chars-for-aes256-key!!"
```

### Frontend (Vite — prefix with VITE_)

```bash
VITE_API_URL="https://api.your-domain.de/api"
FRONTEND_URL="https://your-frontend.netlify.app"
```

### Authentication

```bash
ARZT_PASSWORD="initial-default-doctor-password"
```

### Optional — Redis

```bash
REDIS_URL="redis://localhost:6379"
```

### Optional — AI/LLM

```bash
LLM_ENDPOINT="http://localhost:11434"   # Ollama
OPENAI_API_KEY="sk-..."                 # OpenAI-compatible
```

### Optional — Email (nodemailer)

```bash
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="noreply@your-domain.de"
SMTP_PASS="smtp-password"
```

### Optional — Push Notifications

```bash
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
```

### Feature Flags (all default to false/disabled)

```bash
NFC_ENABLED="true"          # NFC check-in
PAYMENT_ENABLED="true"      # Payment processing
TELEMED_ENABLED="true"      # Video consultation
TI_ENABLED="false"          # Gematik TI (requires ti Docker profile)
```

### Infrastructure

```bash
PORT="3001"
NODE_ENV="production"
NETLIFY_SITE_ID="..."
NETLIFY_AUTH_TOKEN="..."
AGENT_CORE_URL="http://diggai-agent-core:8000"  # Service 1 URL
```

---

## Common Operational Tasks

### View backend logs

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Access database

```bash
# Via Prisma Studio (local only):
npx prisma studio

# Via psql (production):
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres anamnese
```

### Restart backend (no downtime)

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Check running jobs

```bash
# In backend logs, look for:
# [Server] Reminder worker started successfully
# [Server] ROI snapshot job started
# [Server] Cleanup job started
# [Server] Hard-delete worker started
# [Server] Agent orchestrator started
```

### Manual backup

```bash
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres anamnese > backup-$(date +%Y%m%d).sql
```
