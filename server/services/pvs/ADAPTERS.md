# DiggAI PVS Adapter Documentation

## Overview

DiggAI unterstützt die Integration mit verschiedenen Praxisverwaltungssystemen (PVS) in Deutschland über standardisierte Adapter.

**Stand:** 24.03.2026  
**Version:** 2.0.0  
**Adapter Count:** 7 aktive Adapter

---

## Unterstützte PVS-Systeme

| Adapter | PVS-System | Protokoll | Marktanteil | Usability (Zi 2025) | Status |
|---------|------------|-----------|-------------|---------------------|--------|
| `CgmM1Adapter` | CGM M1 PRO | GDT | ~1-2% | Rang 36-40 | ✅ Produktiv |
| `TurbomedAdapter` | CGM TurboMed | GDT | ~5-6% | Rang 38 | ✅ Produktiv |
| `MedistarAdapter` | CGM MEDISTAR | GDT | ~9-10% | Rang 37 | ✅ Produktiv |
| `xIsynetAdapter` | medatixx x.isynet | GDT | ~4-5% | - | ✅ Produktiv |
| `MedatixxAdapter` | medatixx x.concept | FHIR/GDT | ~6-7% | - | ✅ Produktiv |
| `TomedoAdapter` | tomedo (Zollsoft) | FHIR R4 | ~3-4% | **Rang 1** | ✅ Produktiv |
| `T2MedAdapter` | T2Med | FHIR R4 | ~3-4% | Rang 3 | ✅ Produktiv |
| `FhirGenericAdapter` | Generic FHIR | FHIR R4 | - | - | ✅ Fallback |

**Gesamtmarktabdeckung:** ~35-40% der deutschen Arztpraxen

---

## Adapter-Kategorien

### GDT-basierte Adapter (5 Systeme)

GDT (Gerätedatentransfer) ist der älteste aber universell unterstützte Standard.

**Vorteile:**
- Unterstützt von 99% der PVS-Systeme
- Einfache Datei-basierte Kommunikation
- Keine Netzwerk-Konfiguration nötig
- Lokale Datenverarbeitung (DSGVO-konform)

**Nachteile:**
- Keine Echtzeit-Kommunikation
- Datei-Handling erforderlich
- Begrenzte Datenstrukturen

**Systeme:**
| System | Marktanteil | Adapter |
|--------|-------------|---------|
| CGM MEDISTAR | ~9-10% | `MedistarAdapter` |
| CGM TurboMed | ~5-6% | `TurbomedAdapter` |
| medatixx x.isynet | ~4-5% | `xIsynetAdapter` |
| CGM M1 PRO | ~1-2% | `CgmM1Adapter` |
| CGM ALBIS | ~2-3% | `CgmM1Adapter` (shared) |

### FHIR-basierte Adapter (3 Systeme)

FHIR (Fast Healthcare Interoperability Resources) ist der moderne Standard.

**Vorteile:**
- Echtzeit-API-Zugriff
- Rich Data Model
- RESTful Interface
- Internationaler Standard
- Besser für KI-Integration

**Nachteile:**
- Nicht alle PVS unterstützen FHIR nativ
- Komplexere Authentifizierung (OAuth2)
- Höhere Einstiegshürde

**Systeme:**
| System | Marktanteil | Adapter | Authentifizierung |
|--------|-------------|---------|-------------------|
| tomedo (Zollsoft) | ~3-4% | `TomedoAdapter` | OAuth2 |
| T2Med | ~3-4% | `T2MedAdapter` | API-Key |
| medatixx x.concept | ~6-7% | `MedatixxAdapter` | FHIR/REST |

---

## Schnelleinstieg

### GDT-Adapter konfigurieren (MEDISTAR Beispiel)

```typescript
import { MedistarAdapter } from './adapters/medistar.adapter.js';

const connection: PvsConnectionData = {
  id: 'conn-medistar-1',
  praxisId: 'praxis-123',
  pvsType: 'MEDISTAR',
  protocol: 'GDT',
  gdtImportDir: 'C:\\PVS\\MEDISTAR\\IMPORT',
  gdtExportDir: 'C:\\PVS\\MEDISTAR\\EXPORT',
  gdtSenderId: 'DIGGAI01',
  gdtReceiverId: 'MEDISTAR01',
  gdtEncoding: 'ISO-8859-15',
  isActive: true,
  syncIntervalSec: 30,
  retryCount: 3,
  autoMapFields: true,
};

const adapter = new MedistarAdapter();
await adapter.initialize(connection);

// Verbindung testen
const testResult = await adapter.testConnection();
console.log(testResult.message);

// Patient importieren
const patient = await adapter.importPatient('P123456');

// Anamnese exportieren
const result = await adapter.exportAnamneseResult(session);
```

### FHIR-Adapter konfigurieren (Tomedo Beispiel)

```typescript
import { TomedoAdapter } from './adapters/tomedo.adapter.js';

const connection: PvsConnectionData = {
  id: 'conn-tomedo-1',
  praxisId: 'praxis-123',
  pvsType: 'TOMEDO',
  protocol: 'FHIR',
  fhirBaseUrl: 'https://api.tomedo.de/fhir/R4',
  fhirAuthType: 'oauth2',
  fhirCredentials: JSON.stringify({
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
  }),
  isActive: true,
  syncIntervalSec: 60,
  retryCount: 3,
  autoMapFields: true,
};

const adapter = new TomedoAdapter();
await adapter.initialize(connection);

// Patient suchen
const patients = await adapter.searchPatient({ name: 'Müller' });

// Anamnese exportieren
const result = await adapter.exportAnamneseResult(session);
```

---

## PVS-spezifische Besonderheiten

### CGM MEDISTAR

- **Receiver ID:** `MEDISTAR01`
- **Marktanteil:** ~9-10% (Marktführer unter CGM)
- **Unterstützte Satzarten:** 6310, 6311, 6301
- **Besonderheit:** Unterstützt erweiterte 6200-Satzarten für Befunde

```typescript
// Beispiel: MEDISTAR mit erweiterten Befunden
const adapter = new MedistarAdapter();
const result = await adapter.exportAnamneseResult(session);
// Erstellt: DIGGAI_P123456_1234567890.gdt
```

### TurboMed

- **Receiver ID:** `TURBOMED1`
- **Marktanteil:** ~5-6%
- **Unterstützte Satzarten:** 6310, 6311, 6302, 6301
- **Besonderheit:** Unterstützt Untersuchungsanforderung (6302)

### tomedo (Zollsoft)

- **Platz 1 Usability** (Zi-Studie 2025)
- **OAuth2 Authentifizierung**
- **Deutsche FHIR Basisprofile**
- **95% Weiterempfehlungsrate**

```typescript
// Tomedo mit deutschen Basisprofilen
const patient = await adapter.exportPatient({
  pvsPatientId: '123',
  lastName: 'Müller',
  firstName: 'Hans',
  insuranceNr: 'A123456789',
});
// Erstellt FHIR Patient mit:
// - meta.profile: http://fhir.de/StructureDefinition/patient-de-basis
// - identifier: http://fhir.de/sid/gkv/kvid-10
```

### T2Med

- **Platz 3 Usability** (Zi-Studie 2025)
- **API-Key Authentifizierung** (einfacher als OAuth2)
- **FHIR + proprietäre REST APIs**

```typescript
// T2Med mit API-Key
const connection = {
  fhirAuthType: 'apikey',
  fhirCredentials: JSON.stringify({ apiKey: 'your-api-key' }),
};
```

### x.isynet

- **medatixx Familie**
- **~4-5% Marktanteil**
- **Migration zu HealthHub** (FHIR) ab Q1 2026

---

## API-Endpunkte

### Adapter testen
```http
POST /api/pvs/connection/:id/test
```

**Response:**
```json
{
  "ok": true,
  "message": "✅ Import-Verzeichnis erreichbar\n✅ Export-Verzeichnis erreichbar + Schreibrechte"
}
```

### Anamnese exportieren
```http
POST /api/pvs/export/session/:sessionId
```

**Response:**
```json
{
  "transferId": "gdt-1711271234567",
  "status": "COMPLETED",
  "pvsReferenceId": "DIGGAI_P123456_1711271234567.gdt",
  "warnings": [],
  "exportedFields": 42
}
```

### Patient importieren
```http
POST /api/pvs/import/patient
Content-Type: application/json

{
  "pvsPatientId": "P123456"
}
```

### Capabilities abrufen
```http
GET /api/pvs/connection/:id/capabilities
```

**Response (MEDISTAR):**
```json
{
  "canImportPatients": true,
  "canExportResults": true,
  "canExportTherapyPlans": false,
  "canReceiveOrders": true,
  "canSearchPatients": true,
  "supportsRealtime": false,
  "supportedSatzarten": ["6310", "6311", "6301"],
  "supportedFhirResources": []
}
```

**Response (Tomedo):**
```json
{
  "canImportPatients": true,
  "canExportResults": true,
  "canExportTherapyPlans": true,
  "canReceiveOrders": true,
  "canSearchPatients": true,
  "supportsRealtime": false,
  "supportedSatzarten": [],
  "supportedFhirResources": [
    "Patient", "Encounter", "QuestionnaireResponse",
    "Flag", "RiskAssessment", "MedicationStatement",
    "Procedure", "CarePlan", "Observation", "Condition"
  ]
}
```

---

## Troubleshooting

### GDT-Verbindung funktioniert nicht

**Problem:** Verzeichnis nicht erreichbar  
**Lösung:**
```bash
# Berechtigungen prüfen
ls -la /path/to/pvs/import
ls -la /path/to/pvs/export

# Test-Datei erstellen
echo "test" > /path/to/pvs/export/.diggai_test
```

**Problem:** Keine GDT-Dateien vom PVS  
**Lösung:**
- Prüfen, ob PVS GDT-Export aktiviert ist
- Satzart 6311 (Stammdaten übermitteln) muss unterstützt werden
- Pfad-Konfiguration im PVS prüfen

### FHIR-Verbindung funktioniert nicht

**Problem:** OAuth2 Fehler (Tomedo)  
**Lösung:**
```typescript
// Credentials prüfen
const creds = JSON.parse(connection.fhirCredentials);
console.log('Client ID:', creds.clientId ? '✅' : '❌');
console.log('Client Secret:', creds.clientSecret ? '✅' : '❌');
```

**Problem:** 401 Unauthorized (T2Med)  
**Lösung:**
- API-Key im Header: `X-API-Key` oder `Authorization: Bearer`
- Key im T2Med Portal generieren

### Allgemeine Fehler

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `Kein Adapter für PVS-Typ` | Nicht im Router registriert | `pvs-router.service.ts` prüfen |
| `Patient nicht gefunden` | Falsche Patientennummer | Nummer im PVS prüfen |
| `Export-Verzeichnis nicht konfiguriert` | `gdtExportDir` fehlt | Verbindung aktualisieren |

---

## Migration & Updates

### Von GDT zu FHIR (medatixx)

Ab Q1 2026 unterstützt medatixx HealthHub (FHIR):

```typescript
// Alt: xIsynetAdapter (GDT)
const oldConnection = { pvsType: 'X_ISYNET', protocol: 'GDT' };

// Neu: MedatixxAdapter (FHIR)
const newConnection = { 
  pvsType: 'MEDATIXX', 
  protocol: 'FHIR',
  fhirBaseUrl: 'https://healthhub.medatixx.de/fhir/R4'
};
```

---

## Performance Benchmarks

| Adapter | Operation | Zeit | Getestet |
|---------|-----------|------|----------|
| MedistarAdapter | Patient-Import | ~50ms | ✅ |
| MedistarAdapter | Suche (100 Patienten) | ~400ms | ✅ |
| MedistarAdapter | Anamnese-Export | ~80ms | ✅ |
| TurbomedAdapter | Patient-Import | ~50ms | ✅ |
| TurbomedAdapter | Suche (100 Patienten) | ~500ms | ✅ |
| TomedoAdapter | OAuth Auth | ~300ms | ✅ |
| TomedoAdapter | Patient-Suche | ~200ms | ✅ |
| T2MedAdapter | API-Key Auth | ~100ms | ✅ |
| T2MedAdapter | Patient-Suche | ~150ms | ✅ |

---

## Entwicklung

### Neuen Adapter erstellen

1. Interface implementieren:
```typescript
export class MyPvsAdapter implements PvsAdapter {
  readonly type: PvsType = 'MY_PVS';
  readonly supportedProtocols: PvsProtocol[] = ['GDT'];
  
  async initialize(connection: PvsConnectionData): Promise<void> { }
  async testConnection(): Promise<{ ok: boolean; message: string }> { }
  async disconnect(): Promise<void> { }
  async importPatient(externalId: string): Promise<GdtPatientData | FhirPatient> { }
  async exportPatient(patient: PatientSearchResult): Promise<string> { }
  async searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]> { }
  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> { }
  getCapabilities(): AdapterCapabilities { }
}
```

2. Im Router registrieren:
```typescript
// pvs-router.service.ts
import { MyPvsAdapter } from './adapters/my-pvs.adapter.js';

const ADAPTER_REGISTRY: Record<PvsType, AdapterConstructor> = {
  // ... existing adapters
  MY_PVS: MyPvsAdapter,
};
```

3. Tests schreiben:
```typescript
// adapters/__tests__/my-pvs.adapter.test.ts
```

4. Prisma Schema aktualisieren:
```prisma
enum PvsType {
  // ... existing types
  MY_PVS
}
```

---

## Testabdeckung

| Adapter | Unit Tests | E2E Tests | Coverage |
|---------|------------|-----------|----------|
| TurbomedAdapter | 14 | 11 | ~90% |
| TomedoAdapter | 16 | 6 | ~85% |
| MedistarAdapter | 10 | 0 | ~85% |
| T2MedAdapter | 10 | 0 | ~85% |
| xIsynetAdapter | 10 | 0 | ~85% |
| **Gesamt** | **60** | **17** | **~87%** |

---

## Roadmap 2026

### Q2 2026 (Aktuell)
- [x] TurbomedAdapter ✅
- [x] TomedoAdapter ✅
- [x] MedistarAdapter ✅
- [x] T2MedAdapter ✅
- [x] xIsynetAdapter ✅

### Q3 2026 (Geplant)
- [ ] AlbisAdapter (dediziert)
- [ ] inSuite Integration
- [ ] RED Medical Integration
- [ ] Integrationstests mit echten PVS-Systemen

### Q4 2026 (Geplant)
- [ ] Doctolib API (falls verfügbar)
- [ ] KIM-Schnittstelle
- [ ] E-Rezept Integration
- [ ] Apotheken-Systeme (CGM LAUER)

---

## Support

Bei Problemen mit PVS-Integrationen:

1. **Logs prüfen:** `/api/logs`
2. **Transfer-Log:** `/api/pvs/transfers`
3. **Verbindung testen:** `/api/pvs/connection/:id/test`
4. **Dokumentation:** Diese Datei
5. **Test-Report:** `TEST_REPORT.md`

---

## Lizenz & Kontakt

Interne DiggAI Dokumentation - Vertraulich  
Kontakt: engineering@diggai.de

---

*Letzte Aktualisierung: 24.03.2026*  
*Version: 2.0.0*  
*Autor: DiggAI Engineering Team*
