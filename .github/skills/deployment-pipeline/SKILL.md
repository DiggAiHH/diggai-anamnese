---
name: deployment-pipeline
description: "Docker, Netlify, and VPS deployment workflows for DiggAI Anamnese. Use when building Docker images, configuring docker-compose, deploying to Netlify, setting up VPS production, running deploy scripts, configuring nginx, or troubleshooting deployment issues."
metadata:
  author: diggai
  version: "1.0"
  domain: devops
---

# Deployment Pipeline Skill

## Architektur

```
┌───────────────────────────────────────────────────┐
│ Frontend (Netlify)          Backend (Docker VPS)  │
├───────────────────────────────────────────────────┤
│ React SPA (Vite Build)      Express 5.2           │
│ → netlify.toml              → Dockerfile          │
│ → Auto-Deploy on main       → docker-compose.prod │
│ → CDN + HTTPS               → PostgreSQL 16       │
│                              → Redis 7 (optional)  │
│                              → Nginx Reverse Proxy │
└───────────────────────────────────────────────────┘
```

## Frontend (Netlify) — Automatisch

```bash
# Push auf main → automatischer Build + Deploy
git push origin main

# Preview Deploy
npm run deploy:preview

# Preflight Check
npm run preflight
```

**Konfiguration:** `netlify.toml`

## Backend (Docker VPS)

```bash
# Erstmalig
git clone <repo> /opt/anamnese-app
cd /opt/anamnese-app
cp anamnese-app/.env.example anamnese-app/.env.production
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Updates
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --force-recreate
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

## Lokale Entwicklung (Docker)

```bash
# PostgreSQL + Redis starten
docker-compose -f docker-compose.local.yml up -d

# Mit Ollama (LLM)
docker-compose -f docker-compose.local.yml --profile llm up -d

# Stoppen
docker-compose -f docker-compose.local.yml down
```

## Release Gates (Pflicht vor Deploy)

1. **Build**: `npm run build` — erfolgreich
2. **Lint**: `npm run lint` — keine Fehler
3. **Type-Check**: `npm run type-check` — strict mode
4. **Security**: `npm audit --audit-level=high` — keine High/Critical
5. **Health-Check**: `/api/health` → `ok`
6. **Migrations**: `npx prisma migrate status` — keine pending

## Befehle

```bash
npm run build              # tsc -b && vite build
npm run build:analyze      # Bundle-Size-Analyse
npm run deploy             # Guided deploy (Netlify + Docker VPS)
npm run deploy:preview     # Preview deploy
npm run preflight          # Deploy-Preflight Check
npm run check-all          # Type-Check + Lint + i18n + Prisma Status
```

## Umgebungsvariablen (Produktion)

```bash
# REQUIRED
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
JWT_SECRET="minimum-32-character-random-string"
ENCRYPTION_KEY="exactly-32-characters-for-aes256!!"
NODE_ENV="production"

# OPTIONAL
REDIS_URL="redis://localhost:6379"
FRONTEND_URL="https://diggai-drklaproth.netlify.app"
```

## Troubleshooting

- **Build-Fehler**: `npm run type-check` für TypeScript-Errors isolieren
- **Migration-Fehler**: `npx prisma migrate status` + `npx prisma migrate deploy`
- **Container-Start-Fehler**: `docker logs <container-name>`
- **Health-Check**: `curl https://<domain>/api/health`
