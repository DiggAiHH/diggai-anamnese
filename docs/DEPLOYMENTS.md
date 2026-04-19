# DiggAI — Deployment-Übersicht

> Letzte Aktualisierung: 19. April 2026  
> Scoped: Service 4 (Anamnese Platform)

---

## Aktive Deployments

| # | Name | URL | Methode | Status | Konfiguration |
|---|------|-----|---------|--------|---------------|
| 1 | **Klaproth (Hauptseite)** | [diggai-drklaproth.netlify.app](https://diggai-drklaproth.netlify.app) | Netlify | ✅ Live | `netlify.toml` (Hauptrepo) |
| 2 | **Hatami (Kardiologie)** | `/hatami` Pfad auf Hauptdomain | Netlify (DiggAI-HZV-Rural) | ✅ Live | `DiggAI-HZV-Rural/netlify.toml` |
| 3 | **API Backend (Produktion)** | `api.diggai.de` | Hetzner VPS Docker | 🟡 Konfiguriert (DNS ausstehend) | `.env.hetzner.template` |
| 4 | **API Backend (Staging)** | `*.up.railway.app` | Railway | 🔄 Staging | `.env.pilot.example` |
| 5 | **Pilot Klaproth** | `klaproth.diggai.de` | Hetzner VPS | 🟡 Geplant | `.env.pilot.example` |

---

## Demo-Tenants (nur Entwicklung/Seeding)

| Tenant | Subdomain | Plan | Patienten (Seed) |
|--------|-----------|------|-----------------|
| Hausarztpraxis Dr. Musterarzt | `demo-hausarzt.diggai.de` | STARTER | 9 |
| Kardiologische Praxis Prof. Dr. Herzmann | `demo-kardio.diggai.de` | PROFESSIONAL | 7 |
| MVZ DiggAI GmbH | `demo-mvz.diggai.de` | ENTERPRISE | 14 |

> ⚠️ Diese Tenants existieren nur in Seed-Daten (`prisma/seed-demo-complete.ts`) und sind **nicht öffentlich deployed**.

---

## Deployment-Details

### 1. Klaproth (Hauptseite) — Live

- **Netlify Site ID:** `aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa`
- **Branch:** `master` in `Ananmese/diggai-anamnese-master/`
- **Konfiguration:** [`netlify.toml`](../netlify.toml)
- **Backend:** `https://api.diggai.de/api` (Hetzner) oder aktuell Railway-Staging
- **Anmerkung:** Standard-Deployment für Dr. Klaproth (Hausarztpraxis)

### 2. Hatami — Kardiologie Subsite

- **Pfad:** `/hatami/*` auf der Hauptdomain (proxied)
- **Repo:** `DiggAI-HZV-Rural/`
- **VITE_PUBLIC_PATH_PREFIX:** `/hatami`
- **VITE_PRACTICE_NAME:** `Praxis Hatami`
- **Arzt:** Dr. Al-Shdaifat (Kardiologie)
- **Konfiguration:** [`DiggAI-HZV-Rural/netlify.toml`](../../DiggAI-HZV-Rural/netlify.toml)
- **Anmerkung:** White-Label via `VITE_PRACTICE_*` Umgebungsvariablen

### 3. API Backend — Hetzner VPS

- **URL:** `https://api.diggai.de/api`
- **Konfiguration:** [`.env.hetzner.template`](../.env.hetzner.template)
- **Docker:** `docker-compose.prod.yml`
- **Datenbank:** PostgreSQL 16 (Supabase oder lokales Volume)
- **Status:** DNS-Konfiguration ausstehend; aktuell läuft Staging auf Railway

### 4. API Backend — Railway (Staging)

- **URL:** `https://diggai-anamnese.up.railway.app/api`
- **Konfiguration:** [`railway.toml`](../railway.toml), `.env.pilot.example`
- **Zweck:** Temporäres Staging-Backend während Hetzner DNS konfiguriert wird

---

## CSP-Domains (aus `netlify.toml`)

```
*.diggai.de         — Alle Praxis-Subdomains
api.diggai.de       — Primäre Backend-API
api-takios.diggai.de — Integrations-Endpunkt (Drittanbieter)
*.up.railway.app    — Staging-Backend
*.netlify.app       — Aktuelles Frontend
```

---

## Konfigurationsdateien

| Datei | Zweck |
|-------|-------|
| [`netlify.toml`](../netlify.toml) | Frontend-Routing, Headers, CSP |
| [`railway.toml`](../railway.toml) | Railway-Staging-Deployment |
| [`.env.hetzner.template`](../.env.hetzner.template) | Produktions-Umgebungsvariablen (Hetzner) |
| [`.env.pilot.example`](../.env.pilot.example) | Pilot/Staging-Umgebungsvariablen |
| [`docker-compose.prod.yml`](../docker-compose.prod.yml) | Produktions-Docker-Stack |
| [`docker-compose.local.yml`](../docker-compose.local.yml) | Lokale Entwicklung (PostgreSQL + Redis) |

---

## Obsidian-Session-Tracking

Ein MCP-Server für Obsidian existiert bereits: [`server/mcp/obsidian-mcp-server.ts`](../server/mcp/obsidian-mcp-server.ts)

**Vorhandene MCP-Tools:**
- `write_session` — Patientensession → Obsidian-Vault
- `write_patient_summary` — Patientenzusammenfassung
- `list_vault_sessions` — Sessions auflisten
- `search_vault` — Vault-Volltextsuche
- `read_vault_note` — Einzelne Notiz lesen
- `get_vault_stats` — Vault-Statistiken

**Fehlend (TODO):**
- `write_copilot_session` — Copilot-Session-Start/-Ende tracken
- `OBSIDIAN_VAULT_PATH` in `.env.example` dokumentieren
- Session-Start/-Ende-Hooks in Copilot-Instructions

**Vault-Struktur:**
```
.obsidian-vault/
├── sessions/         # Patientensession-Notizen
├── patients/         # Patientenzusammenfassungen
├── copilot-sessions/ # TODO: Copilot-Arbeitssessions
└── index/            # Allgemeiner Index
```

---

## Session-Protokoll (Copilot-Sessions)

| Datum | Version | Schwerpunkt | Commit |
|-------|---------|-------------|--------|
| 2026-04-18 | v3.2.0 | 8 kritische Fixes: Default-Tenant, Cookie sameSite, DSGVO-Signatur, i18n | `75d2679` |
| 2026-04-19 | v3.3.0 | Plan: Trust/Simplicity-Forschung, Signature-tenantId, LandingPage, MFA-Board | aktuell |

---

## Offene Fragen

1. **DNS für `api.diggai.de`** → Wann wird Hetzner DNS aktiviert?
2. **DiggAI-HZV-Rural** → Bleibt als eigenes Repo oder Merge in Hauptrepo?
3. **`api-takios.diggai.de`** → Welcher Service liegt dahinter?
4. **Obsidian-Vault-Pfad** → Wo liegt das Vault auf deinem Rechner?
