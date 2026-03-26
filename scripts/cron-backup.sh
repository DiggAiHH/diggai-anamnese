#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DiggAI Anamnese Platform — Cron Backup Script
# ═══════════════════════════════════════════════════════════════════════════════
# 
# Dieses Script wird per cron ausgeführt und koordiniert Datenbank-Backups.
# 
# Cron-Konfiguration (crontab -e):
#   # Tägliches Voll-Backup um 03:00 Uhr
#   0 3 * * * /opt/anamnese-app/scripts/cron-backup.sh full
#   
#   # Stündliches inkrementelles Backup (WAL archiving)
#   0 * * * * /opt/anamnese-app/scripts/cron-backup.sh inc
#
# Verwendung:
#   ./cron-backup.sh [full|inc|schema_only]
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Konfiguration
BACKUP_TYPE="${1:-full}"
APP_DIR="${APP_DIR:-/opt/anamnese-app}"
LOG_DIR="${LOG_DIR:-/var/log/anamnese}"
LOG_FILE="${LOG_DIR}/backup.log"
LOCK_FILE="/tmp/anamnese-backup.lock"
MAX_LOG_SIZE=$((10 * 1024 * 1024)) # 10MB
RETENTION_DAYS=30

# Farben für Terminal-Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════════
# Hilfsfunktionen
# ═══════════════════════════════════════════════════════════════════════════════

log() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local log_line="[${timestamp}] [${level}] ${message}"
    
    # Zu Datei und stdout loggen
    echo "$log_line" | tee -a "$LOG_FILE"
    
    # Farbige Ausgabe im Terminal
    if [ -t 1 ]; then
        case "$level" in
            ERROR) echo -e "${RED}${log_line}${NC}" ;;
            WARN)  echo -e "${YELLOW}${log_line}${NC}" ;;
            INFO)  echo -e "${GREEN}${log_line}${NC}" ;;
        esac
    fi
}

rotate_logs() {
    if [[ -f "$LOG_FILE" && $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
        log "INFO" "Log-Datei rotiert"
    fi
}

cleanup_old_backups() {
    log "INFO" "Bereinige alte Backups (>${RETENTION_DAYS} Tage)..."
    
    # Lokale Backups
    if [[ -d "$APP_DIR/backups" ]]; then
        find "$APP_DIR/backups" -name "anamnese-*.sql.gz.enc" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
        log "INFO" "Lokale Backup-Bereinigung abgeschlossen"
    fi
    
    # S3 Backups (falls aws-cli verfügbar)
    if command -v aws &> /dev/null && [[ -n "${BACKUP_BUCKET:-}" ]]; then
        aws s3 ls "s3://${BACKUP_BUCKET}/backups/" --recursive | \
            awk -v date=$(date -d "${RETENTION_DAYS} days ago" +%Y-%m-%d) '$1 < date' | \
            while read -r line; do
                key=$(echo "$line" | awk '{print $4}')
                if [[ -n "$key" ]]; then
                    aws s3 rm "s3://${BACKUP_BUCKET}/${key}" 2>/dev/null || true
                fi
            done
        log "INFO" "S3 Backup-Bereinigung abgeschlossen"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Hauptlogik
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    # Log-Verzeichnis erstellen
    mkdir -p "$LOG_DIR"
    rotate_logs
    
    log "INFO" "═══════════════════════════════════════════════════════════════"
    log "INFO" "Backup-Job gestartet (Typ: $BACKUP_TYPE)"
    log "INFO" "═══════════════════════════════════════════════════════════════"
    
    # Lock-File prüfen
    if [[ -f "$LOCK_FILE" ]]; then
        local pid
        pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "0")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "ERROR" "Backup läuft bereits (PID: $pid)"
            exit 1
        else
            log "WARN" "Verwaistes Lock-File gefunden, entferne..."
            rm -f "$LOCK_FILE"
        fi
    fi
    
    # Lock setzen
    echo $$ > "$LOCK_FILE"
    
    # Cleanup bei Exit
    trap 'rm -f "$LOCK_FILE"; log "INFO" "Backup-Job beendet"' EXIT
    
    # In App-Verzeichnis wechseln
    if [[ ! -d "$APP_DIR" ]]; then
        log "ERROR" "App-Verzeichnis nicht gefunden: $APP_DIR"
        exit 1
    fi
    
    cd "$APP_DIR"
    log "INFO" "Arbeitsverzeichnis: $(pwd)"
    
    # Umgebungsvariablen laden
    if [[ -f ".env" ]]; then
        # shellcheck source=/dev/null
        set -a
        source .env
        set +a
        log "INFO" "Umgebungsvariablen geladen"
    fi
    
    if [[ -f ".env.production" ]]; then
        # shellcheck source=/dev/null
        set -a
        source .env.production
        set +a
        log "INFO" "Produktions-Umgebung geladen"
    fi
    
    # Node.js verfügbar?
    if ! command -v node &> /dev/null; then
        log "ERROR" "Node.js nicht gefunden"
        exit 1
    fi
    
    # Backup durchführen
    local start_time
    start_time=$(date +%s)
    
    case "$BACKUP_TYPE" in
        full)
            log "INFO" "Starte vollständiges Backup..."
            npx tsx scripts/backup-database.ts full
            ;;
            
        inc|incremental)
            log "INFO" "Inkrementelles Backup (WAL archiving)..."
            # WAL archiving wird von PostgreSQL selbst verwaltet
            # Dies ist ein Hook für zusätzliche Logik
            if [[ -d "${PGDATA:-}/pg_wal/archive_status" ]]; then
                log "INFO" "WAL archiving Status: OK"
            else
                log "WARN" "WAL archiving nicht konfiguriert"
            fi
            ;;
            
        schema_only)
            log "INFO" "Starte Schema-Only Backup..."
            npx tsx scripts/backup-database.ts schema_only
            ;;
            
        *)
            log "ERROR" "Unbekannter Backup-Typ: $BACKUP_TYPE"
            echo "Verwendung: $0 [full|inc|schema_only]"
            exit 1
            ;;
    esac
    
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "INFO" "Backup abgeschlossen in ${duration}s"
    
    # Alte Backups bereinigen
    cleanup_old_backups
    
    # Health Check
    log "INFO" "Führe Health Check durch..."
    if command -v curl &> /dev/null && [[ -n "${HEALTH_CHECK_URL:-}" ]]; then
        curl -sf "${HEALTH_CHECK_URL}/backup" > /dev/null 2>&1 && \
            log "INFO" "Health Check erfolgreich" || \
            log "WARN" "Health Check fehlgeschlagen"
    fi
    
    log "INFO" "═══════════════════════════════════════════════════════════════"
    log "INFO" "Backup-Job erfolgreich abgeschlossen ✓"
    log "INFO" "═══════════════════════════════════════════════════════════════"
    
    exit 0
}

# Script ausführen
main "$@"
