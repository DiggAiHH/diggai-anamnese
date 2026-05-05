# DiggAi — Backend-Deploy auf Render.com (Free Tier, Frankfurt)

> **Zweck:** Kostenloses, in Deutschland gehostetes Backend als Übergangs-Lösung, solange Hetzner nicht bezahlt ist.
> **Stand:** Sobald Hetzner wieder läuft, einfach DNS/CNAME zurück auf Hetzner schwenken — `render.yaml` bleibt im Repo als dauerhafter Fallback.
> **Lizenz-Kosten:** 0 € — siehe Limits unten.

---

## Was du bekommst

| Komponente | Anbieter | Region | Kosten | Limit |
|------------|----------|--------|--------|-------|
| Backend (Express + Prisma + Socket.IO) | **Render.com Free** | Frankfurt | 0 € | 750 Std/Monat, schläft nach 15 min Inaktivität (30–60 s Cold-Start beim ersten Aufruf danach) |
| PostgreSQL-Datenbank | **Supabase Free** | EU/Frankfurt | 0 € | 500 MB Storage, 5 GB Egress/Monat, 2 GB DB-Größe |
| Frontend (bereits live) | Netlify | Frankfurt-Edge | 0 € | bestehend, https://diggai.de |

DSGVO: Render hat eine Frankfurt-Region (Daten verbleiben in DE/EU). Supabase EU ebenfalls in Frankfurt. Beide Anbieter haben einen DPA-/AVV-Prozess (siehe „DSGVO-Pflichten" weiter unten).

## Voraussetzungen (einmalig, je 5 Minuten)

1. **GitHub-Account** mit Push-Rechten auf `DiggAiHH/diggai-anamnese`
2. **Render-Account** — kostenlos auf https://render.com (mit GitHub einloggen)
3. **Supabase-Account** — kostenlos auf https://supabase.com (mit GitHub einloggen)

---

## Schritt 1 — PostgreSQL-DB auf Supabase anlegen (5 Min)

1. https://supabase.com → Sign in → **New project**
2. Project Name: `diggai-anamnese`
3. Database Password: **starkes Passwort generieren und in 1Password / Bitwarden speichern**
4. Region: **Central EU (Frankfurt)** — wichtig für DSGVO!
5. Pricing Plan: **Free**
6. **Create new project** (dauert ca. 2 Minuten)
7. Sobald die DB läuft: links unten **Project Settings** → **Database** → **Connection string** → Tab **URI** kopieren — sieht aus wie:
   ```
   postgresql://postgres.<random>:<dein-passwort>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   Diese URL ist dein `DATABASE_URL`.

> **Wichtig:** Verwende den **Connection-Pooler**-String (Port `6543`, nicht `5432`). Render Free Tier hat schwankende IPs und nutzt am besten Pooler.

---

## Schritt 2 — Schema auf Supabase migrieren (3 Min)

Lokal in deinem Repo (PowerShell):

```powershell
cd "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"

# Supabase-DATABASE_URL temporär in .env setzen (NICHT committen!)
# In .env die folgenden Zeilen anhängen:
#   DATABASE_URL="postgresql://postgres.<random>:<dein-passwort>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
#   DIRECT_URL="postgresql://postgres.<random>:<dein-passwort>@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Migration laufen lassen
npx prisma migrate deploy
npx prisma db seed
```

Bei Erfolg sind alle Tabellen + Seed-Daten in Supabase. Verifizieren in Supabase Dashboard → **Table Editor**.

---

## Schritt 3 — Backend auf Render deployen (10 Min)

1. https://render.com → **Dashboard** → **New +** → **Blueprint**
2. **Connect Repository** → `DiggAiHH/diggai-anamnese` auswählen
3. Render erkennt die `render.yaml` automatisch → **Apply Blueprint**
4. Branch: `master` (oder `regulatory/spur-a-no-mdsw` wenn der PR noch offen ist)
5. **Service-Einstellungen prüfen:**
   - Plan: `Free` ✓
   - Region: `Frankfurt` ✓
   - Health Check: `/api/health` ✓
6. **Environment Variables** — die mit `sync: false` musst du im Dashboard manuell setzen:
   | Key | Wert |
   |-----|------|
   | `DATABASE_URL` | Supabase-Pooler-URL aus Schritt 1 |
   | `JWT_SECRET` | mindestens 32 Zeichen, z. B. `openssl rand -base64 48` lokal generieren |
   | `ENCRYPTION_KEY` | **exakt 32 Zeichen, mit Buchstabe beginnen** (kein rein-numerischer Wert!) — z. B. `Diggai_Prod_2026_Klapproth_001!` |
   | `ARZT_PASSWORD` | initiales Praxis-Passwort, später in App ändern |
   | `FRONTEND_URL` | `https://diggai.de` |
   | `API_PUBLIC_URL` | `https://<deinservice>.onrender.com` (nach erstem Deploy ablesbar) |
7. **Deploy Web Service** → Render baut den Docker-Image (~5–8 Min)
8. Sobald grün: in den **Logs** prüfen, dass `Server listening on :3001` erscheint
9. Health-Check: im Browser `https://<deinservice>.onrender.com/api/health` → sollte `{ "status": "ok" }` zurückgeben

---

## Schritt 4 — Frontend auf neue Backend-URL umstellen (5 Min)

In Netlify-Dashboard (https://app.netlify.com/sites/<dein-site>):
1. **Site settings** → **Environment variables**
2. `VITE_API_URL` setzen auf `https://<deinservice>.onrender.com/api`
3. **Trigger deploy** → **Clear cache and deploy site**

Oder per CLI lokal:
```powershell
cd "D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
$env:VITE_API_URL = "https://<deinservice>.onrender.com/api"
npm run build
npx netlify deploy --prod --dir=dist
```

---

## Schritt 5 — Smoke-Test (3 Min)

1. https://diggai.de öffnen
2. Patient-Anmeldung starten
3. Eine Frage beantworten (z. B. „Brustschmerzen" auswählen)
4. Erwartung: `AnmeldeHinweisOverlay` zeigt Workflow-Hinweis (kein Diagnose-Wort, siehe Spur-A-PR)
5. Im Render-Dashboard → **Logs** prüfen, dass `POST /api/answers/...` 200 OK liefert

Bei Cold-Start (erster Aufruf nach >15 min): erwarte 30–60 s Wartezeit — danach läuft das Backend wieder responsiv für 15 min.

---

## DSGVO-Pflichten

Bevor echte Patientendaten verarbeitet werden:

1. **AVV mit Render abschließen** — Render bietet einen DPA (Data Processing Agreement) auf https://render.com/legal/dpa
2. **AVV mit Supabase abschließen** — Supabase DPA: https://supabase.com/legal/dpa
3. Beide AVVs in `docs/AVV_TEMPLATE.md` / `docs/VERFAHRENSVERZEICHNIS.md` ergänzen
4. Im Verfahrensverzeichnis Subprocessor-Liste aktualisieren: Render Inc. (US, EU-Region) + Supabase Inc. (US, EU-Region) — beide nach Schrems-II mit SCCs (Standard Contractual Clauses)

---

## Zurück zu Hetzner (sobald wieder bezahlt)

1. Hetzner-Server hochfahren / Rechnung begleichen
2. Backend-Container auf Hetzner deployen (`docker-compose -f docker-compose.prod.yml up -d`)
3. DNS-Eintrag `api.diggai.de` von Render zurück auf Hetzner-IP umleiten
4. In Netlify `VITE_API_URL` zurück auf `https://api.diggai.de/api` setzen
5. Render-Service stoppen (im Dashboard) — verbleibt als Standby-Fallback
6. Supabase-DB nach Hetzner-PostgreSQL umziehen (`pg_dump` + `pg_restore`) ODER Supabase als Read-Replica/Backup behalten

---

## Troubleshooting

| Symptom | Ursache | Fix |
|---------|---------|-----|
| `ENCRYPTION_KEY` Fehler beim Start: „Scientific-Notation" | Render-Dashboard hat den Wert ohne Quotes interpretiert | Wert mit Buchstabe beginnen lassen (z. B. `Diggai_…`) |
| `prisma: relation does not exist` | Migration nicht gelaufen | Schritt 2 wiederholen mit korrektem `DATABASE_URL` |
| 502 Bad Gateway nach 15 min Pause | Cold-Start läuft | 30–60 s warten, dann nochmal versuchen |
| `CORS error` im Browser | `FRONTEND_URL` falsch in Render-Env | Render-Dashboard → Service → Environment → korrigieren → Redeploy |
| Socket.IO bricht ab | Render Free Tier hat begrenzten Idle-Timeout | Frontend-Reconnect-Strategie ist im Code (`socketClient.ts`); kein Server-Fix nötig |

---

## Kostenüberwachung

- **Render Dashboard** → **Billing** → sollte dauerhaft 0 € anzeigen
- **Supabase Dashboard** → **Reports** → sollte unter 500 MB Storage bleiben
- Bei Überschreitung: Service wird gedrosselt, nicht automatisch in Bezahl-Modus geschoben (beide Anbieter)

Wenn die Free-Limits zu eng werden, wechsle entweder zurück zu Hetzner oder upgrade gezielt:
- Render Starter: $7/Monat (kein Cold-Start)
- Supabase Pro: $25/Monat (8 GB DB, mehr Egress)
