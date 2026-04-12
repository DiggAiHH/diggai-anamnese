# SYSTEM_CONTEXT

Stand: 2026-04-12
Repo: DiggAI Anamnese (lokaler Golden-Master-Kontext)
Branch: master
Commit: e7d340d

## Systemstatus

- Frontend: React + TypeScript + Vite
- Backend: Express + Prisma
- Deployment: Netlify (Frontend), externes Backend (API URL via Env)
- Sicherheitsfokus: DSGVO, Audit-Logging, rollenbasierter Zugriff

## Integrationspunkte

### Tomedo

- Adapter vorhanden unter `server/services/pvs/adapters/tomedo.adapter.ts`
- Bridge/Batch/DLQ vorhanden unter `server/services/pvs/` sowie `server/routes/tomedo-*.routes.ts`
- E2E-Abdeckung vorhanden (z. B. `e2e/tomedo-bridge.spec.ts`)

### GDT

- Kernmodule vorhanden unter `server/services/pvs/gdt/`:
  - `gdt-parser.ts`
  - `gdt-writer.ts`
  - `gdt-validator.ts`
  - `gdt-watcher.ts`
- PVS-Adapterlandschaft ist auf GDT/FHIR ausgelegt (`server/services/pvs/adapters/`)

### Anonymisierung

- Datenschutz-/Sicherheitslogik dokumentiert und im Service-Layer verankert
- Relevante Bausteine u. a.:
  - `server/services/encryption.ts`
  - `server/services/sanitize.ts`
  - `server/middleware/audit.ts`

### Obsidian

- Kein nativer Obsidian-Connector als Produktionsadapter im Code-Bestand gefunden.
- Markdown-/Dokumentationspfade sind vorhanden (z. B. Export-/Dokumentationsmodule), dadurch ist ein dateibasierter Obsidian-Workflow grundsaetzlich anschlussfaehig.

## Handover-Hinweise

- Netlify SPA-Fallback aktiv (`netlify.toml` Redirect auf `/index.html`).
- E2E-Suite vorhanden unter `e2e/`.
- Type-Check und Build wurden lokal erfolgreich verifiziert (Windows, PowerShell, npm.cmd).
