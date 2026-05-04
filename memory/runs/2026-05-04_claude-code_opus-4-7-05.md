2026-05-04T16:42+02:00 | Lauf claude-code-05 | tomedo-Bridge gehärtet + diggai.de Audit
---
- Aktion: scripts/tomedo-praktiq.applescript v2.0 geschrieben (mktemp+chmod600+Handshake+JSON statt CLI-Args+Audit-Log); server/routes/tomedo-import.routes.ts mit Zod-Schema + Pfad-Allowlist + executeTomedoBridge-Anbindung; in server/index.ts gemountet auf /api/tomedo-bridge/import; Live-Audit https://diggai.de via web_fetch (HTML+manifest+routes)
- Blocker: api-takios.diggai.de liefert ERR_CERT_COMMON_NAME_INVALID — Frontend macht preconnect darauf, alle API-Calls würden scheitern; SPA-Fallback liefert index.html für /datenschutz /impressum /robots.txt /sitemap.xml (kein 404, kein eigenes <title>)
- Fix: Cert-Issue → separates Ticket in Roadmap (DNS/Netlify Custom Domain Cert renew); SPA-Routes brauchen prerender oder netlify _redirects mit eigenem Title-Injection
- Ergebnis: 2 Files neu im Repo (scripts/tomedo-praktiq.applescript, server/routes/tomedo-import.routes.ts); 2 Edits in server/index.ts (Import + mountRoute); Findings-Datei memory/audits/diggai-de-2026-05-04.md angelegt; ROADMAP.md erweitert
- Out: Endpoint registriert aber nicht smoke-getestet (Workspace-Bash down); Cert-Issue ist P0 für API; 8 Audit-Findings dokumentiert; Agent-Prompts in outputs/agent-prompts.md generiert
