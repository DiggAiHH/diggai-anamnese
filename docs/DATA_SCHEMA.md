# DATA_SCHEMA.md — Complete Data Reference

## Prisma Database Models

All patient data is pseudonymized and encrypted. Raw PII is NEVER stored in plaintext.

---

### Patient

```prisma
model Patient {
  id              String   @id @default(cuid())
  hashedEmail     String   @unique   // SHA-256 of patient email — pseudonymization key
  patientNumber   String   @unique   // Auto-generated: "P-XXXXX"
  encryptedName   String             // AES-256-GCM encrypted full name
  encryptedAddress String?           // AES-256-GCM encrypted address (optional)
  createdAt       DateTime @default(now())

  sessions    PatientSession[]
  medications PatientMedication[]
  surgeries   PatientSurgery[]
  signatures  Signature[]
}
```

**Key rules**:
- `hashedEmail` = SHA-256 hash — used for returning patient lookup
- `encryptedName` — always decrypt via `encryption.ts` before use, never log
- `patientNumber` — safe to log (non-identifying format)

---

### PatientSession

```prisma
model PatientSession {
  id              String        @id @default(cuid())
  patientId       String?                            // null for anonymous sessions
  status          SessionStatus                      // ACTIVE | COMPLETED | SUBMITTED | EXPIRED
  selectedService String                             // "termin" | "rezept" | "au" | "bg" | etc.
  selectedSpecialty String?                          // e.g. "neurologie", "kardiologie"
  triageLevel     String?                            // "CRITICAL" | "WARNING" | null
  startedAt       DateTime      @default(now())
  submittedAt     DateTime?
  language        String?       @default("de")       // ISO 639-1 language code

  patient         Patient?      @relation(...)
  answers         Answer[]
  triageEvents    TriageEvent[]
  chatMessages    ChatMessage[]
  accidentDetails AccidentDetails?
  queueEntry      QueueEntry?
}

enum SessionStatus {
  ACTIVE      // Patient is filling out the form
  COMPLETED   // Form completed, not yet submitted
  SUBMITTED   // Submitted to practice
  EXPIRED     // Timed out (24h auto-expiry)
}
```

---

### Answer

```prisma
model Answer {
  id             String   @id @default(cuid())
  sessionId      String
  questionId     String                    // Canonical question ID (e.g. "1002", "TERM-100")
  value          String                    // JSON-stringified answer value
  encryptedValue String?                   // AES-256-GCM — only set for PII fields (name, address, email)
  answeredAt     DateTime @default(now())

  session        PatientSession @relation(...)
}
```

**PII fields** (always use `encryptedValue`, not `value`):
- Question `0001` (Surname), `0011` (Firstname)
- Questions `3000`–`3004` (address, email, phone)

---

### TriageEvent

```prisma
model TriageEvent {
  id             String   @id @default(cuid())
  sessionId      String
  ruleId         String                    // e.g. "ACS", "SUIZIDALITAET" — see TRIAGE_RULES.md
  level          String                    // "CRITICAL" | "WARNING"
  details        String                    // JSON: { triggeredAnswers, timestamp }
  triggeredAt    DateTime @default(now())
  acknowledged   Boolean  @default(false)
  acknowledgedBy String?                   // ArztUser.id who acknowledged

  session        PatientSession @relation(...)
}
```

---

### ArztUser

```prisma
model ArztUser {
  id             String   @id @default(cuid())
  username       String   @unique
  hashedPassword String             // bcrypt, 10 rounds — NEVER store plaintext
  role           Role               // ARZT | MFA | ADMIN
  displayName    String
  createdAt      DateTime @default(now())
  lastLogin      DateTime?
}

enum Role {
  PATIENT  // Patient portal accounts
  ARZT     // Physician — full clinical access
  MFA      // Medizinische Fachangestellte (reception)
  ADMIN    // System administrator
}
```

---

### MedicalAtom (Question Catalog)

```prisma
model MedicalAtom {
  id         String  @id           // Canonical question ID (e.g. "1002")
  type       String                // QuestionType — see below
  question   Json                  // { de: "...", en: "...", tr: "...", ... } — i18n object
  section    String                // Display grouping (e.g. "Neurologie")
  order      Int                   // Sort order within section
  options    Json?                 // Array of { value: string, label: i18n-object }
  logic      Json?                 // ConditionalRule[] — routing logic
  validation Json?                 // ValidationRules
  active     Boolean @default(true)
}
```

---

### PatientAccount (PWA Portal)

```prisma
model PatientAccount {
  id                  String   @id @default(cuid())
  hashedEmail         String   @unique        // SHA-256
  webAuthnCredential  String?                 // WebAuthn JSON (biometric auth)
  dsgvoConsentDate    DateTime?               // When patient gave GDPR consent
  dsgvoConsentVersion String?                 // Version of consent text accepted
  createdAt           DateTime @default(now())

  reminders           MedicationReminder[]
}
```

---

### MedicationReminder

```prisma
model MedicationReminder {
  id           String   @id @default(cuid())
  accountId    String
  medication   String                  // Medication name
  schedule     String                  // Cron expression (e.g. "0 8 * * *" = 8am daily)
  message      String                  // Reminder text
  active       Boolean  @default(true)
  pushEndpoint String?                 // Web Push subscription endpoint

  logs         ReminderLog[]
}
```

---

### AuditLog

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  userId       String?              // ArztUser.id (null for anonymous patient actions)
  action       String               // e.g. "READ_SESSION", "EXPORT_PDF", "LOGIN"
  resourceId   String?              // ID of the accessed resource
  resourceType String?              // e.g. "Patient", "PatientSession"
  ipHash       String?              // SHA-256 of client IP — pseudonymized
  userAgent    String?
  timestamp    DateTime @default(now())
}
```

**Required for**: any read/write of patient data (HIPAA compliance).

---

### Signature (eIDAS)

```prisma
model Signature {
  id           String   @id @default(cuid())
  sessionId    String
  patientId    String?
  imageBase64  String             // AES-256-GCM encrypted Base64 PNG of signature
  signedAt     DateTime @default(now())
  ipHash       String?            // SHA-256 of signer IP
  documentHash String?            // SHA-256 of the signed document version
}
```

---

### SystemSetting

```prisma
model SystemSetting {
  key       String   @id          // e.g. "llm_provider"
  value     String                // e.g. "ollama" | "openai" | "none"
  updatedAt DateTime @updatedAt
}
```

**Known keys**:
- `llm_provider` — controls AI/LLM backend (runtime-switchable)

---

## QuestionAtom TypeScript Interface

```typescript
// src/types/question.ts

interface QuestionAtom {
  id: string;                                    // Canonical ID — never change after creation
  type: QuestionType;                            // Input type (see below)
  question: string | Record<string, string>;     // String or i18n map { de: "...", en: "..." }
  section: string;                               // UI grouping label
  order: number;                                 // Sort order within section
  options?: Array<{
    value: string;                               // Stored answer value
    label: string | Record<string, string>;      // Display label or i18n map
  }>;
  validation?: {
    required: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: string;           // Regex pattern for text validation
    ageOver?: number;           // Only show if patient age > this value
    ageUnder?: number;          // Only show if patient age < this value
    genderIs?: 'M' | 'W' | 'D'; // Only show for this gender
  };
  logic?: {
    next?: string[];                              // Default next question IDs (in order)
    conditional?: ConditionalRule[];              // Branching rules (evaluated first)
    showIf?: ShowIfRule[];                        // Visibility conditions
    followUpQuestions?: Record<string, string[]>; // Per-answer follow-up IDs
  };
}

// Conditional routing rule
interface ConditionalRule {
  when: string;    // Question ID to check, OR 'context' for session-level checks
  operator:
    | 'equals'           // value === answer
    | 'notEquals'        // value !== answer
    | 'contains'         // Array answer includes value
    | 'greaterThan'      // Numeric answer > value
    | 'lessThan'         // Numeric answer < value
    | 'contextEquals'    // Session context field equals value (e.g. gender, age)
    | 'contextGreaterThan' // Session context field > value
    | 'contextLessThan';   // Session context field < value
  value: any;                     // The value to compare against
  then: string | string[];        // Next question ID(s) if condition matches
}

// Visibility condition
interface ShowIfRule {
  questionId?: string;   // Show this question only if another question was answered
  operator: string;
  value: any;
}
```

---

## All 14 QuestionType Values

| Type | Component | Use Case |
|---|---|---|
| `radio` | RadioInput | Single choice from options |
| `select` | SelectInput | Dropdown single choice |
| `multiselect` | MultiSelectInput | Multiple selections (checkbox grid) |
| `text` | TextInput | Free text, single line |
| `textarea` | TextAreaInput | Free text, multi-line |
| `date` | DateInput | Calendar date picker |
| `number` | NumberInput | Numeric with min/max validation |
| `file` | FileInput | Document upload |
| `patient-identify` | PatientIdentify | Returning patient fast-track lookup |
| `camera` | CameraScanner | QR/barcode scan |
| `voice` | VoiceInput | Speech-to-text |
| `pattern` | PatternLock | Pattern grid authentication |
| `medication-manager` | MedicationManager | Full medication history manager |
| `bg-accident` | BgAccidentForm | BG workplace accident structured form |
| `signature` | SignaturePad | Canvas digital signature capture |

---

## Export Payload Schemas

### Plain JSON Export (`GET /api/export/json/:sessionId`)

```json
{
  "sessionId": "cuid-string",
  "exportedAt": "2026-03-07T12:00:00.000Z",
  "exportVersion": "1.0.0",
  "patientName": "optional — only included if patient consented",
  "selectedService": "termin",
  "triageLevel": "WARNING",
  "answers": [
    {
      "questionId": "0002",
      "questionText": "Geschlecht",
      "value": "W",
      "displayValue": "Weiblich",
      "section": "Identifikation",
      "answeredAt": "2026-03-07T12:01:00.000Z"
    }
  ],
  "triageEvents": [
    {
      "ruleId": "POLYPHARMAZIE",
      "level": "WARNING",
      "triggeredAt": "2026-03-07T12:05:00.000Z"
    }
  ],
  "metadata": {
    "version": "3.0.0",
    "format": "json",
    "encrypted": false,
    "language": "de"
  }
}
```

### Encrypted JSON Export (`src/utils/exportUtils.ts`)

```json
{
  "format": "anamnese-encrypted-v1",
  "algorithm": "AES-256-GCM",
  "iv": "<base64-encoded-12-byte-IV>",
  "authTag": "<base64-encoded-16-byte-auth-tag>",
  "encryptedPayload": "<base64-encoded-AES-GCM-ciphertext>",
  "keyExport": "<base64-encoded-exported-256-bit-key>"
}
```

The `keyExport` field allows the key to be transmitted separately for decryption.

---

## MedicationEntry Interface

```typescript
interface MedicationEntry {
  id: string;
  name: string;              // Drug name
  dosage: string;            // e.g. "10mg"
  frequency: string;         // e.g. "1x täglich"
  drugClass: DrugClass;      // See below — used for triage rule matching
  startDate?: string;        // ISO date
  prescribedBy?: string;     // Prescribing physician name
}

type DrugClass =
  | 'anticoagulants'      // Triggers triage rules 5, 8, 10
  | 'antibiotics'
  | 'antidepressants'     // Context for suicidality triage rule
  | 'beta-blockers'
  | 'ace-inhibitors'
  | 'diuretics'
  | 'statins'
  | 'analgesics'
  | 'other';
```

---

## Storage: localStorage vs HttpOnly Cookie

| Data | Storage | Why |
|---|---|---|
| JWT auth token | HttpOnly cookie | XSS-immune, cannot be read by JavaScript |
| i18n language preference | localStorage (`i18nextLng`) | Non-sensitive, needs to persist |
| Theme preference | localStorage (Zustand persist) | Non-sensitive, user preference |
| Font size | localStorage | Non-sensitive, accessibility preference |
| Cookie consent | localStorage (`cookieConsent`) | TTDSG §25 compliance |
| Session recovery data | sessionStorage | Temporary — expires on tab close |
| Offline question data | Dexie (IndexedDB) | Large structured data for offline use |
| Patient answers (offline) | Dexie (IndexedDB) | Encrypted before storage |

**Rule**: NEVER store JWT or patient health data in localStorage.
