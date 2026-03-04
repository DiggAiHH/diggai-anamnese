# PLAN Modul 3 & 4 — PVS-Integration & Therapieplan

> **Prompt 1b** — Detaillierter Implementierungsplan  
> **Erstellt:** 2026-03-04  
> **Status:** FINAL  
> **Abhängigkeit:** PLAN_MODUL_1_2.md (Modul 1+2 müssen zuerst implementiert sein)

---

## Inhaltsverzeichnis

1. [Modul 3 — PVS-Integration](#modul-3--pvs-integration)
   1. [Übersicht & Architektur](#31-übersicht--architektur)
   2. [Prisma-Schema-Erweiterungen](#32-prisma-schema-erweiterungen)
   3. [GDT 3.0 Engine](#33-gdt-30-engine)
   4. [FHIR R4 Engine](#34-fhir-r4-engine)
   5. [PVS-Adapter](#35-pvs-adapter)
   6. [API-Endpunkte](#36-api-endpunkte)
   7. [Frontend-Komponenten](#37-frontend-komponenten)
   8. [Mapping-Logik](#38-mapping-logik)
   9. [Sicherheit & Compliance](#39-sicherheit--compliance)
2. [Modul 4 — Therapieplan & Arzt-Assistenz](#modul-4--therapieplan--arzt-assistenz)
   1. [Übersicht & Architektur](#41-übersicht--architektur)
   2. [Prisma-Schema-Erweiterungen](#42-prisma-schema-erweiterungen)
   3. [API-Endpunkte](#43-api-endpunkte)
   4. [Frontend-Komponenten](#44-frontend-komponenten)
   5. [KI-Assistenz-System](#45-ki-assistenz-system)
   6. [Echtzeit-Alerts](#46-echtzeit-alerts)
   7. [Anonymisierung](#47-anonymisierung)
3. [Modul-übergreifend](#modul-übergreifend)
   1. [Abhängigkeiten & Reihenfolge](#51-abhängigkeiten--reihenfolge)
   2. [Migrations-Strategie](#52-migrations-strategie)
   3. [Test-Strategie](#53-test-strategie)
   4. [Zeitschätzung](#54-zeitschätzung)

---

# Modul 3 — PVS-Integration

## 3.1 Übersicht & Architektur

### Ziel
Bidirektionale Kommunikation zwischen DiggAI-Anamnese und allen gängigen deutschen Praxisverwaltungssystemen (PVS) über standardisierte Schnittstellen.

### Unterstützte Standards
| Standard | Version | Richtung | Verwendung |
|----------|---------|----------|------------|
| **GDT** | 3.0 | bidirektional | Patienten-Stammdaten, Befunde, Aufträge |
| **BDT** | 2.0 | Import | Behandlungsdaten-Transfer |
| **HL7 FHIR** | R4 (4.0.1) | bidirektional | Moderne PVS, ePA, KIS |
| **xDT** | Basis | bidirektional | Wrapper für GDT/BDT/LDT |
| **KIM** | 1.5 | Export | Sichere E-Mail (gematik) |

### Unterstützte PVS-Systeme (Priorität)
| Priorität | PVS | Hersteller | Interface | Marktanteil DE |
|-----------|-----|------------|-----------|----------------|
| P0 | **CGM M1 PRO** | CompuGroup | GDT 3.0 + REST | ~28% |
| P0 | **medatixx** | medatixx | GDT 3.0 | ~18% |
| P0 | **Medistar** | CGM | GDT 3.0 | ~12% |
| P1 | **T2Med** | CGM | GDT 3.0 + FHIR | ~8% |
| P1 | **x.isynet** | medatixx | GDT 3.0 | ~7% |
| P2 | **Doctolib** | Doctolib | REST/FHIR | ~5% |
| P2 | **TurboMed** | CGM | GDT 3.0 | ~4% |
| P3 | **FHIR-Generic** | beliebig | FHIR R4 | Rest |

### Architektur-Diagramm

```
┌─────────────────────────────────────────────────────────┐
│                    DiggAI Backend                        │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ REST API │──▶│ PVS-Router   │──▶│ Adapter-Layer  │  │
│  │ /pvs/*   │   │ (Strategy)   │   │                │  │
│  └──────────┘   └──────┬───────┘   │ ┌────────────┐ │  │
│                        │           │ │ GDT-Adapter │ │  │
│  ┌──────────┐          │           │ └────────────┘ │  │
│  │ Socket.IO│──────────┤           │ ┌────────────┐ │  │
│  │ Events   │          │           │ │FHIR-Adapter│ │  │
│  └──────────┘          │           │ └────────────┘ │  │
│                        │           │ ┌────────────┐ │  │
│  ┌──────────┐          │           │ │ BDT-Adapter│ │  │
│  │ Cron/    │──────────┘           │ └────────────┘ │  │
│  │ Watcher  │                      │ ┌────────────┐ │  │
│  └──────────┘                      │ │ KIM-Adapter│ │  │
│                                    │ └────────────┘ │  │
│                                    └───────┬────────┘  │
│                                            │           │
│  ┌─────────────────────────────────────────▼────────┐  │
│  │              Mapping-Engine                       │  │
│  │  DiggAI-Models ◄──► Standard-Format ◄──► PVS     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │              PVS-Connection-Store                  │  │
│  │  Prisma: PvsConnection, PvsTransferLog,           │  │
│  │          PvsFieldMapping                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │              │               │
    ┌────▼────┐   ┌─────▼─────┐   ┌────▼────┐
    │ GDT-Dir │   │ FHIR-API  │   │ KIM-TI  │
    │ (File)  │   │ (HTTP)    │   │ (SMTP)  │
    └─────────┘   └───────────┘   └─────────┘
         │              │               │
    ┌────▼────────────────▼───────────────▼────┐
    │          Praxisverwaltungssystem          │
    └──────────────────────────────────────────┘
```

### Design-Prinzipien
1. **Strategy Pattern**: Jedes PVS bekommt einen eigenen Adapter (implements `PvsAdapter`)
2. **File-Watcher für GDT**: Überwacht Import-Verzeichnis, verarbeitet automatisch
3. **Queue-basiert**: Alle Transfers werden geloggt und können wiederholt werden
4. **Fail-Safe**: Bei PVS-Ausfall werden Daten lokal gepuffert
5. **Zero-Config möglich**: Auto-Detection des PVS über GDT-Verzeichnisstruktur

---

## 3.2 Prisma-Schema-Erweiterungen

### Neue Models

```prisma
// ============================================
// MODUL 3: PVS-Integration
// ============================================

enum PvsType {
  CGM_M1
  MEDATIXX
  MEDISTAR
  T2MED
  X_ISYNET
  DOCTOLIB
  TURBOMED
  FHIR_GENERIC
}

enum PvsProtocol {
  GDT
  BDT
  FHIR
  REST
  KIM
}

enum TransferDirection {
  IMPORT
  EXPORT
  BIDIRECTIONAL
}

enum TransferStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  RETRYING
  CANCELLED
}

model PvsConnection {
  id              String          @id @default(uuid())
  praxisId        String          @unique
  pvsType         PvsType
  pvsVersion      String?
  protocol        PvsProtocol     @default(GDT)
  
  // GDT-spezifisch
  gdtImportDir    String?         // z.B. "C:\\PVS\\GDT\\Import"
  gdtExportDir    String?         // z.B. "C:\\PVS\\GDT\\Export"
  gdtFilePattern  String?         @default("*.gdt")
  gdtEncoding     String?         @default("ISO-8859-15") // CP437 oder ISO
  gdtSenderId     String?         // 8-stellig, GDT Satzart 8402
  gdtReceiverId   String?         // 8-stellig, GDT Satzart 8401
  
  // FHIR-spezifisch
  fhirBaseUrl     String?         // z.B. "https://pvs.praxis.local/fhir"
  fhirAuthType    String?         // "basic" | "oauth2" | "apikey"
  fhirCredentials String?         // AES-256-GCM verschlüsselt
  fhirTenantId    String?
  
  // KIM-spezifisch
  kimAddress      String?         // KIM-Adresse der Praxis
  kimSmtpHost     String?
  kimSmtpPort     Int?
  
  // Connection-Status
  isActive        Boolean         @default(true)
  lastSyncAt      DateTime?
  lastError       String?
  syncIntervalSec Int             @default(30)
  retryCount      Int             @default(3)
  
  // Auto-Mapping
  autoMapFields   Boolean         @default(true)
  customMappings  Json?           // Überschreibungen für Feld-Mapping
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  transferLogs    PvsTransferLog[]
  fieldMappings   PvsFieldMapping[]
  
  @@index([pvsType])
  @@index([isActive])
}

model PvsTransferLog {
  id              String          @id @default(uuid())
  connectionId    String
  connection      PvsConnection   @relation(fields: [connectionId], references: [id])
  
  direction       TransferDirection
  protocol        PvsProtocol
  status          TransferStatus  @default(PENDING)
  
  // Referenz auf DiggAI-Entität
  entityType      String          // "Patient" | "PatientSession" | "Answer" | "TriageEvent"
  entityId        String
  
  // Transfer-Details
  satzart         String?         // GDT Satzart (6310, 6311, etc.)
  resourceType    String?         // FHIR Resource Type
  rawPayload      String?         // Verschlüsselter Rohinhalt (für Debug/Retry)
  transformedData Json?           // Mapped-Daten (ohne sensible Inhalte)
  
  // Ergebnis
  pvsReferenceId  String?         // ID im PVS-System
  errorMessage    String?
  errorCode       String?
  retryAttempt    Int             @default(0)
  maxRetries      Int             @default(3)
  
  // Timing
  startedAt       DateTime        @default(now())
  completedAt     DateTime?
  durationMs      Int?
  
  // Audit
  initiatedBy     String?         // ArztUser.id oder "system"
  
  createdAt       DateTime        @default(now())
  
  @@index([connectionId, status])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([status])
}

model PvsFieldMapping {
  id              String          @id @default(uuid())
  connectionId    String
  connection      PvsConnection   @relation(fields: [connectionId], references: [id])
  
  // DiggAI-Seite
  diggaiModel     String          // "Patient" | "Answer" | "PatientSession"
  diggaiField     String          // z.B. "firstName", "answers.schmerzskala"
  
  // PVS-Seite
  pvsFieldId      String          // GDT: Feldkennung (3101, 3102, ...) | FHIR: FHIRPath
  pvsFieldName    String?         // Menschenlesbarer Name
  
  // Transformation
  direction       TransferDirection @default(BIDIRECTIONAL)
  transformRule   String?         // "direct" | "map:ja→1,nein→0" | "format:date:YYYYMMDD" | "custom:fn"
  defaultValue    String?
  isRequired      Boolean         @default(false)
  isActive        Boolean         @default(true)
  
  // Validierung
  validationRule  String?         // Regex oder Zod-Schema-Snippet
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([connectionId, diggaiModel, diggaiField, pvsFieldId])
  @@index([connectionId])
}

model PvsPatientLink {
  id              String          @id @default(uuid())
  patientId       String
  patient         Patient         @relation(fields: [patientId], references: [id])
  
  pvsType         PvsType
  pvsPatientId    String          // ID des Patienten im PVS
  pvsPatientNr    String?         // Patientennummer im PVS (oft anders als ID)
  
  lastSyncAt      DateTime?
  syncStatus      String          @default("linked") // linked | conflict | unlinked
  conflictData    Json?           // Bei Konflikten: beide Versionen
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@unique([patientId, pvsType])
  @@unique([pvsType, pvsPatientId])
  @@index([pvsPatientId])
}
```

### Erweiterungen bestehender Models

```prisma
// Patient — Erweiterung
model Patient {
  // ... bestehende Felder ...
  
  // NEU: PVS-Verknüpfung
  pvsLinks        PvsPatientLink[]
  
  // NEU: Versichertendaten (aus eGK/PVS)
  versichertenNr  String?         // 10-stellig (KVNR)
  versichertenArt String?         // "GKV" | "PKV" | "BG" | "SZ"
  kassennummer    String?         // IK-Nummer (9-stellig)
  kassenname      String?
}

// PatientSession — Erweiterung
model PatientSession {
  // ... bestehende Felder ...
  
  // NEU: PVS-Export-Status
  pvsExported     Boolean         @default(false)
  pvsExportedAt   DateTime?
  pvsExportRef    String?         // Referenz-ID im PVS
  
  // NEU: Therapieplan-Verknüpfung (→ Modul 4)
  therapyPlans    TherapyPlan[]
}
```

---

## 3.3 GDT 3.0 Engine

### Dateistruktur

```
server/
  services/
    pvs/
      index.ts                    // PVS-Service Façade
      types.ts                    // Alle PVS-Typen & Interfaces
      pvs-router.service.ts       // Strategy-Router
      gdt/
        gdt-parser.ts             // GDT 3.0 Datei → Objekt
        gdt-writer.ts             // Objekt → GDT 3.0 Datei
        gdt-watcher.ts            // Dateisystem-Überwachung (chokidar)
        gdt-constants.ts          // Feldkennungen, Satzarten
        gdt-validator.ts          // Prüfsummen, Pflichtfelder
      fhir/
        fhir-client.ts            // FHIR R4 HTTP Client
        fhir-mapper.ts            // DiggAI ↔ FHIR Resources
        fhir-profiles.ts          // DE-Basisprofile Constraints
        fhir-bundle.ts            // Transaction-Bundle Builder
      bdt/
        bdt-parser.ts             // BDT Import
      kim/
        kim-sender.ts             // KIM-Nachricht senden
      adapters/
        adapter.interface.ts      // PvsAdapter Interface
        cgm-m1.adapter.ts
        medatixx.adapter.ts
        medistar.adapter.ts
        t2med.adapter.ts
        doctolib.adapter.ts
        fhir-generic.adapter.ts
      mapping/
        mapping-engine.ts         // Zentrale Mapping-Logik
        mapping-defaults.ts       // Standard-Mappings je PVS
        mapping-transforms.ts     // Transformations-Funktionen
```

### GDT 3.0 Satzarten (relevant)

| Satzart | Name | Richtung | Beschreibung |
|---------|------|----------|--------------|
| **6310** | Stammdaten anfordern | DiggAI → PVS | Patient-Lookup |
| **6311** | Stammdaten übermitteln | PVS → DiggAI | Patient-Import |
| **6302** | Neue Untersuchung anfordern | PVS → DiggAI | Anamnese starten |
| **6310** | Daten einer Untersuchung übermitteln | DiggAI → PVS | Ergebnis senden |
| **6300** | Untersuchung anfordern | PVS → DiggAI | Allgemein |
| **6301** | Untersuchungsergebnis | DiggAI → PVS | Anamnese-Ergebnis |

### GDT-Feldkennungen → DiggAI-Mapping

```typescript
// server/services/pvs/gdt/gdt-constants.ts

export const GDT_FIELDS = {
  // Header
  SATZLAENGE:     '8100',  // Satzlänge
  SATZART:        '8000',  // Satzart (6310, 6311, ...)
  GDT_VERSION:    '9218',  // "03.00" für GDT 3.0
  SENDER_ID:      '8402',  // Sender (8-stellig)
  RECEIVER_ID:    '8401',  // Empfänger (8-stellig)
  
  // Patientendaten
  PAT_NR:         '3000',  // → Patient.id (PVS-intern)
  PAT_NAME:       '3101',  // → Patient.lastName
  PAT_VORNAME:    '3102',  // → Patient.firstName
  PAT_GEBDAT:     '3103',  // → Patient.dateOfBirth (TTMMJJJJ)
  PAT_GESCHLECHT: '3110',  // → Patient.gender (1=m, 2=w, 3=d)
  PAT_STRASSE:    '3107',  // (nicht in DiggAI, optional speichern)
  PAT_PLZ:        '3112',  // (nicht in DiggAI)
  PAT_ORT:        '3113',  // (nicht in DiggAI)
  PAT_VERSART:    '4104',  // → Patient.versichertenArt
  PAT_KASSENNAME: '4102',  // → Patient.kassenname
  PAT_KASSENNR:   '4103',  // → Patient.kassennummer
  PAT_VERSNR:     '3105',  // → Patient.versichertenNr
  
  // Befund / Ergebnis
  BEFUND_TEXT:     '6220',  // Befundtext (mehrzeilig)
  BEFUND_DATUM:    '6200',  // Befunddatum (TTMMJJJJ)
  BEFUND_ZEIT:     '6201',  // Befundzeit (HHMMSS)
  TEST_IDENT:      '8410',  // Test-Identifikation
  TEST_BEZ:        '8411',  // Test-Bezeichnung
  ERGEBNIS_WERT:   '8420',  // Ergebniswert
  ERGEBNIS_EINH:   '8421',  // Ergebniseinheit
  KOMMENTAR:       '6227',  // Kommentar
  
  // GDT Ende
  SATZENDE:       '8100',
} as const;

export const GDT_SATZARTEN = {
  STAMMDATEN_ANFORDERN:     '6310',
  STAMMDATEN_UEBERMITTELN:  '6311',
  UNTERSUCHUNG_ANFORDERN:   '6302',
  UNTERSUCHUNG_UEBERMITTELN:'6310',
  ERGEBNIS_UEBERMITTELN:    '6301',
} as const;
```

### GDT-Parser (Kernlogik)

```typescript
// server/services/pvs/gdt/gdt-parser.ts

export interface GdtRecord {
  satzart: string;
  version: string;
  senderId: string;
  receiverId: string;
  fields: Map<string, string[]>; // Feldkennung → Werte (mehrfach möglich)
  raw: string;
}

export interface GdtPatientData {
  patNr: string;
  lastName: string;
  firstName: string;
  birthDate: Date | null;      // aus TTMMJJJJ
  gender: 'male' | 'female' | 'diverse' | 'unknown';
  insuranceType?: string;
  insuranceNr?: string;
  insuranceName?: string;
}

/**
 * GDT 3.0 Zeilen-Format:
 * [3-stellige Länge][4-stellige Feldkennung][Inhalt]\r\n
 * 
 * Beispiel: "01380001Stammdaten anfordern\r\n"
 *   → Länge=013, Feld=8000, Inhalt="1Stammdaten anfordern"
 *   (Eigentlich: Länge 013, Feld 8000, Inhalt abhängig)
 *
 * Korrekt: Jede Zeile = LLL FFFF DATEN
 *   LLL  = Zeilenlänge (3 Zeichen, inkl. sich selbst + CR LF)
 *   FFFF = Feldkennung (4 Zeichen)
 *   DATEN = Inhalt (Rest der Zeile)
 */
export function parseGdtFile(content: string, encoding?: string): GdtRecord {
  // Implementierung: Zeile für Zeile parsen
  // Encoding: ISO-8859-15 (Standard) oder CP437 (alt)
  // Validierung: Zeilenlänge prüfen, Pflichtfelder prüfen
}

export function extractPatientData(record: GdtRecord): GdtPatientData {
  // Mapping: GDT-Felder → GdtPatientData
  // Datums-Konvertierung: TTMMJJJJ → Date
  // Geschlecht: 1→male, 2→female, 3→diverse
}
```

### GDT-Writer (Export)

```typescript
// server/services/pvs/gdt/gdt-writer.ts

export interface GdtExportOptions {
  satzart: string;
  senderId: string;
  receiverId: string;
  encoding?: string;
}

/**
 * Baut eine GDT 3.0-Datei aus DiggAI-Anamnese-Ergebnis:
 * - Satzart 6301 (Untersuchungsergebnis übermitteln)
 * - Patient-Header (3000, 3101, 3102, 3103)
 * - Befundtext (6220): Strukturierter Anamnese-Bericht
 * - Pro Kategorie ein Befund-Block
 */
export function buildAnamneseResult(
  session: PatientSession & { patient: Patient; answers: Answer[] },
  triageEvents: TriageEvent[],
  options: GdtExportOptions
): string {
  // 1. Header (8000=Satzart, 9218=Version, 8402=Sender, 8401=Empfänger)
  // 2. Patient-Stammdaten (3000, 3101, 3102, 3103)
  // 3. Befunddatum/-zeit (6200, 6201)
  // 4. Test-Identifikation (8410="DIGGAI_ANAMNESE")
  // 5. Pro Answer-Kategorie:
  //    - 6220: "[Kategorie]: [Frage] → [Antwort]"
  // 6. Triage-Zusammenfassung:
  //    - 6220: "TRIAGE: [Level] - [Grund]"
  // 7. Kommentar (6227): Session-ID, Dauer, Sprache
}

/**
 * Datei in GDT-Export-Verzeichnis schreiben.
 * Dateiname: DIGGAI_[PatNr]_[Timestamp].gdt
 */
export async function writeGdtFile(
  content: string,
  exportDir: string,
  patientNr: string
): Promise<string> {
  // Atomisches Schreiben (temp → rename)
  // Encoding: ISO-8859-15
  // Return: Dateipfad
}
```

### GDT-Watcher (Auto-Import)

```typescript
// server/services/pvs/gdt/gdt-watcher.ts

import chokidar from 'chokidar';

/**
 * Überwacht das GDT-Import-Verzeichnis.
 * Bei neuer Datei:
 *   1. Datei parsen
 *   2. Satzart identifizieren
 *   3. Mapping ausführen
 *   4. In DiggAI-DB speichern
 *   5. Datei in Archiv verschieben
 *   6. Socket.IO Event senden
 *
 * Events:
 *   pvs:patient-imported  → Neuer Patient aus PVS
 *   pvs:session-requested → PVS fordert Anamnese an
 */
export class GdtWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  
  constructor(
    private importDir: string,
    private archiveDir: string,
    private onImport: (record: GdtRecord) => Promise<void>,
    private onError: (err: Error, file: string) => void
  ) {}
  
  start(): void {
    // chokidar.watch(importDir, { 
    //   awaitWriteFinish: { stabilityThreshold: 500 },
    //   ignoreInitial: true 
    // })
  }
  
  stop(): void { /* watcher.close() */ }
}
```

---

## 3.4 FHIR R4 Engine

### FHIR-Ressourcen-Mapping

| DiggAI Model | FHIR Resource | Profil |
|--------------|---------------|--------|
| Patient | Patient | `de.basisprofil.patient` (KBV 1.5.0) |
| PatientSession | Encounter | `de.basisprofil.encounter` |
| Answer | QuestionnaireResponse | FHIR Core |
| MedicalAtom (Fragen) | Questionnaire | FHIR Core |
| TriageEvent | Flag + RiskAssessment | FHIR Core |
| PatientMedication | MedicationStatement | `de.basisprofil.medication` |
| PatientSurgery | Procedure | `de.basisprofil.procedure` |
| TherapyPlan (Modul 4) | CarePlan | FHIR Core |

### FHIR-Client

```typescript
// server/services/pvs/fhir/fhir-client.ts

export interface FhirClientConfig {
  baseUrl: string;
  authType: 'basic' | 'oauth2' | 'apikey';
  credentials: {
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    apiKey?: string;
  };
  timeout?: number;        // Default: 10000ms
  retryCount?: number;     // Default: 3
}

export class FhirClient {
  // CRUD-Operationen auf FHIR-Server
  async read<T>(resourceType: string, id: string): Promise<T>;
  async search<T>(resourceType: string, params: Record<string, string>): Promise<Bundle<T>>;
  async create<T>(resource: T): Promise<T>;
  async update<T>(resource: T): Promise<T>;
  async transaction(bundle: Bundle): Promise<Bundle>;
  
  // Spezifisch
  async searchPatient(kvnr: string): Promise<FhirPatient | null>;
  async submitAnamnese(session: PatientSession, answers: Answer[]): Promise<Bundle>;
}
```

### FHIR-Mapper: DiggAI → FHIR

```typescript
// server/services/pvs/fhir/fhir-mapper.ts

/**
 * Patient → FHIR Patient Resource
 * Basiert auf: KBV_PR_Base_Patient (1.5.0)
 */
export function patientToFhir(patient: Patient): FhirPatient {
  return {
    resourceType: 'Patient',
    meta: {
      profile: ['https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Patient|1.5.0']
    },
    identifier: [
      {
        type: { coding: [{ system: 'http://fhir.de/CodeSystem/identifier-type-de-basis', code: 'GKV' }] },
        system: 'http://fhir.de/sid/gkv/kvid-10',
        value: patient.versichertenNr ?? undefined
      },
      {
        system: 'https://diggai.de/sid/patient-id',
        value: patient.id
      }
    ],
    name: [{
      family: patient.lastName,
      given: [patient.firstName],
      use: 'official'
    }],
    birthDate: patient.dateOfBirth?.toISOString().split('T')[0],
    gender: mapGender(patient.gender), // male | female | other | unknown
  };
}

/**
 * Answers + Session → FHIR QuestionnaireResponse
 */
export function answersToQuestionnaireResponse(
  session: PatientSession,
  answers: Answer[],
  atoms: MedicalAtom[]
): FhirQuestionnaireResponse {
  // Questionnaire-URL: https://diggai.de/fhir/Questionnaire/anamnese-v1
  // Items gruppiert nach Kategorie
  // Jede Answer → item mit linkId = atom.id
}

/**
 * TriageEvent → FHIR Flag + RiskAssessment
 */
export function triageToFhir(triage: TriageEvent): [FhirFlag, FhirRiskAssessment] {
  // Flag.code: Triage-Level (rot/gelb/grün)
  // RiskAssessment.prediction: Dringlichkeit
}

/**
 * Komplettes Anamnese-Ergebnis als Transaction Bundle
 */
export function buildAnamneseBundle(
  patient: Patient,
  session: PatientSession,
  answers: Answer[],
  triage: TriageEvent[],
  medications: PatientMedication[],
  surgeries: PatientSurgery[]
): FhirBundle {
  // Bundle.type = 'transaction'
  // Alle Resources mit request.method = 'POST'
}
```

### DE-Basisprofile Integration

```typescript
// server/services/pvs/fhir/fhir-profiles.ts

/**
 * Validiert FHIR Resource gegen DE-Basisprofile.
 * Verwendet: @ahdis/fhir-validation (npm) oder eigene Constraints.
 * 
 * KBV-Profile:
 * - KBV_PR_Base_Patient (1.5.0)
 * - KBV_PR_Base_Medication (1.5.0)
 * - KBV_PR_Base_Procedure (1.5.0)
 */
export function validateAgainstProfile(
  resource: FhirResource,
  profileUrl: string
): ValidationResult {
  // Pflichtfelder prüfen
  // Coding-Systeme validieren (SNOMED CT, ICD-10-GM, OPS)
  // Identifier-Formate prüfen
}
```

---

## 3.5 PVS-Adapter

### Adapter-Interface

```typescript
// server/services/pvs/adapters/adapter.interface.ts

export interface PvsAdapter {
  readonly type: PvsType;
  readonly supportedProtocols: PvsProtocol[];
  
  // Lifecycle
  initialize(connection: PvsConnection): Promise<void>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
  disconnect(): Promise<void>;
  
  // Patient
  importPatient(externalId: string): Promise<GdtPatientData | FhirPatient>;
  exportPatient(patient: Patient): Promise<string>; // Returns PVS-Referenz
  searchPatient(query: { name?: string; birthDate?: string; kvnr?: string }): Promise<PatientSearchResult[]>;
  
  // Anamnese-Ergebnis
  exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult>;
  
  // Therapieplan (Modul 4)
  exportTherapyPlan?(plan: TherapyPlan): Promise<TransferResult>;
  
  // Status
  getCapabilities(): AdapterCapabilities;
}

export interface AdapterCapabilities {
  canImportPatients: boolean;
  canExportResults: boolean;
  canExportTherapyPlans: boolean;
  canReceiveOrders: boolean;       // PVS kann Anamnese-Auftrag senden
  canSearchPatients: boolean;
  supportsRealtime: boolean;       // WebSocket/Polling
  supportedSatzarten: string[];    // GDT-Satzarten
  supportedFhirResources: string[];
}

export interface TransferResult {
  success: boolean;
  transferLogId: string;
  pvsReferenceId?: string;
  warnings?: string[];
  error?: string;
}
```

### CGM M1 PRO Adapter (Beispiel)

```typescript
// server/services/pvs/adapters/cgm-m1.adapter.ts

export class CgmM1Adapter implements PvsAdapter {
  readonly type = PvsType.CGM_M1;
  readonly supportedProtocols = [PvsProtocol.GDT, PvsProtocol.REST];
  
  private gdtWatcher: GdtWatcher | null = null;
  private connection: PvsConnection | null = null;

  async initialize(connection: PvsConnection): Promise<void> {
    this.connection = connection;
    
    if (connection.protocol === 'GDT') {
      // GDT-Modus: File-Watcher starten
      // CGM M1-spezifisch: Verzeichnis ist meist C:\CGM\M1\GDT
      // Dateiname-Konvention: DIGG[Nr].gdt
      this.gdtWatcher = new GdtWatcher(
        connection.gdtImportDir!,
        path.join(connection.gdtImportDir!, 'archiv'),
        this.handleGdtImport.bind(this),
        this.handleGdtError.bind(this)
      );
      this.gdtWatcher.start();
    }
    
    // M1 hat auch REST-API (ab Version 4.x)
    // Optional: REST-Client initialisieren
  }
  
  async exportAnamneseResult(session: PatientSessionFull): Promise<TransferResult> {
    // 1. GDT 6301 (Untersuchungsergebnis) bauen
    // 2. Anamnese-Zusammenfassung als Befundtext (6220)
    // 3. Triage als Kommentar (6227)
    // 4. In Export-Dir schreiben
    // 5. TransferLog erstellen
  }
  
  getCapabilities(): AdapterCapabilities {
    return {
      canImportPatients: true,
      canExportResults: true,
      canExportTherapyPlans: false, // M1 unterstützt keine direkte Plan-Übernahme
      canReceiveOrders: true,       // Satzart 6302
      canSearchPatients: true,      // Über Satzart 6310
      supportsRealtime: false,      // Nur File-basiert
      supportedSatzarten: ['6310', '6311', '6302', '6301'],
      supportedFhirResources: [],
    };
  }
}
```

### Adapter-Registry

```typescript
// server/services/pvs/pvs-router.service.ts

const ADAPTER_REGISTRY: Record<PvsType, new () => PvsAdapter> = {
  CGM_M1:       CgmM1Adapter,
  MEDATIXX:     MedatixxAdapter,
  MEDISTAR:     MedistarAdapter,
  T2MED:        T2MedAdapter,
  X_ISYNET:     MedatixxAdapter,  // Gleicher Hersteller, gleiche Schnittstelle
  DOCTOLIB:     DoctolibAdapter,
  TURBOMED:     CgmM1Adapter,     // CGM-Familie, ähnliche Schnittstelle
  FHIR_GENERIC: FhirGenericAdapter,
};

export class PvsRouter {
  private activeAdapters = new Map<string, PvsAdapter>();
  
  async getAdapter(connectionId: string): Promise<PvsAdapter> {
    if (this.activeAdapters.has(connectionId)) {
      return this.activeAdapters.get(connectionId)!;
    }
    const conn = await prisma.pvsConnection.findUniqueOrThrow({ where: { id: connectionId } });
    const AdapterClass = ADAPTER_REGISTRY[conn.pvsType];
    const adapter = new AdapterClass();
    await adapter.initialize(conn);
    this.activeAdapters.set(connectionId, adapter);
    return adapter;
  }
  
  async exportAnamnese(connectionId: string, sessionId: string): Promise<TransferResult> {
    // 1. Adapter holen
    // 2. Session + Answers + Triage laden (Prisma)
    // 3. adapter.exportAnamneseResult(session)
    // 4. TransferLog speichern
    // 5. Socket.IO: pvs:export-completed
  }
}
```

---

## 3.6 API-Endpunkte

### PVS-Verwaltung

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 1 | `GET` | `/api/pvs/connection` | admin | Aktive PVS-Verbindung abrufen |
| 2 | `POST` | `/api/pvs/connection` | admin | PVS-Verbindung konfigurieren |
| 3 | `PUT` | `/api/pvs/connection/:id` | admin | Verbindung aktualisieren |
| 4 | `POST` | `/api/pvs/connection/:id/test` | admin | Verbindung testen |
| 5 | `DELETE` | `/api/pvs/connection/:id` | admin | Verbindung deaktivieren |
| 6 | `GET` | `/api/pvs/connection/:id/capabilities` | admin | Adapter-Fähigkeiten |

### Transfer-Operationen

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 7 | `POST` | `/api/pvs/export/session/:sessionId` | arzt,admin | Anamnese an PVS exportieren |
| 8 | `POST` | `/api/pvs/export/batch` | admin | Mehrere Sessions exportieren |
| 9 | `POST` | `/api/pvs/import/patient` | arzt,admin | Patient aus PVS importieren |
| 10 | `GET` | `/api/pvs/patient-link/:patientId` | arzt,admin | PVS-Verknüpfung abrufen |
| 11 | `POST` | `/api/pvs/patient-link` | arzt,admin | Patient mit PVS verknüpfen |
| 12 | `DELETE` | `/api/pvs/patient-link/:id` | admin | Verknüpfung lösen |

### Transfer-Log & Monitoring

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 13 | `GET` | `/api/pvs/transfers` | admin | Transfer-Historie (paginiert, filterbar) |
| 14 | `GET` | `/api/pvs/transfers/:id` | admin | Transfer-Details |
| 15 | `POST` | `/api/pvs/transfers/:id/retry` | admin | Fehlgeschlagenen Transfer wiederholen |
| 16 | `GET` | `/api/pvs/transfers/stats` | admin | Transfer-Statistiken |

### Field-Mapping

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 17 | `GET` | `/api/pvs/mappings/:connectionId` | admin | Feld-Mappings abrufen |
| 18 | `PUT` | `/api/pvs/mappings/:connectionId` | admin | Custom-Mappings speichern |
| 19 | `POST` | `/api/pvs/mappings/:connectionId/reset` | admin | Auf Defaults zurücksetzen |
| 20 | `POST` | `/api/pvs/mappings/preview` | admin | Mapping-Vorschau (Dry-Run) |

### Endpunkt-Details (Beispiele)

```typescript
// POST /api/pvs/connection
// Request:
{
  "pvsType": "CGM_M1",
  "protocol": "GDT",
  "gdtImportDir": "C:\\CGM\\M1\\GDT\\Import",
  "gdtExportDir": "C:\\CGM\\M1\\GDT\\Export",
  "gdtSenderId": "DIGGAI01",
  "gdtReceiverId": "CGMM1001",
  "syncIntervalSec": 30,
  "autoMapFields": true
}
// Response: 201 Created
{
  "id": "uuid",
  "pvsType": "CGM_M1",
  "isActive": true,
  "testResult": { "ok": true, "message": "GDT-Verzeichnis erreichbar" }
}

// POST /api/pvs/export/session/:sessionId
// Request:
{
  "format": "gdt",             // "gdt" | "fhir" | "auto"
  "includeTriageDetails": true,
  "includeMedications": true,
  "befundFormat": "structured"  // "structured" | "freetext" | "both"
}
// Response: 200 OK
{
  "transferId": "uuid",
  "status": "COMPLETED",
  "pvsReferenceId": "BEF-2026-0304-001",
  "warnings": [],
  "exportedFields": 42
}
```

### Socket.IO Events (PVS)

| Event | Richtung | Payload | Beschreibung |
|-------|----------|---------|------------|
| `pvs:patient-imported` | Server → Client | `{ patient, source, pvsType }` | Patient aus PVS importiert |
| `pvs:export-completed` | Server → Client | `{ sessionId, transferId, status }` | Export abgeschlossen |
| `pvs:export-failed` | Server → Client | `{ sessionId, error, canRetry }` | Export fehlgeschlagen |
| `pvs:session-requested` | Server → Client | `{ patientNr, satzart }` | PVS fordert Anamnese an |
| `pvs:connection-status` | Server → Client | `{ connectionId, isOnline }` | Verbindungsstatus |

### Route-Datei

```
server/
  routes/
    pvs.ts                    // Alle PVS-Endpunkte
```

---

## 3.7 Frontend-Komponenten

### Neue Komponenten

```
src/
  components/
    pvs/
      PvsConnectionWizard.tsx    // Setup-Wizard (3 Schritte)
      PvsConnectionStatus.tsx    // Status-Badge + Mini-Dashboard
      PvsTransferLog.tsx         // Transfer-Historie-Tabelle
      PvsFieldMapper.tsx         // Visueller Field-Mapping-Editor
      PvsExportDialog.tsx        // Export-Modal für ArztDashboard
      PvsPatientSearch.tsx       // Patient in PVS suchen
      PvsPatientLink.tsx         // Patient verknüpfen
      PvsSetupGuide.tsx          // PVS-spezifischer Setup-Guide
  pages/
    admin/
      PvsAdminPanel.tsx          // Admin-Tab für PVS-Verwaltung
```

### PvsConnectionWizard.tsx

```
┌─────────────────────────────────────────────────────────┐
│  PVS-Verbindung einrichten                    [X]        │
│                                                          │
│  Schritt [1]───[2]───[3]                                │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Welches PVS verwenden Sie?                       │  │
│  │                                                    │  │
│  │  [🏥 CGM M1 PRO]  [📋 medatixx]  [💊 Medistar]   │  │
│  │  [🔬 T2Med]       [📊 x.isynet]  [🌐 Doctolib]   │  │
│  │  [⚙️ Andere (FHIR)]                               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Schritt 2 (PVS-spezifisch):                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  GDT-Konfiguration (CGM M1)                       │  │
│  │                                                    │  │
│  │  Import-Verzeichnis: [C:\CGM\M1\GDT\Import    ]   │  │
│  │  Export-Verzeichnis: [C:\CGM\M1\GDT\Export    ]    │  │
│  │  Sender-ID:          [DIGGAI01]                    │  │
│  │  Empfänger-ID:       [CGMM1001]                    │  │
│  │  Zeichensatz:        [ISO-8859-15 ▼]               │  │
│  │                                                    │  │
│  │  [📂 Auto-Erkennung]                               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Schritt 3:                                              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Verbindungstest                                   │  │
│  │                                                    │  │
│  │  ✅ GDT-Verzeichnis erreichbar                    │  │
│  │  ✅ Schreibrechte vorhanden                       │  │
│  │  ✅ Testdatei erfolgreich geschrieben/gelesen     │  │
│  │  ✅ Standard-Mapping geladen (42 Felder)          │  │
│  │                                                    │  │
│  │  [Verbindung speichern]                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [Zurück]                                 [Weiter →]     │
└─────────────────────────────────────────────────────────┘
```

### PvsExportDialog.tsx (im ArztDashboard)

```
┌────────────────────────────────────────────────────┐
│  Anamnese an PVS senden               [X]          │
│                                                     │
│  Patient: Max Mustermann (*15.03.1985)              │
│  Session: 04.03.2026, 14:32 (47 Antworten)         │
│  PVS:     CGM M1 PRO (GDT)                         │
│                                                     │
│  Format:                                            │
│  (●) GDT 3.0 — Befundtext                          │
│  ( ) FHIR R4 — Strukturierte Daten                  │
│                                                     │
│  Optionen:                                          │
│  [✓] Triage-Details einschließen                    │
│  [✓] Medikamentenliste einschließen                 │
│  [✓] Voroperationen einschließen                    │
│  [ ] Gamification-Ergebnisse (Debug)                │
│                                                     │
│  Befund-Format:                                     │
│  (●) Strukturiert (Kategorien + Fragen)             │
│  ( ) Fließtext                                      │
│  ( ) Beides                                         │
│                                                     │
│  Vorschau:                                          │
│  ┌──────────────────────────────────────────────┐   │
│  │ DIGGAI ANAMNESE-BERICHT                      │   │
│  │ ═══════════════════════════                   │   │
│  │ Patient: Mustermann, Max (*15.03.1985)        │   │
│  │ Datum: 04.03.2026 14:32                       │   │
│  │ Dauer: 12min | Sprache: DE | 47 Antworten    │   │
│  │                                               │   │
│  │ TRIAGE: 🟡 GELB — Mittel                     │   │
│  │ Grund: Brustschmerz + Raucheranamnese         │   │
│  │                                               │   │
│  │ ── AKTUELLE BESCHWERDEN ──                    │   │
│  │ Hauptbeschwerde: Brustschmerzen               │   │
│  │ Schmerzskala: 6/10                            │   │
│  │ Seit wann: 3 Tagen                            │   │
│  │ ...                                           │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [Abbrechen]                   [📤 An PVS senden]   │
└────────────────────────────────────────────────────┘
```

### PvsTransferLog.tsx (Admin-Panel)

```
┌────────────────────────────────────────────────────────────────┐
│  PVS-Transfer-Protokoll                                        │
│                                                                 │
│  Filter: [Alle ▼]  [Letzten 7 Tage ▼]  [🔍 Suche...]         │
│                                                                 │
│  ┌──────────┬──────┬─────────┬────────┬───────┬──────────────┐ │
│  │ Zeitpunkt│ Typ  │ Patient │ Status │ PVS   │ Aktion       │ │
│  ├──────────┼──────┼─────────┼────────┼───────┼──────────────┤ │
│  │ 14:32    │ ⬆EXP │ Muster..│ ✅     │ M1    │ [Details]    │ │
│  │ 14:30    │ ⬇IMP │ Schmidt │ ✅     │ M1    │ [Details]    │ │
│  │ 13:45    │ ⬆EXP │ Meyer   │ ❌     │ M1    │ [🔄 Retry]  │ │
│  │ 13:20    │ ⬇IMP │ Özdemir │ ✅     │ M1    │ [Details]    │ │
│  │ 11:00    │ ⬆EXP │ Kowalsk │ ⏳     │ FHIR  │ [Abbrechen]  │ │
│  └──────────┴──────┴─────────┴────────┴───────┴──────────────┘ │
│                                                                 │
│  Statistik: 156 Transfers heute | 2 fehlgeschlagen | 99% Quote  │
│  Seite 1/12  [← Zurück] [Weiter →]                             │
└────────────────────────────────────────────────────────────────┘
```

### Integration in bestehende Komponenten

| Bestehende Komponente | Änderung |
|----------------------|----------|
| **ArztDashboard.tsx** | Neuer Button "An PVS senden" pro Patient → öffnet PvsExportDialog |
| **AdminDashboard.tsx** | Neuer Tab "PVS" → lädt PvsAdminPanel |
| **PatientDetail** (im ArztDashboard) | PVS-Status-Badge, PVS-Import-Hinweis |
| **SessionComplete** | Optional: Auto-Export anbieten ("Befund automatisch an PVS senden?") |

---

## 3.8 Mapping-Logik

### DiggAI Answer Categories → GDT-Befundtext

```typescript
// server/services/pvs/mapping/mapping-engine.ts

/**
 * Anamnese-Antworten → Strukturierter Befundtext für GDT 6220.
 * 
 * Format:
 * ════════════════════════════════════
 * DIGGAI ANAMNESE-BERICHT
 * ════════════════════════════════════
 * Patient: [Name], [Vorname] (*[Geburtsdatum])
 * Datum: [Datum] [Uhrzeit]
 * Dauer: [Dauer] | Sprache: [Sprache] | [Anzahl] Antworten
 * 
 * TRIAGE: [Emoji] [Level] — [Bezeichnung]
 * Grund: [Triage-Gründe]
 * 
 * ── [KATEGORIE 1] ──
 * [Frage 1]: [Antwort 1]
 * [Frage 2]: [Antwort 2]
 * ...
 */
export function buildBefundtext(
  session: PatientSessionFull,
  format: 'structured' | 'freetext' | 'both'
): string[] {
  // Returns Array von Zeilen (jede → ein 6220-Feld)
}
```

### Answer-Kategorie → ICD-10 Hinweis (optional)

```typescript
/**
 * Optionales Feature: Anamnese-Antworten mit ICD-10-GM Verdachtsdiagnosen
 * annotieren. Nur als Hinweis, nicht als Diagnose!
 * 
 * Mapping basiert auf Symptom-Patterns:
 * - "Brustschmerzen" + "Ausstrahlung in Arm" → R07.4 (Brustschmerzen)
 * - "Kopfschmerzen" + "Nackensteifigkeit" → R51 (Kopfschmerz)
 * 
 * WICHTIG: Immer als "V.a." (Verdacht auf) kennzeichnen!
 */
export function suggestIcdCodes(answers: Answer[], atoms: MedicalAtom[]): IcdSuggestion[];
```

### Standard-Mapping-Tabelle (Default)

| DiggAI-Feld | GDT-Feld | FHIR-Path | Transformation |
|-------------|----------|-----------|---------------|
| `Patient.firstName` | `3102` | `Patient.name.given` | direct |
| `Patient.lastName` | `3101` | `Patient.name.family` | direct |
| `Patient.dateOfBirth` | `3103` | `Patient.birthDate` | GDT: `TTMMJJJJ`, FHIR: `YYYY-MM-DD` |
| `Patient.gender` | `3110` | `Patient.gender` | GDT: `1/2/3`, FHIR: `male/female/other` |
| `Patient.versichertenNr` | `3105` | `Patient.identifier[GKV]` | direct |
| `Patient.kassenname` | `4102` | `Patient.insurance.display` | direct |
| `Patient.kassennummer` | `4103` | `Patient.insurance.identifier` | direct |
| `Session.startedAt` | `6200`+`6201` | `Encounter.period.start` | GDT: Datum+Zeit, FHIR: ISO8601 |
| `Session.completedAt` | — | `Encounter.period.end` | — |
| `Session.language` | `6227` | `Encounter.language` | Als Kommentar / BCP-47 |
| `Answer.*` (alle) | `6220` (Befundtext) | `QuestionnaireResponse.item` | Kategorien-gruppiert |
| `TriageEvent.level` | `6220` + `6227` | `Flag.code` | Text / Coding |
| `Medication.name` | `6220` | `MedicationStatement.code` | Als Befundtext / Coding |
| `Surgery.name` | `6220` | `Procedure.code` | Als Befundtext / Coding |

---

## 3.9 Sicherheit & Compliance

### Datenschutz-Anforderungen

| Anforderung | Umsetzung |
|-------------|-----------|
| **Transportverschlüsselung** | FHIR: TLS 1.3, GDT: Lokales Dateisystem (kein Netzwerk), KIM: TI-Verschlüsselung |
| **Speicher-Verschlüsselung** | `PvsConnection.fhirCredentials`: AES-256-GCM (wie bestehende Implementierung) |
| **Audit-Trail** | Jeder Transfer in `PvsTransferLog` mit Initiator, Zeitstempel, Payload-Hash |
| **Datenminimierung** | Nur medizinisch relevante Felder exportieren, keine Gamification-Daten |
| **Einwilligung** | Patient-Consent für PVS-Export (eigenes Consent-Flag in PatientSession) |
| **Löschrecht** | Cascade-Delete: Patient löschen → PvsPatientLink + TransferLogs löschen |
| **rawPayload-Retention** | Verschlüsselt, automatische Löschung nach 30 Tagen (Cron-Job) |

### GDT-Sicherheit

```
- Dateisystem-Berechtigungen: Nur DiggAI + PVS haben Zugriff auf GDT-Verzeichnisse
- Archiv-Verzeichnis: Verarbeitete GDT-Dateien werden verschoben, nicht gelöscht
- Validierung: Jede importierte GDT-Datei wird gegen Schema validiert
- Injection-Schutz: GDT-Inhalte werden sanitized (keine Steuerzeichen außer \r\n)
```

### Neue Permissions (Modul 2 Erweiterung)

| Permission Code | Beschreibung | Default-Rollen |
|----------------|-------------|----------------|
| `pvs.connection.manage` | PVS-Verbindung konfigurieren | admin |
| `pvs.export.execute` | Anamnese an PVS senden | admin, arzt |
| `pvs.import.execute` | Patient aus PVS importieren | admin, arzt |
| `pvs.transfer.view` | Transfer-Log einsehen | admin |
| `pvs.transfer.retry` | Transfer wiederholen | admin |
| `pvs.mapping.manage` | Field-Mappings ändern | admin |

---

# Modul 4 — Therapieplan & Arzt-Assistenz

## 4.1 Übersicht & Architektur

### Ziel
Ein intelligentes Therapieplan-System, das Ärzten nach der Anamnese strukturierte Behandlungsvorschläge generiert, Patient-Tracking ermöglicht und durch KI-Assistenz die Dokumentation beschleunigt.

### Kern-Features

| Feature | Beschreibung | Modus |
|---------|-------------|-------|
| **Therapieplan-Builder** | Strukturierter Plan aus Templates + KI | Lite: Templates only, Pro: KI-generiert |
| **Plan-Tracking** | Patient-Fortschritt (Termine, Maßnahmen, Medikamente) | Beide |
| **Arzt-KI-Assistent** | Echtzeit-Zusammenfassung + Vorschläge während Anamnese | Pro only |
| **Dual-Display** | Arzt sieht KI-Annotations, Patient sieht normale Anamnese | Pro only |
| **Echtzeit-Alerts** | Automatische Warnung bei kritischen Werten | Beide |
| **Anonymisierte ID** | Kein Klarname in Analytics/Export, nur Pseudonym | Beide |
| **PVS-Export** | Therapieplan → GDT/FHIR (nutzt Modul 3) | Beide |

### Architektur-Diagramm

```
┌──────────────────────────────────────────────────────────┐
│                    ArztDashboard                          │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Patient-    │  │ Therapieplan │  │ KI-Assistent   │  │
│  │ Detail      │  │ Builder      │  │ Panel (Pro)    │  │
│  │             │  │              │  │                │  │
│  │ Anamnese    │  │ Templates    │  │ Zusammenfassung│  │
│  │ Ergebnis    │  │ + KI-Füllung │  │ Vorschläge     │  │
│  │ Triage      │  │ Maßnahmen    │  │ ICD-Hinweise   │  │
│  │ Alerts ⚠️   │  │ Medikamente  │  │ Red Flags      │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                │                   │           │
│         └────────────────┼───────────────────┘           │
│                          │                               │
│  ┌───────────────────────▼─────────────────────────────┐ │
│  │              Therapieplan-Service                     │ │
│  │  REST API + Socket.IO (Echtzeit-Updates)             │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                          │                               │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │  KI-Engine (Pro)           │  Template-Engine (Lite) │ │
│  │  - Lokales LLM (Llama/    │  - Vordefinierte Pläne  │ │
│  │    Mistral)                │  - Regelbasierte        │ │
│  │  - Prompt-Templates       │    Vorschläge            │ │
│  │  - Context: Anamnese +    │  - Checklisten           │ │
│  │    Triage + History       │                          │ │
│  └───────────────────────────┴──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Design-Prinzipien
1. **Lite/Pro Dual-Mode**: Alle Features funktionieren ohne KI (Templates), Pro erweitert mit LLM
2. **Arzt bleibt Entscheider**: KI macht Vorschläge, Arzt bestätigt/ändert/verwirft
3. **Anonymisierung by Design**: Analytics und Exports nutzen Pseudonym-IDs
4. **Echtzeit**: Socket.IO für Live-Alerts und KI-Suggestions während Anamnese
5. **PVS-Ready**: Therapiepläne exportierbar als GDT-Befund oder FHIR CarePlan

---

## 4.2 Prisma-Schema-Erweiterungen

### Neue Models

```prisma
// ============================================
// MODUL 4: Therapieplan & Arzt-Assistenz
// ============================================

enum TherapyStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  CANCELLED
}

enum MeasureStatus {
  PLANNED
  IN_PROGRESS
  COMPLETED
  SKIPPED
  OVERDUE
}

enum MeasureType {
  MEDICATION
  PROCEDURE
  REFERRAL        // Überweisung
  LAB_ORDER       // Laborauftrag
  IMAGING         // Bildgebung
  LIFESTYLE       // Lebensstilberatung
  FOLLOW_UP       // Wiedervorstellung
  DOCUMENTATION   // Arztbrief etc.
  CUSTOM
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
  EMERGENCY
}

enum AlertCategory {
  VITAL_SIGN          // Kritischer Vitalwert
  DRUG_INTERACTION    // Medikamenten-Wechselwirkung
  ALLERGY_CONFLICT    // Allergie-Medikament-Konflikt
  TRIAGE_ESCALATION   // Triage-Eskalation
  SYMPTOM_PATTERN     // Verdächtiges Symptommuster
  AGE_RISK            // Altersabhängiges Risiko
  CUSTOM
}

model TherapyPlan {
  id              String          @id @default(uuid())
  sessionId       String
  session         PatientSession  @relation(fields: [sessionId], references: [id])
  patientId       String
  patient         Patient         @relation(fields: [patientId], references: [id])
  createdById     String
  createdBy       ArztUser        @relation("TherapyPlanCreator", fields: [createdById], references: [id])
  
  // Plan-Details
  title           String          // "Therapieplan vom 04.03.2026"
  status          TherapyStatus   @default(DRAFT)
  diagnosis       String?         // Freitext oder ICD-10
  icdCodes        String[]        // ICD-10-GM Codes
  summary         String?         // KI-generierte oder manuelle Zusammenfassung
  
  // KI-Metadaten
  aiGenerated     Boolean         @default(false)
  aiModel         String?         // z.B. "llama-3.1-8b" oder null
  aiConfidence    Float?          // 0.0 - 1.0
  aiPromptHash    String?         // Hash des verwendeten Prompts (Nachvollziehbarkeit)
  
  // Zeitrahmen
  startDate       DateTime        @default(now())
  targetEndDate   DateTime?
  actualEndDate   DateTime?
  
  // Review
  lastReviewedAt  DateTime?
  lastReviewedBy  String?
  nextReviewDate  DateTime?
  
  // PVS-Export
  pvsExported     Boolean         @default(false)
  pvsExportedAt   DateTime?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  measures        TherapyMeasure[]
  alerts          ClinicalAlert[]
  
  @@index([patientId])
  @@index([sessionId])
  @@index([status])
  @@index([createdById])
}

model TherapyMeasure {
  id              String          @id @default(uuid())
  planId          String
  plan            TherapyPlan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  
  // Maßnahme
  type            MeasureType
  title           String          // z.B. "Ibuprofen 400mg"
  description     String?         // Details / Anweisungen
  status          MeasureStatus   @default(PLANNED)
  priority        Int             @default(0) // Reihenfolge
  
  // Medikament-spezifisch
  medicationName  String?
  dosage          String?         // "1-0-1" oder "400mg alle 8h"
  duration        String?         // "7 Tage" oder "dauerhaft"
  pzn             String?         // Pharmazentralnummer
  atcCode         String?         // ATC-Code
  
  // Überweisung-spezifisch
  referralTo      String?         // Fachrichtung
  referralReason  String?
  referralUrgency String?         // "normal" | "dringend" | "sofort"
  
  // Labor-spezifisch
  labParameters   String[]        // z.B. ["CRP", "BSG", "BB"]
  
  // Zeitplanung
  scheduledDate   DateTime?
  completedDate   DateTime?
  dueDate         DateTime?
  
  // KI-Metadaten
  aiSuggested     Boolean         @default(false)
  aiConfidence    Float?
  arztApproved    Boolean         @default(false)
  arztModified    Boolean         @default(false)
  
  // Notizen
  notes           String?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([planId, priority])
  @@index([status])
}

model ClinicalAlert {
  id              String          @id @default(uuid())
  
  // Kontext
  sessionId       String?
  session         PatientSession? @relation(fields: [sessionId], references: [id])
  planId          String?
  plan            TherapyPlan?    @relation(fields: [planId], references: [id])
  patientId       String
  patient         Patient         @relation(fields: [patientId], references: [id])
  
  // Alert-Details
  severity        AlertSeverity
  category        AlertCategory
  title           String          // "Kritischer Blutdruck"
  message         String          // "Systolisch > 180 mmHg bei bekannter Hypertonie"
  
  // Trigger
  triggerField    String?         // Welche Antwort hat Alert ausgelöst
  triggerValue    String?         // Wert der Antwort
  triggerRule     String?         // Regel-ID oder Beschreibung
  
  // Zustand
  isRead          Boolean         @default(false)
  readAt          DateTime?
  readBy          String?
  isDismissed     Boolean         @default(false)
  dismissedAt     DateTime?
  dismissedBy     String?
  dismissReason   String?
  
  // Aktion
  actionTaken     String?         // Was wurde unternommen
  actionTakenAt   DateTime?
  actionTakenBy   String?
  
  createdAt       DateTime        @default(now())
  
  @@index([patientId, severity])
  @@index([sessionId])
  @@index([isRead, severity])
  @@index([createdAt])
}

model TherapyTemplate {
  id              String          @id @default(uuid())
  
  // Template-Infos
  name            String          // "Rückenschmerzen — Konservativ"
  description     String?
  category        String          // ICD-Kapitel oder Fachgebiet
  icdCodes        String[]        // Zutreffende ICD-10 Codes
  
  // Template-Inhalt
  measures        Json            // TherapyMeasure[] als JSON-Template
  defaultDuration String?         // "14 Tage"
  
  // Nutzung
  isDefault       Boolean         @default(false) // System-Template
  createdById     String?         // null = System-Template
  usageCount      Int             @default(0)
  
  // Status
  isActive        Boolean         @default(true)
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  @@index([category])
  @@index([isActive])
}

model AnonPatientId {
  id              String          @id @default(uuid())
  patientId       String          @unique
  patient         Patient         @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  pseudonym       String          @unique // z.B. "PAT-A7X3-K9M2"
  
  createdAt       DateTime        @default(now())
  
  @@index([pseudonym])
}
```

### Erweiterungen bestehender Models

```prisma
// Patient — Erweiterung
model Patient {
  // ... bestehende Felder + Modul 3 Felder ...
  
  // NEU: Modul 4
  therapyPlans    TherapyPlan[]
  clinicalAlerts  ClinicalAlert[]
  anonId          AnonPatientId?
}

// ArztUser — Erweiterung
model ArztUser {
  // ... bestehende Felder ...
  
  // NEU: Modul 4
  createdTherapyPlans  TherapyPlan[]  @relation("TherapyPlanCreator")
}

// PatientSession — Erweiterung (zusätzlich zu Modul 3)
model PatientSession {
  // ... bestehende + Modul 3 Felder ...
  
  // NEU: Modul 4
  clinicalAlerts  ClinicalAlert[]
}
```

---

## 4.3 API-Endpunkte

### Therapieplan CRUD

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 1 | `POST` | `/api/therapy/plans` | arzt,admin | Neuen Plan erstellen |
| 2 | `GET` | `/api/therapy/plans/:id` | arzt,admin | Plan abrufen |
| 3 | `PUT` | `/api/therapy/plans/:id` | arzt,admin | Plan aktualisieren |
| 4 | `DELETE` | `/api/therapy/plans/:id` | arzt,admin | Plan löschen |
| 5 | `GET` | `/api/therapy/plans/patient/:patientId` | arzt,admin | Alle Pläne eines Patienten |
| 6 | `GET` | `/api/therapy/plans/session/:sessionId` | arzt,admin | Pläne einer Session |
| 7 | `PUT` | `/api/therapy/plans/:id/status` | arzt,admin | Status ändern (ACTIVE, PAUSED, ...) |

### Maßnahmen CRUD

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 8 | `POST` | `/api/therapy/plans/:planId/measures` | arzt,admin | Maßnahme hinzufügen |
| 9 | `PUT` | `/api/therapy/measures/:id` | arzt,admin | Maßnahme aktualisieren |
| 10 | `DELETE` | `/api/therapy/measures/:id` | arzt,admin | Maßnahme entfernen |
| 11 | `PUT` | `/api/therapy/measures/:id/status` | arzt,admin | Status ändern |
| 12 | `PUT` | `/api/therapy/plans/:planId/measures/reorder` | arzt,admin | Reihenfolge ändern |

### Templates

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 13 | `GET` | `/api/therapy/templates` | arzt,admin | Alle Templates |
| 14 | `GET` | `/api/therapy/templates/:id` | arzt,admin | Template-Details |
| 15 | `POST` | `/api/therapy/templates` | admin | Template erstellen |
| 16 | `PUT` | `/api/therapy/templates/:id` | admin | Template aktualisieren |
| 17 | `DELETE` | `/api/therapy/templates/:id` | admin | Template deaktivieren |
| 18 | `POST` | `/api/therapy/templates/:id/apply` | arzt,admin | Template auf Plan anwenden |

### KI-Assistenz (Pro-Modus)

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 19 | `POST` | `/api/therapy/ai/suggest` | arzt,admin | KI-Therapievorschlag generieren |
| 20 | `POST` | `/api/therapy/ai/summarize/:sessionId` | arzt,admin | KI-Zusammenfassung einer Session |
| 21 | `POST` | `/api/therapy/ai/icd-suggest` | arzt,admin | ICD-10 Vorschlag basierend auf Anamnese |
| 22 | `GET` | `/api/therapy/ai/status` | arzt,admin | KI-Engine-Status (verfügbar, Modell, Last) |

### Alerts

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 23 | `GET` | `/api/therapy/alerts` | arzt,admin | Alle offenen Alerts (gefiltert) |
| 24 | `GET` | `/api/therapy/alerts/patient/:patientId` | arzt,admin | Alerts eines Patienten |
| 25 | `PUT` | `/api/therapy/alerts/:id/read` | arzt,admin | Alert als gelesen markieren |
| 26 | `PUT` | `/api/therapy/alerts/:id/dismiss` | arzt,admin | Alert verwerfen (mit Grund) |
| 27 | `PUT` | `/api/therapy/alerts/:id/action` | arzt,admin | Aktion dokumentieren |

### Anonymisierung

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 28 | `GET` | `/api/therapy/anon/:patientId` | arzt,admin | Pseudonym abrufen/generieren |
| 29 | `GET` | `/api/therapy/analytics` | admin | Anonymisierte Therapie-Statistiken |

### PVS-Integration (nutzt Modul 3)

| # | Method | Path | Auth | Beschreibung |
|---|--------|------|------|------------|
| 30 | `POST` | `/api/therapy/plans/:id/export-pvs` | arzt,admin | Therapieplan an PVS senden |

### Endpunkt-Details (Beispiele)

```typescript
// POST /api/therapy/plans
// Request:
{
  "sessionId": "uuid-session",
  "patientId": "uuid-patient",
  "title": "Therapieplan vom 04.03.2026",
  "diagnosis": "Akute Lumbalgie",
  "icdCodes": ["M54.5"],
  "templateId": "uuid-template",     // Optional: Template anwenden
  "aiGenerate": false                 // true → KI füllt Maßnahmen
}
// Response: 201 Created
{
  "id": "uuid",
  "status": "DRAFT",
  "measures": [...],                  // Aus Template oder KI
  "aiGenerated": false
}

// POST /api/therapy/ai/suggest
// Request:
{
  "sessionId": "uuid-session",
  "context": {
    "answers": [...],                 // Relevante Anamnese-Antworten
    "triageEvents": [...],
    "medications": [...],
    "surgeries": [...],
    "patientAge": 45,
    "patientGender": "male"
  },
  "requestType": "full_plan"          // "full_plan" | "single_measure" | "icd_suggestion"
}
// Response: 200 OK
{
  "suggestions": {
    "diagnosis": "V.a. akute Lumbalgie",
    "icdCodes": ["M54.5"],
    "confidence": 0.82,
    "measures": [
      {
        "type": "MEDICATION",
        "title": "Ibuprofen 400mg",
        "dosage": "1-0-1",
        "duration": "7 Tage",
        "aiConfidence": 0.90,
        "reasoning": "NSAID erste Wahl bei akuten Rückenschmerzen ohne Red Flags"
      },
      {
        "type": "LIFESTYLE",
        "title": "Bewegungstherapie",
        "description": "Moderate körperliche Aktivität beibehalten, kein Bettruhe",
        "aiConfidence": 0.95
      },
      {
        "type": "FOLLOW_UP",
        "title": "Wiedervorstellung in 5-7 Tagen",
        "aiConfidence": 0.85,
        "reasoning": "Verlaufskontrolle, ggf. Bildgebung bei ausbleibender Besserung"
      }
    ],
    "warnings": [
      "Patient nimmt bereits ASS → Ibuprofen-Interaktion beachten"
    ]
  },
  "model": "llama-3.1-8b",
  "generationTimeMs": 2340
}
```

### Route-Dateien

```
server/
  routes/
    therapy.ts                   // Therapieplan + Maßnahmen + Templates
    therapy-ai.ts                // KI-Endpunkte (separiert für Lite/Pro Toggle)
    alerts.ts                    // Clinical Alerts
```

### Socket.IO Events (Therapie)

| Event | Richtung | Payload | Beschreibung |
|-------|----------|---------|------------|
| `therapy:alert-new` | Server → Client | `{ alert, patientPseudonym }` | Neuer klinischer Alert |
| `therapy:alert-critical` | Server → Client | `{ alert, patientId }` | CRITICAL/EMERGENCY Alert (sofort) |
| `therapy:plan-updated` | Server → Client | `{ planId, changes }` | Therapieplan geändert |
| `therapy:ai-suggestion` | Server → Client | `{ sessionId, suggestion }` | KI-Vorschlag verfügbar (Pro) |
| `therapy:ai-realtime` | Server → Client | `{ sessionId, partialSuggestion }` | Streaming KI-Output (Pro) |
| `therapy:measure-due` | Server → Client | `{ measure, planId }` | Maßnahme fällig |

---

## 4.4 Frontend-Komponenten

### Neue Komponenten

```
src/
  components/
    therapy/
      TherapyPlanBuilder.tsx       // Haupt-Builder mit Sections
      TherapyPlanView.tsx          // Read-Only Ansicht
      TherapyMeasureCard.tsx       // Einzelne Maßnahme (Drag-Drop)
      TherapyMeasureForm.tsx       // Maßnahme bearbeiten
      TherapyTemplateSelector.tsx  // Template auswählen
      TherapyTimeline.tsx          // Zeitstrahl der Maßnahmen
      TherapyStatusBadge.tsx       // Status-Badge
      TherapyExportButton.tsx      // PVS-Export (nutzt Modul 3)
    ai/
      AiAssistantPanel.tsx         // Haupt-KI-Panel (Pro)
      AiSuggestionCard.tsx         // Einzelner KI-Vorschlag
      AiSummaryView.tsx            // KI-Zusammenfassung
      AiConfidenceBadge.tsx        // Konfidenz-Anzeige (z.B. 82%)
      AiStatusIndicator.tsx        // KI-Engine Online/Offline
      AiRealtimeStream.tsx         // Streaming-Text-Anzeige
    alerts/
      ClinicalAlertBanner.tsx      // Prominenter Alert-Banner
      ClinicalAlertList.tsx        // Alert-Liste
      ClinicalAlertDetail.tsx      // Alert-Detail mit Aktionen
      AlertBadge.tsx               // Badge mit Alert-Count
  hooks/
    useTherapyPlan.ts              // React Query Hook für Pläne
    useAlerts.ts                   // React Query + Socket.IO für Alerts
    useAiAssistant.ts              // KI-Kommunikation Hook
  services/
    therapy-ai.service.ts          // KI-API-Client
    alert-rules.service.ts         // Client-seitige Alert-Regeln
```

### TherapyPlanBuilder.tsx

```
┌────────────────────────────────────────────────────────────────────┐
│  Therapieplan erstellen                                    [X]     │
│                                                                     │
│  Patient: PAT-A7X3 (anonymisiert) | Session: 04.03.2026           │
│  Diagnose: [Akute Lumbalgie          ] ICD: [M54.5  ] [+]         │
│                                                                     │
│  ┌─ Template verwenden ─────────────────────────────────────────┐  │
│  │  [🔍 Template suchen...]                                     │  │
│  │  Vorschläge (basierend auf Anamnese):                        │  │
│  │  [📋 Rückenschmerzen — Konservativ]  [📋 Lumbalgie — Akut]  │  │
│  │  [🤖 KI-Vorschlag generieren (Pro)]                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Maßnahmen (Drag & Drop) ───────────────────────────────────┐  │
│  │                                                               │  │
│  │  ☰ 1. 💊 Ibuprofen 400mg                         [GEPLANT]  │  │
│  │       Dosierung: 1-0-1 | Dauer: 7 Tage                      │  │
│  │       🤖 KI-Konfidenz: 90%  ✅ Arzt bestätigt               │  │
│  │       [Bearbeiten] [Entfernen]                               │  │
│  │                                                               │  │
│  │  ☰ 2. 🏃 Bewegungstherapie                       [GEPLANT]  │  │
│  │       Moderate Aktivität beibehalten                         │  │
│  │       🤖 KI-Konfidenz: 95%  ✅ Arzt bestätigt               │  │
│  │       [Bearbeiten] [Entfernen]                               │  │
│  │                                                               │  │
│  │  ☰ 3. 📅 Wiedervorstellung                       [GEPLANT]  │  │
│  │       In 5-7 Tagen                                           │  │
│  │       🤖 KI-Konfidenz: 85%  ⏳ Nicht bestätigt               │  │
│  │       [Bearbeiten] [Entfernen]                               │  │
│  │                                                               │  │
│  │  [+ Maßnahme hinzufügen]                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ⚠️ KI-Warnung: Patient nimmt ASS → Ibuprofen-Interaktion!        │
│  → [Details] [Alternative vorschlagen]                              │
│                                                                     │
│  Zusammenfassung: [                                               ] │
│  [Automatisch aus Maßnahmen generieren]                             │
│                                                                     │
│  Zeitraum: [04.03.2026] bis [11.03.2026]                           │
│  Nächste Kontrolle: [11.03.2026]                                    │
│                                                                     │
│  [Verwerfen]  [Als Entwurf speichern]  [Plan aktivieren]           │
│                                    [📤 An PVS senden]               │
└────────────────────────────────────────────────────────────────────┘
```

### AiAssistantPanel.tsx (Pro-Modus, Dual-Display)

```
┌────────────────────────────────────────────────────────────────┐
│  🤖 KI-Assistent (Pro)                    [Llama 3.1 • 🟢]    │
│                                                                 │
│  ┌─ Echtzeit-Zusammenfassung ───────────────────────────────┐  │
│  │  Patient (m, 45J) berichtet über:                        │  │
│  │  • Akute Rückenschmerzen seit 3 Tagen (6/10)             │  │
│  │  • Auslöser: Heben schwerer Kiste                        │  │
│  │  • Keine Ausstrahlung in Beine ✓                         │  │
│  │  • Keine Blasen-/Mastdarmstörung ✓                       │  │
│  │  • Vormedikation: ASS 100mg (Dauermedikation)            │  │
│  │                                                           │  │
│  │  Aktualisiert sich live während der Anamnese...          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Vorläufige Einschätzung ────────────────────────────────┐  │
│  │  V.a. Akute Lumbalgie (M54.5)  —  Konfidenz: 82%        │  │
│  │                                                           │  │
│  │  🟢 Keine Red Flags erkannt                              │  │
│  │  ⚠️ ASS-Interaktion bei NSAID-Gabe beachten              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─ Empfohlene Nachfragen ──────────────────────────────────┐  │
│  │  □ "Strahlen die Schmerzen ins Bein aus?"                │  │
│  │  □ "Hatten Sie sowas schon mal?"                         │  │
│  │  □ "Nehmen Sie noch andere Medikamente?"                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Therapieplan generieren] [ICD vorschlagen] [Zusammenfassung] │
└────────────────────────────────────────────────────────────────┘
```

### ClinicalAlertBanner.tsx

```
┌────────────────────────────────────────────────────────────────┐
│  🔴 CRITICAL ALERT                                    [X]      │
│                                                                 │
│  Patient PAT-A7X3: Systolischer Blutdruck > 180 mmHg           │
│  bei bekannter arterieller Hypertonie                           │
│  Antwort: "Mein Blutdruck war heute morgen 185/110"            │
│                                                                 │
│  [Aktion dokumentieren]  [Später]  [Verwerfen (mit Grund)]     │
└────────────────────────────────────────────────────────────────┘
```

### Integration in bestehende Komponenten

| Bestehende Komponente | Änderung |
|----------------------|----------|
| **ArztDashboard.tsx** | Neuer Tab "Therapiepläne", Alert-Badge im Header, KI-Panel (Pro) als Sidebar |
| **PatientDetail** (ArztDashboard) | Therapieplan-Übersicht, "Neuen Plan erstellen" Button |
| **Questionnaire.tsx** | Alert-Engine Hooks einbinden → Alerts während Anamnese generieren |
| **session.ts (Routes)** | Nach Session-Complete → Alert-Check + optionaler Auto-Plan |
| **AdminDashboard.tsx** | Neuer Tab "Therapie-Analytics" (anonymisiert) |
| **Socket.ts** | Neue Events für therapy:* und alert:* |

---

## 4.5 KI-Assistenz-System

### Architektur (Pro-Modus)

```
┌─────────────────────────────────────────────────┐
│  KI-Engine Service                               │
│                                                   │
│  ┌────────────┐   ┌────────────┐                 │
│  │ Prompt-     │   │ LLM-       │                 │
│  │ Builder     │──▶│ Client     │──▶ Lokales LLM  │
│  │             │   │ (Ollama/   │   (Llama 3.1/   │
│  │ Templates   │   │  llama.cpp)│    Mistral 7B)  │
│  └────────────┘   └────────────┘                 │
│        ▲                                          │
│        │                                          │
│  ┌─────┴──────┐   ┌────────────┐                 │
│  │ Context-   │   │ Response-  │                 │
│  │ Aggregator │   │ Parser     │                 │
│  │ (Anamnese  │   │ (JSON      │                 │
│  │  + History │   │  Extract)  │                 │
│  │  + Meds)   │   │            │                 │
│  └────────────┘   └────────────┘                 │
└─────────────────────────────────────────────────┘
```

### Dateistruktur

```
server/
  services/
    ai/
      ai-engine.service.ts        // Haupt-Service (Facade)
      llm-client.ts               // HTTP-Client für Ollama/llama.cpp
      prompt-builder.ts           // Prompt-Templates zusammenbauen
      prompt-templates/
        therapy-suggest.txt       // Therapievorschlag-Prompt
        session-summary.txt       // Session-Zusammenfassung
        icd-suggest.txt           // ICD-10 Vorschlag
        realtime-analysis.txt     // Echtzeit-Analyse während Anamnese
      context-aggregator.ts       // Alle relevanten Daten sammeln
      response-parser.ts          // LLM-Output → Structured JSON
      ai-config.ts                // Modell-Config, Temperatur, etc.
```

### Prompt-Template (Therapievorschlag)

```text
# server/services/ai/prompt-templates/therapy-suggest.txt

Du bist ein medizinischer Assistenz-KI für Hausarztpraxen in Deutschland.
Basierend auf der folgenden Anamnese, erstelle einen strukturierten Therapievorschlag.

## Kontext
Patient: {{gender}}, {{age}} Jahre
Sprache Anamnese: {{language}}

## Anamnese-Ergebnis
{{#each categories}}
### {{categoryName}}
{{#each questions}}
- {{questionText}}: {{answer}}
{{/each}}
{{/each}}

## Triage
Level: {{triageLevel}} — {{triageReason}}

## Vormedikation
{{#each medications}}
- {{name}} {{dosage}} (seit {{since}})
{{/each}}

## Voroperationen
{{#each surgeries}}
- {{name}} ({{year}})
{{/each}}

## Aufgabe
Erstelle einen Therapievorschlag im folgenden JSON-Format:
```json
{
  "diagnosis": "Verdachtsdiagnose als Freitext",
  "icdCodes": ["M54.5"],
  "confidence": 0.82,
  "measures": [
    {
      "type": "MEDICATION|PROCEDURE|REFERRAL|LAB_ORDER|IMAGING|LIFESTYLE|FOLLOW_UP",
      "title": "Kurzbezeichnung",
      "description": "Details",
      "dosage": "Falls Medikament",
      "duration": "Zeitraum",
      "priority": 1,
      "confidence": 0.90,
      "reasoning": "Medizinische Begründung"
    }
  ],
  "warnings": ["Warnhinweise bezüglich Interaktionen oder Kontraindikationen"],
  "suggestedFollowUp": "Empfohlene Nachfragen"
}
```

## Regeln
1. Antworte NUR mit dem JSON-Objekt
2. Alle Vorschläge sind HINWEISE für den Arzt, keine Diagnosen
3. Nutze ICD-10-GM Codes (deutsche Modifikation)
4. Beachte Medikamenten-Interaktionen mit Vormedikation
5. Bei unklaren Symptomen: Mehr diagnostische Maßnahmen vorschlagen
6. Dosierungen in üblicher Hausarzt-Dosierung
7. "confidence" ist 0.0-1.0 (deine Einschätzung der Passgenauigkeit)
```

### Lite-Modus (ohne KI)

```typescript
// server/services/ai/lite-engine.service.ts

/**
 * Regelbasierte "KI" für den Lite-Modus (kein LLM nötig).
 * Verwendet:
 * - Vordefinierte Templates (TherapyTemplate)
 * - Symptom → ICD-10 Mapping-Tabelle
 * - Einfache Regelketten (IF schmerzskala > 7 → NSAID vorschlagen)
 * - Medikamenten-Interaktions-Datenbank (statisch)
 */
export class LiteAiEngine {
  suggestTemplate(answers: Answer[], atoms: MedicalAtom[]): TherapyTemplate[];
  suggestIcdCodes(answers: Answer[]): IcdSuggestion[];
  checkInteractions(medications: PatientMedication[], newMed: string): InteractionWarning[];
  generateSummary(session: PatientSessionFull): string; // Regelbasiert, kein LLM
}
```

---

## 4.6 Echtzeit-Alerts

### Alert-Regeln (Server-side)

```typescript
// server/services/alerts/alert-rules.ts

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  
  // Trigger-Bedingung
  condition: {
    field: string;           // Antwort-Feld oder berechneter Wert
    operator: 'eq' | 'gt' | 'lt' | 'contains' | 'regex' | 'in';
    value: string | number | string[];
    
    // Optional: Zusätzliche Kontextbedingung
    andConditions?: Array<{
      field: string;
      operator: string;
      value: string | number;
    }>;
  };
  
  // Alert-Text
  titleTemplate: string;     // "Kritischer Blutdruck"
  messageTemplate: string;   // "Systolisch {{value}} bei {{context}}"
}

// Vordefinierte Regeln  
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'bp-critical',
    name: 'Kritischer Blutdruck',
    category: 'VITAL_SIGN',
    severity: 'CRITICAL',
    condition: {
      field: 'answers.blutdruck_systolisch',
      operator: 'gt',
      value: 180
    },
    titleTemplate: 'Kritischer Blutdruck',
    messageTemplate: 'Systolischer Blutdruck {{value}} mmHg'
  },
  {
    id: 'chest-pain-smoker',
    name: 'Brustschmerz + Raucher',
    category: 'SYMPTOM_PATTERN',
    severity: 'WARNING',
    condition: {
      field: 'answers.hauptbeschwerde',
      operator: 'contains',
      value: 'brustschmerz',
      andConditions: [
        { field: 'answers.rauchen', operator: 'eq', value: 'ja' }
      ]
    },
    titleTemplate: 'Risikokonstellation: Brustschmerz + Raucher',
    messageTemplate: 'Patient berichtet Brustschmerzen bei positiver Raucheranamnese'
  },
  {
    id: 'suicide-risk',
    name: 'Suizidalität',
    category: 'SYMPTOM_PATTERN',
    severity: 'EMERGENCY',
    condition: {
      field: 'answers.suizidalitaet',
      operator: 'in',
      value: ['ja', 'manchmal', 'gedanken']
    },
    titleTemplate: '⚠️ SUIZIDALITÄT — Sofortiges Handeln erforderlich',
    messageTemplate: 'Patient äußert Suizidgedanken. Sofortige ärztliche Beurteilung!'
  },
  {
    id: 'pain-scale-high',
    name: 'Starke Schmerzen',
    category: 'VITAL_SIGN',
    severity: 'WARNING',
    condition: {
      field: 'answers.schmerzskala',
      operator: 'gt',
      value: 8
    },
    titleTemplate: 'Starke Schmerzen (>8/10)',
    messageTemplate: 'Patient gibt Schmerzintensität {{value}}/10 an'
  },
  {
    id: 'nsaid-ass-interaction',
    name: 'NSAID + ASS Interaktion',
    category: 'DRUG_INTERACTION',
    severity: 'WARNING',
    condition: {
      field: 'medications.active',
      operator: 'contains',
      value: 'ASS',
      andConditions: [
        { field: 'therapy.newMedication.atcGroup', operator: 'eq', value: 'M01A' }
      ]
    },
    titleTemplate: 'Medikamenten-Interaktion: NSAID + ASS',
    messageTemplate: 'Kombination von {{newMed}} mit ASS erhöht GI-Blutungsrisiko'
  },
  // ... weitere Regeln
];
```

### Alert-Engine

```typescript
// server/services/alerts/alert-engine.service.ts

export class AlertEngine {
  private rules: AlertRule[];
  
  /**
   * Wird aufgerufen bei:
   * 1. Jeder neuen Antwort während Anamnese (via Socket.IO)
   * 2. Session-Complete
   * 3. Therapieplan-Erstellung (Medikamenten-Check)
   */
  async evaluateAnswer(
    sessionId: string,
    answer: Answer,
    context: AlertContext
  ): Promise<ClinicalAlert[]> {
    // 1. Alle Regeln gegen die neue Antwort prüfen
    // 2. Kontext laden (bisherige Antworten, Medikamente, Triage)
    // 3. Matches → ClinicalAlert erstellen
    // 4. Socket.IO: therapy:alert-new oder therapy:alert-critical
    // 5. Bei EMERGENCY: Zusätzlich Arzt-Pager/Benachrichtigung
  }
  
  async evaluateSession(sessionId: string): Promise<ClinicalAlert[]> {
    // Alle Antworten einer Session auf einmal bewerten
    // Pattern-Analyse über mehrere Antworten
  }
  
  async evaluateTherapyPlan(plan: TherapyPlan): Promise<ClinicalAlert[]> {
    // Medikamenten-Interaktionen prüfen
    // Kontraindikationen gegen Anamnese
  }
}
```

### Timing & Trigger

```
┌──────────────────────────────────────────────────────────────┐
│                    Alert-Trigger-Points                        │
│                                                               │
│  [1] Anamnese läuft (Echtzeit)                               │
│      → Jede Antwort wird durch AlertEngine geprüft            │
│      → Socket.IO: therapy:alert-new (WARNING)                 │
│      → Socket.IO: therapy:alert-critical (CRITICAL/EMERGENCY) │
│                                                               │
│  [2] Session Complete                                         │
│      → Gesamtbewertung aller Antworten                        │
│      → Pattern-Erkennung über Antwort-Kombinationen           │
│      → Alerts in DB speichern + Socket.IO                     │
│                                                               │
│  [3] Therapieplan erstellen/ändern                            │
│      → Medikamenten-Interaktions-Check                        │
│      → Kontraindikations-Check gegen Anamnese                 │
│      → Alerts sofort anzeigen im Builder                      │
│                                                               │
│  [4] Cron: Überfällige Maßnahmen                             │
│      → Täglich: Prüfen ob Maßnahmen.dueDate < now()          │
│      → Alert: therapy:measure-due                             │
│                                                               │
│  [5] KI-Analyse (Pro)                                         │
│      → LLM analysiert Gesamtbild                              │
│      → Kann zusätzliche Alerts generieren                     │
│      → Höhere Erkennungsrate für Muster                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 4.7 Anonymisierung

### Pseudonym-Generierung

```typescript
// server/services/anonymization/anon.service.ts

/**
 * Generiert und verwaltet Pseudonyme für Patienten.
 * Format: PAT-XXXX-XXXX (z.B. PAT-A7X3-K9M2)
 * 
 * Verwendung:
 * - Analytics/Statistiken (Admin sieht nur Pseudonyme)
 * - Therapieplan-Export an Forschung
 * - Audit-Log (optional)
 * - KI-Training-Daten (falls je anonymisierte Daten exportiert)
 */
export class AnonymizationService {
  
  async getOrCreatePseudonym(patientId: string): Promise<string> {
    // 1. Prüfe ob bereits existiert
    // 2. Falls nicht: Generiere unique Pseudonym
    // 3. Speichere in AnonPatientId
    // Format: PAT-[A-Z0-9]{4}-[A-Z0-9]{4}
  }
  
  async resolvePseudonym(pseudonym: string): Promise<string | null> {
    // Nur mit admin + speziellem Recht
    // Audit-Log: Wer hat wann aufgelöst
  }
  
  /**
   * Anonymisiert ein Dataset für Analytics.
   * Ersetzt: Name, Geburtsdatum (→ nur Alter), Adresse, KVNR
   * Behält: Geschlecht, Alter (berechnet), Antworten (ohne Freitext-PII)
   */
  async anonymizeDataset(sessions: PatientSessionFull[]): Promise<AnonymizedDataset> {
    // PII entfernen
    // Freitext-Antworten: NER-basierte Anonymisierung (Pro) oder Regex (Lite)
  }
}
```

### Anonymisierte Analytics-API

```typescript
// GET /api/therapy/analytics
// Response (alle Daten anonymisiert):
{
  "period": "2026-02",
  "totalPlans": 127,
  "statusDistribution": {
    "ACTIVE": 42,
    "COMPLETED": 68,
    "CANCELLED": 17
  },
  "topDiagnoses": [
    { "icd": "M54.5", "name": "Lumbalgie", "count": 23, "percentage": 18.1 },
    { "icd": "J06.9", "name": "Infekt obere Atemwege", "count": 19, "percentage": 15.0 }
  ],
  "measureTypes": {
    "MEDICATION": 312,
    "REFERRAL": 87,
    "LAB_ORDER": 64,
    "FOLLOW_UP": 127
  },
  "avgMeasuresPerPlan": 3.4,
  "avgPlanDurationDays": 12.7,
  "aiUsage": {
    "aiGeneratedPlans": 89,      // 70% der Pläne
    "avgAiConfidence": 0.78,
    "arztModificationRate": 0.34  // 34% werden vom Arzt angepasst
  },
  "alertStats": {
    "total": 234,
    "bySeverity": { "INFO": 120, "WARNING": 89, "CRITICAL": 22, "EMERGENCY": 3 },
    "avgResponseTimeMinutes": 4.2,
    "dismissRate": 0.12
  }
}
```

---

# Modul-übergreifend

## 5.1 Abhängigkeiten & Reihenfolge

### Modul-Abhängigkeitsgraph

```
Modul 1+2 (Wartezeit + Admin)  ← Voraussetzung (aus PLAN_MODUL_1_2.md)
    │
    ├── Modul 3 (PVS-Integration)
    │     │
    │     │ nutzt:
    │     │  - Patient Model Erweiterungen (Modul 3)
    │     │  - Admin-Panel Tab-System (Modul 2)
    │     │  - Permission-System (Modul 2)
    │     │
    │     └── Modul 4 (Therapieplan) ← nutzt Modul 3 für PVS-Export
    │           │
    │           │ nutzt:
    │           │  - PvsAdapter.exportTherapyPlan() (Modul 3)
    │           │  - FHIR CarePlan Mapping (Modul 3)
    │           │  - Admin-Panel (Modul 2)
    │           │  - Permission-System (Modul 2)
    │           │  - ArztDashboard Erweiterungen (Modul 2)
    │           │
    │           └── Modul 5+6 (PWA + gematik) ← Prompt 1c
    │
    └── Unabhängig voneinander:
         Modul 3 Basis (ohne Therapy-Export) kann parallel zu Modul 4 Basis gebaut werden
```

### Implementierungsreihenfolge (innerhalb 3+4)

```
Phase 3a: PVS-Basis (Priorität: HOCH)
├── Prisma Models: PvsConnection, PvsTransferLog, PvsFieldMapping, PvsPatientLink
├── GDT 3.0 Engine: Parser, Writer, Constants, Validator
├── Mapping-Engine: Defaults, Transforms
├── Erster Adapter: CGM M1 (GDT)
└── API: Basis-Endpunkte (Connection CRUD, Export, Import)

Phase 3b: Frontend + Weitere Adapter (Priorität: HOCH)
├── PvsConnectionWizard.tsx
├── PvsExportDialog.tsx
├── PvsTransferLog.tsx  
├── Admin-Tab "PVS"
├── ArztDashboard Integration ("An PVS senden")
├── Adapter: medatixx, Medistar
└── FHIR R4 Engine + FhirGenericAdapter

Phase 3c: Erweitert (Priorität: MITTEL)
├── PvsFieldMapper.tsx (visueller Editor)
├── GDT-Watcher (Auto-Import)
├── Batch-Export
├── KIM-Integration
├── Adapter: T2Med, Doctolib
└── Transfer-Retry + Monitoring

Phase 4a: Therapieplan-Basis (Priorität: HOCH)
├── Prisma Models: TherapyPlan, TherapyMeasure, TherapyTemplate, ClinicalAlert, AnonPatientId
├── Therapie-API: CRUD + Templates
├── TherapyPlanBuilder.tsx
├── TherapyMeasureCard.tsx + Form
├── TherapyTemplateSelector.tsx
└── AnonymizationService

Phase 4b: Alerts + KI (Priorität: HOCH)
├── Alert-Rules Engine
├── ClinicalAlertBanner.tsx + List
├── Echtzeit-Alert-Integration (Socket.IO)
├── KI-Engine Service (Pro)
├── Prompt-Templates
├── LiteAiEngine (regelbasiert)
└── AiAssistantPanel.tsx (Pro)

Phase 4c: Polish + Integration (Priorität: MITTEL)
├── AiRealtimeStream.tsx (Streaming)
├── TherapyTimeline.tsx
├── Therapy → PVS Export (nutzt Modul 3)
├── Anonymisierte Analytics
├── Therapie-Templates Bibliothek (20+ Vorlagen)
├── Dual-Display (Arzt-KI + Patient-Anamnese)
└── Überfällige-Maßnahmen Cron-Job
```

---

## 5.2 Migrations-Strategie

### Prisma Migration

```bash
# Phase 3a: PVS-Basis
npx prisma migrate dev --name "add_pvs_integration"
# Neue Tabellen: PvsConnection, PvsTransferLog, PvsFieldMapping, PvsPatientLink
# Erweiterungen: Patient (versichertenNr, etc.), PatientSession (pvsExported, etc.)

# Phase 4a: Therapieplan-Basis
npx prisma migrate dev --name "add_therapy_plans"
# Neue Tabellen: TherapyPlan, TherapyMeasure, TherapyTemplate, ClinicalAlert, AnonPatientId
# Erweiterungen: Patient (therapyPlans, clinicalAlerts, anonId), ArztUser, PatientSession
```

### Bestehende Daten

```
Migration ist additiv — keine bestehenden Daten werden verändert.
- Neue Tabellen sind leer nach Migration
- Patient/ArztUser/PatientSession bekommen nur neue optionale Felder
- PVS-Verbindung muss manuell konfiguriert werden (Wizard)
- Therapie-Templates werden per Seed-Script geladen
```

### Seed-Script für Templates

```typescript
// prisma/seeds/therapy-templates.ts

export const DEFAULT_THERAPY_TEMPLATES = [
  {
    name: 'Akuter Rückenschmerz — Konservativ',
    category: 'Orthopädie',
    icdCodes: ['M54.5', 'M54.4'],
    measures: [
      { type: 'MEDICATION', title: 'Ibuprofen 400-600mg', dosage: '1-0-1 oder bei Bedarf', duration: '7-10 Tage' },
      { type: 'LIFESTYLE', title: 'Bewegung beibehalten', description: 'Keine Bettruhe, moderate Aktivität' },
      { type: 'FOLLOW_UP', title: 'Wiedervorstellung', description: 'In 5-7 Tagen bei ausbleibender Besserung' },
    ]
  },
  {
    name: 'Akuter Infekt der oberen Atemwege',
    category: 'Allgemeinmedizin',
    icdCodes: ['J06.9'],
    measures: [
      { type: 'LIFESTYLE', title: 'Symptomatische Therapie', description: 'Ausreichend Flüssigkeit, Ruhe' },
      { type: 'MEDICATION', title: 'Paracetamol 500mg', dosage: 'Bei Bedarf, max 4x/Tag', duration: 'Symptomdauer' },
      { type: 'FOLLOW_UP', title: 'Wiedervorstellung bei Verschlechterung', description: 'Hohes Fieber >3 Tage, Atemnot' },
    ]
  },
  // ... 20+ weitere Templates für häufige Hausarzt-Diagnosen
];
```

---

## 5.3 Test-Strategie

### Modul 3: PVS-Integration

| Test-Bereich | Typ | Dateipfad | Beschreibung |
|-------------|-----|-----------|-------------|
| GDT-Parser | Unit | `__tests__/pvs/gdt-parser.test.ts` | Parsing realer GDT-Dateien (Fixtures) |
| GDT-Writer | Unit | `__tests__/pvs/gdt-writer.test.ts` | Korrekte GDT-Ausgabe, Encoding |
| GDT-Validator | Unit | `__tests__/pvs/gdt-validator.test.ts` | Pflichtfelder, Längenprüfung |
| Mapping-Engine | Unit | `__tests__/pvs/mapping-engine.test.ts` | Feld-Transformationen |
| FHIR-Mapper | Unit | `__tests__/pvs/fhir-mapper.test.ts` | Korrekte FHIR-Resources |
| FHIR-Profiles | Unit | `__tests__/pvs/fhir-profiles.test.ts` | DE-Basisprofil-Validierung |
| PVS-API | Integration | `__tests__/pvs/pvs-api.test.ts` | Endpunkte mit Mock-Adaptern |
| CGM M1 Adapter | Integration | `__tests__/pvs/cgm-m1.test.ts` | Export/Import mit Fixture-Files |
| GDT-Watcher | Integration | `__tests__/pvs/gdt-watcher.test.ts` | File-System-Events |
| PVS-Frontend | E2E | `e2e/pvs-setup.spec.ts` | Wizard, Export-Dialog |

### Modul 4: Therapieplan

| Test-Bereich | Typ | Dateipfad | Beschreibung |
|-------------|-----|-----------|-------------|
| Therapy CRUD | Unit | `__tests__/therapy/therapy-api.test.ts` | Plan/Maßnahmen CRUD |
| Templates | Unit | `__tests__/therapy/templates.test.ts` | Template-Anwendung |
| Alert-Rules | Unit | `__tests__/therapy/alert-rules.test.ts` | Regel-Auswertung |
| Alert-Engine | Integration | `__tests__/therapy/alert-engine.test.ts` | Ende-zu-Ende Alert-Flow |
| Anonymization | Unit | `__tests__/therapy/anonymization.test.ts` | Pseudonym-Generierung, PII-Entfernung |
| LiteAiEngine | Unit | `__tests__/therapy/lite-ai.test.ts` | Regelbasierte Vorschläge |
| KI-Engine (Pro) | Integration | `__tests__/therapy/ai-engine.test.ts` | LLM-Mock-Responses |
| Prompt-Builder | Unit | `__tests__/therapy/prompt-builder.test.ts` | Template-Rendering |
| Response-Parser | Unit | `__tests__/therapy/response-parser.test.ts` | LLM-Output → JSON |
| Therapy-Frontend | E2E | `e2e/therapy-plan.spec.ts` | Builder, Alerts, KI-Panel |
| PVS-Export | E2E | `e2e/therapy-pvs-export.spec.ts` | Plan → GDT/FHIR |

### Test-Fixtures

```
__tests__/
  fixtures/
    gdt/
      sample-6311-patient.gdt           // Echte GDT-Patientendaten
      sample-6302-auftrag.gdt           // Anamnese-Auftrag
      sample-invalid-encoding.gdt       // Falsches Encoding
      sample-missing-fields.gdt         // Fehlende Pflichtfelder
    fhir/
      sample-patient.json               // FHIR Patient (DE-Basisprofil)
      sample-questionnaire-response.json
      sample-bundle.json
    therapy/
      sample-answers-lumbalgie.json     // Anamnese-Daten für Lumbalgie
      sample-answers-infekt.json
      sample-answers-emergency.json     // Mit Suizidalität (Alert-Test)
```

---

## 5.4 Zeitschätzung

| Phase | Beschreibung | Geschätzte Agent-Zeit |
|-------|-------------|----------------------|
| **3a** | PVS-Basis (Prisma, GDT-Engine, CGM-Adapter, API) | ~6h |
| **3b** | Frontend + weitere Adapter + FHIR | ~5h |
| **3c** | Erweitert (Watcher, Batch, KIM, Field-Mapper) | ~4h |
| **4a** | Therapieplan-Basis (Prisma, API, Builder, Templates) | ~5h |
| **4b** | Alerts + KI-Engine (Rules, Socket, Pro-Engine) | ~6h |
| **4c** | Polish (Timeline, Analytics, Dual-Display, Cron) | ~4h |
| | **Gesamt Modul 3+4** | **~30h** |

### Neue npm-Abhängigkeiten

| Paket | Version | Zweck | Phase |
|-------|---------|-------|-------|
| `chokidar` | ^4.x | Dateisystem-Überwachung (GDT-Watcher) | 3c |
| `iconv-lite` | ^0.6 | Encoding-Konvertierung (ISO-8859-15, CP437) | 3a |
| `fhir-kit-client` | ^1.9 | FHIR R4 HTTP Client | 3b |
| `ollama` | ^0.5 | Lokales LLM API Client (Pro) | 4b |

### i18n-Schlüssel (geschätzt)

| Modul | Neue Keys | Sprachen | Gesamt Übersetzungen |
|-------|-----------|----------|---------------------|
| Modul 3 (PVS) | ~60 Keys | 10 | ~600 |
| Modul 4 (Therapie) | ~100 Keys | 10 | ~1000 |
| **Gesamt** | **~160 Keys** | **10** | **~1600** |

---

## Appendix A: Befundtext-Format für GDT-Export

```
══════════════════════════════════════
DIGGAI ANAMNESE-BERICHT
══════════════════════════════════════
Patient: Mustermann, Max (*15.03.1985)
Datum: 04.03.2026 14:32
Dauer: 12min | Sprache: DE | 47 Antworten

TRIAGE: 🟡 GELB — Mittlere Dringlichkeit
Grund: Brustschmerz + positive Raucheranamnese

── AKTUELLE BESCHWERDEN ──
Hauptbeschwerde: Brustschmerzen
Schmerzskala: 6/10
Seit wann: 3 Tagen
Schmerzcharakter: drückend
Ausstrahlung: keine
Verstärkung: bei Belastung
Linderung: Ruhe

── VORERKRANKUNGEN ──
Bekannte Erkrankungen: Arterielle Hypertonie
Allergien: Penicillin

── MEDIKATION ──
1. ASS 100mg — 1x täglich — seit 2 Jahren
2. Ramipril 5mg — 1x morgens — seit 3 Jahren

── VOROPERATIONEN ──
1. Appendektomie (2005)

── SOZIALANAMNESE ──
Raucher: Ja (15 Pack-Years)
Alkohol: gelegentlich
Beruf: Büroangestellt

── FAMILIENANAMNESE ──
Vater: Herzinfarkt mit 58

══════════════════════════════════════
Generiert von DiggAI Anamnese v2.0
Session-ID: abc-123-def
══════════════════════════════════════
```

## Appendix B: FHIR Bundle Beispiel (Kurzfassung)

```json
{
  "resourceType": "Bundle",
  "type": "transaction",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "meta": { "profile": ["https://fhir.kbv.de/StructureDefinition/KBV_PR_Base_Patient|1.5.0"] },
        "identifier": [{ "system": "http://fhir.de/sid/gkv/kvid-10", "value": "A123456789" }],
        "name": [{ "family": "Mustermann", "given": ["Max"] }],
        "birthDate": "1985-03-15",
        "gender": "male"
      },
      "request": { "method": "POST", "url": "Patient" }
    },
    {
      "resource": {
        "resourceType": "Encounter",
        "status": "finished",
        "class": { "code": "AMB", "display": "ambulatory" },
        "period": { "start": "2026-03-04T14:32:00+01:00", "end": "2026-03-04T14:44:00+01:00" }
      },
      "request": { "method": "POST", "url": "Encounter" }
    },
    {
      "resource": {
        "resourceType": "QuestionnaireResponse",
        "status": "completed",
        "questionnaire": "https://diggai.de/fhir/Questionnaire/anamnese-v1",
        "item": [
          {
            "linkId": "hauptbeschwerde",
            "text": "Was ist Ihre Hauptbeschwerde?",
            "answer": [{ "valueString": "Brustschmerzen" }]
          }
        ]
      },
      "request": { "method": "POST", "url": "QuestionnaireResponse" }
    },
    {
      "resource": {
        "resourceType": "Flag",
        "status": "active",
        "code": { "coding": [{ "system": "https://diggai.de/fhir/triage", "code": "yellow" }] },
        "subject": { "reference": "Patient/A123456789" }
      },
      "request": { "method": "POST", "url": "Flag" }
    }
  ]
}
```

## Appendix C: Neue Permissions (Ergänzung zu Modul 2)

| Permission Code | Beschreibung | Default: admin | Default: arzt | Default: mfa |
|----------------|-------------|:-:|:-:|:-:|
| `pvs.connection.manage` | PVS konfigurieren | ✅ | ❌ | ❌ |
| `pvs.export.execute` | An PVS senden | ✅ | ✅ | ❌ |
| `pvs.import.execute` | Aus PVS importieren | ✅ | ✅ | ❌ |
| `pvs.transfer.view` | Transfer-Log ansehen | ✅ | ❌ | ❌ |
| `pvs.transfer.retry` | Transfer wiederholen | ✅ | ❌ | ❌ |
| `pvs.mapping.manage` | Field-Mapping ändern | ✅ | ❌ | ❌ |
| `therapy.plan.create` | Therapieplan erstellen | ✅ | ✅ | ❌ |
| `therapy.plan.edit` | Plan bearbeiten | ✅ | ✅ | ❌ |
| `therapy.plan.delete` | Plan löschen | ✅ | ❌ | ❌ |
| `therapy.template.manage` | Templates verwalten | ✅ | ❌ | ❌ |
| `therapy.alert.manage` | Alerts verwalten | ✅ | ✅ | ❌ |
| `therapy.ai.use` | KI-Assistenz nutzen | ✅ | ✅ | ❌ |
| `therapy.analytics.view` | Therapie-Statistiken | ✅ | ❌ | ❌ |
| `anon.resolve` | Pseudonym auflösen | ✅ | ❌ | ❌ |

---

> **Ende PLAN_MODUL_3_4.md**  
> **Nächster Schritt:** Prompt 1c — Module 5+6 (Patienten-PWA + Lokaler Modus/gematik/ePA)
