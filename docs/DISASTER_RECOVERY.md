# Disaster Recovery Plan — DiggAI Anamnese Platform

> **Version:** 3.0.0  
> **Letzte Aktualisierung:** März 2026  
> **Verantwortlich:** DevOps Team / Dr. Klapproth  
> **Review-Zyklus:** Quartalsweise

---

## 1. Übersicht

### 1.1 Recovery Objectives

| Metrik | Zielwert | Beschreibung |
|--------|----------|--------------|
| **RTO** (Recovery Time Objective) | 4 Stunden | Maximale Zeit bis zur Wiederherstellung des Betriebs |
| **RPO** (Recovery Point Objective) | 1 Stunde | Maximal akzeptabler Datenverlust |
| **RLO** (Recovery Level Objective) | Vollständig | Alle Patientendaten, Konfigurationen, Logs |

### 1.2 Kritikalitätsstufen

| Stufe | System | Auswirkung |
|-------|--------|------------|
| **Kritisch** | PostgreSQL Datenbank | Kompletter Ausfall der Patientenaufnahme |
| **Hoch** | Express Backend | Keine API-Zugriffe möglich |
| **Mittel** | Redis Cache | Performance-Degradation |
| **Niedrig** | Frontend (Netlify) | Fallback auf CDN möglich |

---

## 2. Backup-Strategie

### 2.1 Backup-Typen

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP-HIERARCHIE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TÄGLICH (03:00 Uhr)    Voll-Backup                              │
│  ├── PostgreSQL Dump (pg_dump)                                   │
│  ├── AES-256-GCM Verschlüsselung                                 │
│  ├── S3 Upload (Standard-IA)                                     │
│  └── Lokale Kopie (24h Retention)                                │
│                                                                  │
│  STÜNDLICH              WAL Archiving                            │
│  ├── PostgreSQL Write-Ahead Logs                                 │
│  ├── Kontinuierliche Archivierung                                │
│  └── Point-in-Time Recovery (PITR)                               │
│                                                                  │
│  ON-DEMAND              Pre-Update Backup                        │
│  └── Vor jedem Deployment automatisch                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Backup-Speicherorte

| Speicherort | Retention | Verschlüsselung |
|-------------|-----------|-----------------|
| AWS S3 (eu-central-1) | 90 Tage | AES-256 (Server-Side) + AES-256-GCM (Client-Side) |
| Lokal (VPS) | 7 Tage | AES-256-GCM |
| S3 Glacier (wöchentlich) | 1 Jahr | AES-256 |

### 2.3 Backup-Monitoring

- **Health Check:** Täglich um 09:00 Uhr
- **Alerts:** Email bei fehlendem Backup > 26h
- **Dashboard:** `/api/system/backup-status`

---

## 3. Recovery-Szenarien

### 3.1 Szenario A: Datenbank-Korruption

**Symptome:**
- Datenbank-Fehler in Logs
- Inkonsistente Daten
- Prisma-Query-Fehler

**Recovery-Schritte:**

```bash
# 1. Anwendung stoppen
docker-compose -f docker-compose.prod.yml stop backend

# 2. Datenbank-Status prüfen
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# 3. Backup auflisten
aws s3 ls s3://$BACKUP_BUCKET/backups/ --recursive | sort

# 4. Backup herunterladen und wiederherstellen
npx tsx scripts/restore-database.ts s3://$BACKUP_BUCKET/backups/anamnese-full-YYYY-MM-DD-HH-MM-SS.sql.gz.enc

# 5. Anwendung starten
docker-compose -f docker-compose.prod.yml start backend

# 6. Health Check durchführen
curl https://api.diggai.de/api/system/health
```

**Geschätzte Zeit:** 30-60 Minuten

---

### 3.2 Szenario B: Vollständiger Server-Verlust

**Auslöser:**
- VPS-Ausfall
- Cloud-Provider-Ausfall
- Katastrophaler Hardware-Fehler

**Recovery-Schritte:**

```bash
# ═══════════════════════════════════════════════════════════════
# PHASE 1: Infrastruktur (RTO: 1 Stunde)
# ═══════════════════════════════════════════════════════════════

# 1. Neue VPS provisionieren
# Hetzner Cloud / DigitalOcean / AWS EC2
# Empfohlene Specs: 4 vCPU, 8GB RAM, 100GB SSD

# 2. Docker & Docker Compose installieren
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Repository klonen
git clone https://github.com/diggai/anamnese-app.git /opt/anamnese-app
cd /opt/anamnese-app

# 4. Umgebungsvariablen wiederherstellen
# Aus 1Password / Vault / verschlüsseltem Backup:
cat > .env.production << 'EOF'
DATABASE_URL=postgresql://...
JWT_SECRET=...
ENCRYPTION_KEY=...
BACKUP_ENCRYPTION_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
BACKUP_BUCKET=...
EOF

# ═══════════════════════════════════════════════════════════════
# PHASE 2: Datenbank-Recovery (RTO: 2 Stunden)
# ═══════════════════════════════════════════════════════════════

# 5. PostgreSQL Container starten (noch ohne Backend)
docker-compose -f docker-compose.prod.yml up -d postgres

# 6. Letztes Backup identifizieren
LATEST_BACKUP=$(aws s3 ls s3://$BACKUP_BUCKET/backups/ --recursive | \
    grep "anamnese-full" | sort | tail -n 1 | awk '{print $4}')

echo "Wiederherstellung aus: $LATEST_BACKUP"

# 7. Backup herunterladen und wiederherstellen
npx tsx scripts/restore-database.ts s3://$BACKUP_BUCKET/$LATEST_BACKUP --force

# 8. WAL-Logs anwenden (Point-in-Time Recovery)
# Falls WAL archiving konfiguriert:
# pg_waldump /var/lib/postgresql/data/pg_wal/... | psql ...

# ═══════════════════════════════════════════════════════════════
# PHASE 3: Anwendungs-Start (RTO: 4 Stunden)
# ═══════════════════════════════════════════════════════════════

# 9. Alle Services starten
docker-compose -f docker-compose.prod.yml up -d

# 10. Migrationen prüfen
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate status

# 11. Health Check
watch -n 5 'curl -s https://api.diggai.de/api/system/health | jq'

# 12. DNS-Records aktualisieren (falls neue IP)
# Cloudflare / Hetzner DNS
```

**Geschätzte Zeit:** 3-4 Stunden

---

### 3.3 Szenario C: Inkrementelle Datenverluste

**Auslöser:**
- Fehlerhafte Löschoperation
- Datenkorruption durch Bug

**Recovery-Schritte:**

```bash
# 1. Backup vor dem Vorfall identifizieren
# Prüfe Zeitstempel in S3 oder Datenbank

# 2. Spezifische Tabelle wiederherstellen
# Erstelle temporäre Datenbank aus Backup
docker-compose -f docker-compose.prod.yml exec postgres createdb temp_restore

# Extrahiere und restore nur spezifische Tabelle
pg_restore --table=Patient --dbname=temp_restore < backup.sql

# 3. Daten migrieren
# Nutze Prisma oder direkte SQL-Queries
```

---

### 3.4 Szenario D: Ransomware / Sicherheitsvorfall

**Sofortmaßnahmen:**

```bash
# 1. ISOLIEREN
docker-compose -f docker-compose.prod.yml stop
# Netzwerk-Verbindung trennen

# 2. FORENSIK
# Logs sichern
docker-compose logs > /tmp/incident-logs-$(date +%Y%m%d).txt
aws s3 cp /tmp/incident-logs s3://$BACKUP_BUCKET/incidents/

# 3. NEU AUFBAUEN (Clean Slate)
# Niemals compromised System wiederherstellen!
# Siehe Szenario B: Vollständiger Server-Verlust

# 4. SICHERHEITSREVIEW
# Passwörter rotieren
# API-Keys neu generieren
# JWT-Secret ändern
# Encryption-Key (warnung: bestehende Daten unlesbar!)
```

---

## 4. Recovery-Kommandos

### 4.1 Backup-Verwaltung

```bash
# ═══════════════════════════════════════════════════════════════
# Backups auflisten
# ═══════════════════════════════════════════════════════════════

# Lokale Backups
ls -lah /opt/anamnese-app/backups/

# S3 Backups
aws s3 ls s3://bucket/backups/ --recursive --human-readable

# Datenbank-Backups (via API)
curl https://api.diggai.de/api/system/backups | jq

# ═══════════════════════════════════════════════════════════════
# Manuelles Backup erstellen
# ═══════════════════════════════════════════════════════════════

# Voll-Backup
npx tsx scripts/backup-database.ts full

# Schema-Only
npx tsx scripts/backup-database.ts schema_only

# Mit Cron-Logging
./scripts/cron-backup.sh full

# ═══════════════════════════════════════════════════════════════
# Backup herunterladen
# ═══════════════════════════════════════════════════════════════

# Aus S3
aws s3 cp s3://bucket/backups/file.sql.gz.enc ./

# Entschlüsseln
openssl enc -d -aes-256-cbc -in file.sql.gz.enc -out file.sql.gz -k $BACKUP_KEY

# Entpacken
gunzip file.sql.gz
```

### 4.2 Restore-Operationen

```bash
# ═══════════════════════════════════════════════════════════════
# Automatisches Restore
# ═══════════════════════════════════════════════════════════════

# Aus S3 (interaktiv)
npx tsx scripts/restore-database.ts s3://bucket/backups/file.sql.gz.enc

# Mit Bestätigung überspringen (nur im Notfall!)
npx tsx scripts/restore-database.ts s3://bucket/backups/file.sql.gz.enc --force --yes

# Lokal
npx tsx scripts/restore-database.ts /path/to/backup.sql.gz.enc

# ═══════════════════════════════════════════════════════════════
# Manuelles Restore (Fallback)
# ═══════════════════════════════════════════════════════════════

# 1. Datenbank leeren
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. Restore durchführen
psql $DATABASE_URL < backup.sql

# 3. Prisma-Client regenerieren
npx prisma generate
```

### 4.3 Point-in-Time Recovery (PITR)

```bash
# Voraussetzung: WAL archiving aktiviert in postgresql.conf
# archive_mode = on
# archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

# 1. Basis-Backup restore
pg_basebackup -D /var/lib/postgresql/data -X fetch

# 2. WAL-Logs anwenden
pg_waldump /var/lib/postgresql/wal_archive/ | psql ...

# 3. Bis zu bestimmtem Zeitpunkt
# recovery_target_time = '2026-03-23 14:30:00'
```

---

## 5. Testing & Validation

### 5.1 Restore-Testing (monatlich)

```bash
#!/bin/bash
# restore-test.sh - Monatlicher DR-Test

set -e

echo "🧪 Starte DR-Test..."

# 1. Temporäre Umgebung aufbauen
docker run -d --name dr-test-postgres -e POSTGRES_PASSWORD=test postgres:16

# 2. Backup herunterladen
aws s3 cp s3://$BACKUP_BUCKET/backups/$(date +%Y-%m)*.sql.gz.enc /tmp/test-backup.enc

# 3. Restore durchführen
npx tsx scripts/restore-database.ts /tmp/test-backup.enc --force --yes

# 4. Validierung
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM Patient;"
psql $TEST_DATABASE_URL -c "SELECT COUNT(*) FROM PatientSession;"

# 5. Cleanup
docker stop dr-test-postgres
docker rm dr-test-postgres
rm /tmp/test-backup*

echo "✅ DR-Test erfolgreich!"
```

### 5.2 Backup-Validierung

```bash
# Checksum-Prüfung
sha256sum backup.sql.gz.enc
# Vergleiche mit Wert in der Datenbank

# Testweise entschlüsseln
openssl enc -d -aes-256-cbc -in backup.sql.gz.enc -out /dev/null -k $BACKUP_KEY

# Datenbank-Konsistenz prüfen
pg_dump --schema-only | head -100
```

---

## 6. Rollback-Verfahren

### 6.1 Rollback nach Restore

Falls ein Restore fehlerhaft war:

```bash
# 1. Vor dem Restore wurde automatisch ein Pre-Restore-Backup erstellt
ls -la /tmp/restore-*/pre-restore-backup.sql

# 2. Dieses kann zurückgespielt werden
psql $DATABASE_URL < /tmp/restore-*/pre-restore-backup.sql

# 3. Oder: Nutze ein anderes Backup
npx tsx scripts/restore-database.ts s3://bucket/backups/earlier-backup.sql.gz.enc
```

---

## 7. Kontakt & Eskalation

### 7.1 Eskalationskette

| Stufe | Kontakt | Auslöser |
|-------|---------|----------|
| 1 | DevOps On-Call | Backup-Warnungen |
| 2 | Tech Lead | RTO > 50% |
| 3 | Dr. Klapproth | Datenverlust-Verdacht |
| 4 | Externer Dienstleister | Kompletter Ausfall > 2h |

### 7.2 Notfall-Kontakte

```
DevOps Hotline:     +49-XXX-XXXXXXX
AWS Support:        https://support.console.aws.amazon.com
Hetzner Support:    support@hetzner.com
Cloudflare Status:  https://www.cloudflarestatus.com
```

---

## 8. Anhänge

### Anhang A: System-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Browser    │  │  Mobile PWA  │  │  NFC Tablet  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │ HTTPS
┌───────────────────────────▼───────────────────────────────┐
│                    NETLIFY CDN                             │
│              (Frontend Hosting)                            │
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    HETZNER VPS                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │                 Docker Compose                    │     │
│  │  ┌──────────────┐  ┌──────────────┐              │     │
│  │  │   Nginx      │  │   Backend    │              │     │
│  │  │   (Proxy)    │──│   (Express)  │              │     │
│  │  └──────────────┘  └──────┬───────┘              │     │
│  │                           │                      │     │
│  │  ┌──────────────┐  ┌──────▼───────┐              │     │
│  │  │   Redis      │  │  PostgreSQL  │              │     │
│  │  │   (Cache)    │  │   (Primary)  │              │     │
│  │  └──────────────┘  └──────────────┘              │     │
│  └──────────────────────────────────────────────────┘     │
│                           │                                │
│                    ┌──────▼───────┐                        │
│                    │  S3 Backups  │                        │
│                    │  (eu-cen-1)  │                        │
│                    └──────────────┘                        │
└────────────────────────────────────────────────────────────┘
```

### Anhang B: Checklisten

#### Pre-Deployment Backup
- [ ] `scripts/cron-backup.sh full` ausführen
- [ ] Backup-Status prüfen: `curl /api/system/backup-status`
- [ ] Backup in S3 verifizieren

#### Post-Restore Verification
- [ ] Health Check: `curl /api/health`
- [ ] Patienten-Anzahl prüfen
- [ ] Letzte Anmeldung testen
- [ ] Warteliste anzeigen
- [ ] Terminbuchung testen

---

*Dieses Dokument ist vertraulich und nur für autorisiertes Personal bestimmt.*
