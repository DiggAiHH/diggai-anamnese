# PVS Adapter Optimizations

## Übersicht

Diese Dokumentation beschreibt die neuen Optimierungsmodule für das PVS-Adapter-System:

1. **Auto-Config Engine** - Automatische PVS-Erkennung und Konfiguration
2. **Smart Sync Engine** - Echtzeit-Dateiüberwachung und intelligente Synchronisation

---

## Auto-Config Engine

### Zweck

Ermöglicht Zero-Config-Onboarding für Arztpraxen durch automatische Erkennung installierter PVS-Systeme.

### Funktionsweise

1. **Dateisystem-Scanning**
   - Durchsucht typische Installationsverzeichnisse (Windows: `C:\Program Files\CGM`, Linux: `/opt/cgm`)
   - Erkennt PVS anhand von Verzeichnisnamen und Dateimustern
   - Findet GDT-Import/Export-Verzeichnisse automatisch

2. **Erkennungspfade**
   - Windows: `C:\Program Files\CGM`, `C:\medatixx`, `C:\T2Med`
   - Linux: `/opt/cgm`, `/opt/medatixx`, `/var/lib/pvs`

3. **Konfidenz-Scoring**
   - 95%: Beide GDT-Verzeichnisse gefunden
   - 75-85%: Nur Installation gefunden
   - 70%: Verdacht basierend auf Verzeichnisnamen

### Verwendung (Service)

```typescript
import { pvsDetectionService } from './auto-config/index.js';

// Automatische Erkennung starten
const detected = await pvsDetectionService.detectLocalPVS();

// Ergebnis anzeigen
for (const system of detected) {
  console.log(`Erkannt: ${system.type} (${system.confidence}%)`);
  console.log(`Protokoll: ${system.protocol}`);
  console.log(`Import: ${system.detectedPaths?.importDir}`);
  console.log(`Export: ${system.detectedPaths?.exportDir}`);
}

// Konfiguration testen
const testResult = await pvsDetectionService.testDetectedSystem(detected[0]);
console.log(testResult.works ? '✅ Funktioniert' : '❌ Fehler');

// Optimale Konfiguration generieren
const config = pvsDetectionService.generateOptimalConfig(detected[0]);
```

### API-Endpunkte

#### POST `/api/pvs/detect`
Automatische PVS-Erkennung im Dateisystem starten.

**Response:**
```json
{
  "detected": 2,
  "systems": [
    {
      "pvsType": "TURBOMED",
      "protocol": "GDT",
      "confidence": 95,
      "detectedPaths": {
        "importDir": "C:\\Turbomed\\GDT\\Import",
        "exportDir": "C:\\Turbomed\\GDT\\Export"
      },
      "suggestedConfig": {
        "gdtSenderId": "DIGGAI01",
        "gdtReceiverId": "TURBOMED1",
        "gdtEncoding": "ISO-8859-15"
      }
    }
  ]
}
```

#### POST `/api/pvs/detect/test`
Erkannte Konfiguration testen.

**Request:**
```json
{
  "pvsType": "TURBOMED",
  "detectedPaths": {
    "importDir": "C:\\Turbomed\\GDT\\Import",
    "exportDir": "C:\\Turbomed\\GDT\\Export"
  }
}
```

**Response:**
```json
{
  "works": true,
  "message": "✅ Import-Verzeichnis erreichbar\n✅ Export-Verzeichnis erreichbar + beschreibbar"
}
```

### Unterstützte Systeme

| PVS | Erkennungsmethode | Konfidenz |
|-----|------------------|-----------|
| CGM MEDISTAR | Verzeichnissuche | 75-95% |
| CGM TurboMed | Verzeichnissuche | 75-95% |
| CGM M1/ALBIS | Verzeichnissuche | 70-95% |
| medatixx | Verzeichnissuche | 70-90% |
| Tomedo | Verzeichnissuche | 85% |
| T2Med | Verzeichnissuche | 85% |

---

## Smart Sync Engine

### Zweck

Automatische Echtzeit-Synchronisation von Patientendaten zwischen DiggAI und dem PVS.

### Funktionsweise

1. **Datei-Überwachung**
   - Polling-basiertes Monitoring (konfigurierbar, Standard: 30s)
   - Archivierung verarbeiteter Dateien
   - Duplikat-Erkennung

2. **Smart Export**
   - Exponentielles Backoff bei Fehlern (2s, 4s, 8s...)
   - Automatische Wiederholung (konfigurierbar, Standard: 3 Versuche)
   - Transfer-Statistiken

3. **Event-System**
   - `sync`: Bei jeder Synchronisation
   - `error`: Bei Übertragungsfehlern
   - `watching`: Wenn Überwachung startet
   - `stopped`: Wenn Überwachung stoppt

### Verwendung (Service)

```typescript
import { smartSyncService } from './sync/index.js';

// Überwachung starten
await smartSyncService.startWatching(connection);

// Auf Ereignisse reagieren
smartSyncService.on('sync', (event: SyncEvent) => {
  console.log(`${event.type}: ${event.details.success ? 'OK' : 'FEHLER'}`);
});

// Smart Export mit Retry
const result = await smartSyncService.smartExport(connection, session, 3);
if (result.success) {
  console.log(`Export nach ${result.attempts} Versuchen erfolgreich`);
}

// Statistiken abrufen
const stats = smartSyncService.getStats(connection.id);
console.log(`Erfolgsquote: ${stats.successfulTransfers}/${stats.totalTransfers}`);
```

### API-Endpunkte

#### POST `/api/pvs/connection/:id/sync/start`
Smart Sync für eine Verbindung starten.

**Response:**
```json
{
  "success": true,
  "message": "Synchronisation gestartet",
  "connectionId": "conn-123"
}
```

#### POST `/api/pvs/connection/:id/sync/stop`
Smart Sync für eine Verbindung stoppen.

**Response:**
```json
{
  "success": true,
  "message": "Synchronisation gestoppt",
  "connectionId": "conn-123"
}
```

#### GET `/api/pvs/connection/:id/sync/stats`
Sync-Statistiken abrufen.

**Response (aktiv):**
```json
{
  "connectionId": "conn-123",
  "status": "watching",
  "stats": {
    "totalTransfers": 150,
    "successfulTransfers": 148,
    "failedTransfers": 2,
    "successRate": 99,
    "averageDurationMs": 245,
    "lastSyncAt": "2026-03-24T11:30:00Z",
    "pendingTransfers": 0
  }
}
```

**Response (nicht aktiv):**
```json
{
  "connectionId": "conn-123",
  "status": "not_watching",
  "message": "Keine aktive Überwachung für diese Verbindung"
}
```

### Konfiguration

```typescript
interface SyncConfig {
  syncIntervalSec: number;  // Polling-Intervall (Standard: 30)
  retryCount: number;       // Max. Wiederholungen (Standard: 3)
}
```

---

## Integration

### Neue Endpunkte Zusammenfassung

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/pvs/detect` | PVS-Systeme automatisch erkennen |
| POST | `/api/pvs/detect/test` | Erkannte Konfiguration testen |
| POST | `/api/pvs/connection/:id/sync/start` | Smart Sync starten |
| POST | `/api/pvs/connection/:id/sync/stop` | Smart Sync stoppen |
| GET | `/api/pvs/connection/:id/sync/stats` | Sync-Statistiken abrufen |

### Integration mit bestehendem PVS-Service

```typescript
// In pvs.service.ts oder ähnlichem
import { pvsDetectionService } from './auto-config/index.js';
import { smartSyncService } from './sync/index.js';

export class PvsService {
  async autoConfigure(praxisId: string) {
    const detected = await pvsDetectionService.detectLocalPVS();
    
    for (const system of detected) {
      const test = await pvsDetectionService.testDetectedSystem(system);
      if (test.works) {
        const config = pvsDetectionService.generateOptimalConfig(system);
        await this.saveConnection(praxisId, config);
      }
    }
    
    return detected;
  }
  
  async enableRealtimeSync(connectionId: string) {
    const connection = await this.getConnection(connectionId);
    await smartSyncService.startWatching(connection);
    return { watching: true };
  }
}
```

---

## Testabdeckung

| Modul | Tests | Abdeckung |
|-------|-------|-----------|
| Auto-Config | 4 | 80%+ |
| Smart Sync | 5 | 75%+ |

### Test ausführen

```bash
# Alle PVS-Tests
npx vitest run server/services/pvs

# Nur neue Module
npx vitest run server/services/pvs/auto-config
npx vitest run server/services/pvs/sync
```

---

## Roadmap

### Phase 1 (Jetzt)
- [x] Auto-Config für GDT-basierte PVS
- [x] Smart Sync mit Polling
- [x] Basis-Event-System
- [x] API-Endpunkte

### Phase 2 (Geplant)
- [ ] Native Dateisystem-Events (fser/fsevents)
- [ ] FHIR Subscription Support
- [ ] Konfliktlösung bei gleichzeitigen Änderungen
- [ ] PVS-spezifische Optimierungen

### Phase 3 (Vision)
- [ ] ML-basierte Erkennung unbekannter PVS
- [ ] Netzwerk-Scanning für FHIR-Endpunkte
- [ ] Automatische Feldmapping-Optimierung
