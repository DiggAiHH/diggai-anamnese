2026-05-07T21:30+02:00 | Lauf claude-code-13 | Staging-Umgebung (ISO 27001 8.31 ◧→◼) + Tracker-Score aktualisiert

---
- Aktion: `fly.staging.toml` (diggai-api-staging, 256MB, auto_stop=suspend, fra) + `.github/workflows/deploy-staging.yml` (4-Stage: build-check→migrate-db→deploy→smoke-test, Trigger: develop-Push + workflow_dispatch) + `docs/STAGING_SETUP_CK.md` (CK-Checkliste für einmalige Aktivierung). SoA 8.31 ◧→◼, Zähler 44→45 implementiert, 28→27 teilweise. Tracker Status-Score von Lauf-22-Stand (35% voll) auf aktuellen Stand (56% voll) aktualisiert. npm-devDep xlsx committed (package.json+lockfile, J9 noch blockiert wegen node_modules-Korruption).
- Blocker: J9 (xlsx build) — npm install sagt "added 88 packages" aber node_modules/xlsx nicht vorhanden. Wahrscheinlich npm-Cache-Korruption durch ersten --legacy-peer-deps Lauf. Staging-Aktivierung benötigt CK (Neon Console-Zugang + flyctl auth).
- Fix: Staging-Konfig vollständig als Code bereitgestellt — CK muss nur 3 CLI-Befehle ausführen.
- Ergebnis: 3 neue Dateien staged, SoA + Tracker aktualisiert.
- Out: Staging-Config ✅ bereit. SoA 45◼/27◧/1⬛/20 N/A. Tracker 56% voll. Nächste ENG-Items: J9-Fix (npm cache clean), oder B-Block nach RAM-Verfügbarkeit.
