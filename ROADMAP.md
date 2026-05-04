# DiggAi · Anamnese Platform — Roadmap

**Stand:** 2026-05-04 · **Letzter Audit:** [diggai-de-2026-05-04.md](memory/audits/diggai-de-2026-05-04.md)

Eselsbrücke: P0 = brennt jetzt · P1 = brennt diese Woche · P2 = nächster Sprint · P3 = später

---

## P0 — Sofort (diese Woche)

| ID | Thema | Owner | Quelle |
|----|-------|-------|--------|
| F-01 | API-Cert `api-takios.diggai.de` ungültig fixen | DevOps | Audit 2026-05-04 |
| F-02 | Google Fonts → self-hosted (`@fontsource/*`) | Frontend | Audit 2026-05-04 |
| T-01 | tomedo-PraktIQ-Bridge: Endpoint Smoketest + erste Praxis-Anbindung | Backend | Lauf 05 |

## P1 — Diese/Nächste Woche

| ID | Thema | Owner |
|----|-------|-------|
| F-03 | `og:url` auf `https://diggai.de` korrigieren | Frontend |
| F-04 | favicon (Vite-Default) durch DiggAi-Brand ersetzen | Frontend |
| F-05 | Route-spezifische `<title>` via react-helmet-async | Frontend |
| F-06 | `public/robots.txt` + `public/sitemap.xml` + Netlify-Redirects | Frontend |
| T-02 | tomedo-Bridge: PraktIQ-App-Seite Handshake-Datei-Schreibung implementieren | macOS-Dev |
| T-03 | Tests für `tomedo-import.routes.ts` (Zod-Schema, Pfad-Allowlist, Bridge-Aufruf) | Backend |

## P2 — Nächster Sprint

| ID | Thema | Owner |
|----|-------|-------|
| F-07 | `og:image` 1200×630 erstellen + ausspielen | Design+Frontend |
| F-08 | Theme-Color auf DiggAi-Brand mappen | Frontend |
| F-09 | Manifest-`orientation` auf `any` | Frontend |
| T-04 | Audit-Logger: `logAction()` Method tatsächlich implementieren (bisher best-effort) | Backend |
| T-05 | tomedo-Bridge: Lighthouse-Audit + Performance-Budget für Import-Endpoint | DevOps |

## P3 — Später

| ID | Thema | Owner |
|----|-------|-------|
| T-06 | Prerendering für statische Routes (Datenschutz, Impressum) | Frontend |
| T-07 | tomedo-Bridge: n8n-Workflow für Batch-Import nightly | Automation |
| T-08 | Patient-Facing Status-Page mit Cert-Monitoring | DevOps |

---

## Aktive Workstreams

### Tomedo ↔ PraktIQ ↔ DiggAi Bridge (NEU 2026-05-04)
- **Komponente A:** AppleScript v2.0 in tomedo-Texteditor → erstellt Temp-JSON in `/tmp/diggai-tomedo.*.json`
- **Komponente B:** PraktIQ-App liest JSON, schickt POST an `https://api-takios.diggai.de/api/tomedo-bridge/import` mit `{filePath}`
- **Komponente C:** Express-Endpoint validiert mit Zod, ruft `executeTomedoBridge()` (Multi-Agent: Alpha/Bravo/Charlie/Delta), schreibt Handshake-Datei
- **Komponente D:** AppleScript pollt Handshake-Datei, löscht JSON nach Bestätigung

### Live-Site Hardening (laufend)
- Cert-Monitoring fehlt → P0
- Self-Hosted Fonts → P0
- SEO/Meta-Tags → P1
- Static-Routes-Prerender → P3

---

## Definition of Done — siehe `CLAUDE.md`
Jeder Lauf MUSS einen Eintrag unter `memory/runs/YYYY-MM-DD_<agent>_<model>-<run>.md` schreiben.
