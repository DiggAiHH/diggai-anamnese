# Backup & Disaster Recovery System

> **Version:** 3.0.0  
> **Status:** Produktiv

## Schnellstart

```bash
# Backup-Status prüfen
npm run backup:status

# Manuelles Backup erstellen
npm run backup:create full

# Backup wiederherstellen
npm run backup:restore ./backups/anamnese-full-2026-03-23.sql.gz.enc

# Interaktives Backup-Menü
npm run backup:ops
```

## Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKUP-ARCHITEKTUR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Scheduler  │────▶│   Backup     │────▶│    S3        │    │
│  │   (03:00)    │     │   Script     │     │  (eu-cen-1)  │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                              │        │
│         │              ┌──────────────┐                │        │
│         └─────────────▶│   Monitor    │◀───────────────┘        │
│                        │   (09:00)    │                         │
│                        └──────────────┘                         │
│                               │                                  │
│                               ▼                                  │
│                        ┌──────────────┐                         │
│                        │   Alerts     │                         │
│                        │  (Email)     │                         │
│                        └──────────────┘                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Komponenten

| Komponente | Datei | Zweck |
|------------|-------|-------|
| **Backup Script** | `scripts/backup-database.ts` | PostgreSQL Dump, Verschlüsselung, S3 Upload |
| **Restore Script** | `scripts/restore-database.ts` | Wiederherstellung aus S3 oder lokal |
| **Cron Script** | `scripts/cron-backup.sh` | Cron-Wrapper mit Logging |
| **Monitor** | `server/jobs/backupMonitor.ts` | Health-Checks und Alerts |
| **Scheduler** | `server/jobs/backupScheduler.ts` | Automatische Backup-Planung |
| **Operations** | `scripts/backup-operations.sh` | Interaktives CLI |

## Umgebungsvariablen

```bash
# Required
DATABASE_URL="postgresql://..."
BACKUP_ENCRYPTION_KEY="32+ Zeichen"

# Für S3-Backups
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
BACKUP_BUCKET="diggai-backups"
AWS_REGION="eu-central-1"

# Optional
BACKUP_DIR="./backups"
BACKUP_CRON="0 3 * * *"
BACKUP_MONITOR_CRON="0 9 * * *"
BACKUP_KEEP_LOCAL="false"
```

## Cron-Konfiguration

```bash
# /etc/cron.d/anamnese-backup
# Tägliches Backup um 03:00 Uhr
0 3 * * * root /opt/anamnese-app/scripts/cron-backup.sh full

# Stündliche WAL-Archivierung
0 * * * * root /opt/anamnese-app/scripts/cron-backup.sh inc

# Monitoring täglich um 09:00 Uhr
0 9 * * * root curl -s http://localhost:3001/api/system/backup-status
```

## API-Endpunkte

| Endpoint | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/system/backups` | GET | Backup-Verzeichnis auflisten |
| `/api/system/backups` | POST | Manuelles Backup erstellen |
| `/api/system/backups/:id/restore` | POST | Backup wiederherstellen |
| `/api/system/backup-status` | GET | Backup-Health-Check |
| `/api/system/backups/schedule` | GET | Backup-Zeitplan anzeigen |

## Recovery-Verfahren

Siehe ausführliche Dokumentation: [`DISASTER_RECOVERY.md`](./DISASTER_RECOVERY.md)

### Schnell-Recovery

```bash
# 1. Anwendung stoppen
docker-compose stop backend

# 2. Backup wiederherstellen
npx tsx scripts/restore-database.ts s3://bucket/backups/file.sql.gz.enc

# 3. Anwendung starten
docker-compose start backend
```

## Tests

```bash
# DR-Test durchführen
npm run backup:ops test

# Oder direkt
./scripts/backup-operations.sh test
```

## Monitoring

Das Backup-System überwacht:

- **Backup-Alter:** Warnung wenn > 24h
- **Backup-Größe:** Anomalie-Detection
- **S3-Konnektivität:** Erreichbarkeit prüfen
- **Fehlgeschlagene Backups:** Alert nach 3 Fehlversuchen

## RTO / RPO

| Metrik | Ziel |
|--------|------|
| RTO | 4 Stunden |
| RPO | 1 Stunde (mit WAL) |

## Support

- **Dokumentation:** `docs/DISASTER_RECOVERY.md`
- **Health Check:** `npm run backup:status`
- **DR-Test:** `npm run backup:ops test`
