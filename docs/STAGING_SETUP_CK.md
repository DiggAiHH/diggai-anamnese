# Staging-Umgebung Aktivierung — CK-Checkliste

**Zweck:** ISO 27001:2022 Control 8.31 — Trennung Entwicklung / Test / Produktion  
**Aufwand:** ~15–20 Minuten, einmalig  
**Resultat:** `https://diggai-api-staging.fly.dev` live mit eigener Test-DB

---

## Schritt 1: Neon Staging-Branch anlegen (5 Min)

1. → [Neon Console](https://console.neon.tech) öffnen
2. Projekt `diggai` auswählen
3. **Branches** → **New Branch**
4. Name: `staging`, von: `main`
5. **Connection string** kopieren (Format: `postgres://user:pass@...neon.tech/neondb?sslmode=require`)

---

## Schritt 2: Fly.io Staging-App anlegen (10 Min)

```bash
# Fly CLI lokal ausführen (flyctl muss installiert sein)
flyctl auth login

# App anlegen (nur einmalig)
flyctl apps create diggai-api-staging --org personal

# Secrets setzen (CONNECTION STRING aus Schritt 1 einsetzen)
flyctl secrets set -a diggai-api-staging \
  DATABASE_URL="postgres://...NEON_STAGING_CONNECTION_STRING..." \
  JWT_SECRET="staging-jwt-secret-minimum-32-chars!!" \
  ENCRYPTION_KEY="staging-enc-key-exactly-32chars!!" \
  NODE_ENV="staging"

# Erstes Deployment
flyctl deploy -a diggai-api-staging --config fly.staging.toml --remote-only
```

---

## Schritt 3: GitHub Secret hinterlegen (2 Min)

Damit der CI automatisch auf `develop`-Pushes deployed:

1. → GitHub Repo → **Settings → Secrets and variables → Actions**
2. **New repository secret**:
   - Name: `STAGING_DATABASE_URL`
   - Value: Neon Staging Connection String (aus Schritt 1)
3. Der `FLY_API_TOKEN` ist bereits gesetzt (für Production-Deploy)

---

## Verifizierung

```bash
# Health-Check (nach 30s Warm-up)
curl https://diggai-api-staging.fly.dev/api/health
# Erwartete Antwort: {"status":"ok","env":"staging",...}
```

---

## Kosten

- **Neon Staging Branch:** kostenlos (im Free-Tier inbegriffen)
- **Fly.io Staging App:** ~$0/Mon bei `auto_stop_machines = "suspend"` (schläft wenn nicht genutzt)
- **Gesamtkosten Staging:** $0/Mon

---

*Erstellt: 2026-05-07, Lauf claude-code-13 — Adressiert ISO 27001:2022 8.31*
