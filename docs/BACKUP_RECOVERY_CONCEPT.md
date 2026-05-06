# DiggAi · Backup- und Disaster-Recovery-Konzept

**Version:** 1.0
**Stand:** 2026-05-06 · **Branch:** `restructure/phase-1-workspace`
**Verfasser:** Claude (claude-code, opus-4-7) · Lauf 20
**Adressaten:** CK (Verantwortlicher), Engineering, DPO, Pen-Tester, BfArM-Auditor

> **Anker:** Open-Items-Tracker E3, DSGVO Art. 32 (Sicherheit der Verarbeitung), MDR Anhang II §6 (Software-Lebenszyklus), BSI TR-03161 (DiGA-Sicherheits-Anforderungen).

---

## 1. Zielwerte (RTO / RPO)

| Kennzahl | Definition | Zielwert | Aktueller Stand |
|---------|-----------|----------|-----------------|
| RPO (Recovery Point Objective) | Maximaler Datenverlust nach Restore | **24 Stunden** | erfüllt durch Neon-Postgres-PITR + nightly Snapshot |
| RTO (Recovery Time Objective) | Zeit bis zur Wiederherstellung des Betriebs | **4 Stunden** | durch Fly.io-Auto-Restart + Neon-PITR + Netlify-Edge erfüllt |
| MTPD (Maximum Tolerable Period of Disruption) | Worst-Case bevor Praxis-Workflow leidet | 8 Stunden | Praxen können in dieser Zeit auf Empfangs-Tresen-Anmeldung umstellen |

## 2. Backup-Strategie pro Schicht

### 2.1 Datenbank (Neon Postgres)

**Provider-seitig (automatisch):**
- **Point-in-Time-Recovery (PITR):** Neon-Standard ist 7 Tage retention; Restore-Granularität 1 Sekunde.
- **Snapshots:** Tägliche automatische Snapshots, retained 7 Tage.
- **Branching:** Neon erlaubt instant-Branching für Dev/Stage-Kopien.

**DiggAi-eigene Backups (Eigenständigkeit):**
- **Nightly-Logical-Dump:** `pg_dump --format=custom` per Cron (`server/jobs/backupScheduler.ts`), verschlüsselt mit AES-256-GCM, gespeichert in S3-kompatiblem EU-Storage (TBD: Hetzner Cloud Object Storage oder Cloudflare R2 EU).
- **Aufbewahrung:** 30 Tage rolling, plus monatlicher Long-Term-Snapshot 12 Monate.
- **Verifikation:** Wöchentlicher automatischer Test-Restore in eine Sandbox-DB (siehe §4).

### 2.2 Backend-Code (Application Layer)

Code lebt im Git-Repository (`DiggAiHH/diggai-anamnese`). Backup-Strategie hier:
- **Git-Hauptzweig** auf GitHub (Cloud-Multi-Region) plus mindestens 2 Klone auf Engineering-Workstations.
- **Container-Images:** Fly.io speichert die letzten 10 Image-Tags; bei Bedarf Rollback via `flyctl deploy --image registry.fly.io/diggai-api:deployment-xxx`.
- **Build-Artefakte (Frontend):** Netlify hält die letzten 50 Deploys verfügbar; Rollback ist 1-Click.

### 2.3 Statische Assets / Frontend

Netlify CDN ist Multi-Region und stellt die letzten 50 Deploys vor. Bei Totalverlust Re-Build aus Git via `npm run build` und `netlify deploy --prod`. Build-Zeit ca. 60 Sekunden.

### 2.4 Konfigurations-Daten / Secrets

- **Fly-Secrets** (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, VAPID_*, …) sind in der Fly-Plattform verschlüsselt gespeichert.
- **Backup der Secret-Liste:** Externer Vault (1Password Vault „DiggAi-Production"), regelmäßig manuell mit Fly synchronisiert (vierteljährlich + bei jeder Rotation).
- **Recovery-Pfad bei Vault-Verlust:** Secrets können nicht aus Fly extrahiert werden, aber Werte sind im Vault deponiert. Bei Vault-Totalverlust: Notfall-Rotation aller Schlüssel + Re-Verschlüsselung der DB-PII-Felder mit neuem ENCRYPTION_KEY (Wiederherstellung mehrere Stunden).

### 2.5 Audit-Logs (HIPAA-style)

Audit-Logs sind primär in der Postgres-Datenbank (Tabelle `AuditLog`) mit gleicher Backup-Strategie wie 2.1. Zusätzlich werden kritische Sicherheits-Events im Sentry-System dupliziert (Retention 90 Tage).

## 3. Disaster-Szenarien und Recovery-Pläne

### Szenario A — Backend-Crash auf Fly

**Symptome:** /api/health antwortet 502 oder 503 dauerhaft.

**Recovery (RTO < 30 Min):**
1. `flyctl status --app diggai-api` zur Fehlerdiagnose.
2. `flyctl machine restart 3d8d204ef42338` für Hard-Restart.
3. Falls Image-Korruption: Rollback auf vorletzten Tag mit `flyctl deploy --image registry.fly.io/diggai-api:deployment-prev`.
4. Health-Check verifizieren: `curl https://diggai-api.fly.dev/api/health`.
5. Live-Strecke verifizieren: `node tools/smoke-test-chrome.mjs`.

**Eskalation:** Wenn nach 30 Min kein Erfolg, Frontend in Read-Only-Mode versetzen (Banner via Netlify Edge-Function), Praxis informieren über Empfangs-Tresen-Fallback.

### Szenario B — Datenbank-Korruption oder unbeabsichtigte Lösch-Aktion

**Symptome:** Anwendung antwortet, aber Daten fehlen oder sind inkonsistent.

**Recovery (RTO < 4 Std):**
1. **Sofort:** Schreibrechte auf DB einfrieren (Fly-Secret `DB_READONLY=1` setzen, Backend-Restart).
2. PITR-Restore in Neon-Branch zum Zeitpunkt vor dem Vorfall.
3. Diff-Analyse: was wurde zwischen Vorfall und Sicherung verändert?
4. Selektive Wiederherstellung der betroffenen Records aus dem PITR-Branch.
5. DB-Schreibrechte wieder freigeben.
6. Audit-Log-Eintrag: was wurde wiederhergestellt, von wem, warum.

**Eskalation:** Wenn PITR-Branch ebenfalls korrumpiert: Fall-back auf nächtlichen S3-Logical-Dump (max RPO 24 h). Datenverlust-Vorfall an HmbBfDI melden gem. DSGVO Art. 33 (binnen 72 h).

### Szenario C — Neon-Outage (Provider-Ausfall)

**Symptome:** Alle DB-Verbindungen failen, Status-Page neon.tech bestätigt Incident.

**Recovery (RTO 2-8 Std je nach Outage-Schwere):**
1. Fall-back-DB ist NICHT aktiv vorgehalten (Single-Provider-Risiko, dokumentiert).
2. Bei Neon-Total-Outage: Read-Only-Modus, Backend antwortet 503 mit klarer Fehlermeldung.
3. Praxis wechselt auf Empfangs-Tresen-Fallback.
4. Wenn Outage > 4 Std: Activate-Cold-Standby-Plan = pg_dump in neuen Postgres-Container auf Hetzner Cloud bringen, DATABASE_URL umstellen, Re-Deploy.

**Eskalation Verhinderung (Phase 2 Engineering):** Multi-Provider-Strategie evaluieren (Neon + AWS RDS Frankfurt als Hot-Standby), Aufwand 1-2 Wochen Engineering, Kosten +200-400 €/Monat.

### Szenario D — Fly.io-Outage

**Symptome:** Backend nicht erreichbar, fly.io Status-Page bestätigt Region-fra-Incident.

**Recovery (RTO 1-4 Std):**
1. Bei Single-Region-Outage in fra: Manuell Fail-over auf zweite Region (z.B. ams Amsterdam) — Fly hat Multi-Region-Support, derzeit aber nur fra aktiv.
2. Frontend geht in Banner-Mode mit Hinweis auf temporäre Beeinträchtigung.

**Eskalation Verhinderung (Phase 2 Engineering):** Multi-Region-Deployment auf Fly mit min_machines_running=1 in 2 EU-Regionen, kostet ~4 €/Monat statt 2 €.

### Szenario E — DDoS-Angriff oder Massen-Anmeldungen

**Symptome:** /api/sessions/start und /api/answers werden überflutet, Backend reagiert träge.

**Recovery (RTO < 15 Min):**
1. Cloudflare-Proxy oder Netlify-WAF einschalten (vorbereitet aber nicht default-aktiv).
2. Rate-Limit-Werte temporär verschärfen (in `server/middleware/rateLimit.ts`).
3. Fly-Machine-Scale auf shared-cpu-2x oder dedicated-2x erhöhen.

### Szenario F — Verschlüsselungs-Schlüssel-Verlust

**Symptome:** ENCRYPTION_KEY in Fly-Secret nicht mehr verfügbar oder rotiert ohne Re-Verschlüsselung.

**Recovery (worst case, 4-8 Std):**
1. ENCRYPTION_KEY aus 1Password-Vault wiederherstellen.
2. Fly-Secret neu setzen, Backend-Restart.
3. Verifikation durch Decrypt-Test einer bekannten PII-Spalte.

**Eskalation Verhinderung:** Quartalsweise Vault-Sync-Audit, Documented-Recovery-Test einmal pro Halbjahr.

## 4. Test-Restore-Lauf (regelmäßige Verifikation)

**Frequenz:** Monatlich, jeden ersten Montag.

**Ablauf:**
1. PITR-Branch in Neon erzeugen (zum Zeitpunkt T-24h).
2. Logical-Dump aus dem Branch ziehen (`pg_dump --format=custom`).
3. In Sandbox-Postgres-Container restoren.
4. Schema-Integrität prüfen (`prisma migrate status`).
5. Sample-Records-Vergleich: 10 zufällige PatientSessions vs. Production-Read-Only-Snapshot.
6. Verschlüsselungs-Roundtrip: 3 PII-Felder decryptable mit ENCRYPTION_KEY.
7. Audit-Log-Eintrag mit Outcome (PASS/FAIL).

**Skript:** `scripts/backup-test-restore.cjs` (TODO — als Folge-Aufgabe für ENG).

## 5. Compliance-Mapping

| Standard | Anforderung | Erfüllung in DiggAi |
|----------|-------------|---------------------|
| DSGVO Art. 32 lit. b | Verfügbarkeit personenbezogener Daten | RTO 4h, RPO 24h, dokumentiert in §1 |
| DSGVO Art. 32 lit. c | Wiederherstellbarkeit nach Zwischenfall | PITR + Logical-Dump + Test-Restore-Lauf |
| MDR Anhang II §6 | Software-Lebenszyklus (Fehler-/Notfall-Pläne) | Disaster-Pläne A-F in §3 |
| BSI TR-03161 §5 | Backup-Verfahren für DiGAs | Multi-Layer (Provider + eigene S3-Dumps) |
| ISO 27001 A.17 | Business Continuity (BCM) | RPO/RTO definiert, getestet |
| HIPAA-Best-Practice | Audit-Log-Backup | AuditLog-Tabelle in Backup-Scope |

## 6. Restrisiken

| Risiko | Wahrscheinlichkeit | Schwere | Mitigation |
|--------|--------------------|---------|------------|
| Neon-Region-Outage > 8 Std | gering | hoch | Cold-Standby-Plan (Hetzner-Postgres), Phase-2-Engineering-Item |
| Vault-und-Fly-Secret-Doppel-Verlust | sehr gering | sehr hoch | Quartals-Vault-Sync-Audit, 2 Vault-Operatoren mit Recovery-Codes |
| Verschlüsselungs-Key rotiert ohne Re-Encrypt | mittel | hoch | Pre-Rotate-Migration-Script Pflicht (Folge-Task) |
| Logical-Dump-Storage geleakt | gering | mittel | Server-side-encryption + Access-Control + Audit-Logs |
| Test-Restore wird nicht regelmäßig durchgeführt | hoch | mittel | Cowork-Scheduled-Task `monthly-restore-test` (Folge-Task) |

## 7. Folge-Aufgaben aus diesem Dokument

| # | Item | Owner | Block-Effekt |
|---|------|-------|--------------|
| K11 | `scripts/backup-test-restore.cjs` schreiben | ENG | E3-Verifikation |
| K12 | Cowork-Scheduled-Task `monthly-restore-test` einrichten | Claude | Operations-Automation |
| K13 | Hetzner Cloud Object Storage als S3-Alternativ-Ziel beauftragen | CK | Backup-Storage |
| K14 | Multi-Region-Fly-Deployment evaluieren (fra + ams) | ENG | Hochverfügbarkeit |
| K15 | 1Password-Vault-Sync-Audit-Routine etablieren | CK + ENG | Secret-Resilience |
| K16 | Pre-Rotate-Migration-Script für ENCRYPTION_KEY | ENG | Key-Lifecycle |

## 8. Versionierung

| Version | Datum | Autor | Änderung |
|---------|-------|-------|----------|
| 1.0 | 2026-05-06 | Claude (Lauf 20) | Erst-Erstellung gegen DSGVO Art. 32 + MDR Annex II §6 |
| ... | ... | ENG | Updates nach Phase-2-Multi-Region |

---

**Hinweis zur Class-I-Position:** Dieses Konzept gilt für DiggAi-Capture in der aktuellen monolithischen Form. Nach Phase-3/4-Bucket-Trennung (Capture vs Suite) wird das Konzept für **beide Anwendungen separat** geführt; die kritischen Compliance-Daten (Audit-Logs, Konsent-Belege) bleiben gemeinsam in `packages/common/`.
