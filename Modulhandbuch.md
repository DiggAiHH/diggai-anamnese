# DiggAI Anamnese Platform — Modulhandbuch

**Version:** 3.0.0  
**Stand:** April 2026  
**Produkt:** DiggAI Anamnese Platform (Praxis OS — Modul 1)  
**Lizenz:** Proprietär — DiggAI GmbH

---

## Inhaltsverzeichnis

1. [Systemarchitektur](#1-systemarchitektur)
2. [Multi-Tenancy & BSNR-Routing](#2-multi-tenancy--bsnr-routing)
3. [Sicherheitsarchitektur (Zero-Knowledge)](#3-sicherheitsarchitektur-zero-knowledge)
4. [Frontend-Module](#4-frontend-module)
5. [Backend-Module (API-Routes)](#5-backend-module-api-routes)
6. [Datenbank-Schema (Prisma)](#6-datenbank-schema-prisma)
7. [Feature-Flag-System](#7-feature-flag-system)
8. [KI / Agent-System](#8-ki--agent-system)
9. [Internationalisierung (i18n)](#9-internationalisierung-i18n)
10. [Deployment & Infrastruktur](#10-deployment--infrastruktur)
11. [Compliance & DSGVO](#11-compliance--dsgvo)

---

## 1. Systemarchitektur

DiggAI ist nach der **6-Layer Praxis OS Architektur** aufgebaut:

| Layer | Technologie | Zweck |
|---|---|---|
| Frontend | React 19 + TypeScript 5.9 + Vite 8 | Patientenoberfläche, Arzt-Dashboard |
| Backend | Express 5 + Node.js | API, Auth, Triage, Geschäftslogik |
| Datenbank | PostgreSQL 16 + Prisma 6 | Persistenz, Row-Level Tenant-Isolation |
| Realtime | Socket.IO 4 | Queue-Updates, Triage-Alerts |
| Cache/Queue | Redis 7 | Token-Blacklist, Rate-Limiting, Job-Queue |
| Infrastruktur | Docker + Nginx (VPS Hetzner/Contabo DE) | Hosting, SSL, Reverse Proxy |

**Entry Point:**  
- Frontend: `src/main.tsx` → `src/App.tsx`  
- Backend: `server/index.ts`

---

## 2. Multi-Tenancy & BSNR-Routing

### 2.1 Konzept

Jede Arztpraxis wird über ihre **Betriebsstättennummer (BSNR)** — eine 9-stellige Zahl — identifiziert. Die URL-Struktur lautet:

```
https://diggai.de/<BSNR>              → Praxis-Startseite
https://diggai.de/<BSNR>/anamnese    → Anamnese-Modul
https://diggai.de/<BSNR>/rezepte     → Rezept-Anfrage
https://diggai.de/<BSNR>/patient     → Patient-Flow
```

### 2.2 Datenbank

Das `Tenant`-Modell in `prisma/schema.prisma` enthält:

```prisma
model Tenant {
  id        String  @id @default(uuid())
  subdomain String  @unique
  bsnr      String? @unique   // 9-stellige BSNR
  name      String
  plan      TenantPlan @default(STARTER)
  status    TenantStatus @default(ACTIVE)
  settings  Json?  @default("{}")  // Feature-Overrides
  ...
}
```

Alle `Patient`- und `PatientSession`-Datensätze sind über `tenantId` isoliert. Cross-Tenant-Leaks sind durch Prisma-Query-Filter auf DB-Ebene ausgeschlossen.

### 2.3 Backend-Middleware

`server/middleware/tenant.ts` — `resolveTenant()`:

1. Liest `X-Tenant-BSNR`-Header (gesetzt von `src/api/client.ts`)
2. Sucht Tenant via `bsnr` ODER `subdomain` ODER `customDomain`
3. Hängt `req.tenant` und `req.tenantId` an den Request

### 2.4 Frontend-Flow

1. `BsnrLayout` in `src/App.tsx` liest `:bsnr` aus der URL
2. Ruft `GET /api/tenants/by-bsnr/:bsnr` auf (öffentlich, kein Auth)
3. Befüllt `useTenantStore` (Branding, Features)
4. Speichert BSNR im `useSessionStore` → wird als `X-Tenant-BSNR`-Header mitgesendet
5. Rendert `<Outlet />` für verschachtelte BSNR-Routen

### 2.5 Seeding (Dr. Klaproth)

```bash
npx prisma db seed
```

Erstellt `Praxis Dr. Klaproth` mit BSNR `999999999`.  
URL: `http://localhost:5173/999999999`

---

## 3. Sicherheitsarchitektur (Zero-Knowledge)

### 3.1 Prinzip

Patientendaten (PII/PHI) verlassen den Browser **nie im Klartext**:

```
Browser                           Server (PostgreSQL)
───────                           ──────────────────
Patient füllt Anamnese aus
→ encryptPayload(data, key)       ← empfängt nur { iv, ciphertext }
→ POST /api/sessions/:id/answers  ← speichert verschlüsselten Blob
                                    (kein Plaintext-Zugriff möglich)
Arzt mit MFA-Login
→ GET /api/arzt/sessions/:id      ← AES-256-GCM Entschlüsselung
→ Anzeige in MfaDecryptView         nur für authentifizierte Rollen
```

### 3.2 Server-Side Encryption (AES-256-GCM)

`server/services/encryption.ts`:
- Alle PII-Felder (Name, E-Mail, Diagnosen) werden mit `encrypt()` → AES-256-GCM verschlüsselt
- Entschlüsselung nur via `decrypt()` für authentifizierte Arzt/MFA-Rollen
- Schlüssel: `ENCRYPTION_KEY` (32 Bytes, Umgebungsvariable)

### 3.3 Client-Side Encryption (Browser SubtleCrypto)

`src/utils/clientEncryption.ts`:
- `deriveSessionKey()`: PBKDF2-SHA-256, 100.000 Iterationen
- `encryptPayload()`: AES-256-GCM, IV als zufällige 12 Bytes
- `decryptPayload()`: Nur im Arzt-Kontext nach MFA-Login

### 3.4 E2E-Verschlüsselungstest

`e2e/encryption.spec.ts` — verifiziert automatisiert:
1. SubtleCrypto produziert opaken Ciphertext (kein Plaintext sichtbar)
2. POST-Body enthält keine Klartextwerte
3. Entschlüsselung im Arzt-Kontext korrekt

### 3.5 Authentifizierung

- **JWT HS256** mit Algorithm-Pinning, JTI für Token-Blacklist (Redis)
- **HttpOnly Cookies** (kein localStorage)
- **CSRF Double-Submit Cookie Pattern**
- **Rate Limiting**: 10 Login-Versuche/15min, 200 Requests/15min global
- **Account Lockout** nach konfigurierbaren Fehlversuchen (`config.accountLockoutMaxAttempts`)
- **MFA-Roles**: `arzt`, `mfa`, `admin` — getrennte Berechtigungen

---

## 4. Frontend-Module

### 4.1 Patientenbereich

| Komponente | Pfad | Beschreibung |
|---|---|---|
| `HomeScreen` | `src/components/HomeScreen.tsx` | Praxis-Startseite mit Service-Auswahl |
| `Questionnaire` | `src/components/Questionnaire.tsx` | Anamnese-Fragebogen (Auto-Scroll, 270+ Fragen) |
| `LandingPage` | `src/components/LandingPage.tsx` | Marketing-Landing-Page |
| `PatientWartezimmer` | `src/components/PatientWartezimmer.tsx` | Warteraum-Queue |

**Auto-Scroll:** `src/hooks/useAutoScroll.ts` — sorgt für sanftes Scrollen beim Sektionswechsel, sodass keine Eingabefelder verdeckt werden.

### 4.2 Arzt-/MFA-Bereich

| Seite | Pfad | Beschreibung |
|---|---|---|
| `ArztDashboard` | `src/pages/ArztDashboard.tsx` | Vollständiges Arzt-Dashboard |
| `MFADashboard` | `src/pages/MFADashboard.tsx` | MFA-Mitarbeiter-Ansicht |
| `MfaDecryptView` | `src/components/mfa/MfaDecryptView.tsx` | Entschlüsselte Session-Ansicht nach MFA-Login |
| `AdminDashboard` | `src/pages/AdminDashboard.tsx` | Admin-Bereich (Tenant-Verwaltung, Statistiken) |

### 4.3 Weitere Seiten

| Seite | Route | Beschreibung |
|---|---|---|
| `DatenschutzPage` | `/datenschutz` | DSGVO Art. 13/14 Datenschutzerklärung |
| `ImpressumPage` | `/impressum` | §5 DDG Impressum (vollständig) |
| `Impressum` | — | Einbettbare Kurzfassung (Footer-Komponente) |
| `Pricing` | `/pricing` | Tarifübersicht |
| `SecuritySettingsPage` | `/settings/security` | 2FA, Passwort, Sessions |

### 4.4 State Management

| Store | Datei | Inhalt |
|---|---|---|
| `useSessionStore` | `src/store/sessionStore.ts` | Patientensession, BSNR, Flow-Schritt |
| `useTenantStore` | `src/store/tenantStore.ts` | Praxis-Branding, Feature-Flags |
| `useThemeStore` | `src/store/themeStore.ts` | Dark/Light Theme |
| `useModeStore` | `src/store/modeStore.ts` | Demo/Live Modus |

---

## 5. Backend-Module (API-Routes)

Alle Routes sind in `server/routes/` und werden in `server/index.ts` gemountet.

### 5.1 Core API

| Route | Methoden | Auth | Beschreibung |
|---|---|---|---|
| `/api/tenants/by-bsnr/:bsnr` | GET | Public | BSNR-Lookup (Tenant-Branding) |
| `/api/arzt/*` | GET/POST | `arzt`/`admin` | Staff Auth, Sessions, Dashboard-Daten |
| `/api/mfa/*` | GET/POST | `mfa`/`admin` | MFA-Mitarbeiter-Endpoints |
| `/api/sessions/*` | POST | Auth | Session-Erstellung, Status |
| `/api/answers/:id` | POST | Auth | Antwort-Einreichung (Rate-Limited) |
| `/api/admin/*` | GET/POST/PATCH | `admin` | Tenant-Verwaltung, System |

### 5.2 Medizinische Module

| Route | Beschreibung |
|---|---|
| `/api/atoms` | Fragen-Atome (Medical Question Catalog) |
| `/api/therapy` | Therapiepläne |
| `/api/epa` | Elektronische Patientenakte (gematik/ePA) |
| `/api/pvs` | Praxisverwaltungssystem-Anbindung (Tomedo GDT) |
| `/api/export` | PDF/GDT-Export der Anamnesedaten |
| `/api/signatures` | Digitale Unterschriften (eIDAS Art. 26) |

### 5.3 Kommunikation & Workflow

| Route | Beschreibung |
|---|---|
| `/api/queue` | Warteraum-Queue (Socket.IO) |
| `/api/chats` | Staff-Chat, Patienten-FAQ |
| `/api/telemedizin` | WebRTC Videosprechstunde |
| `/api/flows` | Treatment-Flow-Builder |
| `/api/ai` | KI-Assistent (Ollama/OpenAI) |
| `/api/nfc` | NFC Check-in |

### 5.4 Business & Compliance

| Route | Beschreibung |
|---|---|
| `/api/billing` | Abrechnung, Stripe-Integration |
| `/api/subscriptions` | Tarifverwaltung |
| `/api/usage` | KI-Nutzungs-Tracking |
| `/api/gamification` | DSGVO-Schulungsspiel |
| `/api/feedback` | Anonymes Feedback |

### 5.5 Triage Engine

`server/engine/TriageEngine.ts` — 10 medizinische Sicherheitsregeln:

- **4 KRITISCH**: ACS (Herzinfarkt), Suizidalität, SAH (Hirnblutung), Synkope
- **6 WARNUNG**: Weitere klinische Red-Flags

**Änderungen an Triage-Regeln erfordern klinische Freigabe** (Dr. Klaproth / Dr. Al-Shdaifat).

---

## 6. Datenbank-Schema (Prisma)

**Datei:** `prisma/schema.prisma`  
**Datenbank:** PostgreSQL 16  
**Client:** Prisma 6.x

### Core-Modelle

| Modell | Beschreibung |
|---|---|
| `Tenant` | Arztpraxis (BSNR, Branding, Plan, Feature-Settings) |
| `ArztUser` | Praxis-Mitarbeiter (Arzt, MFA, Admin) |
| `Patient` | Pseudonymisierter Patient (kein Klartext — SHA-256 + AES-256-GCM) |
| `PatientSession` | Anamnesesesion (Status, Triage-Level, verschlüsselter Name) |
| `Answer` | Einzelne Antwort (PII-Felder AES-256-GCM verschlüsselt) |
| `TriageEvent` | Triage-Ereignis (CRITICAL/WARNING/INFO) |
| `AuditLog` | HIPAA-konformes Audit-Log |
| `Signature` | Digitale Unterschrift (eIDAS, AES-256-GCM) |
| `VideoSession` | Videosprechstunde-Session |
| `Subscription` | Tarifmodell (Starter/Professional/Enterprise) |

### Migrations

```bash
# Neue Migration erstellen
npx prisma migrate dev --name <beschreibender-name>

# Client regenerieren
npx prisma generate

# Seed ausführen (270+ Fragen + Dr. Klaproth BSNR 999999999)
npx prisma db seed
```

---

## 7. Feature-Flag-System

### 7.1 Konfiguration

Feature-Flags werden im `Tenant.settings` JSON-Feld gespeichert:

```json
{
  "features": {
    "anamnese": true,
    "videoKonsultation": true,
    "gamification": false,
    "kioskMode": false
  }
}
```

### 7.2 Standard-Flags (alle Tenants)

| Flag | Default | Beschreibung |
|---|---|---|
| `anamnese` | `true` | Anamnesemodul |
| `rezepte` | `true` | Rezeptanfragen |
| `krankschreibung` | `true` | Krankschreibungen |
| `unfallmeldung` | `true` | BG/Unfallmeldungen |
| `videoKonsultation` | `false` | Videosprechstunde (coturn erforderlich) |
| `gamification` | `false` | DSGVO-Lernspiel |
| `kioskMode` | `false` | Kiosk/Tablet-Modus |
| `nfc` | `false` | NFC Check-in |
| `patientPortal` | `false` | PWA Patientenportal |
| `multiLanguage` | `true` | Mehrsprachigkeit (10 Sprachen) |

### 7.3 Frontend-Zugriff

```typescript
import { useTenantStore } from './store/tenantStore';

const flags = useTenantStore(s => s.tenant?.features);
if (flags?.videoKonsultation) { /* Modul anzeigen */ }
```

---

## 8. KI / Agent-System

### 8.1 LLM-Integration

Konfigurierbar via `SystemSetting` DB-Tabelle (`llm_provider`):

| Provider | Beschreibung |
|---|---|
| `ollama` (default) | Lokaler LLM (datenschutzkonform, kein Cloud-Zugriff) |
| `openai` | OpenAI API (nur für unkritische Abfragen, kein PHI) |
| `none` | Rule-based Fallback |

**Wichtig:** Patientendaten (PHI) werden **niemals** an externe LLM-APIs übertragen.

### 8.2 Agent-System

5 spezialisierte Agenten (`server/services/agent/`):

| Agent | Aufgabe |
|---|---|
| `orchestrator` | Task-Routing und Koordination |
| `empfang` | Patientenaufnahme-Unterstützung |
| `triage` | Klinische Priorisierung |
| `dokumentation` | Dokumentationsassistenz |
| `abrechnung` | Abrechnungsunterstützung |

---

## 9. Internationalisierung (i18n)

10 Sprachen — `public/locales/{lng}/translation.json`:

| Code | Sprache |
|---|---|
| `de` | Deutsch (Quelldatei) |
| `en` | Englisch |
| `tr` | Türkisch |
| `ar` | Arabisch (RTL) |
| `uk` | Ukrainisch |
| `es` | Spanisch |
| `fa` | Farsi/Persisch (RTL) |
| `it` | Italienisch |
| `fr` | Französisch |
| `pl` | Polnisch |

**Regeln:**
- Alle User-facing Strings via `t('key')` — kein Hardcoding
- Nach Änderungen: `node scripts/generate-i18n.ts` ausführen
- RTL-Layout nach Änderungen für `ar` und `fa` testen

---

## 10. Deployment & Infrastruktur

### 10.1 Frontend (Netlify)

```bash
npm run build        # Vite Production Build → dist/
npm run deploy       # Geführter Netlify-Deploy
npm run deploy:preview  # Preview-Deploy
```

- Site ID: `aeb2a8e2-e8ac-47e0-a5bc-fef4df4aceaa`
- SPA-Fallback: `/* → /index.html` (deckt alle BSNR-Pfade ab)
- BSNR-URL-Beispiel: `https://diggai.de/999999999`

### 10.2 Backend (Docker / Railway / VPS)

```bash
npm run docker:up    # docker compose up (App + PostgreSQL + Redis + Nginx)
npm run docker:down  # Services stoppen
```

**Pflicht-Umgebungsvariablen:**

```bash
DATABASE_URL="postgresql://user:pass@host:5432/diggai"
JWT_SECRET="min-32-zeichen-zufaelliger-string"
ENCRYPTION_KEY="genau-32-zeichen-fuer-aes256!!!"
ARZT_PASSWORD="praxis-seed-passwort"
FRONTEND_URL="https://diggai.de"
```

### 10.3 Entwicklung

```bash
npm run dev          # Vite :5173 + Express :3001 (proxy)
npm run dev:all      # Beides parallel
npm run type-check   # TypeScript prüfen (muss grün sein)
npm run lint         # ESLint (src/ only)
```

---

## 11. Compliance & DSGVO

### 11.1 Datenschutz-Grundsätze

- **Privacy by Design**: PHI verlässt den Browser nur AES-256-GCM verschlüsselt
- **Datensparsamkeit**: Minimal notwendige Daten, pseudonymisiert (SHA-256 E-Mail-Hash)
- **Aufbewahrung**: Unterschriften 10 Jahre (§630f Abs. 3 BGB)
- **Löschkonzept**: Soft-Delete + Hard-Delete-Worker (konfigurierbare TTL)
- **Audit-Trail**: Jeder Request wird in `AuditLog` protokolliert (HIPAA-konform)

### 11.2 Rechtsgrundlagen

| Norm | Relevanz |
|---|---|
| DSGVO Art. 9 | Besondere Kategorien (Gesundheitsdaten) |
| DSGVO Art. 13/14 | Datenschutzerklärung (→ `/datenschutz`) |
| DSGVO Art. 35 | Datenschutz-Folgeabschätzung (DSFA) |
| §630f BGB | Dokumentationspflicht |
| §5 DDG | Impressumspflicht (→ `/impressum`) |
| eIDAS Art. 26 | Fortgeschrittene elektronische Signatur |
| BSI TR-03161 | Videodienste im Gesundheitswesen |
| §291g SGB V | Videosprechstunde |

### 11.3 Sicherheitsmaßnahmen (OWASP Top 10)

| Maßnahme | Implementierung |
|---|---|
| SQL-Injection | Prisma ORM (kein Raw SQL) |
| XSS | CSP-Header + Input-Sanitization |
| CSRF | Double-Submit Cookie Pattern |
| Auth-Brute-Force | Rate Limiting + Account Lockout |
| Sensitive Data | AES-256-GCM + SHA-256-Hashing |
| Security Misconfiguration | Helmet.js + HSTS + CSP |
| Broken Access Control | RBAC via `requireRole()` |
| Logging | HIPAA Audit-Log + Sentry |

---

*Dieses Modulhandbuch wird mit jeder Major-Version aktualisiert.*  
*Klinische Änderungen bedürfen der Freigabe durch den ärztlichen Leiter.*
