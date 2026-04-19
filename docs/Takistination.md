# Takistination — Browser-Agent Navigationshandbuch

> **Ziel:** Dieses Dokument ist die einzige Referenz, die ein Browser-Agent (Playwright, Puppeteer, Antigravity-Browser) braucht, um die DiggAI-Anamnese-Plattform vollständig zu navigieren, zu testen und zu dokumentieren.
> 
> **Live-URL:** https://diggai-drklaproth.netlify.app
> **Letzte Aktualisierung:** 2026-04-15

---

## 1. Globale Seitenstruktur

```
┌─────────────────────────────────────────────────────────┐
│  FIXED OVERLAYS (alle Seiten)                           │
│  ├── ThemeToggle      → fixed bottom-5 right-5 z-8000  │
│  ├── OfflineIndicator → top, conditionally rendered     │
│  ├── InstallPrompt    → overlay, after 2 visits         │
│  ├── UpdateNotification → top banner                    │
│  ├── CookieConsent    → bottom overlay                  │
│  └── KeyboardShortcutsHelp → overlay (? Taste)         │
├─────────────────────────────────────────────────────────┤
│  <a href="#main-content"> Skip-to-Content (sr-only)     │
├─────────────────────────────────────────────────────────┤
│  <main id="main-content">                               │
│    └── <Routes> → Seiteninhalt                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Vollständige Route Map

### 2.1 Öffentliche Routen (kein Login nötig)

| Route | Komponente | Beschreibung | Schlüssel-Elemente |
|-------|-----------|-------------|-------------------|
| `/` | HomeScreen | Kiosk/Tablet Entry Point | 3 Kacheln, Expand-Button, Footer |
| `/patient` | PatientApp → LandingPage/Questionnaire | Patient-Intake-Flow | CTA-Button, Fragebogen |
| `/datenschutz` | DatenschutzPage | DSGVO Art. 13/14 | Langtext, zurück-Navigation |
| `/impressum` | ImpressumPage | §5 DDG | Praxisdaten, Kontakt |
| `/pricing` | Pricing | Preisseite | Preis-Karten, CTA |
| `/nfc` | NfcLanding | NFC Check-in | NFC-Status |
| `/feedback` | AnonymousFeedbackForm | Anonymes Feedback | Formular |
| `/telemedizin` | TelemedizinScheduler | Telemedizin-Terminplaner | Kalender, Buchung |
| `/telemedizin/room/:sessionId` | VideoRoom | Video-Sprechstunde | Video-UI |
| `/pwa/login` | PwaLogin | Patient-Portal Login | Login-Formular |
| `/pwa/verify-email` | PwaEmailVerification | E-Mail-Verifizierung | Token-Status |
| `/checkout/:sessionId` | CheckoutWizard | Checkout nach Fragebogen | Wizard Steps |
| `/checkout/:sessionId/delete` | DataDeletionConfirm | Datenlöschung bestätigen | Bestätigungs-Dialog |
| `/checkout/success` | CheckoutSuccess | Checkout erfolgreich | Erfolgs-Anzeige |
| `/settings/security` | SecuritySettingsPage | Sicherheitseinstellungen | Passwort, 2FA |
| `/forms/run/:formId` | FormRunnerPage | Formular ausfüllen | Dynamisches Formular |
| `/epa/shared/:token` | SharedEpaView | Geteilte ePA-Ansicht | Patienten-Daten |
| `/verwaltung/login` | StaffLogin | Personal-Login | Email, Passwort, Demo-Users |

### 2.2 Geschützte Routen (Login erforderlich)

| Route | Rollen | Komponente | Redirect bei fehlendem Auth |
|-------|--------|-----------|---------------------------|
| `/verwaltung/arzt` | arzt, admin | ArztDashboard | → `/verwaltung/login` |
| `/verwaltung/mfa` | mfa, admin | MFADashboard | → `/verwaltung/login` |
| `/verwaltung/admin` | admin | AdminDashboard | → `/verwaltung/login` |
| `/verwaltung/docs` | arzt, mfa, admin | DokumentationPage | → `/verwaltung/login` |
| `/verwaltung/handbuch` | arzt, mfa, admin | HandbuchPage | → `/verwaltung/login` |
| `/verwaltung/system` | admin | SystemPanel | → `/verwaltung/login` |
| `/verwaltung/ti` | arzt, admin | TIStatusPanel | → `/verwaltung/login` |
| `/verwaltung/agents` | arzt, mfa, admin | AgentDashboard | → `/verwaltung/login` |
| `/verwaltung/business` | arzt, admin | PraxisDashboard | → `/verwaltung/login` |
| `/kiosk` | mfa, arzt, admin | KioskDashboard | (default redirect) |
| `/flows/builder` | arzt, admin | TreatmentFlowBuilder | (default redirect) |
| `/flows/builder/:flowId` | arzt, admin | TreatmentFlowBuilder | (default redirect) |
| `/epa/:patientId` | arzt, admin | PrivateEpaDashboard | (default redirect) |

### 2.3 Legacy Redirects

| Alt | Neu |
|-----|-----|
| `/arzt` | → `/verwaltung/arzt` |
| `/mfa` | → `/verwaltung/mfa` |
| `/admin` | → `/verwaltung/admin` |
| `/admin/system` | → `/verwaltung/system` |
| `/admin/ti` | → `/verwaltung/ti` |
| `/docs` | → `/verwaltung/docs` |
| `/handbuch` | → `/verwaltung/handbuch` |

### 2.4 PWA-Shell Routen (innerhalb `/pwa`)

| Route | Komponente | Tab-Label |
|-------|-----------|-----------|
| `/pwa/dashboard` | PwaDashboard | Dashboard |
| `/pwa/diary` | PwaDiary | Tagebuch |
| `/pwa/diary/trends` | PwaDiaryTrends | Trends |
| `/pwa/measures` | PwaMeasures | Messwerte |
| `/pwa/messages` | PwaMessages | Nachrichten |
| `/pwa/settings` | PwaSettings | Einstellungen |
| `/pwa/appointments` | PwaAppointments | Termine |
| `/pwa/reminders` | PwaReminderConfig | Erinnerungen |
| `/pwa/reels` | PwaReels | Reels |
| `/pwa/community` | PwaCommunity | Community |

### 2.5 Catch-All

| Route | Komponente |
|-------|-----------|
| `/*` (alles Unbekannte) | NotFoundPage (404) |

---

## 3. Seitendetails — Interaktive Elemente

### 3.1 HomeScreen (`/`)

```
HEADER ─────────────────────────────────────────────
Selektor: <header> (erstes headerElement)
├── Logo-Bereich
│   ├── Icon: div.w-10.h-10.rounded-xl (Stethoscope SVG)
│   └── Text: h1 "Praxis Dr. Klaproth"
│          p  "Digitale Anamnese & Praxis-Services"
├── Kalender: span (dateStr im Format "Montag, 15. April 2026")
├── Uhr: span.text-lg.font-mono (tabular-nums, z.B. "06:02")
├── LanguageSelector: Dropdown-Komponente
│   └── Aktion: Klick öffnet Sprachliste (de/en/tr/ar/uk/es/fa/it/fr/pl)
└── ThemeToggle: Button (Dark/Light)

TRUST BADGE BAR ────────────────────────────────────
Selektor: div > TrustBadgeBar
└── Badges: DSGVO, ISO 27001, etc. (nicht klickbar, nur visuell)

WELCOME TEXT ───────────────────────────────────────
h2: "Wie können wir Ihnen helfen?"
p:  "Wählen Sie Ihr Anliegen..."

HAUPTKACHELN (3x button) ──────────────────────────
Selektor: section.grid > button (3 Stück)

  [1] Patient (Anamnese)
      ├── Selektor: button mit aria-label="Anamnese"
      ├── ID-Hint: tile.id = 'patient'
      ├── Gradient: from-blue-500 to-indigo-600
      ├── Icon: Stethoscope w-16/w-20
      ├── Text: t('home.tile.patient') → "Anamnese" 
      ├── Sub:  t('home.tile.patient_desc')
      ├── Aktion: navigate('/patient')
      └── Preload: preloadPatientFlow() on hover/focus

  [2] Patienten-Portal (PWA)
      ├── Selektor: button mit aria-label="Patienten-Portal"
      ├── ID-Hint: tile.id = 'pwa'
      ├── Gradient: from-emerald-500 to-teal-600
      ├── Icon: Smartphone w-16/w-20
      ├── Aktion: navigate('/pwa/login')
      └── Preload: preloadPwaPortal() on hover/focus

  [3] Telemedizin
      ├── Selektor: button mit aria-label="Telemedizin"
      ├── ID-Hint: tile.id = 'telemedizin'
      ├── Gradient: from-purple-500 to-violet-600
      ├── Icon: Video w-16/w-20
      ├── Aktion: navigate('/telemedizin')
      └── Preload: preloadTelemedizin() on hover/focus

EXPAND BUTTON ──────────────────────────────────────
Selektor: button[aria-expanded]
├── Text (collapsed): "Praxis-Verwaltung & mehr" (mit ChevronDown)
├── Text (expanded):  "Weniger anzeigen" (mit ChevronUp)
└── Aktion: toggles showMore state, renders expandable section

EXPANDABLE SECTION (showMore === true) ─────────────
Layout: grid cols-1 lg:cols-3

  [Linke Spalte] Agenten & Praxis-Funktionen (lg:col-span-2)
  ├── heading: h3 "Agenten & Praxis-Funktionen"
  ├── Grid: sm:cols-2, 8 items
  │
  │   [item-1] Agenten Hub → /verwaltung/agents
  │   ├── Icon: Bot
  │   ├── Badge: "Neu" (indigo pill)
  │   └── Sub: "Agent Tasks, Metriken, Runs"
  │
  │   [item-2] Live Flow Board → /flows/live
  │   ├── Icon: Radar
  │   └── Sub: "Patientenfluss in Echtzeit"
  │
  │   [item-3] Flow Builder → /flows/builder
  │   ├── Icon: Workflow
  │   └── Sub: "Journeys und Behandlungspfade"
  │
  │   [item-4] Forms Lab → /forms/builder
  │   ├── Icon: FlaskConical
  │   └── Sub: "Formulare bauen und testen"
  │
  │   [item-5] TI Status → /verwaltung/ti
  │   ├── Icon: ShieldCheck
  │   └── Sub: "Konnektor, Karten, Gesundheit"
  │
  │   [item-6] System Panel → /verwaltung/system
  │   ├── Icon: Settings
  │   └── Sub: "Backups, Logs, Deploy"
  │
  │   [item-7] Dokumentation → /verwaltung/docs
  │   ├── Icon: ClipboardList
  │   └── Sub: "Praxiswissen und Leitfäden"
  │
  │   [item-8] NFC Entry → /nfc
  │   ├── Icon: Activity
  │   └── Sub: "Schneller Check-in & Trigger"

  [Rechte Spalte] Schnellstart
  ├── heading: h3 "Schnellstart"
  ├── 4 items (stacked):
  │
  │   [item-1] Kiosk → /kiosk
  │   ├── Icon: Building2
  │   └── Sub: "Wartezimmer und Aufruf"
  │
  │   [item-2] Telemedizin → /telemedizin
  │   ├── Icon: Video
  │   └── Sub: "Terminplaner und Videoraum"
  │
  │   [item-3] Patient Portal → /pwa/login
  │   ├── Icon: Smartphone
  │   └── Sub: "Diary, Measures, Messages"
  │
  │   [item-4] Datenschutz → /datenschutz
  │   ├── Icon: FileText
  │   └── Sub: "DSGVO, Transparenz, Rechte"

AUTO-RESET OVERLAY (nach 90s Inaktivität) ──────────
Selektor: div.fixed.inset-0.z-50 (conditionally rendered)
├── Timer-Icon: Timer w-12 amber
├── h3: "Sind Sie noch da?"
├── p: "Dieses Gerät wird in X Sekunden zurückgesetzt."
└── button: "Ja, ich bin noch da" (bg-blue-600)
    └── Aktion: resetTimer() → schließt Overlay, setzt Timer zurück

FOOTER ─────────────────────────────────────────────
Selektor: footer (letztes footer-Element)
├── "Datenschutz" → navigate('/datenschutz')  (button, underline)
├── "·" (Separator)
├── "Impressum" → navigate('/impressum')       (button, underline)
├── "·" (Separator)
└── "Verwaltung" → navigate('/verwaltung/login') (button, underline)
```

### 3.2 Patient-Seite (`/patient`) — PATIENTEN-SERVICE HUB

> ⚠️ **ACHTUNG (2026-04-15):** Die Seite wurde umgebaut! Es gibt NICHT mehr die Marketing-LandingPage mit "Digitale Anamnese". Stattdessen ist jetzt ein vollständiger Service-Hub mit 10 Anliegen-Karten.

```
TOOLBAR ─────────────────────────────────────────────
├── "Live-Modus" Button
├── ThemeToggle
├── LanguageSelector (Dropdown mit "de" angezeigt)
└── "Vollbild starten" Button

HEADER ──────────────────────────────────────────────
├── Icon + "Patienten-Service Hub"
├── h1: "Anliegen wählen"
└── p: "Wählen Sie Ihr Anliegen aus. Unser intelligenter Assistent..."

ANLIEGEN-KARTEN (10 × link/button) ─────────────────

  [1] Termin / Anamnese → /anamnese
      ├── Dauer: "5-8 Min."
      └── CTA: "Mehr erfahren" (link)

  [2] Medikamente / Rezepte → /rezepte
      ├── Dauer: "2 Min."
      └── CTA: "Mehr erfahren" (link)

  [3] AU (Krankschreibung) → /krankschreibung
      ├── Dauer: "3 Min."
      └── CTA: "Mehr erfahren" (link)

  [4] Unfallmeldung (BG) → /unfallmeldung
      ├── Dauer: "5 Min."
      ├── Badge: "NEU"
      └── CTA: "Mehr erfahren" (link)

  [5] Überweisung → (button, kein Link)
      ├── Dauer: "2 Min."
      └── CTA: "Jetzt starten" (button)

  [6] Terminabsage → (button, kein Link)
      ├── Dauer: "1 Min."
      └── CTA: "Jetzt starten" (button)

  [7] Dateien / Befunde → (button, kein Link)
      ├── Dauer: "2 Min."
      └── CTA: "Jetzt starten" (button)

  [8] Telefonanfrage → (button, kein Link)
      ├── Dauer: "2 Min."
      └── CTA: "Jetzt starten" (button)

  [9] Dokumente anfordern → (button, kein Link)
      ├── Dauer: "2 Min."
      └── CTA: "Jetzt starten" (button)

  [10] Nachricht schreiben → (button, kein Link)
       ├── Dauer: "3 Min."
       └── CTA: "Jetzt starten" (button)

BOTTOM BAR ──────────────────────────────────────────
├── "System Online" Status
├── "DSGVO Konform" Badge
└── Links:
    ├── Datenschutz → /datenschutz
    ├── Impressum → /impressum
    ├── Dokumentation → /docs
    ├── Handbuch → /handbuch
    ├── Arzt → /arzt
    ├── MFA → /mfa
    └── Admin → /admin

QR-CODE BEREICH ─────────────────────────────────────
├── "QR-Code scannen" Label
├── QR-Code Image
├── p: "Scannen Sie diesen Code..."
└── Button: "Link kopieren"

CHAT BUTTON ─────────────────────────────────────────
└── "Chat öffnen" (floating button)

COOKIE CONSENT DIALOG ───────────────────────────────
├── h2: "Cookie-Einstellungen"
├── p: "TTDSG §25 — Ihre Privatsphäre..."
├── Button: "Detaillierte Einstellungen"
├── Button: "Nur Essenzielle"
├── Button: "Alle akzeptieren"
└── Links: Datenschutzerklärung, Impressum
```
│   ├── "Features" → #features
│   ├── "Erfahrungen" → #testimonials
│   └── "Sicherheit" → #security
├── CTA Button: "Jetzt starten" (bg-[#4A90E2])
│   └── Aktion: (TODO - aktuell kein onClick, nur Button-Render)
└── Mobile Menu Button: hamburger/X icon
    └── Toggle: isMenuOpen

HERO SECTION ───────────────────────────────────────
├── Trust Badges: DSGVO-konform | End-to-End verschlüsselt | Gematik-zertifiziert
├── h1: "Digitale Anamnese" + span "für moderne Praxen"
├── p: Beschreibungstext
├── PRIMARY CTA: Button "Kostenlos testen" (gradient, ArrowRight)
│   └── Aktion: (TODO - untersuchen ob flowStep wechselt)
├── Secondary: "Mehr erfahren" → #features
└── Stats: 50% Zeitersparnis | 10k+ Patienten | 500+ Praxen

FEATURES SECTION (id="features") ──────────────────
├── Badge: "Funktionen"
├── h2: "Alles was Sie brauchen"
└── 6 FeatureCards (grid cols-1/2/3):
    [1] Zeitersparnis (Clock)
    [2] Höchste Sicherheit (Shield)
    [3] KI-Unterstützung (Sparkles)
    [4] Nahtlose Integration (Stethoscope)
    [5] Patientenfreundlich (Users)
    [6] Automatisierte Dokumentation (FileCheck)

TESTIMONIALS SECTION (id="testimonials") ──────────
├── Badge: "Erfahrungen"
├── h2: "Was unsere Kunden sagen"
└── 3 TestimonialCards:
    [1] Dr. med. Sarah Schmidt, Hausärztin Berlin (5★)
    [2] Dr. med. Klaus Weber, Internist München (5★)
    [3] Maria Hoffmann, Praxismanagerin Hamburg (5★)

SECURITY SECTION (id="security") ──────────────────
├── Badge: "Sicherheit"
├── h2: "Ihre Daten sind bei uns sicher"
├── 4 Security Items:
│   [1] End-to-End Verschlüsselung (Lock)
│   [2] DSGVO-konform (Shield)
│   [3] Gematik-zertifiziert (FileCheck)
│   [4] TI-kompatibel (Zap)
└── Illustration: Shield-Icon in gradient circle

CTA SECTION ────────────────────────────────────────
├── h2: "Bereit für die digitale Patientenaufnahme?"
├── Button: "Kostenlos testen" (gradient, ArrowRight)
└── Button: "Kontakt aufnehmen" (ghost)

FOOTER ─────────────────────────────────────────────
├── Logo: DiggAI + Beschreibung
├── Produkt: Funktionen | Preise | Integrationen
├── Rechtliches: Datenschutz | AGB | Impressum
└── Trust: ISO 27001 | DSGVO Badges
```

### 3.3 StaffLogin (`/verwaltung/login`)

```
LOGIN FORM ─────────────────────────────────────────
(Details aus StaffLogin.tsx zu extrahieren)
├── h1/h2: "Verwaltung" / "Personal-Login"
├── Input: Benutzername/E-Mail
├── Input: Passwort (type=password)
├── Button: "Anmelden" (submit)
└── Demo-User Vorschläge:
    ├── admin / praxis2026
    ├── arzt / arzt1234
    ├── mfa / mfa1234
    └── (klickbar → auto-fill Credentials)
```

---

## 4. Browser-Agent Klick-Flows

### Flow A: Patient-Anamnese starten

```
SCHRITT 1: Navigiere → https://diggai-drklaproth.netlify.app
SCHRITT 2: Warte → DOM geladen (h2 "Wie können wir Ihnen helfen?")
SCHRITT 3: Klicke → Erste Kachel (button[aria-label*="Anamnese"])
           ODER: navigate('/patient')
SCHRITT 4: Warte → LandingPage geladen (h1 "Digitale Anamnese")
SCHRITT 5: Scrolle → zum CTA "Kostenlos testen"
SCHRITT 6: Klicke → CTA Button
SCHRITT 7: Warte → Questionnaire rendert (flowStep wechselt)
SCHRITT 8: Dokumentiere → aktuelle Frage, Optionen, Buttons
```

### Flow B: Staff Login (Arzt)

```
SCHRITT 1: Navigiere → /verwaltung/login
SCHRITT 2: Warte → Login-Form sichtbar
SCHRITT 3: Finde → Benutzername-Input
SCHRITT 4: Tippe → "arzt"
SCHRITT 5: Finde → Passwort-Input
SCHRITT 6: Tippe → "arzt1234"
SCHRITT 7: Klicke → "Anmelden"
SCHRITT 8: Warte → Redirect zu /verwaltung/arzt
           ODER: Fehler-Meldung (Backend nicht erreichbar)
SCHRITT 9: Dokumentiere → Dashboard-Inhalte
```

### Flow C: Demo-User Quick Login

```
SCHRITT 1: Navigiere → /verwaltung/login
SCHRITT 2: Warte → Demo-User-Bereich sichtbar
SCHRITT 3: Klicke → auf Demo-User-Karte (z.B. "arzt")
SCHRITT 4: Prüfe → Felder werden auto-filled
SCHRITT 5: Klicke → "Anmelden"
```

### Flow D: Sprachenwechsel

```
SCHRITT 1: Navigiere → /
SCHRITT 2: Finde → LanguageSelector (im Header)
SCHRITT 3: Klicke → LanguageSelector
SCHRITT 4: Warte → Dropdown mit Sprachen
SCHRITT 5: Klicke → z.B. "English" / "العربية"
SCHRITT 6: Warte → UI-Texte wechseln
SCHRITT 7: Prüfe → h2 Text in neuer Sprache
SCHRITT 8: Für RTL (ar/fa): Prüfe → dir="rtl" auf html/body
```

### Flow E: Navigation testen (alle öffentlichen Links)

```
SCHRITT 1:  / → Lade HomeScreen
SCHRITT 2:  Klicke "Praxis-Verwaltung & mehr" → Expand
SCHRITT 3:  Klicke jedes Item, prüfe URL, gehe zurück
SCHRITT 4:  Footer: Klicke "Datenschutz" → /datenschutz
SCHRITT 5:  Browser zurück → /
SCHRITT 6:  Footer: Klicke "Impressum" → /impressum
SCHRITT 7:  Browser zurück → /
SCHRITT 8:  Footer: Klicke "Verwaltung" → /verwaltung/login
SCHRITT 9:  Navigiere → /gibts-nicht → 404-Seite?
SCHRITT 10: Navigiere → /arzt → Redirect zu /verwaltung/arzt?
```

---

## 5. CSS-Selektor Referenz

### Häufig benötigte Selektoren

| Element | CSS Selektor | Beschreibung |
|---------|-------------|-------------|
| Theme Toggle | `.fixed.bottom-5.right-5.z-\\[8000\\]` | Dark/Light Schalter |
| Skip Link | `a[href="#main-content"]` | Barrierefreiheit |
| Main Content | `#main-content` | Hauptinhalt Container |
| HomeScreen Header | `header:first-of-type` | Praxis-Header |
| Kachel 1 (Patient) | `button:has(> div > div > svg.lucide-stethoscope)` | Anamnese-Tile |
| Kachel 2 (PWA) | `button:has(> div > div > svg.lucide-smartphone)` | Portal-Tile |
| Kachel 3 (Telemed) | `button:has(> div > div > svg.lucide-video)` | Telemedizin-Tile |
| Expand Button | `button[aria-expanded]` | "Mehr anzeigen" |
| Footer Datenschutz | `footer button:nth-child(1)` | Datenschutz-Link |
| Footer Impressum | `footer button:nth-child(3)` | Impressum-Link |
| Footer Verwaltung | `footer button:nth-child(5)` | Verwaltung-Link |
| Cookie Banner | `.cookie-consent` oder bottom overlay | Cookie Consent |
| Offline Banner | OfflineIndicator component | Netzwerk-Status |
| Loading Spinner | `.animate-spin` (im Suspense fallback) | Lade-Animation |
| Reset Warning | `.fixed.inset-0.z-50` (mit Timer icon) | Auto-Reset Overlay |

### Text-basierte Selektoren (für Button-Suche)

| Text (DE) | Element | Aktion |
|-----------|---------|--------|
| "Wie können wir Ihnen helfen?" | h2 | HomeScreen Titel |
| "Praxis-Verwaltung & mehr" | button | Expand Toggle |
| "Weniger anzeigen" | button | Collapse Toggle |
| "Kostenlos testen" | button | Patient Flow starten |
| "Jetzt starten" | button | Navbar CTA |
| "Mehr erfahren" | a | Scroll zu Features |
| "Datenschutz" | button/a | Datenschutz-Seite |
| "Impressum" | button/a | Impressum-Seite |
| "Verwaltung" | button | Staff-Login |
| "Ja, ich bin noch da" | button | Reset-Warning schließen |

---

## 6. Authentifizierungs-Kontext

### Demo-Credentials (für Browser-Agent Tests)

| Rolle | Username | Passwort | Erwarteter Redirect |
|-------|----------|----------|-------------------|
| Admin | `admin` | `praxis2026` | `/verwaltung/admin` |
| Admin | `praxis.leiter` | `demo1234` | `/verwaltung/admin` |
| Arzt | `arzt` | `arzt1234` | `/verwaltung/arzt` |
| Arzt | `dr.klapproth` | `demo1234` | `/verwaltung/arzt` |
| MFA | `mfa` | `mfa1234` | `/verwaltung/mfa` |
| MFA | `rezeption` | `demo1234` | `/verwaltung/mfa` |

### Auth-Fluss (technisch)

```
POST /api/arzt/login  { username, password }
  → Response: Set-Cookie: token=JWT (HttpOnly, Secure)
  → Frontend: useSessionStore() updated, ProtectedRoute passes
  → Redirect: basierend auf Rolle

Logout:
  → Cookie gelöscht
  → useSessionStore() cleared
  → Redirect zu /verwaltung/login
```

### ProtectedRoute Verhalten

```typescript
// Bei fehlendem Auth:
<ProtectedRoute allowedRoles={['arzt', 'admin']} redirectTo="/verwaltung/login">
// → Navigate to="/verwaltung/login" wenn:
//   1. Kein Token im Cookie
//   2. Token abgelaufen
//   3. Rolle nicht in allowedRoles
```

---

## 7. Fehlerbehandlung & Edge Cases

### Erwartete Fehlerzustände

| Situation | Erwartetes Verhalten | Selektor-Hint |
|-----------|---------------------|--------------|
| 404 Route | NotFoundPage rendert | Suche nach "404" Text |
| Backend offline | API-Calls scheitern, Offline-Indicator | OfflineIndicator Komponente |
| Session abgelaufen | Redirect zu Login | URL wechselt zu `/verwaltung/login` |
| JS-Error | RouteErrorBoundary fängt | Error-Boundary UI |
| Netzwerk-Disconnect | OfflineIndicator + Dexie offline DB | Top-Banner |
| Auto-Reset (120s) | Overlay → Reset zu `/` | `.fixed.inset-0.z-50` |
| Cookie nicht akzeptiert | Cookie-Banner bleibt | Cookie Consent Overlay |

### Console-Fehler die ignoriert werden können

| Fehler | Grund |
|--------|-------|
| `Failed to fetch` bei API-Calls | Backend nicht erreichbar (erwartet auf Netlify) |
| `Service Worker registration failed` | Localhost vs. HTTPS |
| `Refused to connect to wss://` | WebSocket Backend nicht erreichbar |

---

## 8. Technische Details für Browser-Agent

### Viewport-Größen für Tests

| Gerät | Breite × Höhe | User-Agent Hint |
|-------|---------------|----------------|
| iPhone SE | 375 × 667 | Mobile Chrome |
| iPhone 14 Pro | 393 × 852 | Mobile Safari |
| iPad | 768 × 1024 | Tablet |
| Desktop | 1440 × 900 | Chrome Desktop |
| Widescreen | 1920 × 1080 | Chrome Desktop |

### Wichtige Timeouts

| Timeout | Dauer | Beschreibung |
|---------|-------|-------------|
| Auto-Reset Warning | 90s Inaktivität | Zeigt Countdown-Overlay |
| Auto-Reset Execute | 120s Inaktivität | Reset zu `/` |
| Lazy-Load Preload | 1.2s nach Mount | Patient-Flow preload |
| React Query Stale | 30s | Cache invalidation |
| React Query GC | 5 min | Cache cleanup |

### Keyboard Shortcuts

| Taste | Aktion |
|-------|--------|
| `?` | KeyboardShortcutsHelp öffnen |
| `Tab` | Fokus-Navigation |
| `Escape` | Modal/Overlay schließen |

---

## 9. Änderungsprotokoll

| Datum | Änderung | Autor |
|-------|---------|-------|
| 2026-04-15 | Initiale Erstellung, 50 Routen, HomeScreen + LandingPage vollständig | Antigravity Agent |
