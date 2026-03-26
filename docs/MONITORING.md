# DiggAI Monitoring & Alerting Guide

## Überblick

Unser Monitoring-Stack besteht aus:
- **Prometheus** - Metrik-Sammlung und -Speicherung
- **Grafana** - Visualisierung und Dashboards
- **Alertmanager** - Alert-Routing und Benachrichtigungen
- **Sentry** - Error Tracking und Performance Monitoring

## Schnellstart

```bash
# Monitoring Stack starten
npm run monitoring:up

# Zugriff:
# - Grafana: http://localhost:3000 (admin/admin)
# - Prometheus: http://localhost:9090
# - Status Page: http://localhost:5173/status.html
```

## Komponenten

### 1. Prometheus Metrics

Verfügbare Metriken unter `/api/system/metrics`:

| Metrik | Beschreibung |
|--------|--------------|
| `http_requests_total` | Gesamtzahl HTTP Requests |
| `http_request_duration_seconds` | Request Latency (Histogram) |
| `active_sessions_total` | Aktive Benutzer-Sessions |
| `db_connections_active` | Aktive DB Verbindungen |
| `triage_alerts_total` | Triage Alerts nach Level |
| `business_metric` | Business Metriken |

### 2. Health Endpoints

| Endpoint | Zweck |
|----------|-------|
| `GET /api/health` | Detaillierter Health Check |
| `GET /api/system/ready` | Kubernetes Readiness Probe |
| `GET /api/system/live` | Kubernetes Liveness Probe |
| `GET /api/system/metrics` | Prometheus Metrics |

### 3. Sentry Integration

Frontend und Backend Error Tracking:
- Automatische Fehlererfassung
- Performance Tracing (10% Sampling)
- Session Replay (1% Sampling, 100% bei Fehlern)
- PII-Filterung (DSGVO-konform)

### 4. Web Vitals

Frontend Performance Monitoring:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)

## Alert-Level

| Level | Response Time | Kanäle |
|-------|--------------|--------|
| Critical | 15 Minuten | PagerDuty, Email, Slack |
| Warning | 1 Stunde | Email, Slack |
| Info | Nächster Tag | Slack |

## Alert Regeln

### Critical Alerts
- **HighErrorRate** - >1% 5xx Fehler über 5 Minuten
- **DatabaseDown** - PostgreSQL nicht erreichbar
- **RedisDown** - Redis nicht erreichbar

### Warning Alerts
- **HighResponseTime** - p95 Latenz >500ms über 5 Minuten
- **HighMemoryUsage** - Speichernutzung >85%
- **LowDiskSpace** - <20% freier Speicher

### Info Alerts
- **TriageAlertSpike** - >10 Triage Alerts in 1 Stunde

## Dashboards

### Grafana Dashboards

Importiere `monitoring/grafana/dashboards/anamnese-dashboard.json` in Grafana.

Panels:
- System Status
- Request Rate (RPS)
- Error Rate
- Response Time (p50/p95/p99)
- Active Sessions
- Database Connections
- Memory/CPU Usage
- Triage Alerts

## Troubleshooting

### HighErrorRate

1. Prüfe Sentry für aktuelle Fehler
2. Prüfe Logs: `docker logs anamnese-app`
3. Prüfe Datenbank-Verbindung
4. Prüfe Redis-Verbindung

### DatabaseDown

1. Prüfe PostgreSQL Container: `docker ps | grep postgres`
2. Prüfe Logs: `docker logs postgres`
3. Prüfe Disk Space: `df -h`
4. Connection Pool prüfen

### HighResponseTime

1. Prüfe Datenbank-Query Performance
2. Prüfe Redis Cache Hit Rate
3. Prüfe externe API Latenz
4. Prüfe CPU/Memory Nutzung

## Konfiguration

### Umgebungsvariablen

```bash
# Sentry
SENTRY_DSN="https://...@sentry.io/..."
VITE_SENTRY_DSN="https://...@sentry.io/..."
APP_VERSION="3.0.0"

# Grafana
GRAFANA_USER="admin"
GRAFANA_PASSWORD="secure_password"

# Alerting
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
PAGERDUTY_KEY="..."
ALERT_EMAIL="admin@praxis.de"
```

## Sicherheit

- Keine PII in Monitoring-Daten
- Sentry DSN nur in Env-Variablen
- Grafana mit starkem Passwort absichern
- Alertmanager mit TLS konfigurieren
