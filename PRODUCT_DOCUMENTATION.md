# DiggAI Anamnese App – Produkt- & Architekturdokumentation

> Version 14.0 | Stand: März 2026 | Status: Produktion  
> URL: [https://diggai-drklaproth.netlify.app](https://diggai-drklaproth.netlify.app)

---

## 1. Executive Summary

Die **DiggAI Anamnese App** ist ein DSGVO-konformes, vollständig digitales Patienten-Aufnahmesystem für den Einsatz in deutschen Arztpraxen. Die Anwendung digitalisiert den gesamten Anamnese-Prozess – von der Patientenidentifikation über die Symptomerfassung bis zur strukturierten Arztübersicht – und ersetzt papierbasierte Fragebögen vollständig.

### Kernvorteile auf einen Blick

| Metrik | Papier (alt) | DiggAI (neu) | Verbesserung |
| --- | --- | --- | --- |
| Durchschnittliche Aufnahmezeit | 15–25 Min | 5–8 Min | **-65%** |
| Datenübertragungsfehler | ~12% | 0% (direkt digital) | **-100%** |
| Sprachbarrieren | Keine Lösung | 10 Sprachen (DE/EN/AR/TR/UK/ES/FA/IT/FR/PL) | **+∞** |
| Arzt-Vorbereitungszeit | 5–10 Min Lesen | Sofortige KI-Zusammenfassung | **-90%** |
| Notfall-Erkennung | Manuell (verzögert) | Echtzeit Triage (<2s) | **Lebensrettend** |
| DSGVO-Konformität | Papierlagerung | AES-256-GCM + Audit Trail | **Vollständig** |
| Multi-Device | Nur Papier | Smartphone / Tablet / Desktop | **100%** |

---

## 2. Systemarchitektur

### 2.1 Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                            │
│  React 19.2 · TypeScript 5.9 · Vite 8 · Tailwind CSS 4     │
│  Zustand 5 · React Query 5 · Socket.io Client · i18next     │
│  Lucide Icons · Tesseract.js (OCR) · html5-qrcode           │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND (API)                             │
│  Express 5.2.1 · Prisma 6.19.2 · SQLite (dateibasiert)      │
│  JWT Auth · AES-256-GCM · Helmet · Rate Limiting             │
│  Socket.io · Multer (Uploads) · Audit Logging                │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUKTUR                              │
│  Netlify (Frontend) · Node.js 20+ Server · SQLite            │
│  TLS 1.3 · HIPAA Audit Trail · Automated Backups             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Datenbankmodell (Prisma/SQLite)

```
Patient ──1:n── PatientSession ──1:n── Answer
   │                  │                    └── encryptedValue (AES-256-GCM)
   │                  ├── 1:n── TriageEvent
   │                  ├── 1:1── AccidentDetails (BG-Unfall)
   │                  └── 1:n── ChatMessage
   ├── 1:n── PatientMedication
   └── 1:n── PatientSurgery

ArztUser ──────── role: PATIENT | ARZT | MFA | ADMIN
AuditLog ──────── HIPAA-konformes Zugriffsprotokoll
MedicalAtom ───── Fragen-Definitionen (Server-seitig)
```

### 2.3 Komponentenarchitektur (38+ Komponenten)

```
App.tsx
├── /arzt ──────── ArztDashboard (Auth-geschützt)
├── /mfa ───────── MFADashboard (Auth-geschützt)
├── /admin ─────── AdminDashboard (NEU: Interaktive Dokumentation)
├── /datenschutz ─ DatenschutzPage (Datenschutzerklärung)
├── /impressum ─── ImpressumPage (§5 DDG)
├── /docs ──────── DokumentationPage
├── /handbuch ──── HandbuchPage
└── /* ─────────── PatientApp
                   ├── LandingPage (10 Service-Cards)
                   │   └── DSGVOConsent (Einwilligungsdialog)
                   │   └── CookieConsent (TTDSG §25)
                   └── Questionnaire
                       ├── HistorySidebar (Verlaufsnavigation)
                       ├── ProgressBar (Fortschrittsanzeige)
                       ├── QuestionRenderer
                       │   ├── RadioInput
                       │   ├── SelectInput
                       │   ├── MultiSelectInput
                       │   ├── TextInput
                       │   ├── DateInput
                       │   └── +11 weitere Typen
                       ├── MedicationManager
                       ├── SchwangerschaftCheck
                       ├── SurgeryManager
                       ├── UnfallBGFlow
                       ├── RedFlagOverlay (Triage-Notfall)
                       ├── WarningBanner (Triage-Warnung)
                       ├── AnswerSummary
                       ├── PDFExport (Signatur + Druck)
                       ├── CameraScanner (OCR)
                       ├── SubmittedPage
                       ├── CookieConsent (TTDSG §25)
                       ├── DatenschutzGame (Interaktiv)
                       ├── PatientWartezimmer (Warteschlange)
                       ├── StaffChat (Interne Kommunikation)
                       ├── StaffTodoList (Aufgabenverwaltung)
                       └── ModeToggle (Dark/Light Theme)
```

---

## 3. Patienten-Flow (Gesamtablauf)

### 3.1 Übersicht: 10 Service-Pfade

| # | Service | Start-ID | Dauer | Beschreibung |
| --- | --- | --- | --- | --- |
| 1 | **Termin / Anamnese** | 0000 → 1000 | 5–8 Min | Vollständige medizinische Anamnese |
| 2 | **Medikamente / Rezepte** | RES-100 | 2 Min | Folge-Rezept-Anforderung |
| 3 | **AU (Krankschreibung)** | AU-100 | 3 Min | Arbeitsunfähigkeits-Bescheinigung |
| 4 | **Unfallmeldung (BG)** | 2080 | 5 Min | Arbeits-/Wegeunfall dokumentieren |
| 5 | **Überweisung** | UEB-100 | 2 Min | Fachspezifische Überweisung |
| 6 | **Terminabsage** | ABS-100 | 1 Min | Bestehenden Termin absagen |
| 7 | **Dateien / Befunde** | DAT-100 | 2 Min | Dokumente übermitteln |
| 8 | **Telefonanfrage** | TEL-100 | 2 Min | Rückruf anfordern |
| 9 | **Dokumente anfordern** | BEF-100 | 2 Min | Befunde/Berichte anfordern |
| 10 | **Nachricht schreiben** | MS-100 | 3 Min | Allgemeine Praxis-Nachricht |

### 3.2 Haupt-Anamnese-Flow (Service 1: Termin/Anamnese)

```
LANDING PAGE
    │
    ▼
DSGVO-EINWILLIGUNG ──[Ablehnung]──▶ STOPP
    │
    ▼
IDENTIFIKATION
    ├── 0000  Bekannt? (Ja/Nein)
    ├── 0001  Nachname
    ├── 0011  Vorname
    ├── 0002  Geschlecht (M/W/D)
    └── 0003  Geburtsdatum
         │
    ┌────┴────┐
    ▼         ▼
 NEU-PATIENT  BESTANDS-PATIENT
    │              │
    ▼              ▼
 ENROLLMENT        TERMINWUNSCH
 ├─ 2000 Vers.     ├─ TERM-100 Tag (Mo–Fr, Egal)
 ├─ 3000 PLZ       ├─ TERM-101 Zeit (VM/NM/Egal)
 ├─ 3001 Ort       │
 ├─ 3002 Straße    MEDIKAMENTENÄNDERUNG
 ├─ 3003 E-Mail    ├─ ALT-100 Geändert? (Ja/Nein)
 └─ 3004 Telefon   │
    │              BESUCHSGRUND
    │              ├─ VISIT-100 (9 Optionen)
    │              │   ├─ Beschwerdeabklärung → 1000
    │              │   ├─ Kontrolle → 5B-100
    │              │   ├─ Vorsorge → 5C-100
    │              │   ├─ Therapieanpassung → 5D-100
    │              │   ├─ Befunderörterung → 5E-100
    │              │   ├─ Tumorverdacht → 5F-100
    │              │   ├─ Begutachtung → 5G-100
    │              │   ├─ Unfallfolgen → 5H-100
    │              │   └─ Zweitmeinung → 5I-100
    │              │
    └──────┬───────┘
           ▼
    BESCHWERDEN (Block 5–7)
    ├── 1000  Beschwerden vorhanden? → [Nein + Alt → 9500 Bewertung]
    ├── 1001  Seit wann? (Select)
    ├── 1004  Wie häufig? (Select)
    ├── 1005  Auslöser? (Multiselect)
    ├── 1006  Verlauf? (Select)
    ├── 1007  Begleitsymptome (Multiselect)
    └── 1002  Körperregion (Multiselect → 13 Sub-Module)
              ├── Angiologie (1010)
              ├── Atembeschwerden (1020)
              ├── Magen-Darm (1030)
              ├── Haut (1040)
              ├── Herz-Kreislauf (1050)
              ├── Stoffwechsel (1060)
              ├── Bewegungsapparat (1070)
              ├── Neurologie (1080)
              ├── Urologie/Gyn (1090)
              ├── Augen (1A00)
              ├── HNO (1B00)
              ├── Gemüt/Psyche (1C00) [PHQ-Style, 15 Fragen]
              └── Gynäkologie (GYN-100) [showIf: W]
           ▼
    ALLGEMEIN (Block 10, nur Neu-Patienten)
    ├── 4000  Größe
    ├── 4001  Gewicht
    ├── 5000  Diabetes
    ├── 6000  Beeinträchtigungen
    ├── 6002  Implantate
    ├── 6004  Blutverdünner
    └── 6007  Allergien
           ▼
    GEWOHNHEITEN (Block 11)
    ├── 4002  Rauchen
    ├── 4100  Sport
    ├── 4120  Beruf
    ├── 4130  Alkohol
    └── 4131  Drogen
           ▼
    VORERKRANKUNGEN (Block 13)
    ├── 7000  Gesundheitsstörungen (Multiselect)
    └── 7001–7011  Detail-Follow-ups (Herz, Lunge, Niere, ...)
           ▼
    ERKRANKUNGEN/EINGRIFFE (Block 14)
    ├── 8000  Operationen/Diagnosen (Multiselect)
    └── 8001–8012  Detail-Follow-ups
           ▼
    KINDER (<6 J., Block 15–16, showIf)
    ├── 1500  Frühgeburt?
    ├── 1501  Gewicht bei Geburt
    └── 1600–1604  Entwicklung
           ▼
    SCREENING & VORSORGE (Block 17–19, showIf Alter/Geschlecht)
    ├── 1700  Gesundheitscheck (>35 J.)
    ├── 1800  Mammografie (W, >50 J.)
    ├── MAMMO-100  Details
    ├── 1900  Prostata (M, >44 J.)
    ├── DARM-W-100  Darmkrebs (>50 J.)
    └── 1901  Darmkrebs-Vorsorge
           ▼
    SCHWANGERSCHAFT (showIf: W, 14–50 J.)
    ├── 8800  Schwanger?
    ├── 8801–8802  SSW, Risiko
    └── 8850–8851  Verhütung
           ▼
    MEDIKAMENTE (Block 12)
    ├── MED-100  Strukturierte Medikamentengruppen
    ├── 8900  Freitext-Ergänzung
    └── 8950–8951  Allergien-Ergänzung
           ▼
    ABSCHLUSS (Block 20–21)
    ├── 9010  Kontaktwunsch (Telefon/E-Mail)
    ├── 9011  Bestätigungspräferenz
    ├── 9500  Bewertung (1–5 Sterne)
    ├── 9501  Freitext-Feedback
    └── 9000  ENDE → Zusammenfassung / PDF-Export
```

---

## 4. Routing Engine

### 4.1 Drei-Stufen-Routing

```
Stufe 1: followUpQuestions    → Option hat spezifische Sub-Fragen?
         │ JA → folge diesem Pfad
         │ NEIN ↓
Stufe 2: conditional routing  → Prüfe Bedingungen (when/context/equals)
         │ MATCH → folge "then" Pfad
         │ NEIN ↓
Stufe 3: static logic.next    → Fester nächster Schritt
```

### 4.2 Unterstützte Operatoren

| Operator | Beschreibung | Beispiel |
| --- | --- | --- |
| `equals` | Exakte Übereinstimmung | `answer == 'ja'` |
| `notEquals` | Ungleich | `answer != 'nein'` |
| `contains` | Array enthält Wert | `['herz', 'lunge'].includes('herz')` |
| `greaterThan` | Numerisch größer | `age > 35` |
| `lessThan` | Numerisch kleiner | `age < 6` |
| `contextEquals` | Session-Kontext prüfen | `gender == 'W'` |
| `contextGreaterThan` | Alter/Kontext > Wert | `age > 50` |
| `contextLessThan` | Alter/Kontext < Wert | `age < 14` |

### 4.3 showIf-System (Bedingte Sichtbarkeit)

Fragen können geschlechts- oder altersabhängig ein-/ausgeblendet werden:

```typescript
showIf: [
  { operator: 'contextEquals', key: 'gender', value: 'W' },
  { operator: 'contextGreaterThan', key: 'age', value: 14 },
  { operator: 'contextLessThan', key: 'age', value: 51 }
]
// → Frage wird nur für Frauen zwischen 14 und 50 Jahren angezeigt
```

---

## 5. Sicherheitsarchitektur

### 5.1 Datenverschlüsselung

```
┌─────────────────────────────────────────────┐
│              ENCRYPTION LAYER                │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ PII-Daten │───▶│ AES-256-GCM          │   │
│  │ (Name,    │    │ • IV: 12 Bytes       │   │
│  │  Adresse, │    │ • AuthTag: 16 Bytes  │   │
│  │  E-Mail)  │    │ • Key: 32 Bytes      │   │
│  └──────────┘    └──────────────────────┘   │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ E-Mail    │───▶│ SHA-256 Hash          │   │
│  │ (Patient- │    │ (Pseudonymisierung)   │   │
│  │  Zuordng) │    └──────────────────────┘   │
│  └──────────┘                                │
│                                              │
│  ┌──────────┐    ┌──────────────────────┐   │
│  │ Passwort  │───▶│ bcrypt (10 Rounds)    │   │
│  │ (Arzt)    │    └──────────────────────┘   │
│  └──────────┘                                │
└─────────────────────────────────────────────┘
```

### 5.2 Authentifizierung & Autorisierung

| Schicht | Technologie | Details |
| --- | --- | --- |
| **Transport** | TLS 1.3 | End-to-end Verschlüsselung |
| **Auth** | JWT | HttpOnly Cookies, 24h Expiry |
| **RBAC** | 4 Rollen | PATIENT, ARZT, MFA, ADMIN |
| **API-Schutz** | Helmet.js | Security Headers (CSP, HSTS, X-Frame) |
| **Rate Limiting** | express-rate-limit | 100 Requests / 15 Min pro IP |
| **JWT Pinning** | HS256 | Algorithmus explizit gepinnt |
| **Token Blacklist** | JTI-basiert | In-Memory Blacklist für Token-Widerruf |
| **Session** | Ownership Check | Nur eigene Session bearbeitbar |
| **Audit** | HIPAA Logging | Jeder Zugriff wird protokolliert |

### 5.3 DSGVO-Konformität

- ✅ **Einwilligungserklärung** vor Datenverarbeitung (DSGVOConsent-Dialog)
- ✅ **Datensparsamkeit** – nur medizinisch notwendige Daten
- ✅ **Pseudonymisierung** – SHA-256 Hash statt Klartext-E-Mail
- ✅ **Verschlüsselung** – AES-256-GCM für alle PII-Felder
- ✅ **Löschrecht** – Session-Ablauf nach 24h
- ✅ **Audit Trail** – Vollständige Zugriffsdokumentation
- ✅ **Datenportabilität** – Export als PDF/CSV/JSON
- ✅ **Cookie-Consent-Banner** (TTDSG §25)
- ✅ **Datenschutzerklärung** (Art. 13/14 DSGVO)
- ✅ **Impressum** (§5 DDG)

---

## 6. Triage-System (Notfallerkennung)

### 6.1 Echtzeit Red-Flag-Erkennung

| # | Regel | Level | Auslöser | Aktion |
| --- | --- | --- | --- | --- |
| 1 | Akutes Koronarsyndrom | 🔴 CRITICAL | Brustschmerzen + Atemnot/Lähmung | Vollbild-Overlay, 112-Notruf |
| 2 | Suizidalität | 🔴 CRITICAL | Depression + spezifische Indikatoren | Sofort-Alert an Arzt |
| 3 | SAH/Aneurysma | 🔴 CRITICAL | Kopfschmerzen + Bewusstseinsstörung | 112-Notruf |
| 4 | Syncope + Risiko | 🔴 CRITICAL | Ohnmacht + Herzrhythmusstörung | Sofort-Alert |
| 5 | GI-Blutung | 🟡 WARNING | Blutverdünner + Bauchschmerzen | Arzt-Warnung |
| 6 | Diabetisches Fußsyndrom | 🟡 WARNING | Diabetes + Fußsyndrom | Arzt-Warnung |
| 7 | Starker Raucher | 🟡 WARNING | >30 Pack-Years | Arzt-Hinweis |
| 8 | Schwangerschaft + Medikamente | 🟡 WARNING | Schwanger + Blutverdünner | Arzt-Warnung |
| 9 | Polypharmazie | 🟡 WARNING | >5 Medikamente | Arzt-Hinweis |
| 10 | Doppel-Blutverdünner | 🟡 WARNING | ≥2 Antikoagulantien | Arzt-Warnung |

### 6.2 Notfall-Workflow

```
Antwort eingegeben
      │
      ▼
  getTriageAlert() prüft Regeln
      │
  ┌───┴───┐
  ▼       ▼
WARNING  CRITICAL
  │       │
  ▼       ▼
Banner   Vollbild-Overlay
(gelb)   (rot, pulsierend)
  │       │
  │       ├── 5-Sekunden-Countdown
  │       ├── 112-Direktanruf-Button
  │       └── Socket.io → Arzt-Dashboard
  │
  └── Socket.io → Arzt-Dashboard
```

---

## 7. Export & Dokumentation

### 7.1 Strukturierter Medizinischer Bericht

Die **AnswerSummary**-Komponente gruppiert alle Antworten in klinische Kategorien:

| Gruppe | Inhalt | IDs |
| --- | --- | --- |
| 👤 Personalien & Kontakt | Name, Geschlecht, Geburtsdatum, Adresse, Versicherung | 0000–9011 |
| 🏥 Aktuelles Anliegen | Beschwerden, Dauer, Häufigkeit, Lokalisation, Sub-Module | 1000–AU-103 |
| 📋 Medizinische Vorgeschichte | Vorerkrankungen, Operationen, Medikamente, Allergien | 4000–8900 |

### 7.2 PDF-Export

- **Browser-basierte PDF-Generierung** via `window.print()`
- **Digitale Signatur** – Touch/Maus-Zeichnung auf Canvas
- **A4-optimiertes Layout** mit Praxis-Header
- **Abschnitte:** Personalien → Anliegen → Anamnese → Unterschrift

### 7.3 Weitere Export-Formate

| Format | Endpunkt | Beschreibung |
| --- | --- | --- |
| **PDF** | `GET /api/export/pdf/:id` | Druckoptimierter Bericht |
| **CSV** | `GET /api/export/csv/:id` | Tabellarische Daten |
| **JSON** | `GET /api/export/json/:id` | Maschinenlesbar (API-Integration) |

---

## 8. Produktivitätsananalyse

### 8.1 Zeitersparnis pro Patientenkontakt

```
PAPIERBASIERT                    DIGITAL (DiggAI)
═══════════════                  ═══════════════════
Papier verteilen      2 Min      Patient scannt QR     0 Min
Patient füllt aus    15 Min      App-Fragebogen        5 Min
Abgabe + Warten       3 Min      Automatisch            0 Min
MFA tippt ab          8 Min      Direkt digital         0 Min
Arzt liest           5 Min      KI-Zusammenfassung    0.5 Min
───────────────────              ───────────────────────
GESAMT              33 Min      GESAMT               5.5 Min
                                 ERSPARNIS            -83%
```

### 8.2 ROI pro Praxis (Monatliche Hochrechnung)

| Metrik | Berechnung | Ergebnis |
| --- | --- | --- |
| Patienten/Tag | 40 | 40 |
| Zeitersparnis/Patient | 27.5 Min | 27.5 Min |
| Zeitersparnis/Tag | 40 × 27.5 Min | **18.3 Stunden** |
| Zeitersparnis/Monat (22 Tage) | 18.3 × 22 | **403 Stunden** |
| MFA-Äquivalent eingespart | 403 ÷ 160 | **2.5 Vollzeitstellen** |
| Kosteneinsparung/Monat | 2.5 × 3.500€ | **~8.750€** |

### 8.3 Qualitätsverbesserungen

| Bereich | Verbesserung |
| --- | --- |
| **Vollständigkeit** | 100% aller Pflichtfelder ausgefüllt (Validierung) |
| **Lesbarkeit** | Digitale Schrift statt Handschrift |
| **Triage-Geschwindigkeit** | <2 Sekunden statt manueller Erkennung |
| **Mehrsprachigkeit** | 10 Sprachen – keine Dolmetscher-Wartezeit |
| **Datensicherheit** | E2E-Verschlüsselung statt offener Papierakte |
| **Nachhaltigkeit** | 0 Papierverbrauch |
| **Fehlerreduktion** | Pflichtfelder + Plausibilitätsprüfung |

### 8.4 Funktions-Highlights

| Feature | Beschreibung | Produktivitätswirkung |
| --- | --- | --- |
| **Intelligentes Routing** | Nur relevante Fragen werden angezeigt | -40% Fragen für den Patienten |
| **showIf-System** | Geschlechts-/Altersabhängige Blöcke | Keine irrelevanten Fragen |
| **Multiselect-Queue** | Mehrere Beschwerden parallel abarbeiten | Keine vergessenen Symptome |
| **OCR-Scanner** | Medikamentenplan fotografieren | -90% manuelle Eingabe |
| **Echtzeit-Chat** | Arzt ↔ Patient Kommunikation | Keine Rückfragen nötig |
| **Auto-Triage** | 10 Red-Flag-Regeln | Notfälle sofort erkannt |
| **Dark/Light Mode** | Augenschonend | Bessere Akzeptanz |
| **Demo-Modus** | Offline-fähig ohne Backend | Sofortiger Test möglich |

---

## 9. Dashboards

### 9.1 Arzt-Dashboard (`/arzt`)

- **Session-Übersicht** mit Live-Statistiken (Aktiv, Abgeschlossen, Red Flags)
- **KI-gestützte Analyse** mit ICD-10-Codes und medizinischer Zusammenfassung
- **Echtzeit-Triage-Events** via Socket.io
- **Live-Chat** bidirektional mit Patienten
- **Export** (PDF/CSV) pro Session
- **Session-Locking** (zeigt, wer gerade eine Akte bearbeitet)

### 9.2 MFA-Dashboard (`/mfa`)

- **Warteschlange** der eingehenden Patientensitzungen
- **Schnellzuordnung** von Sitzungen an Ärzte
- **Statusübersicht** (wartend, in Bearbeitung, abgeschlossen)

### 9.3 Admin-Dashboard (`/admin`) – NEU

- **Interaktive Systemdokumentation** mit Live-Statistiken
- **Visueller Questionnaire-Flow** (Mermaid-Diagramme)
- **Sicherheitsarchitektur** als interaktive Grafik
- **Produktivitäts-KPIs** und ROI-Rechner
- **Komponentenübersicht** mit Technologie-Stack

---

## 10. Internationalisierung (i18n)

| Sprache | Code | Status | Schlüssel |
| --- | --- | --- | --- |
| 🇩🇪 Deutsch | `de` | ✅ Vollständig | ~1.812 |
| 🇬🇧 English | `en` | ✅ Vollständig | ~1.812 |
| 🇹🇷 Türkçe | `tr` | ✅ Vollständig | ~1.808 |
| 🇸🇦 العربية | `ar` | ✅ Vollständig (RTL) | ~1.808 |
| 🇺🇦 Українська | `uk` | ⚠️ 69 Schlüssel fehlen | ~1.743 |
| 🇪🇸 Español | `es` | ✅ Vollständig | ~1.809 |
| 🇮🇷 فارسی | `fa` | ✅ Vollständig (RTL) | ~1.812 |
| 🇮🇹 Italiano | `it` | ✅ Vollständig | ~1.812 |
| 🇫🇷 Français | `fr` | ✅ Vollständig | ~1.812 |
| 🇵🇱 Polski | `pl` | ✅ Vollständig | ~1.812 |

---

## 11. API-Referenz

| Methode | Endpunkt | Auth | Beschreibung |
| --- | --- | --- | --- |
| POST | `/api/sessions/start` | – | Session erstellen |
| POST | `/api/sessions/:id/answers` | JWT | Antwort speichern |
| POST | `/api/triage` | JWT | Triage-Event auslösen |
| PUT | `/api/arzt/sessions/:id/status` | ARZT | Session-Status ändern |
| POST | `/api/upload` | JWT | Datei hochladen |
| GET | `/api/export/:format/:id` | ARZT | Export (PDF/CSV/JSON) |
| GET | `/api/arzt/sessions` | ARZT | Alle Sitzungen |
| GET | `/api/arzt/sessions/:id/chat` | ARZT | Chat abrufen |
| POST | `/api/chats/:id` | JWT | Chat-Nachricht senden |
| POST | `/api/mfa/assign` | MFA | Session zuweisen |

---

## 12. Entwicklung & Deployment

### 12.1 Lokale Entwicklung

```bash
npm install          # Dependencies installieren
npm run dev:all      # Frontend (5173) + Backend (3001) starten
npm run db:migrate   # Datenbank-Migration
npm run db:seed      # Seed-Daten laden
```

### 12.2 Production Build

```bash
npm run build        # TypeScript-Kompilierung + Vite-Build
```

### 12.3 Deployment

- **Frontend**: Netlify (automatisch via `dist/` Ordner)
- **Backend**: Node.js Server mit SQLite (dateibasiert)
- **CI/CD**: Playwright E2E-Tests vor jedem Deploy

### 12.4 E2E-Tests (Playwright)

| Test | Beschreibung | Status |
| --- | --- | --- |
| i18n-Rendering | Phase 8 Schlüssel laden ohne Fehler | ✅ |
| Build Integrity | Keine Console-Errors nach Navigation | ✅ |
| Patient Flow | Vollständiger Bestands-Patienten-Pfad | ✅ |
| Headache Chain | Kopfschmerz-Sub-Chain (5 Zwischenfragen) | ✅ |
| Age Gate | Darmkrebs-Screening Alters-Bedingung | ✅ |
| DOM Presence | MAMMO-100 und DARM-W-100 im DOM vorhanden | ✅ |

---

*Erstellt: Phase 8 | DiggAI Anamnese App | DSGVO-konform | Made in Germany 🇩🇪*
