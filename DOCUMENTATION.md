# Anamnese App: Projekt-Dokumentation & Architektur

Diese Dokumentation beschreibt die Struktur, den technischen Aufbau und die klinischen Abläufe der digitalen Anamnese-Anwendung.

---

## 🚀 Technical Stack

- **Framework**: React 18+ mit Vite
- **Sprache**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Modern Glassmorphism & Clinical Design)
- **Icons**: Lucide React
- **State Management**: React Context API + `useReducer`
- **Animationen**: CSS Transitions & Tailwind Animate

---

## 📁 Dateistruktur (Source Layout)

```text
src/
├── components/          # UI-Komponenten
│   ├── LandingPage      # Einstiegspunkt (Service-Auswahl)
│   ├── Questionnaire    # Haupt-Container für den Fragen-Ablauf
│   ├── HistorySidebar   # Permanente Verlaufsanzeige & Navigation
│   ├── QuestionRenderer # Dynamische Darstellung der Fragentypen
│   ├── AnswerSummary    # Strukturierter medizinischer Bericht
│   └── ProgressBar      # Visueller Fortschrittsanzeiger
├── context/
│   └── QuestionnaireContext # Globaler State (Antworten, aktueller Pfad)
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
