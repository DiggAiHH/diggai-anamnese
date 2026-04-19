# Anamnese App: Projekt-Dokumentation & Architektur

Diese Dokumentation beschreibt die Struktur, den technischen Aufbau und die klinischen Abläufe der digitalen Anamnese-Anwendung.

---

## 🚀 Technical Stack

- **Framework**: React 19.2 mit Vite
- **Sprache**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS 4 (Modern Glassmorphism & Clinical Design)
- **Icons**: Lucide React
- **State Management**: Zustand 5 + TanStack React Query
- **Animationen**: CSS Transitions & Tailwind Animate
- **Internationalisierung**: i18next (10 Sprachen: DE/EN/TR/AR/UK/ES/FA/IT/FR/PL)
- **Sicherheit**: AES-256-GCM Verschlüsselung, JWT HS256 (gepinnt), JTI-Blacklist
- **Datenbank**: SQLite (dateibasiert) via Prisma 6.19.2

---

## 📁 Dateistruktur (Source Layout)

```text
src/
├── components/          # UI-Komponenten (38+)
│   ├── LandingPage      # Einstiegspunkt (Service-Auswahl)
│   ├── Questionnaire    # Haupt-Container für den Fragen-Ablauf
│   ├── HistorySidebar   # Permanente Verlaufsanzeige & Navigation
│   ├── QuestionRenderer # Dynamische Darstellung der Fragentypen
│   ├── AnswerSummary    # Strukturierter medizinischer Bericht
│   ├── ProgressBar      # Visueller Fortschrittsanzeiger
│   ├── CookieConsent    # TTDSG §25 Cookie-Einwilligungsbanner
│   ├── DatenschutzGame  # Interaktives Datenschutz-Quiz
│   ├── PatientWartezimmer # Digitale Warteschlange
│   ├── StaffChat        # Interne Arzt-/MFA-Kommunikation
│   ├── StaffTodoList    # Aufgabenverwaltung für Praxisteam
│   └── ModeToggle       # Dark/Light Theme Umschalter
├── pages/
│   ├── ArztDashboard    # Arzt-Übersicht mit KI-Analyse
│   ├── MFADashboard     # MFA-Warteschlange & Zuordnung
│   ├── AdminDashboard   # Interaktive Systemdokumentation
│   ├── DatenschutzPage  # Datenschutzerklärung (Art. 13/14 DSGVO)
│   ├── ImpressumPage    # Impressum (§5 DDG)
│   ├── DokumentationPage # Interaktive Produkt-Dokumentation
│   └── HandbuchPage     # Benutzerhandbuch
├── store/
│   └── sessionStore     # Zustand State Management
├── data/
│   └── questions.ts     # Definition aller >1000 klinischen Fragen & Logik
├── types/
│   └── question.ts      # TypeScript Interfaces für Fragen, Logik & Triage
└── utils/
    └── questionLogic.ts # Der "Logic Engine" (Routing, Validierung, Triage)
```

---

## 🧠 Die Logic Engine (`questionLogic.ts`)

Die Anwendung wird durch eine datengesteuere Engine angetrieben. Anstatt fester Routen wird der Pfad dynamisch berechnet:

1.  **Iteratives Routing**: Jede Frage entscheidet basierend auf der Antwort des Nutzers über die nächste(n) Frage(n).
2.  **Recursive Conditional Routing**: Unterstützt komplexe Verschachtelungen (z.B. *Status: Bestehender Patient* UND *Grund: Rezept* -> `RES-100`).
3.  **Active Path Tracing**: Berechnet jederzeit den gesamten Pfad von Anfang bis Ende, um den Fortschrittsbalken und die Zusammenfassung korrekt anzuzeigen.
4.  **Clinical Triage**: Erkennt "Red Flags" (z.B. Brustschmerz) sofort und zeigt Warnhinweise an.

---

## 🔄 Questionnaire Workflow & Abläufe

Der Ablauf ist in drei logische Blöcke unterteilt:

### 1. Identifikations-Block (Basis für alle)
- **0000**: Bekannt-Status (Ja/Nein)
- **0001 - 0011**: Name & Vorname
- **0002 - 0003**: Geschlecht & Geburtsdatum

### 2. Enrollment-Block (Nur für NEU-Patienten)
Wenn `0000 == 'nein'`, wird automatisch dieser Block eingeschoben:
- **2000 - 2001**: Versicherungsstatus
- **3000 - 3002**: Adresse (PLZ, Ort, Anschrift)
- **3003 - 3004**: Kontakt (E-Mail, Telefon)

### 3. Service-Blöcke (Grundspezifisch)
Basierend auf der Auswahl auf der `LandingPage` (`selectedReason`) verzweigt die App nach der Identifikation/Enrollment:

| Service | Start-ID | Beschreibung |
| :--- | :--- | :--- |
| **Termin / Anamnese** | `1000` | Umfassende medizinische Abfrage (Beschwerden, Vorerkrankungen, etc.) |
| **Medikamente / Rezepte** | `RES-100` | Name, Dosierung, Packungsgröße, Bezugsweg |
| **AU (Krankschreibung)** | `AU-100` | Zeitraum, Symptome, Vorbehandlung |
| **Überweisung** | `UEB-100` | Fachrichtung, Grund |
| **Dateien / Befunde** | `DAT-100` | Typ, Beschreibung, Upload-Hinweis |
| **Weitere Services** | `TEL, ABS, BEF, MS` | Kurzabfragen für Rückrufe, Absagen, Nachrichten |

---

## 🏥 Klinische Features

### History Sidebar (Navigation)
Ermöglicht dem Patienten jederzeit den Überblick über bereits gegebene Antworten. Ein Klick auf eine vorherige Antwort führt zurück zu dieser Frage, wobei der restliche Pfad dynamisch neu berechnet wird.

### Structured Medical Summary
Am Ende steht kein einfacher Fragenkatalog, sondern ein gruppierter Bericht:
- **Personalien** (Name, Alter, Kontakt)
- **Anliegen** (Spezifische Service-Details)
- **Anamnese** (Nur bei Termin-Fluss: Diagnosen, Medikamente, Risiken)
- **Print-Modus**: Optimiert für den Ausdruck in der Praxis mit Unterschriftenfeldern.

### Red Flag System
Echtzeit-Überprüfung der Antworten gegen eine klinische Triage-Liste. Sofortige Warnmeldung bei Notfall-Symptomen.

---

## 🛠 Build & Development

- **Development**: `npm run dev` (Vite Hot-Reload)
- **Build**: `npm run build` (Erzeugt `dist/` Ordner für Deployment)

Die Anwendung ist so konzipiert, dass neue Dienste oder Fragen einfach in `questions.ts` hinzugefügt werden können, ohne den Code der UI anpassen zu müssen.

---

## 📄 DSGVO-Dokumentation (`docs/` Ordner)

Im Verzeichnis `docs/` befinden sich sämtliche DSGVO- und Datenschutz-Dokumente:

| Datei | Beschreibung |
| :--- | :--- |
| `AVV_TEMPLATE.md` | Auftragsverarbeitungsvertrag (Art. 28 DSGVO) |
| `DSFA.md` | Datenschutz-Folgenabschätzung (Art. 35 DSGVO) |
| `INCIDENT_RESPONSE_PLAN.md` | Incident-Response-Plan für Datenpannen |
| `TOM_DOKUMENTATION.md` | Technisch-organisatorische Maßnahmen (Art. 32 DSGVO) |
| `VERFAHRENSVERZEICHNIS.md` | Verfahrensverzeichnis (Art. 30 DSGVO) |

---

## 🔐 End-to-End Verschlüsselung (Zero-Knowledge Architektur)

### Datenfluss: Patient → Backend → Arzt-Dashboard

```
Patient Browser                         Server                      PostgreSQL
─────────────────────────────────────────────────────────────────────────────
1. Patient gibt PII ein
   (z.B. E-Mail, Adresse, Telefon)
        ↓
2. PBKDF2(passphrase + sessionId)
   → AES-256-GCM CryptoKey (non-extractable)
        ↓
3. encryptPayload({value}, key)
   → { iv, ciphertext, alg: 'AES-256-GCM' }
        ↓
4. POST /api/sessions/:id/answers
   { atomId: '3003', value: '[E2EE]',
     encrypted: { iv, ciphertext } }
                                        ↓
                                   5. Server speichert NUR Ciphertext
                                      (entschlüsselt NICHT)
                                        ↓
                                                                6. JSON-Blob in DB
                                                                   (nur Ciphertext)

--- Später: Arzt-Ansicht ---

7. GET /api/sessions/:id
   → Server liefert verschlüsselte Blobs
        ↓
8. MfaDecryptView im Browser:
   deriveSessionKey(masterKey, sessionId)
   decryptPayload(encrypted, key)
        ↓
9. Klartext NUR im Browser-DOM
   (wird nie zurück an Server gesendet)
   ✅ Zero-Knowledge bestätigt
```

### Verschlüsselte Felder (Client-Side E2EE)

| AtomId | Feld | Verschlüsselung |
|--------|------|-----------------|
| 3000 | PLZ | AES-256-GCM (Client) |
| 3001 | Ort | AES-256-GCM (Client) |
| 3002 | Adresse | AES-256-GCM (Client) |
| 3004 | Telefon | AES-256-GCM (Client) |
| 9011 | Kontakt-Telefon | AES-256-GCM (Client) |

### Server-Side Verschlüsselung (Legacy PII)

| AtomId | Feld | Verschlüsselung |
|--------|------|-----------------|
| 0001 | Nachname | AES-256-GCM (Server, ENCRYPTION_KEY) |
| 0011 | Vorname | AES-256-GCM (Server, ENCRYPTION_KEY) |
| 9010 | E-Mail | SHA-256 gehashter Lookup + AES-256-GCM |

### DSGVO-Signatur-Persistierung

1. Patient unterschreibt DSGVO-Formular im Browser (SignaturePad)
2. `handleSignatureComplete()` → localStorage (Offline-Fallback) + `POST /api/signatures`
3. Server verschlüsselt Signatur-Daten via `signatureService.encryptSignature()` (AES-256-GCM)
4. Gespeichert: `encryptedSignatureData`, `documentHash` (SHA-256), `ipHash`, `userAgent`
5. Abruf nur durch Arzt/Admin mit `?decrypt=true` Parameter

### Multi-Tenant-Architektur

- **Row-Level Isolation**: Jede DB-Zeile hat `tenantId`
- **Tenant-Resolution**: Subdomain → BSNR-Header → Custom-Domain → Default-Fallback
- **5-Minuten-Cache**: Tenant-Konfiguration wird gecacht für Performance
- **Skalierung**: Unbegrenzte Praxen im selben System (Shared Database)
- **White-Label**: Farben, Logo, Willkommensnachricht pro Tenant konfigurierbar
