#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# DiggAI Anamnese Platform — Backup Operations Helper
# ═══════════════════════════════════════════════════════════════════════════════
#
# Dieses Script bietet einen interaktiven Menü für Backup-Operationen.
#
# Verwendung:
#   ./scripts/backup-operations.sh [command]
#
# Commands:
#   status      - Backup-Status anzeigen
#   create      - Manuelles Backup erstellen
#   list        - Backup-Verzeichnis auflisten
#   restore     - Backup wiederherstellen
#   test        - Disaster Recovery Test
#   help        - Diese Hilfe anzeigen
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Konfiguration
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"

# ═══════════════════════════════════════════════════════════════════════════════
# Hilfsfunktionen
# ═══════════════════════════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║        🏥  DiggAI Backup & Disaster Recovery                  ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
}

print_status() {
    local status="$1"
    local message="$2"
    case "$status" in
        ok) echo -e "${GREEN}✓${NC} $message" ;;
        warn) echo -e "${YELLOW}⚠${NC} $message" ;;
        error) echo -e "${RED}✗${NC} $message" ;;
        info) echo -e "${BLUE}ℹ${NC} $message" ;;
    esac
}

check_prerequisites() {
    local missing=()
    
    if [[ ! -f "$APP_DIR/.env" && ! -f "$APP_DIR/.env.production" ]]; then
        missing+=(".env Datei")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("Node.js")
    fi
    
    if ! command -v npx &> /dev/null; then
        missing+=("npx")
    fi
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        print_status "error" "Fehlende Voraussetzungen:"
        for item in "${missing[@]}"; do
            echo "  - $item"
        done
        exit 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# Kommandos
# ═══════════════════════════════════════════════════════════════════════════════

cmd_status() {
    print_header
    print_status "info" "Prüfe Backup-Status..."
    
    cd "$APP_DIR"
    
    # API Status
    if curl -s http://localhost:3001/api/system/backup-status > /tmp/backup-status.json 2>/dev/null; then
        local status=$(cat /tmp/backup-status.json | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
        local message=$(cat /tmp/backup-status.json | grep -o '"message":"[^"]*"' | cut -d'"' -f4)
        
        echo ""
        echo "API Backup Status:"
        if [[ "$status" == "healthy" ]]; then
            print_status "ok" "$message"
        elif [[ "$status" == "warning" ]]; then
            print_status "warn" "$message"
        else
            print_status "error" "$message"
        fi
        
        # Details anzeigen
        cat /tmp/backup-status.json | jq -r '.health.details | to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || true
    else
        print_status "warn" "API nicht erreichbar. Ist der Server gestartet?"
    fi
    
    # Lokale Backups
    echo ""
    echo "Lokale Backups:"
    if [[ -d "$BACKUP_DIR" ]]; then
        local count=$(find "$BACKUP_DIR" -name "anamnese-*.sql.gz.enc" 2>/dev/null | wc -l)
        if [[ $count -gt 0 ]]; then
            print_status "ok" "$count Backup(s) gefunden"
            ls -lah "$BACKUP_DIR"/*.sql.gz.enc 2>/dev/null | tail -5
        else
            print_status "warn" "Keine lokalen Backups gefunden"
        fi
    else
        print_status "warn" "Backup-Verzeichnis existiert nicht: $BACKUP_DIR"
    fi
    
    # S3 Backups (falls konfiguriert)
    if command -v aws &> /dev/null && [[ -n "${BACKUP_BUCKET:-}" ]]; then
        echo ""
        echo "S3 Backups (s3://$BACKUP_BUCKET):"
        if aws s3 ls "s3://${BACKUP_BUCKET}/backups/" --recursive 2>/dev/null | head -5 > /tmp/s3-backups.txt; then
            local s3_count=$(wc -l < /tmp/s3-backups.txt)
            print_status "ok" "$s3_count Backup(s) in S3"
            cat /tmp/s3-backups.txt | tail -5
        else
            print_status "warn" "Konnte S3 nicht abrufen (keine AWS Credentials?)"
        fi
    fi
    
    echo ""
}

cmd_create() {
    print_header
    print_status "info" "Erstelle manuelles Backup..."
    
    cd "$APP_DIR"
    
    local backup_type="${1:-full}"
    
    echo "Backup-Typ: $backup_type"
    echo ""
    
    case "$backup_type" in
        full|incremental|schema_only)
            npx tsx scripts/backup-database.ts "$backup_type"
            ;;
        *)
            print_status "error" "Unbekannter Backup-Typ: $backup_type"
            echo "Verfügbare Typen: full, incremental, schema_only"
            exit 1
            ;;
    esac
    
    echo ""
    print_status "ok" "Backup erfolgreich erstellt!"
    echo ""
}

cmd_list() {
    print_header
    
    echo "Lokale Backups ($BACKUP_DIR):"
    echo "───────────────────────────────────────────────────────────────"
    if [[ -d "$BACKUP_DIR" ]]; then
        ls -lah "$BACKUP_DIR"/*.sql.gz.enc 2>/dev/null || echo "Keine Backups gefunden"
    else
        echo "Verzeichnis existiert nicht"
    fi
    
    echo ""
    echo "S3 Backups:"
    echo "───────────────────────────────────────────────────────────────"
    if command -v aws &> /dev/null && [[ -n "${BACKUP_BUCKET:-}" ]]; then
        aws s3 ls "s3://${BACKUP_BUCKET}/backups/" --recursive --human-readable 2>/dev/null || echo "Keine S3-Verbindung"
    else
        echo "AWS CLI nicht konfiguriert oder BACKUP_BUCKET nicht gesetzt"
    fi
    
    echo ""
}

cmd_restore() {
    print_header
    
    echo "⚠️  WARNUNG: Datenbank-Wiederherstellung"
    echo ""
    echo "Dieser Vorgang wird ALLE bestehenden Daten überschreiben!"
    echo ""
    
    if [[ -z "${1:-}" ]]; then
        echo "Verwendung: $0 restore <backup-pfad>"
        echo ""
        echo "Beispiele:"
        echo "  $0 restore ./backups/anamnese-full-2026-03-23.sql.gz.enc"
        echo "  $0 restore s3://bucket/backups/anamnese-full-2026-03-23.sql.gz.enc"
        echo ""
        
        # Liste verfügbare Backups
        echo "Verfügbare lokale Backups:"
        ls -1 "$BACKUP_DIR"/*.sql.gz.enc 2>/dev/null | tail -5 || echo "  Keine lokalen Backups"
        echo ""
        exit 1
    fi
    
    local backup_path="$1"
    
    echo "Backup: $backup_path"
    echo ""
    
    read -p "Fortfahren? (ja/NEIN): " confirm
    if [[ "$confirm" != "ja" ]]; then
        print_status "info" "Abgebrochen"
        exit 0
    fi
    
    cd "$APP_DIR"
    npx tsx scripts/restore-database.ts "$backup_path"
    
    echo ""
    print_status "ok" "Wiederherstellung abgeschlossen!"
    echo ""
}

cmd_test() {
    print_header
    
    echo "🧪 Disaster Recovery Test"
    echo ""
    print_status "info" "Dieser Test führt einen vollständigen Restore-Test durch"
    echo ""
    
    read -p "Fortfahren? (ja/NEIN): " confirm
    if [[ "$confirm" != "ja" ]]; then
        print_status "info" "Abgebrochen"
        exit 0
    fi
    
    cd "$APP_DIR"
    
    # Finde neuestes Backup
    local latest_backup=$(ls -1t "$BACKUP_DIR"/*.sql.gz.enc 2>/dev/null | head -1)
    
    if [[ -z "$latest_backup" ]]; then
        print_status "error" "Kein Backup gefunden für Test"
        exit 1
    fi
    
    print_status "info" "Teste mit: $(basename "$latest_backup")"
    
    # Starte temporären PostgreSQL Container
    print_status "info" "Starte temporären PostgreSQL Container..."
    docker run -d --name dr-test-postgres -e POSTGRES_PASSWORD=test -p 5433:5432 postgres:16-alpine > /dev/null 2>&1
    
    # Warte auf Start
    sleep 5
    
    # Test-Restore
    local test_db_url="postgresql://postgres:test@localhost:5433/postgres"
    print_status "info" "Führe Test-Restore durch..."
    
    # Erstelle temporäre .env für Test
    export DATABASE_URL="$test_db_url"
    
    if npx tsx scripts/restore-database.ts "$latest_backup" --force --yes; then
        print_status "ok" "Test-Restore erfolgreich!"
        
        # Validierung
        local patient_count=$(docker exec dr-test-postgres psql -U postgres -t -c "SELECT COUNT(*) FROM \"Patient\";" 2>/dev/null | xargs)
        print_status "info" "Validierung: $patient_count Patienten in Backup"
    else
        print_status "error" "Test-Restore fehlgeschlagen!"
    fi
    
    # Cleanup
    print_status "info" "Bereinige Test-Umgebung..."
    docker stop dr-test-postgres > /dev/null 2>&1
    docker rm dr-test-postgres > /dev/null 2>&1
    
    echo ""
    print_status "ok" "DR-Test abgeschlossen!"
    echo ""
}

cmd_help() {
    print_header
    
    cat << 'EOF'
VERWENDUNG:
    ./scripts/backup-operations.sh [COMMAND] [ARGS]

COMMANDS:
    status              Backup-Status anzeigen
    create [TYPE]       Manuelles Backup erstellen (full|incremental|schema_only)
    list                Alle Backups auflisten
    restore <PATH>      Backup wiederherstellen
    test                Disaster Recovery Test durchführen
    help                Diese Hilfe anzeigen

BEISPIELE:
    # Status prüfen
    ./scripts/backup-operations.sh status

    # Voll-Backup erstellen
    ./scripts/backup-operations.sh create full

    # Aus S3 wiederherstellen
    ./scripts/backup-operations.sh restore s3://bucket/backups/file.sql.gz.enc

    # DR-Test
    ./scripts/backup-operations.sh test

UMGEBUNGSVARIABLEN:
    APP_DIR         Anwendungsverzeichnis (default: auto-detected)
    BACKUP_DIR      Lokales Backup-Verzeichnis (default: ./backups)
    BACKUP_BUCKET   S3 Bucket Name
    AWS_*           AWS Credentials für S3

EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# Hauptprogramm
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    check_prerequisites
    
    local command="${1:-status}"
    shift || true
    
    case "$command" in
        status)
            cmd_status
            ;;
        create)
            cmd_create "$@"
            ;;
        list)
            cmd_list
            ;;
        restore)
            cmd_restore "$@"
            ;;
        test)
            cmd_test
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            print_status "error" "Unbekannter Befehl: $command"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
