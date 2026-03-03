# Comprehensive Audit Report – DiggAI Anamnese App

**Datum:** 2025-07-24  
**Scope:** Full-Stack Medical Anamnesis Application  
**Stack:** React 19 · TypeScript 5.9 · Vite 8 beta · Express 5 · Prisma 6 · SQLite · Socket.io  
**Ergebnis:** 48 konkrete, umsetzbare Findings

---

## Inhaltsverzeichnis

1. [TypeScript-Fehler](#1-typescript-fehler)
2. [Code-Qualität](#2-code-qualität)
3. [Komponenten](#3-komponenten)
4. [Seiten (Pages)](#4-seiten-pages)
5. [Stores](#5-stores)
6. [Hooks](#6-hooks)
7. [Server](#7-server)
8. [CSS / Styling](#8-css--styling)
9. [Konfiguration / Dependencies](#9-konfiguration--dependencies)
10. [Internationalisierung (i18n)](#10-internationalisierung-i18n)
11. [Tests](#11-tests)
12. [PWA](#12-pwa)
13. [SEO / Meta](#13-seo--meta)
14. [Performance](#14-performance)
15. [Security](#15-security)
16. [Datenbank / Prisma](#16-datenbank--prisma)
17. [API-Routen](#17-api-routen)
18. [Error Boundary / Fehlerbehandlung](#18-error-boundary--fehlerbehandlung)
19. [Fehlende Features](#19-fehlende-features)

---

## 1. TypeScript-Fehler

**`npx tsc --noEmit` → 0 Fehler.** Der Build ist sauber. Allerdings gibt es versteckte Typ-Schwächen:

### Finding #1 – `as any` in QuestionRenderer.tsx (L128)
**Datei:** `src/components/QuestionRenderer.tsx` Zeile 128  
**Problem:** `value={value as any}` umgeht die Typsicherheit bei `BgAccidentForm`.  
**Fix:** Definiere ein konkretes Union-Type für den `value`-Prop:
```ts
type QuestionValue = string | string[] | number | BgAccidentData | null;
```
und tippe `BgAccidentForm` entsprechend.

### Finding #2 – `as any` in speechSupport.ts (L4–5)
**Datei:** `src/utils/speechSupport.ts` Zeilen 4–5  
**Problem:** `(window as any).SpeechRecognition` – umgeht fehlende Web Speech API Typen.  
**Fix:** Verwende Declaration Merging:
```ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
```

### Finding #3 – `any` in answers.ts (L86)
**Datei:** `server/routes/answers.ts` Zeile 86  
**Problem:** `const updates: any = {}` – umgeht Typsicherheit in der Update-Logik für Sessions.  
**Fix:** Definiere ein partielles Prisma SessionUpdate-Interface:
```ts
const updates: Partial<Prisma.PatientSessionUpdateInput> = {};
```

---

## 2. Code-Qualität

### Finding #4 – Questionnaire.tsx ist 746 Zeilen lang
**Datei:** `src/components/Questionnaire.tsx`  
**Problem:** God Component mit Navigation-Logik, Auto-Save, Triage-Check, Medikamenten-Handling, Speech-Support und UI in einer Datei.  
**Fix:** Extrahiere in mindestens 4 Module:
- `useQuestionnaireNavigation.ts` (Navigation, handleNext/handleBack)
- `useAutoSave.ts` (Auto-Save-Logik)
- `useTriageCheck.ts` (Red-Flag-Erkennung)
- `QuestionnaireView.tsx` (reine UI-Komponente)

### Finding #5 – AdminDashboard.tsx ist 1.373 Zeilen lang
**Datei:** `src/pages/AdminDashboard.tsx`  
**Problem:** Größte Datei in der Codebasis. Enthält Tab-Navigation, Session-Liste, Statistiken, Detail-Ansichten, AI-Summary, Payment-Management und User-Verwaltung in einer einzelnen Datei.  
**Fix:** Splitte in Sub-Komponenten:
- `AdminSessionsTab.tsx`
- `AdminStatsTab.tsx`
- `AdminUsersTab.tsx`
- `AdminPaymentsTab.tsx`
- `SessionDetailModal.tsx`

### Finding #6 – console.error ohne Bedingung in Produktion
**Dateien:** `src/components/Questionnaire.tsx` (L364), `src/components/ChatBubble.tsx`, `src/hooks/useApi.ts`, `src/pages/MFADashboard.tsx`  
**Problem:** 11 `console.error`-Aufrufe in Produktion ohne `import.meta.env.DEV`-Guard. Während `console.log` korrekt geschützt ist, fehlt dies bei Error-Logging.  
**Fix:** Ersetze durch eine zentrale Logger-Utility:
```ts
// src/utils/logger.ts
export const logger = {
  error: (...args: unknown[]) => {
    if (import.meta.env.DEV) console.error(...args);
    // In Produktion: an Sentry/LogRocket senden
  }
};
```

### Finding #7 – Unconditional console.warn in client.ts (L15, L19)
**Datei:** `src/api/client.ts` Zeilen 15, 19  
**Problem:** `console.warn` für fehlende ENV-Variablen wird auch in Produktion ausgegeben.  
**Fix:** Hinter `import.meta.env.DEV`-Guard setzen.

### Finding #8 – Server-seitiges console.log ohne Level-Kontrolle
**Dateien:** `server/socket.ts` (8 Stellen), `server/services/paymentService.ts` (L16)  
**Problem:** Socket.io-Events und Payment-Service loggen unkontrolliert in stdout. Besonders kritisch: `paymentService.ts` L16 loggt die **E-Mail-Adresse des Patienten** im Klartext → PII-Leak in Server-Logs.  
**Fix:** Verwende einen strukturierten Logger (winston/pino) mit Log-Levels. PII NIEMALS loggen.

---

## 3. Komponenten

### Finding #9 – SelectInput: Hardcoded German Strings
**Datei:** `src/components/inputs/SelectInput.tsx` Zeilen 17–18  
**Problem:** `title={label || 'Auswahl'}` und `<option value="" disabled>Bitte wählen...</option>` sind hardcoded Deutsch.  
**Fix:** Importiere `useTranslation` und nutze `t('common.select')` / `t('common.pleaseChoose')`.

### Finding #10 – FileInput: Alle UI-Strings hardcoded Deutsch
**Datei:** `src/components/inputs/FileInput.tsx` Zeilen 28, 89, 92, 131, 137, 143, 148  
**Problem:** Mindestens 7 hardcoded deutsche Strings: "Datei ist zu groß", "Upload fehlgeschlagen", "Erfolgreich hochgeladen", "Klicken, um ein Dokument hochzuladen", etc.  
**Fix:** Alle Strings durch `t()`-Aufrufe ersetzen. `useTranslation` importieren.

### Finding #11 – Kein `useTranslation` in 11 von 12 Input-Komponenten
**Datei:** `src/components/inputs/` (alle außer `CameraScanner.tsx`)  
**Problem:** Nur `CameraScanner.tsx` nutzt `useTranslation`. Alle anderen Input-Komponenten (TextInput, NumberInput, RadioInput, SelectInput, FileInput, VoiceInput, etc.) haben deutsche Strings direkt im Code.  
**Fix:** Systematisch alle Input-Komponenten mit i18n ausstatten.

### Finding #12 – PDFExport.tsx: handleDownloadPDF ist window.print()
**Datei:** `src/components/PDFExport.tsx` Zeile ~180  
**Problem:** Die "PDF herunterladen"-Funktion ruft nur `window.print()` auf – identisch mit "Drucken". Es wird **kein echtes PDF** generiert.  
**Fix:** Integriere eine echte PDF-Bibliothek (jsPDF, react-pdf, @react-pdf/renderer):
```ts
import { jsPDF } from 'jspdf';
const doc = new jsPDF();
doc.text(summary, 10, 10);
doc.save('anamnese.pdf');
```

### Finding #13 – MedicationManager: FREQUENCY_OPTIONS hardcoded
**Datei:** `src/components/MedicationManager.tsx` Zeilen 24–34  
**Problem:** `FREQUENCY_OPTIONS` Array enthält deutsche Labels: "Täglich", "2x täglich", "Bei Bedarf" etc.  
**Fix:** Labels durch `t('medication.frequency.daily')` etc. ersetzen.

---

## 4. Seiten (Pages)

### Finding #14 – AdminDashboard: Null i18n (1.373 Zeilen)
**Datei:** `src/pages/AdminDashboard.tsx`  
**Problem:** Die gesamte Seite enthält **keinen einzigen `t()`-Aufruf**. Alle Überschriften, Buttons, Labels, Fehlermeldungen, Tab-Namen sind hardcoded Deutsch. Für eine App mit 5 Sprachen ist das eine massive i18n-Lücke.  
**Fix:** `useTranslation()` importieren und alle ~80+ Strings durch Translation Keys ersetzen. Aufwand: ~2–3 Stunden.

### Finding #15 – LandingPage: Service-Karten nicht übersetzt
**Datei:** `src/components/LandingPage.tsx` Zeilen 41–143  
**Problem:** Alle `title` und `description` Felder der Service-Karten (6 Dienste) sind hardcoded Deutsch: "Allgemeinmedizin", "Schnelle Diagnose mit KI-Unterstützung" etc.  
**Fix:** Nutze `t('landing.services.generalMedicine.title')` etc.

### Finding #16 – LandingPage: "Patienten-Service Hub" nicht übersetzt
**Datei:** `src/components/LandingPage.tsx` Zeile 186  
**Problem:** Hauptüberschrift `"Patienten-Service Hub"` ist hardcoded.  
**Fix:** `t('landing.title')`.

---

## 5. Stores

### Finding #17 – sessionStore: Kein Token-Refresh-Mechanismus
**Datei:** `src/store/sessionStore.ts`  
**Problem:** JWT-Token wird gespeichert, aber es gibt keine automatische Token-Renewal-Logik. Das Token läuft nach `JWT_EXPIRES_IN` (default 24h) still ab, und der Patient verliert die Session ohne Vorwarnung.  
**Fix:** Implementiere eine `refreshToken()`-Action im Store und einen Timer-basierten Auto-Refresh.

### Finding #18 – client.ts: Token-Refresh ruft nicht existierenden Endpoint auf
**Datei:** `src/api/client.ts` (Token-Refresh-Interceptor)  
**Problem:** Der Axios-Interceptor versucht `POST /sessions/refresh-token` aufzurufen, aber dieser Endpoint existiert **nicht** in `server/routes/sessions.ts`.  
**Fix:** Implementiere den Endpoint serverseitig oder entferne die Client-Logik.

---

## 6. Hooks

### Finding #19 – useApi.ts: Generische Typen für Medikamente/OPs
**Datei:** `src/hooks/useApi.ts`  
**Problem:** Medikamente und Operationen/Vorerkrankungen nutzen `unknown[]` als Typ. Keine konkrete Typisierung für diese medizinisch kritischen Datenstrukturen.  
**Fix:** Definiere konkrete Interfaces:
```ts
interface MedicationEntry {
  name: string;
  dosage: string;
  frequency: string;
  since?: string;
}
```

---

## 7. Server

### Finding #20 – paymentService.ts: PII-Leak in Logs
**Datei:** `server/services/paymentService.ts` Zeile 16  
**Problem:** `console.log(`[Payment] Erstelle Checkout für ${service.name} (${service.price}€) für ${email}`)` loggt die **E-Mail-Adresse des Patienten im Klartext** in Server-Logs. Verstößt gegen DSGVO Art. 5 (Datenminimierung).  
**Fix:** E-Mail-Adresse hashen oder maximal die ersten 3 Zeichen zeigen: `${email.substring(0, 3)}***`.

### Finding #21 – aiService.ts: Simulation statt echtem LLM-Call
**Datei:** `server/services/aiService.ts`  
**Problem:** Die klinische Zusammenfassung ist eine String-Interpolation mit Keyword-Matching. Es gibt keinen echten LLM/API-Aufruf. ICD-10-Codes werden nur für 4 Keywords generiert.  
**Fix:** Implementiere einen echten OpenAI/Anthropic API-Call mit klinischem Prompt oder dokumentiere dies prominent als "MVP-Placeholder".

### Finding #22 – Queue: In-Memory ohne Persistenz
**Datei:** `server/routes/queue.ts`  
**Problem:** Das gesamte Warteschlangen-System basiert auf `let queue: QueueEntry[] = []` im RAM. Ein Server-Neustart löscht alle wartenden Patienten. Kein Prisma-Modell für die Queue.  
**Fix:** Erstelle ein `WaitingQueueEntry` Prisma-Model und persistiere Queue-Einträge in der Datenbank.

### Finding #23 – rateLimitMax: 1.000 Requests / 15 Min
**Datei:** `server/config.ts` Zeilen 33–34  
**Problem:** `rateLimitMax: 1000` mit Kommentar "erhöht für Tests" – ist aber der Produktionswert. 1.000 Requests pro 15 Minuten ist für eine medizinische App viel zu hoch und bietet kaum Schutz vor Brute-Force.  
**Fix:** Reduziere auf 100 für die allgemeine Rate-Limit und nutze pro-Endpoint-Limits (z.B. 5/min für Login).

### Finding #24 – authLimiter nur auf Arzt-Login
**Datei:** `server/index.ts`  
**Problem:** Das `authLimiter` (striktere Rate-Limitierung) wird nur auf `/api/arzt/login` angewendet, nicht auf `/api/mfa/*` Login-Routes.  
**Fix:** `authLimiter` auch auf MFA-Login-Endpoints anwenden.

---

## 8. CSS / Styling

### Finding #25 – Hardcoded Farbwerte statt CSS-Variablen
**Datei:** `src/index.css`  
**Problem:** Obwohl ein umfangreiches CSS-Variablen-System existiert (`--color-primary` etc.), nutzen viele Tailwind-Klassen in Komponenten direkte Farbwerte wie `bg-blue-500`, `text-emerald-400`, `border-red-500` statt der Theme-Variablen. Dadurch funktioniert Theme-Switching nicht konsistent.  
**Fix:** Tailwind-Config um Custom Colors erweitern, die auf CSS-Variablen referenzieren:
```js
// tailwind.config.js
colors: {
  primary: 'var(--color-primary)',
  danger: 'var(--color-danger)',
}
```

### Finding #26 – Kein Dark/Light Mode Contrast-Check
**Datei:** `src/index.css`  
**Problem:** CSS-Variablen definieren Themes, aber es gibt keine systematische WCAG AA Kontrast-Prüfung. Besonders `text-white/40` und `text-emerald-500/70` in FileInput können bei hellem Theme unlesbar sein.  
**Fix:** Alle Text/Hintergrund-Kombinationen gegen WCAG AA (4.5:1 Ratio) prüfen.

---

## 9. Konfiguration / Dependencies

### Finding #27 – Vite 8.0.0-beta.13 in Produktion
**Datei:** `package.json`  
**Problem:** `"vite": "^8.0.0-beta.13"` ist eine **Beta-Version** als Build-Tool in einer medizinischen App. Beta-Versionen können Breaking Changes, Bugs und Sicherheitslücken enthalten.  
**Fix:** Downgrade zu Vite 6.x (latest stable) oder warte auf Vite 8 GA.

### Finding #28 – vite.config.ts: Proxy zeigt auf localtunnel
**Datei:** `vite.config.ts`  
**Problem:** `target: 'https://anamnese-api-final.loca.lt'` – der Dev-Proxy zeigt auf eine **localtunnel-URL**. Das ist ein temporärer Tunnel-Service, der jederzeit ausfallen kann und nicht für Produktion geeignet ist.  
**Fix:** Proxy auf `http://localhost:3001` setzen und eine Deployment-Konfiguration mit echten Server-URLs erstellen.

### Finding #29 – netlify.toml: Kein Server-Deployment
**Datei:** `netlify.toml`  
**Problem:** Die Netlify-Config deployed nur das Frontend (Static Build). Der Express-Server (`server/`) wird **nicht** deployed. Es fehlt eine Serverless-Functions-Konfiguration oder ein separates Backend-Deployment.  
**Fix:** Entweder Netlify Functions für die API nutzen oder ein separates Backend auf Railway/Render/Fly.io deployen und die API-URL als ENV-Variable konfigurieren.

---

## 10. Internationalisierung (i18n)

### Finding #30 – DSGVOConsent: Datenschutztext hardcoded
**Datei:** `src/components/DSGVOConsent.tsx` Zeilen 119–148  
**Problem:** Der gesamte Datenschutztext (Rechtsgrundlage, Zweck der Verarbeitung, Betroffenenrechte) ist als deutscher Klartext hardcoded. Für nicht-deutschsprachige Patienten ist das eine rechtliche Barriere.  
**Fix:** Den Datenschutztext in alle 5 Sprachversionen übersetzen und über `t('dsgvo.privacyPolicy.purpose')` etc. laden.

### Finding #31 – i18n: Kein Namespace-Splitting
**Datei:** `src/i18n.ts`  
**Problem:** Nur ein Default-Namespace (`translation`). Alle Translations landen in einer großen JSON-Datei pro Sprache. Bei wachsender App wird das unübersichtlich und verschlechtert die Ladezeit.  
**Fix:** Namespace-Splitting einführen: `common`, `questionnaire`, `admin`, `medical` etc.

### Finding #32 – Fehlende i18n-Keys (Quantitative Schätzung)
**Problem:** Basierend auf der Analyse fehlen i18n-Translations in:
- `AdminDashboard.tsx` → ~80 Strings
- `LandingPage.tsx` → ~20 Strings
- `DSGVOConsent.tsx` → ~15 Strings
- Input-Komponenten (11 Dateien) → ~30 Strings
- `MedicationManager.tsx` → ~10 Strings
- `FileInput.tsx` → ~7 Strings

**Gesamt: ~162 fehlende Translation-Keys** → Etwa 810 Übersetzungen für 5 Sprachen.

---

## 11. Tests

### Finding #33 – E2E-Tests decken nur Happy Path ab
**Datei:** `e2e/anamnese.spec.ts` (215 Zeilen)  
**Problem:** Tests prüfen nur den Basis-Flow: Landing → Dienst wählen → Consent → Fragebogen starten. Keine Tests für:
- ArztDashboard Login & Session-Ansicht
- MFA Dashboard
- AdminDashboard
- Error States (Server offline, ungültige Session)
- Auth-Flows (Token-Ablauf, falsches Passwort)
- Queue-Flow
- Chat-Flow
- PDF-Export / CSV-Export
- Multi-Language-Wechsel

**Fix:** Mindestens 10 weitere Test-Suites schreiben.

### Finding #34 – Keine Unit-Tests
**Problem:** Es gibt keine Jest/Vitest Unit-Tests für:
- Zustand Stores (sessionStore, themeStore, modeStore)
- Utility-Funktionen (secureStorage, speechSupport)
- Server-Middleware (auth, audit)
- Server-Services (encryption, aiService)
- Triage Engine, Question Flow Engine

**Fix:** Vitest konfigurieren und Store-/Utility-Tests schreiben. Minimum ~30 Unit-Tests für kritische Business-Logik.

### Finding #35 – Kein Test für die Verschlüsselung
**Problem:** `server/services/encryption.ts` hat keine Tests. Eine Regression in der encrypt/decrypt-Logik würde Patientendaten unwiderruflich zerstören.  
**Fix:** Unit-Tests für encrypt → decrypt Round-Trip, Edge Cases (leere Strings, Unicode, maximale Länge).

---

## 12. PWA

### Finding #36 – Nur SVG-Icons, keine PNG-Fallbacks
**Datei:** `public/manifest.json`  
**Problem:** `icon-192.svg` und `icon-512.svg` – ältere Android-Versionen (< 8) und einige Browser unterstützen keine SVG-Icons in Web App Manifests.  
**Fix:** PNG-Versionen in 48x48, 72x72, 96x96, 144x144, 192x192, 512x512 generieren und in `icons` aufnehmen.

### Finding #37 – Service Worker Cache nicht an Build-Hash gebunden
**Datei:** `public/sw.js` Zeile 2  
**Problem:** `const CACHE_NAME = 'diggai-anamnese-v1'` ist statisch. Nach einem neuen Deployment werden gecachte Assets nicht automatisch invalidiert. Patienten sehen veraltete Versionen.  
**Fix:** Cache-Name an Build-Hash binden (via Vite Plugin) oder Workbox mit `precacheAndRoute` verwenden:
```js
const CACHE_NAME = `diggai-anamnese-${__BUILD_HASH__}`;
```

### Finding #38 – manifest.json: Fehlende Felder
**Datei:** `public/manifest.json`  
**Problem:** Fehlende Felder: `screenshots` (für Install-Prompt auf Android), `shortcuts` (für App-Shortcuts), `categories`, `description`.  
**Fix:** Ergänze:
```json
{
  "description": "Digitale Anamnese für Arztpraxen",
  "categories": ["medical", "health"],
  "screenshots": [...],
  "shortcuts": [
    { "name": "Neue Anamnese", "url": "/", "icons": [...] }
  ]
}
```

---

## 13. SEO / Meta

### Finding #39 – Kein robots.txt
**Problem:** Es gibt keine `public/robots.txt`. Suchmaschinen erhalten keine Anweisung, welche Pfade indexiert werden sollen. Für eine medizinische App sollten Dashboard-Routes (`/arzt`, `/mfa`, `/admin`) explizit ausgeschlossen werden.  
**Fix:**
```
User-agent: *
Allow: /
Disallow: /arzt
Disallow: /mfa
Disallow: /admin
Sitemap: https://diggai-anamnese.netlify.app/sitemap.xml
```

### Finding #40 – Kein sitemap.xml
**Problem:** Keine Sitemap für Suchmaschinen-Indexierung.  
**Fix:** `public/sitemap.xml` mit den öffentlichen Routes erstellen.

---

## 14. Performance

### Finding #41 – Questionnaire: Keine React.memo-Optimierung
**Datei:** `src/components/Questionnaire.tsx`  
**Problem:** Der 746-Zeilen-Questionnaire rendert bei jedem State-Change alle Kinder neu. `QuestionRenderer`, `ProgressBar`, `AnswerSummary` etc. sind nicht mit `React.memo` gewrappt.  
**Fix:** Memoize Sub-Komponenten:
```tsx
export const QuestionRenderer = React.memo(QuestionRendererBase);
```

### Finding #42 – ChatBubble: useEffect Dependency Array unvollständig
**Datei:** `src/components/ChatBubble.tsx` (Zeile ~159)  
**Problem:** Der useEffect, der die Bot-Begrüßungsnachricht mit `t()` erstellt, hat `t` nicht im Dependency-Array. Ein Sprachwechsel triggert kein Re-Rendering der Begrüßung.  
**Fix:** `t` zum Dependency-Array hinzufügen. Alternativ `i18n.language` als Dependency.

### Finding #43 – Google Fonts: Render-blocking ohne display=swap
**Datei:** `index.html`  
**Problem:** Google Fonts werden via preconnect geladen, aber wenn das Font CSS `font-display: swap` nicht erzwingt, blockiert der Font-Download das Rendering. Prüfe, ob `&display=swap` im Google Fonts URL-Parameter gesetzt ist.  
**Fix:** URL auf `https://fonts.googleapis.com/css2?family=Inter:wght@...&display=swap` prüfen/ergänzen.

---

## 15. Security

### Finding #44 – payments.ts: KEIN Auth-Middleware
**Datei:** `server/routes/payments.ts`  
**Problem:** **Kritisch:** Alle Payment-Routes (`/services`, `/checkout`) sind OHNE `authMiddleware` oder `roleMiddleware`. Jeder kann ohne Authentifizierung Checkout-Sessions erstellen und Patientendaten (E-Mail) an den Payment-Service senden.  
**Fix:**
```ts
router.post('/checkout', authMiddleware, async (req, res) => { ... });
```

### Finding #45 – queue.ts: KEIN Auth-Middleware auf Mutations
**Datei:** `server/routes/queue.ts`  
**Problem:** **Kritisch:** `PUT /queue/:id/call`, `PUT /queue/:id/treat`, `PUT /queue/:id/done`, `DELETE /queue/:id` haben **keine Auth-Prüfung**. Jeder kann Patienten in der Warteschlange aufrufen, behandeln oder löschen.  
**Fix:** Mindestens `authMiddleware` + `roleMiddleware(['ARZT'])` auf Call/Treat/Done/Delete-Endpunkte anwenden.

### Finding #46 – Kein CSRF-Schutz
**Datei:** `server/index.ts`  
**Problem:** Kein CSRF-Token-Mechanismus implementiert. Die App nutzt Cookie-basierte Session-Tokens, ist aber anfällig für Cross-Site Request Forgery bei Mutations-Requests.  
**Fix:** Implementiere CSRF-Tokens via Double Submit Cookie Pattern oder SameSite=Strict Cookies.

### Finding #47 – Encryption Key aus UTF-8 String geschnitten
**Datei:** `server/services/encryption.ts` Zeile 15  
**Problem:** `Buffer.from(config.encryptionKey, 'utf-8').slice(0, 32)` – der Encryption Key wird als UTF-8 interpretiert und auf 32 Bytes beschnitten. Wenn der Key Multi-Byte-Zeichen enthält (z. B. Umlaute), reduziert sich die effektive Schlüssellänge.  
**Fix:** Den Key als Hex- oder Base64-String fordern und entsprechend parsen:
```ts
const key = Buffer.from(config.encryptionKey, 'hex'); // erwartet 64 Hex-Zeichen = 32 Bytes
```

---

## 16. Datenbank / Prisma

### Finding #48 – PatientSession.status ist String statt Enum
**Datei:** `prisma/schema.prisma`  
**Problem:** `status String @default("ACTIVE")` – Pat Session Status ist ein freier String. Erlaubt Typos und inkonsistente Werte (z. B. `"active"` vs `"ACTIVE"`).  
**Fix:** Prisma Enum definieren:
```prisma
enum SessionStatus {
  ACTIVE
  COMPLETED
  TRIAGE_RED
  ABANDONED
}

model PatientSession {
  status SessionStatus @default(ACTIVE)
}
```
> **Hinweis:** SQLite unterstützt keine nativen Enums, aber Prisma validiert auf App-Ebene.

---

## 17. API-Routen

> Findings #44 und #45 (Auth auf payments/queue) sind in Sektion 15 (Security) dokumentiert.

### (Abgedeckt in Sektionen 7 und 15)

Zusätzlich:
- **Finding #18** (Token-Refresh-Endpoint fehlt) betrifft API-Routen
- **Finding #22** (Queue ohne Persistenz) betrifft API-Routen
- **Finding #24** (authLimiter nur auf Arzt) betrifft API-Routen

---

## 18. Error Boundary / Fehlerbehandlung

### Finding #6 deckt den Consumer-seitigen Error-Logging ab. Zusätzlich:

- Die `ErrorBoundary.tsx` fängt Render-Fehler, reported aber **nicht** an einen externen Service (Sentry, LogRocket). In Produktion verschwinden Fehler lautlos.
- Es gibt nur **eine** globale ErrorBoundary. Wenn der Questionnaire crasht, geht die gesamte App verloren statt nur die betroffene View.

→ Empfehlung: ErrorBoundary pro Route + Sentry Integration.

---

## 19. Fehlende Features

### Finding #F1 – Kein Passwort-Reset-Flow
**Problem:** Arzt/MFA User können ihr Passwort nur über die Datenbank zurücksetzen. Es gibt keinen "Passwort vergessen"-Endpoint oder UI.  
**Fix:** Implementiere `/api/arzt/reset-password` mit E-Mail-Verifizierung.

### Finding #F2 – Kein DSGVO-Recht auf Datenlöschung für Patienten
**Problem:** Patienten können ihre Daten nicht selbst löschen oder exportieren ("Recht auf Vergessenwerden" nach DSGVO Art. 17). Nur Admins können Sessions in `cleanup.ts` automatisch löschen.  
**Fix:** Patient-facing "Meine Daten löschen"-Button auf der Submitted-Page mit sofortiger vollständiger Löschung.

### Finding #F3 – Kein Health-Check-Endpoint
**Problem:** Kein `/api/health` Endpoint für Monitoring und Deployment-Checks.  
**Fix:**
```ts
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

### Finding #F4 – Kein E-Mail-Versand
**Problem:** Die App sammelt E-Mail-Adressen, versendet aber nie E-Mails (keine Bestätigung, keine Ergebnisse, kein Passwort-Reset). Der MFA-Endpoint für 2FA generiert TOTP-Secrets, sendet sie aber nicht per E-Mail.  
**Fix:** E-Mail-Service integrieren (Nodemailer + SMTP oder SendGrid/Resend).

---

## Zusammenfassung nach Priorität

| Priorität | # | Beschreibung | Kategorie |
|-----------|---|-------------|-----------|
| 🔴 Kritisch | #44 | payments.ts ohne Auth | Security |
| 🔴 Kritisch | #45 | queue.ts Mutations ohne Auth | Security |
| 🔴 Kritisch | #20 | PII-Leak in Payment-Logs | DSGVO |
| 🔴 Kritisch | #47 | Encryption Key UTF-8 Slicing | Security |
| 🔴 Kritisch | #F2 | Kein Recht auf Datenlöschung | DSGVO |
| 🟠 Hoch | #27 | Vite 8 beta in Produktion | Config |
| 🟠 Hoch | #14 | AdminDashboard 0% i18n | i18n |
| 🟠 Hoch | #30 | DSGVO-Text nicht übersetzt | i18n / Legal |
| 🟠 Hoch | #22 | Queue in-memory ohne Persistenz | Datenbank |
| 🟠 Hoch | #18 | Token-Refresh Endpoint fehlt | API |
| 🟠 Hoch | #28 | Proxy auf localtunnel URL | Config |
| 🟠 Hoch | #23 | Rate Limit 1000 zu hoch | Security |
| 🟠 Hoch | #35 | Keine Encryption-Tests | Tests |
| 🟡 Mittel | #4 | Questionnaire 746 Zeilen | Code Quality |
| 🟡 Mittel | #5 | AdminDashboard 1373 Zeilen | Code Quality |
| 🟡 Mittel | #6 | console.error in Produktion | Code Quality |
| 🟡 Mittel | #32 | ~162 fehlende i18n-Keys | i18n |
| 🟡 Mittel | #33 | E2E nur Happy Path | Tests |
| 🟡 Mittel | #34 | Keine Unit-Tests | Tests |
| 🟡 Mittel | #36 | Nur SVG Icons (kein PNG) | PWA |
| 🟡 Mittel | #37 | SW Cache ohne Build-Hash | PWA |
| 🟡 Mittel | #41 | Kein React.memo | Performance |
| 🟡 Mittel | #48 | Status als String statt Enum | Datenbank |
| 🟢 Niedrig | #1–3 | `as any` / `any` Typ-Umgehungen | TypeScript |
| 🟢 Niedrig | #9–11 | Input-Komponenten i18n | i18n |
| 🟢 Niedrig | #25–26 | CSS Theme-Konsistenz | Styling |
| 🟢 Niedrig | #39–40 | robots.txt / sitemap.xml | SEO |

---

**Gesamtbewertung:** Die App hat eine solide Basis (gute Verschlüsselung, saubere TypeScript-Kompilierung, PWA-Ready, Code-Splitting). Die kritischsten Probleme liegen in **fehlender Authentifizierung auf Payment/Queue-Routes**, **PII-Leak in Server-Logs** und **fehlender DSGVO-Konformität** (Datenlöschung, unübersetzte Rechtstexte). Die i18n-Coverage liegt bei geschätzt 70% – insbesondere das AdminDashboard und alle Input-Komponenten fehlen komplett.
