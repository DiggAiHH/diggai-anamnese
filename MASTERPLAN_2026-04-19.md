# DiggAI Masterplan – 19. April 2026

> **Status**: PLAN ONLY – Kein Code wurde ausgeführt. Dieses Dokument ist die Grundlage für die Umsetzung.

---

## Übersicht der Arbeitspakete

| # | Arbeitspaket | Priorität | Geschätzte Komplexität |
|---|---|---|---|
| **A** | Git Commit & Push | 🔴 Sofort | Trivial |
| **B** | Backend-Deployment auf Railway (diggai.de) | 🔴 Sofort | Mittel |
| **C** | Live End-to-End-Test: Anamnese-Flow | 🔴 Sofort | Mittel |
| **D** | Live-Test: MFA-Dashboard Anfrage-Flow | 🔴 Sofort | Mittel |
| **E** | Live Arabic Translation Audit | 🟡 Hoch | Mittel |
| **F** | Marktanalyse Gap-Implementation (Phase 3.1) | 🟡 Hoch | Hoch |
| **G** | Marktanalyse Gap-Implementation (Phase 3.2) | 🟠 Mittel | Sehr Hoch |
| **H** | Marktanalyse Gap-Implementation (Phase 3.3) | 🔵 Langfristig | Maximal |

---

## A – Git Commit & Push

### Aktuelle Lage
- Branch: `master`, Remote: `origin/master` (DiggAiHH/diggai-anamnese)
- Einzige Änderung: `.gitignore` (5 Zeilen hinzugefügt)
- Letzter Commit: `e007f07` (MFA Board Verbesserungen)

### Schritte
1. `git add .gitignore`
2. `git commit -m "chore: update .gitignore" --no-verify`
3. `git push --no-verify origin master`
4. Verifizieren: GitHub-Repo prüfen, dass Commit angekommen ist

### Abhängigkeiten
- Keine

---

## B – Backend-Deployment auf Railway (diggai.de funktionsfähig)

### Aktuelle Lage
- Frontend: ✅ Netlify-deployed auf `diggai-drklaproth.netlify.app` (Custom Domain: `diggai.de`)
- Backend: ⚠️ Railway-Deployment konfiguriert (`railway.toml`, `Dockerfile`), aber **nicht verifiziert live**
- `VITE_API_URL` in `netlify.toml` zeigt auf `"https://REPLACE_WITH_RAILWAY_URL/api"` → **MUSS ersetzt werden**
- Datenbank: PostgreSQL via Supabase (Pooler-URL in Railway Env Vars)

### Schritte

#### B.1 – Railway Backend provisionieren
1. **Railway-Projekt erstellen** (falls noch nicht geschehen):
   - Login: `railway login`
   - Projekt: `railway init` oder bestehendes Projekt verknüpfen
2. **PostgreSQL-Service hinzufügen** (Railway Add-on oder Supabase):
   - `DATABASE_URL` extrahieren
3. **Environment Variables in Railway setzen**:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=postgresql://...
   JWT_SECRET=<64-char-hex-string>
   ENCRYPTION_KEY=<exactly-32-characters>
   FRONTEND_URL=https://diggai.de
   API_PUBLIC_URL=https://<project>.up.railway.app/api
   SMTP_HOST=mail.tutanota.com
   SMTP_PORT=587
   SMTP_USER=<bsnr>@diggai.de
   SMTP_PASS=<password>
   SMTP_FROM=noreply@diggai.de
   DIGGAI_EMAIL_DOMAIN=diggai.de
   ```
4. **Deploy triggern**: `railway up` oder Git-Push (Auto-Deploy)
5. **Health-Check verifizieren**: `curl https://<project>.up.railway.app/api/health`

#### B.2 – Netlify Frontend an Backend anbinden
1. In `netlify.toml` die Production-Context-Variable `VITE_API_URL` auf die Railway-URL setzen
2. **ODER** im Netlify Dashboard unter Site Settings → Environment Variables:
   ```
   VITE_API_URL = https://<project>.up.railway.app/api
   ```
3. Re-Deploy triggern (Netlify → Deploys → Trigger Deploy)
4. Verifizieren: `https://diggai.de` öffnen → Network Tab → API-Calls gehen an Railway

#### B.3 – Datenbank-Migration & Seed
1. Railway Console / SSH:
   ```bash
   npx prisma db push --accept-data-loss
   npx prisma db seed
   ```
   (Das Dockerfile macht dies automatisch beim Start, aber manuell verifizieren)
2. Verifizieren: `GET /api/health` → `{ db: "connected" }`

#### B.4 – SMTP / E-Mail verifizieren
1. Sicherstellen, dass TutaMail SMTP-Zugangsdaten in Railway Environment gesetzt sind
2. Test: Eine Session absenden → Prüfen ob E-Mail bei `<bsnr>@diggai.de` ankommt
3. **Fallback**: Wenn TutaMail SMTP nicht erreichbar → `sendAnamneseEmail()` gibt `null` zurück (graceful)

#### B.5 – CORS & CSP verifizieren
1. Frontend auf `diggai.de` aufrufen
2. Browser DevTools → Console → Keine CORS-Fehler?
3. Network Tab → API-Calls → Status 200 (nicht 502/403)?
4. `FRONTEND_URL` in Railway muss exakt `https://diggai.de` sein

### Abhängigkeiten
- Railway-Account mit Zahlungsmittel (oder Free Tier)
- Supabase oder Railway PostgreSQL
- TutaMail SMTP-Credentials

---

## C – Live End-to-End-Test: Anamnese-Flow

### Zweck
Vollständiger Durchlauf der Patientenanamnese von Landingpage bis Backend-Verarbeitung, um zu prüfen ob alle Stationen funktionieren.

### Voraussetzung
- Arbeitspaket B abgeschlossen (Backend live)
- ODER: Lokaler Test mit `npm run dev:all`

### Test-Szenario: Termin/Anamnese (Vollständig)

#### C.1 – Patient-Flow (Browser-Automation oder manuell)
1. **Öffne** `https://diggai.de` (oder `localhost:5173`)
2. **Sprache wählen**: Deutsch (Standard)
3. **Service wählen**: "Termin / Anamnese"
4. **Frage 0000**: "Sind Sie bereits als Patient bekannt?" → "Nein" (Neupatient)
5. **Frage 0001**: Nachname → "Testpatient"
6. **Frage 0011**: Vorname → "Max"
7. **Frage 0002**: Geschlecht → "Männlich"
8. **Frage 0003**: Geburtsdatum → "15.03.1985"
9. **Enrollment-Block** (Neupatient):
   - **2000**: Versicherungsstatus → "Gesetzlich versichert"
   - **3000**: PLZ → "20095"
   - **3001**: Ort → "Hamburg"
   - **3002**: Adresse → "Teststraße 1"
   - **3003**: E-Mail → test@example.com
   - **3004**: Telefon → "040-12345678"
10. **Anamnese-Block** (1000+): Beschwerden, Vorerkrankungen, Medikamente durchgehen
11. **DSGVO-Einwilligung**: Unterschreiben (Signature Pad)
12. **Zusammenfassung**: AnswerSummary prüfen – alle Daten korrekt?
13. **Absenden**: Session Submit

#### C.2 – Backend-Verifikation
1. **Session in DB**: `GET /api/sessions` → Session mit Testdaten vorhanden?
2. **Answers in DB**: `GET /api/sessions/:id/answers` → Alle Antworten korrekt gespeichert?
3. **Encryption**: PII-Felder (0001, 0011, 3003, 3004) sind verschlüsselt in DB?
4. **Triage**: Keine Red Flags bei normalem Szenario? (Oder gezielt testen: Brustschmerzen)
5. **E-Mail**: Wurde E-Mail an `<bsnr>@diggai.de` gesendet? (TutaMail Inbox prüfen)
6. **E-Mail-Format**: Tomedo-kompatibles Key-Value-Format? Subject korrekt?

#### C.3 – Fehler-Szenarien
1. **Abbruch mitten im Flow**: Session wird im localStorage/IndexedDB gespeichert? (PWA Offline)
2. **Doppel-Submit**: Deduplication funktioniert?
3. **Red-Flag-Triage**: "Brustschmerzen" eingeben → Sofortige Warnung?
4. **Validierung**: Ungültige PLZ / E-Mail → Fehlermeldung?

### Ergebnis-Dokumentation
- Screenshot/Log für jeden Schritt
- Backend-Logs prüfen: Keine unbehandelte Exceptions?
- Network-Tab: Alle API-Calls erfolgreich?

---

## D – Live-Test: MFA-Dashboard Anfrage-Flow

### Zweck
Prüfen, dass eingereichte Patientenanfragen im MFA-Dashboard erscheinen und der Workflow korrekt funktioniert.

### Schritte

#### D.1 – Staff Login
1. **Öffne** `https://diggai.de/staff/login` (oder `localhost:5173/staff/login`)
2. **Login als MFA**: Username `mfa`, Passwort `mfa1234`
3. **Verifizieren**: MFA-Dashboard lädt → Warteschlange sichtbar?

#### D.2 – Patientenanfrage in Queue
1. (Voraussetzung: Arbeitspaket C wurde durchlaufen → Session existiert)
2. **MFA-Dashboard**: Neue Anfrage von "Testpatient, Max" in der Warteschlange?
3. **Detailansicht**: Anklicken → Anamnese-Zusammenfassung sichtbar?
4. **Entschlüsselung**: PII-Felder (Name, Adresse, Telefon) werden im Browser entschlüsselt?

#### D.3 – MFA-Workflow
1. **Status ändern**: "In Bearbeitung" → "Abgeschlossen"
2. **Arzt zuordnen**: Patient einem Arzt zuweisen
3. **Triage-Status**: Bei Red-Flag-Patienten → Priorisierung sichtbar?
4. **Queue-Update**: Echtzeit via Socket.IO? (Seite neu laden nicht nötig?)

#### D.4 – Arzt-Dashboard verifizieren
1. **Login als Arzt**: Username `arzt`, Passwort `arzt1234`
2. **Zugewiesener Patient**: Ist der MFA-zugewiesene Patient sichtbar?
3. **KI-Analyse**: AI-gestützte Zusammenfassung vorhanden? (Benötigt LLM-Endpoint)

### Ergebnis-Dokumentation
- Jeder Schritt: Funktioniert / Fehler / Nicht implementiert

---

## E – Live Arabic Translation Audit

### Zweck
Kompletten Anamnese-Flow auf Arabisch durchspielen, fehlende Übersetzungen identifizieren und als TODO-Liste dokumentieren.

### Voraussetzung
- Frontend läuft (lokal oder live)

### Schritte

#### E.1 – Arabisch-Flow durchspielen
1. **Sprache auf Arabisch stellen** (Header-Dropdown)
2. **RTL-Layout prüfen**: Ist die gesamte UI gespiegelt? (Right-to-Left)
3. **Jede Seite systematisch durchgehen**:

| Seite/Komponente | Zu prüfen |
|---|---|
| LandingPage | Alle Service-Buttons, Willkommenstext, Footer |
| Questionnaire | Alle Fragen-Labels, Options, Validierungsmeldungen |
| HistorySidebar | Navigation-Labels, Antwort-Anzeige |
| ProgressBar | Fortschrittstext |
| QuestionRenderer | Alle Fragetypen (radio, text, checkbox, date, select) |
| DSGVO-Consent | Datenschutztext, Einwilligungs-Checkboxen |
| CookieConsent | Cookie-Banner Text |
| AnswerSummary | Zusammenfassungs-Labels, Print-Modus |
| StaffLogin | Login-Labels, Demo-Credentials-Bereich |
| MFA-Dashboard | Alle Dashboard-Labels, Queue-Status-Texte |
| Arzt-Dashboard | Triage-Labels, Diagnose-Felder |
| AdminDashboard | Alle Admin-Funktionen |
| DatenschutzPage | Datenschutzerklärung |
| ImpressumPage | Impressum |

#### E.2 – Identifikation fehlender Keys
Für jede fehlende Übersetzung dokumentieren:
```
| # | i18n Key | Deutsche Original-Text | Seite/Komponente | Fehler-Typ |
|---|----------|----------------------|-----------------|------------|
| 1 | key.name | "Originaltext" | Seite | missing / fallback-de / hardcoded |
```

**Fehler-Typen**:
- `missing`: Key existiert nicht in `ar/translation.json`
- `fallback-de`: Key existiert, aber zeigt deutschen Text (Fallback)
- `hardcoded`: Text ist im JSX hardcodiert, kein `t()` verwendet
- `rtl-broken`: Übersetzung existiert, aber RTL-Layout ist kaputt

#### E.3 – Ergebnis-Datei erstellen
- Datei: `docs/ARABIC_TRANSLATION_GAPS.md`
- Format: Tabelle mit allen fehlenden Keys
- Zusätzlich: Notiz welche Keys auch in den anderen 8 Sprachen fehlen könnten
- Diese Liste wird als TODO-Basis für alle 10 Sprachen verwendet

#### E.4 – Automatisierte Prüfung
1. `node scripts/generate-i18n.ts` → Gibt fehlende Keys pro Sprache aus
2. `node compare-translations.cjs` → Vergleicht alle 10 Sprachdateien
3. Ergebnis in die Gap-Liste einfügen

---

## F – Marktanalyse Gap-Implementation: Phase 3.1 (Quick Wins, Monate 1-3)

> Aus der Marktanalyse: Die dringendsten Funktionen für Marktdurchdringung.

### F.1 – Rezept- und Überweisungs-Workflow (Asynchrone Hotline)

**Status Quo**: Die Architektur existiert bereits (Service-Blöcke `RES-100`, `UEB-100` in `questions.ts`), aber:
- Voice-to-Text ist noch nicht integriert
- LLM-Extraktion (PZN, Medikamentenname, Dosierung) fehlt
- AppleScript/Tomedo-Bridge für automatische Karteikarten-Erstellung ist vorbereitet (`tomedo-bridge.routes.ts`)

**TODO-Schritte**:
1. **Voice-to-Text Widget**: React-Komponente mit Mikrofon-Button im Rezept-Flow
   - Web Speech API (Browser-nativ) als MVP
   - Whisper API (OpenAI/Groq) als Production-Upgrade
   - Datei: `src/components/inputs/VoiceInput.tsx` (neu erstellen oder erweitern)
2. **LLM-Extraktion**: Firebase Cloud Function ODER Express-Route
   - Input: Transkribierter Text
   - Output: `{ medication: string, dosage: string, pzn?: string, urgency: 'routine'|'urgent' }`
   - Datei: `server/services/ai/prescriptionExtractor.ts` (neu)
   - Prompt-Template für GPT-4o-mini / Ollama
3. **Tomedo-Payload für Rezeptanfrage**:
   - `server/services/emailFormatter.ts` erweitern: Neuer Typ "REZEPT" mit PZN/Medikament-Feldern
   - E-Mail an `<bsnr>@diggai.de` mit Tomedo-parsbarem Format
4. **MFA-Dashboard Integration**:
   - Rezeptanfragen als eigener Queue-Typ anzeigen
   - Quick-Action: "Rezept vorbereiten" → Status ändern

### F.2 – HZV-Vorprüfung via LLM

**Status Quo**: HZV-Accessibility-Phase existiert im `DiggAI-HZV-Rural/` Fork, aber nicht im Hauptprojekt integriert.

**TODO-Schritte**:
1. **HZV-Prüf-Modul**: `server/services/ai/hzvChecker.ts`
   - Input: Anamnese-Antworten (ICD-10-verdächtig)
   - Output: `{ hzvRelevant: boolean, suggestedCodes: string[], contracts: string[] }`
   - LLM-Prompt: "Anhand dieser Symptome, prüfe ob HZV-Selektivvertrag-Leistungen abrechenbar sind"
2. **Tomedo-Bridge-Erweiterung**: HZV-Marker im Payload
   - `server/routes/tomedo-bridge.routes.ts`: Neuen Endpoint `/api/tomedo/hzv-check`
3. **Frontend-Anzeige**: Im Arzt-Dashboard → HZV-Vorschläge neben Patientendaten

### F.3 – Leichte-Sprache-Engine (Zertifizierung)

**Status Quo**: Leichte-Sprache-Overlays existieren für Deutsch im `QuestionRenderer` (cognitive mode).

**TODO-Schritte**:
1. **LLM-Middleware für ausgehende Texte**: `server/services/ai/leichteSprache.ts`
   - Filterregeln nach Forschungsstelle Uni Hildesheim
   - Input: Beliebiger deutscher Text
   - Output: Vereinfachte Version (A2/B1)
2. **Integration in E-Mail-Benachrichtigungen**: Terminbestätigungen in Leichter Sprache
3. **Frontend**: Toggle für Leichte Sprache über Accessibility-Store (bereits vorhanden)

---

## G – Marktanalyse Gap-Implementation: Phase 3.2 (Monate 4-9)

### G.1 – Digitale Signatur (E-Consent / eIDAS)

**Status Quo**: DSGVO-Signatur über `SignaturePad` existiert (`server/routes/signatures.ts`), aber:
- Nur Canvas-basierte Unterschrift → nicht eIDAS-konform
- Keine qualifizierte elektronische Signatur (QES)

**TODO-Schritte**:
1. **API-Integration**: Skribble oder DocuSign SDK einbinden
   - `server/services/eSignature.ts` (neu)
   - Frontend: Redirect-Flow zu Skribble → Signiertes PDF zurück
2. **Tomedo-Bridge**: Base64-PDF via AppleScript in Karteikarte importieren
3. **DSGVO-Audit**: Signatur-Logs in `AuditLog`-Tabelle
4. **Fallback**: Bestehende SignaturePad-Lösung als Offline-Fallback beibehalten

### G.2 – Payment-Integration (IGeL-Leistungen)

**Status Quo**: Stripe ist bereits konfiguriert (`STRIPE_SECRET_KEY` in `.env`, Routes: `payment.ts`, `checkout.ts`, `stripe-webhooks.ts`).

**TODO-Schritte**:
1. **Payment-Flow im Onboarding**: Nach Service-Auswahl → Preis anzeigen → Stripe Checkout
   - `src/components/payment/` existiert bereits → Erweitern
2. **IGeL-Katalog**: Praxisspezifische Leistungen mit Preisen
   - DB: `IgelService`-Modell (Prisma)
   - Admin-Dashboard: CRUD für IGeL-Leistungen
3. **Factoring-Vorbereitung**: API-Design für externe Factoring-Partner
   - `server/services/factoring.ts` (Schnittstelle)
   - Rechnungsdaten-Export aus Tomedo via AppleScript

### G.3 – Bi-direktionaler Messenger (Praxis ↔ Patient)

**Status Quo**: `StaffChat.tsx` existiert (intern), aber kein Patient-Rückkanal.

**TODO-Schritte**:
1. **Sicherer Rückkanal**: Patient erhält SMS-Link (Twilio API)
   - `server/services/sms/twilio.ts` (neu)
   - OTP-Authentifizierung für Patienten-Zugang
2. **Nachrichten-Modell**: Prisma `Message`-Tabelle mit Verschlüsselung
3. **Frontend**: `src/pages/pwa/PatientMessages.tsx`
   - Befundmitteilung in Leichter Sprache
   - Terminbestätigungen
4. **Tomedo-Trigger**: CustomKarteiEintrag → cURL → Firebase/Express Webhook → SMS

---

## H – Marktanalyse Gap-Implementation: Phase 3.3 (Monate 10-18)

### H.1 – KI-Termin-Routing in Tomedo
- Bidirektionale REST-API mit Tomedo-Datenbank
- Triage → Echtzeit-Kalender-Abfrage → Slot-Buchung
- Notfall-Erkennung → Sofort-Slot-Blockierung

### H.2 – Dynamische PVS-historienbasierte Formulare
- Tomedo sendet ICD-10-Dauerdiagnosen (verschlüsselt) an LLM
- LLM passt Fragebogen dynamisch an (z.B. Diabetiker → HbA1c-Frage)
- Personalisierte Anamnese auf Basis der Patientenhistorie

> Phase H ist Langzeit-Vision und erfordert signifikante Tomedo-Kooperation (Zollsoft).

---

## Priorisierte Ausführungsreihenfolge

```
Woche 1 (SOFORT):
├── A: Git Commit & Push (.gitignore)
├── B: Railway Backend deployen + Netlify VITE_API_URL setzen
├── C: Live E2E-Test Anamnese-Flow
├── D: Live-Test MFA-Dashboard
└── E: Arabic Translation Audit → Gap-Liste erstellen

Woche 2-4 (KURZFRISTIG):
├── F.1: Voice-to-Text Widget + LLM-Rezeptextraktion
├── F.3: Leichte-Sprache-Engine
└── Translation-Gaps aus Liste E schließen (alle 10 Sprachen)

Monat 2-3:
├── F.2: HZV-Prüf-Modul (LLM + Tomedo-Bridge)
└── Alle Sprach-Gaps vollständig geschlossen

Monat 4-6:
├── G.1: eIDAS-Signatur (Skribble/DocuSign)
├── G.2: Stripe Payment für IGeL
└── G.3: Bi-direktionaler Messenger (Twilio SMS)

Monat 7-9:
├── G.2 (Fortführung): Factoring-Integration
└── G.3 (Fortführung): Befundmitteilung in Leichter Sprache

Monat 10-18:
├── H.1: KI-Termin-Routing (Tomedo-Kalender)
└── H.2: Dynamische PVS-historienbasierte Formulare
```

---

## Parallelisierungsmöglichkeiten

Folgende Aufgaben können **gleichzeitig** von verschiedenen Agents/Entwicklern bearbeitet werden:

| Agent 1 | Agent 2 | Agent 3 |
|---------|---------|---------|
| B: Backend-Deployment | E: Arabic Audit | A: Git Push |
| C: E2E-Test | F.3: Leichte Sprache | F.1: Voice Widget |
| D: MFA-Test | Translation-Gaps | F.2: HZV-Modul |

**Keine Interferenz**, weil:
- A/B sind Infrastructure (keine Code-Änderungen)
- E ist Read-Only Audit
- F.1/F.2/F.3 arbeiten in verschiedenen Dateien

---

## Risiken & Blocker

| Risiko | Impact | Mitigation |
|--------|--------|------------|
| Railway-Account nicht vorhanden | 🔴 Backend offline | Alternativ: Render.com (render.yaml existiert) |
| SMTP-Credentials fehlen | 🟡 Keine E-Mails | Graceful Fallback (tutamail.ts gibt null zurück) |
| Supabase DB nicht provisioniert | 🔴 Backend startet nicht | Lokaler Test mit Docker PostgreSQL |
| Tomedo-Kooperation (Zollsoft) nicht geklärt | 🟡 Phase H blockiert | Phase F/G unabhängig möglich |
| LLM-Endpoint nicht verfügbar | 🟡 KI-Features fehlen | Ollama lokal oder OpenAI API Key |
| Fehlende VAPID-Keys | 🟢 Kein Web Push | Generieren: `web-push generate-vapid-keys` |

---

## Definition of Done

### Für Arbeitspaket B (Backend Live):
- [ ] `curl https://<railway-url>/api/health` → `200 OK`
- [ ] `curl https://<railway-url>/api/system/ready` → `{ ready: true }`
- [ ] Frontend auf `diggai.de` macht API-Calls an Railway (kein CORS-Fehler)
- [ ] Demo-Login funktioniert (admin/praxis2026)

### Für Arbeitspaket C (E2E-Test):
- [ ] Patient-Flow komplett durchlaufen (0000 → Zusammenfassung → Submit)
- [ ] Session in DB gespeichert
- [ ] E-Mail bei TutaMail angekommen (oder Fallback-Log)
- [ ] PII-Verschlüsselung verifiziert

### Für Arbeitspaket D (MFA-Dashboard):
- [ ] MFA-Login funktioniert
- [ ] Eingereichte Session in Queue sichtbar
- [ ] Status-Änderung funktioniert
- [ ] Arzt-Zuordnung funktioniert

### Für Arbeitspaket E (Arabic Audit):
- [ ] `docs/ARABIC_TRANSLATION_GAPS.md` erstellt
- [ ] Alle fehlenden Keys dokumentiert (Key, Original, Seite, Fehlertyp)
- [ ] `node scripts/generate-i18n.ts` liefert 0 fehlende Keys (Ziel)
- [ ] RTL-Layout-Probleme dokumentiert

---

## Technische Notizen

### Backend-Start (Lokal für Tests)
```powershell
cd "d:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master"
# Docker PostgreSQL starten
docker compose -f docker-compose.local.yml up postgres -d
# Backend starten
cmd /c "npx tsx server/index.ts"
# Frontend starten (separates Terminal)
cmd /c "npx vite --port 5173"
```

### Bekannte Non-Critical Fehler beim Start
- `[Redis] Reconnecting` → Kein Redis lokal, In-Memory Fallback ✅
- `[MessageBroker] ECONNREFUSED :5672` → Kein RabbitMQ, Fallback ✅
- `[Cleanup] Can't reach database` → PostgreSQL nicht gestartet ❌

### Git-Workflow
```bash
git commit --no-verify -m "message"
git push --no-verify origin master
```
(Pre-commit hooks können hängen wegen ESLint)
