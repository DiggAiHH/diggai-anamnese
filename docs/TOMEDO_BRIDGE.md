# DiggAi-Tomedo Bridge Dokumentation

> Multi-Agent PVS Integration für Tomedo (Zollsoft)

## Übersicht

Die DiggAi-Tomedo Bridge ist eine leistungsfähige Integration zwischen der DiggAi Anamnese-Plattform und dem Tomedo Praxisverwaltungssystem (Zollsoft). Sie nutzt ein **Multi-Agent System** mit 9 spezialisierten Subagenten für maximale Zuverlässigkeit, Transparenz und Fehlertoleranz.

## Architektur

### 9 Subagenten in 4 Teams

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
└───────────────────────┬─────────────────────────────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    ▼                   ▼                   ▼
┌────────┐        ┌────────┐        ┌────────┐
│ Alpha  │        │ Bravo  │        │ Charlie│
│ (Trust)│        │(Tomedo)│        │(Simple)│
└─┬──┬──┬┘        └─┬──┬──┬┘        └─┬──┬──┬┘
  │  │  │            │  │  │            │  │  │
  ▼  ▼  ▼            ▼  ▼  ▼            ▼  ▼  ▼
┌──┐┌──┐┌──┐      ┌──┐┌──┐┌──┐      ┌──┐┌──┐┌──┐
│A1││A2││A3│      │B1││B2││B3│      │C1││C2││C3│
└──┘└──┘└──┘      └──┘└──┘└──┘      └──┘└──┘└──┘
Explain Ethics Human   API  EPA  Doc   Load Feed Error
                       Conn Map   Gen   Red. Back Corr

                        │
                        ▼
                   ┌────────┐
                   │  Delta │
                   │(Output)│
                   └─┬──┬──┬┘
                     │  │  │
                     ▼  ▼  ▼
                   ┌──┐┌──┐┌──┐
                   │D1││D2││D3│
                   └──┘└──┘└──┘
                  Markdown Cross Audit
                  Protocol Valid. Logger
```

### Team Alpha - Trust & Transparency

| Agent | Name | Timeout | Beschreibung |
|-------|------|---------|--------------|
| A1 | Explainability | 10s | Erklärungen für KI-Entscheidungen |
| A2 | Ethics | 5s | DSGVO-Compliance & Bias-Check |
| A3 | Human Loop | 3s | Approval-Erkennung |

### Team Bravo - Tomedo Integration

| Agent | Name | Timeout | Beschreibung |
|-------|------|---------|--------------|
| B1 | API Connector | 10s | OAuth2, Verbindungsstatus, Queue |
| B2 | EPA Mapper | 15s | Patient/Fallakte in Tomedo erstellen |
| B3 | Documentation | 15s | Karteieintrag generieren & sync |

### Team Charlie - Simplicity

| Agent | Name | Timeout | Beschreibung |
|-------|------|---------|--------------|
| C1 | Load Reducer | 10s | Komplexitäts-Reduktion |
| C2 | Feedback | 8s | Validierung der Ergebnisse |
| C3 | Error Correction | 8s | Auto-Fix von Fehlern |

### Team Delta - Output

| Agent | Name | Timeout | Beschreibung |
|-------|------|---------|--------------|
| D1 | Markdown Generator | 12s | Protokoll-Generierung |
| D2 | Cross Validator | 10s | Konsistenz-Prüfung |
| D3 | Audit Logger | 5s | Audit-Trail |

## Ausführungsfluss

```
1. PARALLEL: Teams Alpha + Bravo + Charlie gleichzeitig
   └─ Team Bravo: Sequentiell (B1 → B2 → B3)
      - B1 prüft Verbindung
      - B2 erstellt Patient/Fallakte
      - B3 nutzt IDs für Karteieintrag

2. SYNCHRONIZE: Ergebnisse aggregieren

3. SEQUENTIAL: Team Delta (abhängig von 1+2)
   └─ D1 → D2 → D3 (Pipeline)

4. OUTPUT: Protokoll + Audit-Trail
```

## API Endpunkte

### Bridge Ausführung

```http
POST /api/tomedo-bridge/execute
Content-Type: application/json

{
  "patientSessionId": "sess-123",
  "tenantId": "tenant-456",
  "connectionId": "conn-tomedo-789",
  "patientData": {
    "patientId": "p-001",
    "name": "Max Mustermann",
    "dob": "1980-01-01"
  },
  "anamneseData": {
    "answers": {...},
    "icd10Codes": ["I10", "E11"],
    "triageResult": {...}
  },
  "options": {
    "waitForCompletion": true,
    "syncMode": "auto"
  }
}
```

### Response

```json
{
  "success": true,
  "taskId": "bridge-1234567890-abc",
  "protocol": "## DIGGAI-TOMEDO ÜBERGABEPROTOKOLL...",
  "timing": {
    "startedAt": "2026-04-03T10:00:00Z",
    "completedAt": "2026-04-03T10:00:05Z",
    "totalDurationMs": 5234
  },
  "teams": {
    "alpha": {...},
    "bravo": {
      "apiConnector": {
        "connectionStatus": "ONLINE",
        "latencyMs": 145
      },
      "epaMapper": {
        "patientId": "tomedo-p-123",
        "goaeZiffern": ["0300", "0330", "2500"],
        "tomedoSync": {
          "patientId": "tomedo-p-123",
          "fallakteId": "enc-456",
          "status": "synced"
        }
      },
      "documentation": {
        "karteityp": "Anamnese",
        "wordCount": 342,
        "tomedoCompositionId": "comp-789",
        "tomedoSyncStatus": "synced"
      }
    },
    "charlie": {...},
    "delta": {...}
  }
}
```

### Dead Letter Queue (DLQ)

```http
# Alle DLQ-Items abrufen
GET /api/tomedo-bridge/dlq

# Alle pending Items retry
POST /api/tomedo-bridge/dlq/retry

# Einzelnes Item retry
POST /api/tomedo-bridge/dlq/:id/retry

# Item entfernen
DELETE /api/tomedo-bridge/dlq/:id
```

### Verbindungsstatus

```http
GET /api/tomedo-bridge/connection/:connectionId/status

Response:
{
  "success": true,
  "connection": {
    "id": "conn-tomedo-789",
    "status": "ONLINE",
    "message": "Connected to Tomedo FHIR API",
    "latencyMs": 145,
    "lastSyncAt": "2026-04-03T09:55:00Z"
  },
  "rateLimit": {
    "remaining": 178,
    "limit": 180,
    "queued": 0
  }
}
```

### Statistiken

```http
GET /api/tomedo-bridge/stats

Response:
{
  "success": true,
  "stats": {
    "dlq": {
      "total": 5,
      "pending": 3,
      "processing": 1,
      "failed": 1,
      "byType": {
        "documentation": 3,
        "patient": 2
      }
    },
    "activeTasks": 2
  }
}
```

## WebSocket Events

### Client → Server

```javascript
// Abonnieren
socket.emit('bridge:subscribe', {
  tenantId: 'tenant-456',
  patientSessionId: 'sess-123'
});

// Deabonnieren
socket.emit('bridge:unsubscribe', {
  tenantId: 'tenant-456',
  patientSessionId: 'sess-123'
});
```

### Server → Client

```javascript
// Bridge gestartet
socket.on('bridge:event', (event) => {
  // { type: 'bridge:started', timestamp, data: {...} }
});

// Bridge abgeschlossen
socket.on('bridge:event', (event) => {
  // { type: 'bridge:completed', timestamp, data: {...} }
});

// Bridge fehlgeschlagen
socket.on('bridge:event', (event) => {
  // { type: 'bridge:failed', timestamp, data: { error: '...' } }
});

// DLQ aktualisiert
socket.on('bridge:event', (event) => {
  // { type: 'bridge:dlq:updated', timestamp, data: { dlqCount: 5 } }
});

// Team-Fortschritt
socket.on('bridge:event', (event) => {
  // { type: 'bridge:team:progress', timestamp, data: { team: 'bravo', agent: 'epa-mapper', progress: 75 } }
});
```

## Frontend Integration

### React Component

```tsx
import { TomedoBridgePanel } from '@/components/pvs';

function PatientSessionPage() {
  return (
    <TomedoBridgePanel
      patientSessionId="sess-123"
      tenantId="tenant-456"
      connectionId="conn-tomedo-789"
      patientData={{
        patientId: "p-001",
        name: "Max Mustermann",
        dob: "1980-01-01"
      }}
      anamneseData={{
        icd10Codes: ["I10"],
        triageResult: { level: "NORMAL", reasons: [] }
      }}
      onSuccess={(result) => console.log(result)}
      onError={(error) => console.error(error)}
    />
  );
}
```

### React Hook

```tsx
import { useTomedoBridge } from '@/hooks';

function MyComponent() {
  const {
    execute,
    isExecuting,
    lastResult,
    bridgeStats,
    dlqItems,
    retryDLQ,
    isConnected
  } = useTomedoBridge({
    patientSessionId: 'sess-123',
    tenantId: 'tenant-456',
    connectionId: 'conn-tomedo-789',
    enableRealtime: true
  });

  return (
    <div>
      <button onClick={() => execute()} disabled={isExecuting}>
        Bridge ausführen
      </button>
      
      {lastResult && (
        <div>
          Status: {lastResult.success ? 'OK' : 'Fehler'}
          DLQ Items: {bridgeStats?.dlq.pending}
        </div>
      )}
    </div>
  );
}
```

## Dead Letter Queue (DLQ)

### Funktionsweise

Wenn ein Sync-Vorgang fehlschlägt, wird das Item in die DLQ aufgenommen:

1. **Max 3 Retries** mit Exponential Backoff
2. **7 Tage TTL** für Redis-Einträge
3. **Redis + PostgreSQL** Fallback
4. **Auto-Retry** bei Wiederverbindung

### DLQ Item Struktur

```typescript
interface DLQItem {
  id: string;                    // "dlq-{timestamp}-{random}"
  type: 'documentation' | 'patient' | 'fallakte' | 'composition';
  patientSessionId: string;
  tenantId: string;
  connectionId: string;
  payload: {
    documentation?: {...};
    patientData?: {...};
    fallakteId?: string;
  };
  error: string;                 // Fehlermeldung
  traceId: string;               // Trace ID für Debugging
  failedAt: string;              // ISO Timestamp
  retryCount: number;            // 0-3
}
```

### DLQ Verarbeitung

```typescript
// Alle pending Items verarbeiten
const { processed, failed, skipped } = await tomedoDLQ.processAll();

// Einzelnes Item verarbeiten
const result = await tomedoDLQ.processItem(item);

// Stats abrufen
const stats = await tomedoDLQ.getStats();
```

## Konfiguration

### Environment Variablen

```bash
# Redis (für DLQ & Rate-Limiting)
REDIS_URL=redis://localhost:6379

# Tomedo OAuth2 (in PvsConnection.fhirCredentials gespeichert)
# {
#   "clientId": "your-client-id",
#   "clientSecret": "your-client-secret",
#   "tokenUrl": "https://api.tomedo.de/oauth/token"
# }
```

### Rate Limiting

| PVS Typ | Requests/Min | Burst | Queue Size |
|---------|--------------|-------|------------|
| CGM_M1 | 60 | 10 | 50 |
| T2Med | 120 | 20 | 100 |
| **TOMEDO** | **180** | **30** | **150** |

## Fehlerbehebung

### Häufige Fehler

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `OAuth2 failed` | Ungültige Credentials | Credentials in PvsConnection prüfen |
| `Connection refused` | Tomedo API offline | Später retry oder DLQ |
| `Rate limit exceeded` | Zu viele Requests | Rate Limiter Queue prüfen |
| `Patient not found` | Falsche Patienten-ID | Suche mit Name/DOB |

### Debugging

```typescript
// Verbindung testen
const client = createTomedoApiClient(connection);
const status = await client.testConnection();
console.log(status); // { ok: true, latencyMs: 145, message: '...' }

// Rate Limit Status
const rateLimit = client.getRateLimitStatus();
console.log(rateLimit); // { remaining: 178, limit: 180, queued: 0 }
```

## Tests

### Unit Tests

```bash
# Tomedo API Client
cd anamnese-app
npm test -- server/services/pvs/__tests__/tomedo-api.client.test.ts

# DLQ Service
npm test -- server/services/pvs/__tests__/tomedo-dlq.service.test.ts
```

### E2E Tests

```bash
# Playwright E2E Tests
npm run test:e2e -- e2e/tomedo-bridge.spec.ts
```

### Load Tests

```bash
# k6 Load Tests
npm run test:load:api
```

## Sicherheit

- **OAuth2** mit Client Credentials Flow
- **Token Rotation** automatisch bei Ablauf
- **Rate Limiting** pro PVS-Typ
- **Audit Logging** aller Operationen
- **DSGVO-konforme** Datenverarbeitung
- **Keine Patientendaten** im Log

## Roadmap

- [x] Phase 1: Echte Tomedo API Integration
- [x] Phase 2: EPA-Mapper & Documentation
- [x] Phase 3: Cross-Agent Kommunikation & DLQ
- [x] Phase 4: API Routes, WebSocket & Frontend
- [x] Phase 5: Tests & Dokumentation
- [x] Phase 6: Batch Processing Service
- [x] Phase 7: FHIR Subscriptions & Echtzeit-Sync
- [x] Phase 8: Performance Optimierung & Monitoring

## Phase 8: Performance & Monitoring (NEU)

### Connection Pooling

```typescript
// Automatisches Connection Pooling für Tomedo API
const pool = tomedoConnectionPool;
const conn = await pool.acquire(connectionData);
try {
  const result = await conn.client.searchPatient({ name: 'Müller' });
} finally {
  pool.release(conn);
}

// Pool Statistiken
const stats = pool.getStats();
// { total: 5, available: 2, inUse: 3, waiting: 0, utilization: 60 }
```

**Konfiguration:**
- Min Connections: 2
- Max Connections: 10
- Max Idle Time: 5 Minuten
- Connection Timeout: 10 Sekunden

### Multi-Tier Caching

```typescript
// Automatisches Caching für Patienten und Suchen
const patient = await tomedoCache.getPatient(praxisId, patientId);
await tomedoCache.setPatient(praxisId, patientId, patientData);

// Cache Statistiken
const stats = tomedoCache.getStats();
// { hits: 150, misses: 50, hitRate: 75 }
```

**Cache TTLs:**
| Ressource | TTL |
|-----------|-----|
| Patient | 5 Minuten |
| Patient Search | 1 Minute |
| Encounter | 5 Minuten |
| Fallakte | 10 Minuten |
| Referenzdaten | 1 Stunde |

### Circuit Breaker

```typescript
// Automatischer Circuit Breaker für API Calls
const result = await circuitBreaker.execute(async () => {
  return await apiClient.createPatient(data);
});

// Circuit Breaker Status
const stats = circuitBreaker.getStats();
// { state: 'CLOSED', failures: 0, successes: 42 }
```

**Konfiguration:**
- Failure Threshold: 5 Fehler
- Success Threshold: 3 Erfolge für Wiederherstellung
- Timeout: 60 Sekunden
- Half-Open Max Calls: 3

### Prometheus-Metrics

```typescript
// Metriken aufzeichnen
tomedoMetrics.recordApiCall('Patient', 'POST', 'success', 145);
tomedoMetrics.recordPatientOperation('create', 'success');
tomedoMetrics.updateCacheMetrics(hits, misses);

// Prometheus Export
const prometheus = tomedoMetrics.exportPrometheus();
```

**Verfügbare Metriken:**
- `tomedo_api_calls_total` - API Aufrufe
- `tomedo_api_call_duration_ms` - Latenz
- `tomedo_patient_searches_total` - Patientensuchen
- `tomedo_cache_hits_total` - Cache Hits
- `tomedo_pool_connections_active` - Aktive Connections
- `tomedo_circuit_state` - Circuit Breaker Status

### Health Checks & Alerts

```http
GET /api/tomedo-bridge/health

Response:
{
  "success": true,
  "health": {
    "overall": "healthy",
    "timestamp": 1712134567890,
    "checks": [
      { "component": "database", "status": "healthy", "responseTime": 12 },
      { "component": "redis", "status": "healthy", "responseTime": 5 },
      { "component": "tomedo_api", "status": "healthy", "responseTime": 145 }
    ],
    "metrics": {
      "apiLatencyP95": 234,
      "errorRate": 0.02,
      "dlqSize": 3
    }
  }
}
```

```http
GET /api/tomedo-bridge/metrics
# Prometheus-kompatibler Text-Export

GET /api/tomedo-bridge/performance
# Performance-Übersicht

GET /api/tomedo-bridge/alerts
# Aktive Alerts
```

**Alert Thresholds:**
- API Latency Warning: > 2s
- API Latency Critical: > 5s
- Error Rate Warning: > 5%
- DLQ Size Warning: > 10 Items

## Support

Bei Problemen oder Fragen:
- **Tech Lead**: [Name]
- **Medical Advisor**: Dr. Al-Shdaifat
- **Dokumentation**: Diese Datei
- **API Specs**: `/api/tomedo-bridge/agents`

---

*Version: 1.0.0 | Letzte Aktualisierung: 2026-04-03*
