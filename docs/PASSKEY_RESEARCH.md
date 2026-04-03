# Passkey / WebAuthn / FIDO2 Research Dokument

> **DiggAI Anamnese Platform** - Research & Architecture für Passkey-Integration  
> **Stand:** April 2026  
> **Autor:** DiggAI Engineering Team

---

## 1. Was sind Passkeys?

### 1.1 FIDO2 / WebAuthn Standard

**FIDO2** ist ein offener Authentifizierungsstandard, entwickelt von der **FIDO Alliance** und dem **W3C**. Er besteht aus zwei Kernkomponenten:

| Komponente | Beschreibung |
|------------|--------------|
| **WebAuthn (Web Authentication)** | W3C-Standard für Browser-API zur Public-Key-Authentifizierung |
| **CTAP (Client to Authenticator Protocol)** | Protokoll für Kommunikation zwischen Client und Hardware-Authenticator |

**FIDO2 ermöglicht:**
- Passwortlose Authentifizierung im Web
- Starke Kryptographie basierend auf Public-Private Key Pairs
- Phishing-resistente Authentifizierung
- Biometrische Verifizierung (Face ID, Touch ID, Windows Hello)

### 1.2 Unterschied zu Passwörtern

| Aspekt | Passwörter | Passkeys |
|--------|------------|----------|
| **Speicherung** | Server (gehashed) | Nur Public Key auf Server |
| **Übertragung** | Werden über das Netzwerk gesendet | Nie übertragen - nur kryptographische Challenge |
| **Phishing-Anfälligkeit** | Hoch (fake-Seiten können Credentials abfangen) | Nicht möglich (gebunden an Origin) |
| **Brute-Force** | Möglich bei schwachen Passwörtern | Unmöglich - kryptographische Sicherheit |
| **Re-Use Risiko** | Benutzer nutzen Passwörter mehrfach | Einzigartig pro Service |
| **Datenlecks** | Credentials können geleakt werden | Public Keys sind nutzlos für Angreifer |
| **UX** | Eingabe erforderlich, leicht vergesslich | Biometrisch oder PIN, gerätegebunden |

### 1.3 Public-Private Key Kryptographie

**Wie Passkeys funktionieren:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      REGISTRATION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Client (Browser)              Server                          │
│  ────────────────              ──────                          │
│                                                                   │
│  1. Erzeugt Key Pair              ←── Challenge ──               │
│     - Private Key (lokal)                                       │
│     - Public Key                                  ──→ speichert  │
│                                                                   │
│  2. Signiert Challenge mit Private Key                          │
│                                                  ──→ verifiziert │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Client (Browser)              Server                          │
│  ────────────────              ──────                          │
│                                                                   │
│  1. Fordert Assertion             ←── Challenge + Credential ID  │
│                                                                   │
│  2. Nutzt Private Key zum Signieren                             │
│     (nach Biometrie/PIN-Check)                                   │
│                                                                   │
│  3. Sendet Assertion zurück       ──→ verifiziert mit Public Key │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Schlüsseleigenschaften:**
- **Private Key:** Nie den Server verlassen, sicher im Authenticator (Secure Enclave, TPM)
- **Public Key:** Öffentlich auf dem Server gespeichert, kann nicht für Anmeldung missbraucht werden
- **Challenge-Response:** Jede Authentifizierung nutzt einzigartige Challenge - kein Replay möglich

### 1.4 Phishing-resistent

**Warum Passkeys gegen Phishing immun sind:**

1. **Origin-Binding:** Der Authenticator prüft die Origin (Domain) der Anfrage. Ein Phishing-Site auf `evil.com` kann keine Credentials für `diggai.de` erzeugen oder nutzen.

2. **Challenge-Response:** Der Server sendet eine einzigartige Challenge, die signiert werden muss. Ohne Zugriff auf den Private Key ist keine gültige Antwort möglich.

3. **Keine geteilten Secrets:** Im Gegensatz zu Passwörtern oder SMS-Codes gibt es nichts, das ein Angreifer abfangen und wiederverwenden könnte.

```
Phishing-Angriff auf Passkeys:
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Benutzer   │ ──────→ │  evil.com    │         │  diggai.de   │
│              │         │  (Phishing)  │         │  (Echt)      │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                        │
       │  Passkey-Anfrage       │                        │
       │───────────────────────→│                        │
       │                        │                        │
       │  Origin = evil.com     │                        │
       │  ←── FEHLGESCHLAGEN!   │                        │
       │  (Keine Credentials    │                        │
       │   für diese Domain)    │                        │
```

---

## 2. Vorteile für DiggAI

### 2.1 99% Reduktion Account Takeover

**Microsoft Studie (2023):**
- Passkeys reduzieren Account Takeover-Angriffe um **99%**
- Passwort-basierte Angriffe (Brute-Force, Credential Stuffing, Phishing) werden vollständig eliminiert

**Relevanz für DiggAI:**
- Schutz medizinischer Patientendaten
- Verhinderung unautorisierter Arzt-Zugriffe
- Sicherstellung der Audit-Trail-Integrität

### 2.2 Keine Passwort-Resets mehr

**Reduzierte Support-Last:**
- Keine "Passwort vergessen"-Tickets mehr
- Keine temporären Passwörter
- Keine Account-Lockouts durch falsche Eingaben

**Kosteneinsparungen:**
| Metrik | Passwörter | Passkeys |
|--------|------------|----------|
| Passwort-Resets/Monat | ~5% der Benutzer | 0% |
| Support-Tickets | Hoch | Minimal |
| Account Recovery Zeit | 5-15 Minuten | Sofort (alternatives Gerät) |

### 2.3 HIPAA 2026 Compliance

**Neue HIPAA-Anforderungen (2026):**
- Starke Authentifizierung für alle Zugriffe auf ePHI (electronic Protected Health Information)
- MFA wird für alle Arzt- und Admin-Zugriffe vorgeschrieben
- Phishing-resistente Authentifizierung empfohlen

**Wie Passkeys helfen:**
- **Authentifizierungsfaktor:** "Something you are" (Biometrie) oder "something you have" (Gerät)
- **Kryptographische Stärke:** Erfüllt NIST SP 800-63B Authenticator Assurance Level 2 (AAL2)
- **Audit-Trail:** Unveränderliche kryptographische Nachweise für jede Anmeldung

**Compliance-Matrix:**
| Anforderung | Passwörter + SMS | Passwörter + TOTP | Passkeys |
|-------------|------------------|-------------------|----------|
| HIPAA 2026 MFA | ✅ | ✅ | ✅ |
| Phishing-resistent | ❌ | ⚠️ | ✅ |
| NIST AAL2 | ❌ | ✅ | ✅ |
| NIST AAL3 | ❌ | ❌ | ✅ (mit Hardware-Key) |

### 2.4 Bessere UX

**Vergleich Anmeldeprozess:**

| Schritt | Passwort + SMS | Passkey |
|---------|----------------|---------|
| 1 | Username eingeben | - |
| 2 | Passwort eingeben | - |
| 3 | SMS-Code warten | - |
| 4 | Code eingeben | Touch/Face ID |
| **Gesamtzeit** | **30-60 Sekunden** | **1-2 Sekunden** |

**Plattform-Support:**
- **iOS/macOS:** Face ID, Touch ID (Secure Enclave)
- **Android:** Fingerprint, Face Unlock (StrongBox/TEE)
- **Windows:** Windows Hello (Fingerprint, Gesicht, PIN)
- **Cross-Platform:** Passkeys können über QR-Code oder Bluetooth auf andere Geräte übertragen werden

**Sync-Optionen:**
- **iCloud Keychain:** Passkeys sync zwischen Apple-Geräten
- **Google Password Manager:** Sync zwischen Android/Chrome
- **1Password, Bitwarden:** Third-Party Passkey-Anbieter
- **Hardware-Keys:** YubiKey, SoloKeys (kein Sync, höchste Sicherheit)

---

## 3. Technische Anforderungen

### 3.1 Browser Support

**WebAuthn API Support (Stand April 2026):**

| Browser | Version | Unterstützung | Hinweise |
|---------|---------|---------------|----------|
| **Chrome** | 67+ | ✅ Vollständig | Beste Unterstützung |
| **Safari** | 13+ | ✅ Vollständig | iOS 16.0+, macOS 13+ |
| **Firefox** | 60+ | ✅ Vollständig | Aktiviert ab v60 |
| **Edge** | 79+ | ✅ Vollständig | Chromium-basiert |
| **Opera** | 54+ | ✅ Vollständig | Chromium-basiert |
| **Samsung Internet** | 10.2+ | ✅ Vollständig | Android |

**Feature Detection:**
```javascript
// Prüfen ob Passkeys unterstützt werden
const isSupported = 
  window.PublicKeyCredential !== undefined &&
  typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function';

// Prüfen ob Platform Authenticator verfügbar (Face ID, Touch ID, etc.)
const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
```

**Nutzerbasis:**
- **Global:** ~95% aller Browser unterstützen WebAuthn
- **Deutschland:** ~93% (basierend auf StatCounter Daten)
- **Healthcare-Umfeld:** ~90% (ältere Systeme in Praxen)

### 3.2 Backend: @simplewebauthn/server

**Empfohlene Library:** [`@simplewebauthn/server`](https://simplewebauthn.dev/)

**Installation:**
```bash
npm install @simplewebauthn/server
```

**Features:**
- TypeScript-first
- Unterstützt alle Authenticator-Typen
- SRP (Secure Remote Password) Unterstützung
- Einfache API für Registration und Authentication
- Integrierte Challenge-Verwaltung

**Alternative Libraries:**
| Library | Sprache | Features | Bewertung |
|---------|---------|----------|-----------|
| **simplewebauthn** | TypeScript/Node.js | Vollständig, einfach | ⭐⭐⭐⭐⭐ |
| fido2-lib | Node.js | Vollständig, komplex | ⭐⭐⭐⭐ |
| webauthn-json | TypeScript | Lightweight Wrapper | ⭐⭐⭐ |
| java-webauthn-server | Java | Für Java-Backends | ⭐⭐⭐⭐ |

### 3.3 Frontend: @simplewebauthn/browser

**Installation:**
```bash
npm install @simplewebauthn/browser
```

**Verwendung:**
```typescript
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

// Registration
const registrationOptions = await fetch('/auth/passkey/register-options');
const attestation = await startRegistration(await registrationOptions.json());
await fetch('/auth/passkey/register', {
  method: 'POST',
  body: JSON.stringify(attestation),
});

// Authentication
const authOptions = await fetch('/auth/passkey/auth-options');
const assertion = await startAuthentication(await authOptions.json());
await fetch('/auth/passkey/authenticate', {
  method: 'POST',
  body: JSON.stringify(assertion),
});
```

### 3.4 HTTPS Required (Production)

**Warum HTTPS zwingend erforderlich ist:**

1. **Origin-Sicherheit:** WebAuthn prüft die Origin streng. Ohne HTTPS ist die Origin nicht verifizierbar.

2. **Man-in-the-Middle:** Ohne HTTPS könnten Angreifer die Challenge-Response abfangen.

3. **Browser-Policies:** Moderne Browser blockieren WebAuthn auf nicht-HTTPS-Sites.

**Setup für Entwicklung:**
```javascript
// Vite Dev Server mit HTTPS
export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    },
  },
});
```

---

## 4. Architektur-Vorschlag

### 4.1 Registration Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                        PASSKEY REGISTRATION                          │
└──────────────────────────────────────────────────────────────────────┘

  ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
  │  Client  │         │  Server  │         │   DB     │         │Platform  │
  │ (Browser)│         │(Node.js) │         │(PostgreSQL)│       │(Face ID) │
  └────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
       │                    │                    │                    │
       │  1. POST /passkey/register-options     │                    │
       │     { userId, username }               │                    │
       │───────────────────→│                    │                    │
       │                    │                    │                    │
       │                    │  2. Generate Challenge                    │
       │                    │     (32 bytes random)                   │
       │                    │                    │                    │
       │                    │  3. Store Challenge in Redis             │
       │                    │     (TTL: 5 minutes)                     │
       │                    │                    │                    │
       │  4. Return RegistrationOptions         │                    │
       │     { challenge, rp, user, ... }       │                    │
       │←───────────────────│                    │                    │
       │                    │                    │                    │
       │  5. Call navigator.credentials.create()│                    │
       │     with RegistrationOptions           │                    │
       │───────────────────────────────────────────────────────────────→│
       │                    │                    │                    │
       │                    │                    │  6. User Verification
       │                    │                    │    (Face ID / Touch ID)
       │                    │                    │←───────────────────│
       │                    │                    │                    │
       │                    │                    │  7. Generate Key Pair
       │                    │                    │     (Private + Public)
       │                    │                    │                    │
       │  8. Return Attestation                 │                    │
       │     { credentialId, publicKey, ... }   │                    │
       │←───────────────────────────────────────────────────────────────│
       │                    │                    │                    │
       │  9. POST /passkey/register             │                    │
       │     { attestation }                    │                    │
       │───────────────────→│                    │                    │
       │                    │                    │                    │
       │                    │ 10. Verify Attestation                    │
       │                    │     (@simplewebauthn/server)             │
       │                    │                    │                    │
       │                    │ 11. Store Credential in DB                │
       │                    │───────────────────→│                    │
       │                    │                    │                    │
       │                    │ 12. Link to User   │                    │
       │                    │                    │                    │
       │  13. Return Success  │                    │                    │
       │     { verified: true }                 │                    │
       │←───────────────────│                    │                    │
       │                    │                    │                    │
```

### 4.2 Authentication Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                       PASSKEY AUTHENTICATION                         │
└──────────────────────────────────────────────────────────────────────┘

  ┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
  │  Client  │         │  Server  │         │   DB     │         │Platform  │
  │ (Browser)│         │(Node.js) │         │(PostgreSQL)│       │(Face ID) │
  └────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
       │                    │                    │                    │
       │  1. POST /passkey/auth-options         │                    │
       │     { userId? } (optional - discoverable)                  │
       │───────────────────→│                    │                    │
       │                    │                    │                    │
       │                    │  2. Fetch User's   │                    │
       │                    │     Credentials    │                    │
       │                    │───────────────────→│                    │
       │                    │                    │                    │
       │                    │  3. Generate Challenge                    │
       │                    │                    │                    │
       │                    │  4. Return AuthenticationOptions          │
       │     { challenge, allowCredentials, ... }                   │
       │←───────────────────│                    │                    │
       │                    │                    │                    │
       │  5. Call navigator.credentials.get()   │                    │
       │     with AuthenticationOptions         │                    │
       │───────────────────────────────────────────────────────────────→│
       │                    │                    │                    │
       │                    │                    │  6. User Verification
       │                    │                    │←───────────────────│
       │                    │                    │                    │
       │                    │                    │  7. Sign Challenge
       │                    │                    │     with Private Key
       │                    │                    │                    │
       │  8. Return Assertion                   │                    │
       │     { credentialId, signature, ... }   │                    │
       │←───────────────────────────────────────────────────────────────│
       │                    │                    │                    │
       │  9. POST /passkey/authenticate         │                    │
       │     { assertion }  │                    │                    │
       │───────────────────→│                    │                    │
       │                    │                    │                    │
       │                    │ 10. Fetch Credential from DB              │
       │                    │───────────────────→│                    │
       │                    │                    │                    │
       │                    │ 11. Verify Signature                      │
       │                    │     with Public Key                       │
       │                    │                    │                    │
       │                    │ 12. Update Counter │                    │
       │                    │     (Anti-Cloning) │                    │
       │                    │───────────────────→│                    │
       │                    │                    │                    │
       │                    │ 13. Generate JWT   │                    │
       │                    │                    │                    │
       │  14. Return Success + JWT              │                    │
       │     { verified: true, token }          │                    │
       │←───────────────────│                    │                    │
       │                    │                    │                    │
```

### 4.3 Challenge-Response Mechanismus

**Warum Challenge-Response?**

Der Challenge-Response-Mechanismus ist das Herzstück der WebAuthn-Sicherheit:

1. **Einzigartigkeit:** Jede Challenge ist kryptographisch zufällig und einmalig
2. **Replay-Schutz:** Eine Challenge kann nur einmal verwendet werden
3. **Zeitliche Begrenzung:** Challenges haben eine kurze Lebensdauer (5-10 Minuten)

**Implementierung:**
```typescript
// Challenge Generierung
function generateChallenge(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// Challenge Speicherung (Redis)
await redis.setex(
  `webauthn:challenge:${userId}`,
  300, // 5 Minuten TTL
  challenge
);

// Challenge Verifizierung
const expectedChallenge = await redis.get(`webauthn:challenge:${userId}`);
if (response.challenge !== expectedChallenge) {
  throw new Error('Challenge mismatch - possible replay attack');
}
await redis.del(`webauthn:challenge:${userId}`); // Einmalige Verwendung
```

### 4.4 Credential Storage

**Datenbank-Schema:**

```prisma
// prisma/schema.prisma

model PasskeyCredential {
  id                  String   @id @default(uuid())
  userId              String
  userType            UserType // ARZT, PATIENT, ADMIN, MFA
  
  // WebAuthn Daten
  credentialID        String   @unique // Base64URL encoded
  credentialPublicKey String   // Base64URL encoded COSE key
  counter             Int      @default(0) // Signature counter (anti-cloning)
  
  // Metadaten
  deviceName          String?  // "iPhone 15", "MacBook Pro", etc.
  transports          String[] // ['usb', 'nfc', 'ble', 'hybrid', 'internal']
  
  // Backup-Eligibility (für Sync)
  backupEligible      Boolean  @default(false)
  backupStatus        Boolean  @default(false)
  
  // Zeitstempel
  createdAt           DateTime @default(now())
  lastUsedAt          DateTime?
  
  // Relations
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([credentialID])
}

enum UserType {
  ARZT
  PATIENT
  ADMIN
  MFA
}
```

**Wichtige Sicherheitsaspekte:**

| Feld | Speicherung | Hinweis |
|------|-------------|---------|
| `credentialID` | Klartext | Wird für Lookup benötigt |
| `credentialPublicKey` | Klartext | Öffentlicher Schlüssel, unbedenklich |
| `counter` | Integer | Muss bei jeder Nutzung inkrementiert werden |
| `backupEligible` | Boolean | Zeigt an ob Passkey sync-fähig ist |

**NIE SPEICHERN:**
- ❌ Private Keys (bleiben im Authenticator)
- ❌ Biometrische Daten (werden vom Betriebssystem verwaltet)
- ❌ PINs (werden vom Authenticator verifiziert)

---

## 5. Implementierungs-Roadmap

### Phase 1: Backend Service (4 Stunden)

**Aufgaben:**
1. [ ] `@simplewebauthn/server` installieren
2. [ ] Datenbank-Schema erstellen (Migration)
3. [ ] PasskeyService implementieren:
   - `generateRegistrationOptions()`
   - `verifyRegistrationResponse()`
   - `generateAuthenticationOptions()`
   - `verifyAuthenticationResponse()`
4. [ ] API Endpunkte erstellen:
   - `POST /api/auth/passkey/register-options`
   - `POST /api/auth/passkey/register`
   - `POST /api/auth/passkey/auth-options`
   - `POST /api/auth/passkey/authenticate`
5. [ ] Challenge-Verwaltung mit Redis
6. [ ] Integration mit bestehendem JWT-System

**Ergebnis:** Voll funktionsfähige Backend-API für Passkey-Registrierung und -Authentifizierung

### Phase 2: Frontend Integration (3 Stunden)

**Aufgaben:**
1. [ ] `@simplewebauthn/browser` installieren
2. [ ] `PasskeyButton` Komponente erstellen:
   - Browser-Support Detection
   - Registration Flow
   - Authentication Flow
   - Error Handling
3. [ ] Integration in Login-Page:
   - "Mit Passkey anmelden" Button
   - Fallback auf Passwort-Login
4. [ ] Integration in Profile-Settings:
   - Passkey-Registrierung
   - Passkey-Verwaltung (löschen, umbenennen)
5. [ ] Loading States und Error Messages

**Ergebnis:** Benutzer können Passkeys registrieren und zur Anmeldung nutzen

### Phase 3: Testing & Rollout (2 Stunden)

**Aufgaben:**
1. [ ] E2E Tests mit Playwright:
   - Registration Flow
   - Authentication Flow
   - Error Cases (abgebrochene Authentifizierung)
2. [ ] Cross-Browser Tests:
   - Chrome (Desktop + Mobile)
   - Safari (iOS + macOS)
   - Firefox
3. [ ] Security Review:
   - Challenge Replay-Attack Tests
   - Origin Validation Tests
4. [ ] Feature Flag für schrittweisen Rollout
5. [ ] Monitoring und Analytics

**Ergebnis:** Produktionsreife Passkey-Integration mit Monitoring

---

## Anhang

### A. Nützliche Ressourcen

| Ressource | URL |
|-----------|-----|
| WebAuthn Spec | https://www.w3.org/TR/webauthn-2/ |
| FIDO Alliance | https://fidoalliance.org/ |
| SimpleWebAuthn Docs | https://simplewebauthn.dev/docs/ |
| webauthn.guide | https://webauthn.guide/ |
| caniuse WebAuthn | https://caniuse.com/webauthn |

### B. Begriffserklärungen

| Begriff | Erklärung |
|---------|-----------|
| **Authenticator** | Hardware oder Software, die Private Keys speichert und kryptographische Operationen durchführt |
| **Attestation** | Nachweis über Herkunft und Eigenschaften des Authenticators |
| **Assertion** | Die Antwort des Authenticators bei einer Authentifizierung |
| **RP (Relying Party)** | Der Server/Service, der die Authentifizierung durchführt (DiggAI) |
| **COSE** | CBOR Object Signing and Encryption - Format für Public Keys |
| **CTAP** | Client to Authenticator Protocol - Kommunikation zwischen Browser und Authenticator |
| **Resident Key** | Passkey, der auf dem Authenticator gespeichert ist (nicht server-seitig) |

### C. Gängige Fehler und Lösungen

| Fehler | Ursache | Lösung |
|--------|---------|--------|
| `NotAllowedError` | Benutzer hat abgebrochen | Benutzerfreundliche Fehlermeldung anzeigen |
| `SecurityError` | Ungültige Origin | HTTPS erzwingen, Domain prüfen |
| `InvalidStateError` | Credential existiert bereits | Existierende Credentials vorher löschen |
| `AbortError` | Timeout oder Navigation | Session-Handling verbessern |

---

*Dokument erstellt: April 2026*  
*Version: 1.0*  
*Autor: DiggAI Engineering Team*
