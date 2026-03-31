# Secure Export / Import Rollout

Diese Datei ergänzt die globale Architektur- und Sicherheitsrichtlinie in
[`docs/GLOBAL_AI_ARCHITECTURE_SECURITY_POLICY.md`](./GLOBAL_AI_ARCHITECTURE_SECURITY_POLICY.md)
für den konkreten Patienten-Export- und MFA-Import-Workflow.

## Zielbild

- Frontend bleibt auf Netlify.
- Express-Backend bleibt separat gehostet.
- Supabase ist für v1 die produktive Praxis-Postgres-Datenbank.
- Patienten erhalten nur ein verschlüsseltes JSON-Paket oder einen kurzlebigen Einmal-Link.
- TXT- und PDF-Exporte werden nur on-demand für Praxisrollen erzeugt.

## Sicherheitsmodell

- Paketverschlüsselung:
  - asymmetrische Umschlüsselung mit `RSA-OAEP-256`
  - Payload-Verschlüsselung mit `AES-256-GCM`
- Pro Mandant wird ein aktiver Praxisschlüssel in `PracticeEncryptionKey` gehalten.
- Download-Links werden nur gehasht gespeichert.
- Import ist über `tenantId + packageId` idempotent.
- Audit-Logs enthalten keine PHI-Nutzdaten.
- Patienten-E-Mails bleiben PHI-arm und enthalten keine medizinischen Inhalte.

## Reset der App-Daten

Nur App-Daten, keine Supabase-Systemtabellen:

```powershell
$env:SUPABASE_RESET_CONFIRM='DELETE_APP_DATA'
$env:SUPABASE_RESET_BACKUP_ACK='I_HAVE_A_BACKUP'
npm run db:reset:app-data
```

Optional mit Seed:

```powershell
$env:SUPABASE_RESET_CONFIRM='DELETE_APP_DATA'
$env:SUPABASE_RESET_BACKUP_ACK='I_HAVE_A_BACKUP'
npm run db:reset:app-data:seed
```

Vorher ist ein Snapshot/Backup Pflicht.

## Umgebungsvariablen

- `DATABASE_URL`
- `API_PUBLIC_URL`
- `ENCRYPTION_KEY`
- `JWT_SECRET`
- `PACKAGE_LINK_TTL_HOURS`
- optional `PACKAGE_RSA_MODULUS_LENGTH`
- optional SMTP:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`

## Go-Live Voraussetzungen

- Supabase-Service-Token aus dem Chat nicht weiterverwenden, sondern rotieren.
- Supabase-Region in der EU betreiben.
- DPA/AVV mit Supabase und Netlify prüfen.
- DSFA/DPIA mit Datenschutzverantwortlichen prüfen.
- SMTP so konfigurieren, dass keine PHI im Betreff, Body oder Anhang landet.
- Backend-URL (`API_PUBLIC_URL`) auf die produktive Express-API zeigen lassen.

## Verifikation

- Servertests:
  - Paket-Erzeugung / Decrypt
  - Tamper-Erkennung
  - Einmal-Link-Verbrauch
  - MFA-Import
  - TXT/PDF/Export-Routen
- Frontend-Tests:
  - Patienten-Submitted-Page Aktionen
  - MFA Import-/Versand-Panel
- Produktionsbuild:
  - `npx vite build`
