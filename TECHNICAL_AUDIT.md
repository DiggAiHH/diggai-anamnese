# TECHNISCHE ANALYSE & LÜCKEN-IDENTIFIKATION
## Anamnese-App: Von MVP zu Produktionsreife

Dieses Dokument liefert eine exakte technische Analyse des Architektur-Status der Anamnese-App und identifiziert konkrete Lücken (Gaps) zur Erreichung der Produktionsreife im Arbeits- und Praxisalltag.

---

## 1. AKTUELLER ARCHITEKTUR-STATUS

### a) Datenbank-Schema (Prisma)
Das derzeitige Schema ist auf den grundlegenden Flow (Patient ↔ Sessions ↔ MedicalAtoms/Answers) ausgerichtet.

```prisma
// Relevanter Auszug des aktuellen Schemas
model Patient {
  id          String   @id @default(uuid())
  hashedEmail String   @unique // Pseudonymisierung
  sessions    PatientSession[]
}

model PatientSession {
  id              String   @id @default(uuid())
  patientId       String?
  gender          String?       // M / W / D
  birthDate       DateTime?
  status          String        @default("ACTIVE")
  selectedService String        // TERMIN, REZEPT, AU, UEBERWEISUNG, etc.
  answers         Answer[]
  triageEvents    TriageEvent[]
}

model Answer {
  id             String         @id @default(uuid())
  sessionId      String
  atomId         String         
  value          String         // JSON string: { type: 'radio', data: 'ja' }
  encryptedValue String?        // AES-256-GCM für PII-Freitexte
}
```

**Identifizierte fehlende DB-Felder/-Tabellen:**
1.  **Für BG/Arbeitsunfall:** Es fehlt eine eigene Tabelle `AccidentDetails` (1:1 mit `PatientSession`) zur starren Erfassung von BG, Hergang, Ort und Ersthelfer.
2.  **Für Medikamente:** Eine relationale Tabelle `PatientMedication` (1:n mit `Patient`) am Patienten, *nicht* nur an der Session, um Dauermedikationen über mehrere Besuche hinweg strukturiert (Name, Dosis, Intervall) zu tracken.
3.  **Für OP-Anamnese:** Eine relationale Tabelle `SurgeryHistory` verknüpft mit `Patient`.

### b) API-Endpunkte (Express)
Das Backend läuft als monolithische Express.js-Instanz (inkl. Multer & Websockets).

**Vorhandene Routen:**
*   **POST** `/api/sessions/start`: Initialisiert Session.
    *   *Request:* `{ email: "test@...", isNewPatient: true }`
    *   *Response:* `{ sessionId: "...", newPatient: true }`
*   **POST** `/api/sessions/:id/answers`: Schreibt eine Patientenantwort (`Answer`).
    *   *Request:* `{ atomId: "1000", value: { data: "Kopfschmerzen" } }`
*   **POST** `/api/triage`: Triggert einen Red-Flag Alert (`TriageEvent`).
    *   *Request:* `{ sessionId: "...", level: "CRITICAL", atomId: "1002", message: "Notfall!" }`
*   **PUT** `/api/arzt/sessions/:id/status`: "Telefon-Entlaster" (Update Status + Websocket Push an Patient).
*   **POST** `/api/upload`: Multer-Upload für Dokumente (`DAT-102`).
*   **GET** `/api/export/:format/:sessionId`: Exportiert die Akte (PDF/CSV/JSON) inkl. Entschlüsselung.
*   **GET** `/api/arzt/sessions/:id/chat`: Holt den synchronen Praxis-Chat.

### c) State Management (Frontend)
-   **Technologie:** Es wird die native React **Context API** in Kombination mit `useReducer` (`QuestionnaireContext.tsx`) genutzt. Redux oder Zustand sind *nicht* im Einsatz.
-   **Routing-Logik:** Der Context hält den globalen State (`answers`, `currentQuestionId`). Die `evaluateLogic`-Funktion traversiert den JSON-Baum `branchingLogic` (`next`, `conditional`). Sobald der User auf "Weiter" klickt (`handleAnswer`), evaluiert die Engine die Logik des aktuellen Atoms gegen alle bisherigen `answers` und errechnet die ID der nächsten Frage.

---

## 2. LÜCKEN-ANALYSE (Gap Analysis)

**A. Unfall/BG-Daten (Kritisch für Arbeitsmedizin)**
*   **Lücke:** Keine standardisierte Erfassung von Berufsgenossenschaften, Hergängen oder Ersthelfern.
*   **Lösung:**
    *   *DB-Tabelle:* Neue `AccidentDetails` Tabelle an `PatientSession`.
    *   *API:* Neuer Endpoint `POST /api/sessions/:id/accident`.
    *   *Frontend:* Neuer Custom-Wizard (`BgAccidentForm.tsx`), der bei Auswahl von "Arbeitsunfall" (statt z.B. Krankheit) gerendert wird.

**B. Schwangerschafts-Check (Geschlechtsspezifische Logik)**
*   **Lücke:** Aktuelle Routing-Engine (`ConditionalRouting`) wertet nur vorherige Antworten (`answers`) aus, jedoch keine globalen Session-Parameter (wie Alter/Geschlecht).
*   **Lösung:** 
    *   Die Funktion `evaluateLogic` im `QuestionnaireContext` muss Zugriff auf das `PatientSession` Metadaten-Objekt (`gender`, `age`) erhalten.
    *   In `questions.ts` wird Atom `8800` eingefügt, versehen mit einer erweiteten Logic: `{ showIf: [{ operator: 'context', key: 'gender', value: 'W' }] }`.

**C. Strukturierte Medikamenten-Erfassung (Ersetzt 8900)**
*   **Lücke:** Frage 8900 ist ein simples `textarea` (Freitext).
*   **Lösung:**
    *   *DB-Tabelle:* Neue Tabelle `Medication` am `Patient` (Dauermedikation).
    *   *Frontend:* Neuer Fragetyp `medication-list`. Rendert einen dynamischen Table-Builder (Add/Remove Row) für Felder: *Name, Dosierung, Einheit, Häufigkeit (x-x-x-x)*.
    *   Die UI sendet ein strukturiertes JSON-Payload an die API, die es in die `Medication` Tabelle überführt.

**D. OP-Anamnese (Vorherige Operationen)**
*   **Lücke:** Keine strukturierte Erfassung von Vor-OPs (Datum, Art, Ort).
*   **Lösung:** Analog zum Medikamenten-Erfasser ein "Dynamic List"-Input-Typ generieren, der an eine neue `SurgeryHistory` Tabelle per API-Route gesendet wird.

**E. Multiselect-Parallelrouting (Architektur-Problem)**
*   **Lücke:** Wählt der Patient bei 1006 "Herz" UND "Lunge", geht der Flow aktuell in den Ast von "Herz" und vergisst danach den "Lunge"-Ast.
*   **Lösung:** 
    *   Der `QuestionnaireContext` benötigt eine **Stack/Queue (Warteschlange)** im State. Statt `currentQuestionId: string`, muss es `questionQueue: string[]` heißen.
    *   Bei Multiselect werden alle ermittelten `followUpQuestions`-Pfade ans Ende der `questionQueue` gepusht. "Weiter" popt einfach das nächste Item von der Queue.

**F. Erweiterte Red-Flags (Triage)**
*   **Lücke:** `triage` Feld im TS-Interface versteht aktuell nur ein simples Array (OR-Logik bei `when: ['brust', 'atemnot']`).
*   **Lösung:** Erweiterung des `TriageLogic` Interfaces auf komplexe Conditions (AND/OR). FAST-Test Implementierung: `{ AND: [{ questionId: "face", equals: "hängt" }, { questionId: "arms", equals: "schwach" }] }`.

**G. QR-Code/Praxis-Link Verteilung**
*   **Lücke:** Keine einfache Verteilung des Fragebogens via Praxis-Display / Wartezimmer.
*   **Lösung:**
    *   *UUID-Strategy:* Ein Public-Endpoint `/api/qr/generate` erzeugt eine temporäre Session (ohne Patient-Link) `UUID` und rendert einen QR-Code für `https://app.praxis.de/start?token={UUID}`. 
    *   *Auth:* Das Token befähigt zur Beantwortung der spezifischen Session-ID via Bearer Header.

---

## 3. TECHNISCHE SCHULDEN (Technical Debt)

*   **Duplikate (Frage 1002 - 'bauch' vs 'Bauch'):** 
    *   *Lösung ohne Zerstörung:* Ein simples Prisma-Migrations-Script (`clean-options.ts`), das serverseitig alle alten Answers lädt: `UPDATE Answer SET value = REPLACE(value, 'Bauch', 'bauch') WHERE value LIKE '%Bauch%'`. Danach die `questions.ts` aktualisieren.
*   **Type Safety in Answer-Values:** 
    *   Aktuell akzeptiert das Frontend-State `any` für den `value`.
    *   *Lösung:* Erstellung einer strengen *Discriminated Union* in TS: `type AnswerPayload = { type: 'text', data: string } | { type: 'medication', data: MedicationItem[] }`.
*   **Performance (1000+ Fragen):** 
    *   Aktuell lädt der Client die gesamte `questions.ts` synchron. Bei 1000+ Fragen (importierte PDFs) bläht das die initiale JS-Bundle-Größe unnötig auf.
    *   *Lösung:* Die JSON-Fragelogik in die Datenbank (`MedicalAtom`) migrieren und lazy-loaded per `GET /api/atoms?section=...` abrufen.

---

## 4. IMPLEMENTIERUNGS-ROADMAP

### ✅ Priorität 1: Kritisch (Sicherheit/Gesetz)
- [ ] **Schwangerschafts-Check:** 
  - [ ] Frontend: `QuestionnaireContext` Evaluator um `gender` Kontext erweitern.
  - [ ] Tests: Rendering sicherstellen (nur W, 15-50 Jahre).
- [ ] **BG-Daten Formular:** 
  - [ ] DB-Migration: `AccidentDetails` Tabelle anlegen.
  - [ ] API-Endpoint: `/api/sessions/:id/accident` erstellen.
  - [ ] Frontend: `BgAccidentForm` Komponente bauen.

### 🟡 Priorität 2: Hoch (Usability)
- [ ] **Medikamenten-Manager (Ersatz 8900):**
  - [ ] DB-Migration: `Medication` Tabelle (Patient-Relation) anlegen.
  - [ ] Frontend: Komponentenbau `DynamicListInput`.
- [ ] **Multiselect Queue-Routing Fix:**
  - [ ] Frontend: Context Reducer auf Queue-Pattern umschreiben.
  - [ ] Tests: Umfangreiche Unit-Tests für Branching schreiben.

### 🔵 Priorität 3: Mittel
- [ ] **Basis QR-Codes:** Endpoint für Einmal-Token bauen, Dashboard-Action hinzufügen.
- [ ] **Erweiterte Triage-Logik:** TS-Interfaces für AND/OR Notfall-Ausdrücke schreiben.

### ⚪ Priorität 4: Niedrig
- [ ] **OP-Anamnese:** Nach erfolgreichem Muster der Medikamenten-Listen adaptieren.
- [ ] **Mehrsprachigkeit:** i18n JSON-Dictionaries anlegen.

---

## 5. CODE-BEISPIELE (Top 3 Prioritäten)

### A. BG-Daten / Medikamentenmanager (DB-Schema Migration)

```prisma
// Neues Schema für strukturierte BG-Zusatzdaten
model AccidentDetails {
  id              String         @id @default(uuid())
  sessionId       String         @unique
  session         PatientSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  bgName          String         // DGUV, BG Bau, etc.
  accidentDate    DateTime
  accidentLocation String
  description     String
  firstResponder  String?
}

// Neues Schema für Dauermedikation (pro Patient)
model PatientMedication {
  id              String   @id @default(uuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  
  agentName       String   // "Ramipril"
  dosage          String   // "5mg"
  frequency       String   // "1-0-1-0"
  since           DateTime?
  
  createdAt       DateTime @default(now())
}
```

### B. Schwangerschafts-Check (TS Interface & Kontext Logic)

**Erweiterung des TypeScript Interfaces (`src/types/question.ts`):**
```typescript
export interface ConditionalLogic {
  operator: 'equals' | 'notEquals' | 'contains' | 'contextEquals';
  key?: 'gender' | 'age';      // NEU: Welcher Kontext?
  value: string | number | boolean | string[];
}
```

**Erweiterung im `QuestionnaireContext.tsx` (Pseudo-Logic):**
```typescript
function shouldShowQuestion(logic: QuestionLogic, session: PatientContext) {
  if (!logic.showIf) return true;
  
  return logic.showIf.every(condition => {
    if (condition.operator === 'contextEquals' && condition.key === 'gender') {
      return session.gender === condition.value; // z.B. === 'W'
    }
    // ... bisherige evaluatedAnswer-Logik
  });
}
```

### C. Strukturierter Medikamenten-Manager (Komponente)

**TS-Definition für die Payload (`AnswerValue`):**
```typescript
export type MedicationPayload = {
  type: 'medication_list';
  data: Array<{
    name: string;
    dosage: string;
    freqMorning: number;
    freqNoon: number;
    freqEvening: number;
    freqNight: number;
  }>;
};
```

**React-Logik für Struktur-Update:**
```tsx
const addMedicationRow = () => {
   const newList = [...currentValue.data, { name: '', dosage: '', ...zeros }];
   onChange({ type: 'medication_list', data: newList });
};
```
