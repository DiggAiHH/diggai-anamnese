# DiggAI Anamnese - Monitoring & Observability

> Vollständiger Observability-Stack für die DiggAI Anamnese Platform

## Architektur

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Prometheus    │────▶│  Alertmanager   │────▶│  Slack/Email/   │
│   (Metriken)    │     │   (Alerts)      │     │    PagerDuty    │
└────────┬────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│     Grafana     │◀────│  DiggAI Backend │
│  (Dashboards)   │     │  (/api/system/  │
│                 │     │    /metrics)    │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   Status Page   │
│ (public/status  │
│    .html)       │
└─────────────────┘
```

## Komponenten

### 1. Sentry (Error Tracking)

**Frontend**: `src/lib/sentry.ts`
- Automatische Fehlererfassung
- Performance Tracing (10% Sample Rate)
- Session Replay (1% normal, 100% bei Fehlern)
- DSGVO-konform: Text/Inputs maskiert

**Backend**: `server/lib/sentry.ts`
- Express Integration
- HTTP Tracing
- PII-Filterung (Authorization, Cookie Header entfernt)
- Health Check Noise Filter

**Konfiguration** (`.env`):
```bash
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
APP_VERSION=3.0.0
```

### 2. Prometheus Metrics

**Middleware**: `server/middleware/metrics.ts`

Verfügbare Metriken:
- `http_request_duration_seconds` - HTTP Latenz (Histogram)
- `http_requests_total` - Request Count (Counter)
- `active_sessions_total` - Aktive Sessions (Gauge)
- `db_connections_active` - DB Connections (Gauge)
- `triage_alerts_total` - Triage Alerts (Counter)
- `business_metric` - Business Metriken (Gauge)
- `api_errors_total` - API Fehler (Counter)

**Endpoint**: `GET /api/system/metrics`

### 3. Health Checks

**Endpoint**: `GET /api/health`

Response:
```json
{
  "status": "ok|degraded|error",
  "version": "3.0.0",
  "timestamp": "2026-01-01T00:00:00Z",
  "checks": {
    "database": { "status": "ok", "responseTime": 15 },
    "redis": { "status": "ok", "responseTime": 5 },
    "disk": { "status": "ok", "freePercent": 75.5 },
    "memory": { "status": "ok", "usedPercent": 45.2 }
  }
}
```

**Kubernetes Probes**:
- `/api/system/ready` - Readiness Probe
- `/api/system/live` - Liveness Probe

### 4. Grafana Dashboard

**Location**: `monitoring/grafana/dashboards/anamnese-dashboard.json`

Panels:
- System Status
- Request Rate (RPS)
- Error Rate
- Response Time (p50/p95/p99)
- Active Sessions
- Database Connections
- Memory Usage
- CPU Usage
- Triage Alerts
- Completed Anamnesen

### 5. Alerting Rules

**Location**: `monitoring/prometheus/alerts.yml`

| Alert | Severity | Bedingung |
|-------|----------|-----------|
| HighErrorRate | critical | >1% 5xx errors |
| DatabaseDown | critical | PostgreSQL down |
| RedisDown | critical | Redis down |
| HighResponseTime | warning | p95 > 500ms |
| HighMemoryUsage | warning | >85% Memory |
| LowDiskSpace | warning | <20% free |
| TriageAlertSpike | info | >10 Triage Alerts/h |

### 6. Status Page

**URL**: `https://diggai-drklaproth.netlify.app/status.html`

Features:
- Echtzeit-Status aller Komponenten
- Automatisches Refresh (30s)
- Responsives Design
- Offline-Fallback

## Quick Start

### Monitoring Stack starten

```bash
# Docker Netzwerk erstellen (falls nicht vorhanden)
docker network create monitoring

# Monitoring Stack starten
docker-compose -f docker-compose.monitoring.yml up -d

# Services prüfen
open http://localhost:9090  # Prometheus
open http://localhost:3000  # Grafana (admin/admin)
open http://localhost:9093  # Alertmanager
```

### Manuelle Metriken prüfen

```bash
# Prometheus Metriken
curl http://localhost:3001/api/system/metrics

# Health Check
curl http://localhost:3001/api/health

# Kubernetes Probes
curl http://localhost:3001/api/system/ready
curl http://localhost:3001/api/system/live
```

## Alertmanager Konfiguration

**Location**: `monitoring/alertmanager/alertmanager.yml`

Benötigte Umgebungsvariablen:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
PAGERDUTY_KEY=your-pagerduty-key
```

Routing:
- **Critical** → PagerDuty + Slack + Email
- **Warning** → Slack + Email
- **Info** → Email

## Prometheus Konfiguration

**Location**: `monitoring/prometheus/prometheus.yml`

Scrape Targets:
- Prometheus (localhost:9090)
- Anamnese Backend (app:3001)
- PostgreSQL (postgres-exporter:9187)
- Redis (redis-exporter:9121)
- Node Exporter (9100)

## Business Metrics

Metriken für Business-KPIs:

```typescript
import { businessMetricsGauge } from './middleware/metrics';

// Anamnese completed
businessMetricsGauge.set({ metric_name: 'completedAnamnesen' }, count);

// Active patients
businessMetricsGauge.set({ metric_name: 'activePatients' }, count);

// Revenue
businessMetricsGauge.set({ metric_name: 'dailyRevenue' }, amount);
```

## Troubleshooting

### Prometheus erreichbar aber keine Metriken

1. Prüfen: `curl http://localhost:3001/api/system/metrics`
2. Container-Netzwerk prüfen: `docker network inspect monitoring`
3. Prometheus Logs: `docker logs prometheus`

### Alerts werden nicht gesendet

1. Alertmanager Logs: `docker logs alertmanager`
2. Konfiguration testen: `amtool check-config alertmanager.yml`
3. Alerts manuell feuern: `amtool alert add alertname=Test`

### Sentry Events nicht sichtbar

1. DSN prüfen
2. Environment Filter in Sentry UI checken
3. beforeSend Hook prüfen (Events könnten gefiltert werden)

## Security Notes

- Sentry filtert automatisch PII (Authorization, Cookie Header)
- Session Replay maskiert Texte und Inputs (DSGVO)
- Health Check endpoint gibt keine sensitiven Daten preis
- Metrics endpoint ist öffentlich (keine Auth), aber keine PII

## Weiterentwicklung

### Neue Metrik hinzufügen

```typescript
import { Counter, Histogram, Gauge } from 'prom-client';

export const myMetric = new Counter({
  name: 'my_metric_total',
  help: 'Description',
  labelNames: ['label1'],
  registers: [register],
});
```

### Neue Alert Rule hinzufügen

```yaml
- alert: MyNewAlert
  expr: my_metric_total > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "My metric is high"
```

## Referenzen

- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [Sentry Docs](https://docs.sentry.io/)
- [Alertmanager Docs](https://prometheus.io/docs/alerting/latest/alertmanager/)
