# Security Event Monitoring & Device Fingerprinting - Implementierung

## Zusammenfassung

Diese Implementierung erweitert das DiggAI-Sicherheitssystem um:
1. **Security Event Monitoring** mit erweitertem Enum
2. **Device Fingerprinting Service** mit Trust-Scoring
3. **Device Fingerprint API Routes** für Geräteverwaltung
4. **Integration-Beispiele** für Auth-Flows

---

## 1. Security Event Enum (✅ Erledigt)

**Datei:** `server/services/security-audit.service.ts`

### Hinzugefügte Events:

```typescript
// MFA Events
MFA_ENABLED = 'SECURITY:MFA_ENABLED'
MFA_DISABLED = 'SECURITY:MFA_DISABLED'
MFA_CHALLENGE_SUCCESS = 'SECURITY:MFA_CHALLENGE_SUCCESS'
MFA_CHALLENGE_FAILED = 'SECURITY:MFA_CHALLENGE_FAILED'

// Token & Session Events
TOKEN_REFRESHED = 'SECURITY:TOKEN_REFRESHED'
TOKEN_FAMILY_BROKEN = 'SECURITY:TOKEN_FAMILY_BROKEN'
SESSION_TERMINATED = 'SECURITY:SESSION_TERMINATED'
ALL_SESSIONS_TERMINATED = 'SECURITY:ALL_SESSIONS_TERMINATED'

// Device & Location Events
DEVICE_TRUSTED = 'SECURITY:DEVICE_TRUSTED'
DEVICE_UNTRUSTED = 'SECURITY:DEVICE_UNTRUSTED'
NEW_DEVICE_DETECTED = 'SECURITY:NEW_DEVICE_DETECTED'
SUSPICIOUS_LOCATION = 'SECURITY:SUSPICIOUS_LOCATION'
IMPOSSIBLE_TRAVEL = 'SECURITY:IMPOSSIBLE_TRAVEL'
```

### Helper-Funktionen:
- `logMfaStatusChange()` - MFA Aktivierung/Deaktivierung
- `logMfaChallenge()` - MFA Challenge Ergebnisse
- `logTokenRefresh()` - Token Refresh Events
- `logSessionEvent()` - Session-Terminierung
- `logDeviceEvent()` - Geräte-Vertrauens-Events
- `logLocationAlert()` - Standort-basierte Alerts

---

## 2. Device Fingerprint Service (✅ Erledigt)

**Datei:** `server/services/auth/device-fingerprint.service.ts`

### Kernfunktionen:

| Funktion | Beschreibung |
|----------|--------------|
| `generateFingerprint(req)` | Generiert Fingerprint aus Request |
| `generateFingerprintFromComponents(components)` | Generiert Fingerprint aus Komponenten |
| `generateFingerprintHash(components)` | SHA-256 Hash der Komponenten |
| `compareFingerprints(fp1, fp2, ...)` | Vergleicht Fingerprints (0-1 Similarity) |
| `isTrustedDevice(fp, stored, expires, verified)` | Prüft Geräte-Vertrauen |
| `evaluateDeviceTrust(fp, devices, history, mfa)` | Umfassende Trust-Evaluierung |
| `detectRiskFactors(components)` | Erkennt Risikofaktoren |
| `calculateTrustScore(...)` | Berechnet Trust-Score |
| `requiresVerification(...)` | Bestimmt ob Verifizierung nötig |
| `generateDeviceName(components)` | Generiert lesbaren Namen |
| `getDeviceType(components)` | Bestimmt Gerätetyp |

### Konfiguration:
```typescript
{
  minTrustScore: 0.7,          // Mindest-Trust für "vertrauenswürdig"
  verificationThreshold: 0.5,   // Schwellwert für Verifizierung
  deviceRetentionDays: 90,      // Geräte-Speicherdauer
  maxDevicesPerUser: 10,        // Max. Geräte pro Benutzer
  useAdvancedFingerprinting: false,
  weights: {
    similarity: 0.4,      // Gewichtung Fingerprint-Ähnlichkeit
    knownDevice: 0.3,     // Gewichtung bekanntes Gerät
    loginHistory: 0.3,    // Gewichtung Login-Historie
  }
}
```

---

## 3. Device Fingerprint API Routes (✅ Erledigt)

**Datei:** `server/routes/auth/device.ts`

### Endpunkte:

| Methode | Endpoint | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/device/register` | Neues Gerät registrieren |
| GET | `/api/auth/device/verify` | Gerät verifizieren (aus Request) |
| POST | `/api/auth/device/verify` | Gerät verifizieren (mit Komponenten) |
| GET | `/api/auth/device/list` | Bekannte Geräte auflisten |
| PUT | `/api/auth/device/:id/trust` | Gerät als vertrauenswürdig markieren |
| PUT | `/api/auth/device/:id/untrust` | Vertrauen entfernen |
| DELETE | `/api/auth/device/:id` | Gerät entfernen |

### Registrierung in `server/index.ts`:
```typescript
import deviceFingerprintRoutes from './routes/auth/device';
// ...
mountRoute('shared', '/api/auth/device', authLimiter, deviceFingerprintRoutes);
```

---

## 4. Datenbank-Schema (✅ Erledigt)

**Datei:** `prisma/schema.prisma`

### Erweiterung des `PatientDevice` Models:

```prisma
model PatientDevice {
  // ... existing fields ...
  
  // NEU: Refresh Token Rotation Support
  fingerprintHash String?  // SHA-256 des Device Fingerprints
  isTrusted       Boolean @default(false)
  trustedAt       DateTime?
  trustExpiresAt  DateTime? // Wann das Vertrauen abläuft
  lastVerifiedAt  DateTime? // Wann das Gerät zuletzt verifiziert wurde
  
  // Relationen
  refreshTokens RefreshToken[]
  
  @@index([fingerprintHash])
  @@index([isTrusted])
}
```

**Migration erforderlich:**
```bash
npx prisma migrate dev --name add_device_fingerprint_fields
```

---

## 5. Integration-Beispiele (✅ Erledigt)

**Datei:** `server/services/auth/device-fingerprint.integration.example.ts`

### Verfügbare Beispiele:

1. **`verifyDeviceOnLogin`** - Middleware für Login-Device-Check
2. **`registerDeviceAfterLogin`** - Gerät nach Login registrieren
3. **`logMfaChallengeWithDevice`** - MFA mit Device Context loggen
4. **`terminateAllSessionsExceptCurrent`** - Alle Sessions außer aktueller terminieren
5. **`verifyDeviceOnTokenRefresh`** - Device bei Token Refresh verifizieren
6. **`trustDeviceAfterMfa`** - Gerät nach MFA als vertrauenswürdig markieren
7. **`checkSuspiciousLocation`** - Verdächtige Standortänderungen erkennen
8. **`deviceTrackingMiddleware`** - Express Middleware für Device Tracking

### Verwendung im Auth-Flow:

```typescript
// In bestehendem Login-Handler:
import { registerDeviceAfterLogin } from './device-fingerprint.integration.example';

router.post('/auth/login', async (req, res) => {
  // ... bestehender Login-Code ...
  
  // Nach erfolgreichem Login:
  const deviceInfo = await registerDeviceAfterLogin(
    accountId,
    tenantId,
    req,
    req.body.trustDevice // true/false
  );
  
  if (deviceInfo && !deviceInfo.isTrusted) {
    // Zusätzliche Verifizierung erforderlich
    return res.json({
      success: true,
      requiresDeviceVerification: true,
      deviceId: deviceInfo.deviceId,
    });
  }
  
  // ... normaler Login-Flow ...
});
```

---

## 6. Tests (✅ Erledigt)

**Dateien:**
- `server/services/auth/device-fingerprint.service.test.ts` (bestehend)
- `server/services/auth/device-fingerprint.service.test.new.ts` (neu)

### Test-Abdeckung:

| Bereich | Tests |
|---------|-------|
| Konfiguration | Default-Werte, Custom Config, Reset |
| Component Extraction | Headers, Body Params, IP Extraction |
| Fingerprint Generation | SHA-256 Konsistenz, Determinismus |
| Fingerprint Comparison | Exact Match, Partial Similarity |
| Risk Detection | Automation, Emulator, Suspicious |
| Trust Score | Perfect Match, Failures, Clamping |
| Verification | MFA, Low Trust, High Risk |
| Device Trust | New Device, Known Device, Similarity |
| Device Name | Browser/OS Erkennung |
| Device Type | Desktop/Mobile/Tablet |
| Edge Cases | Long UA, Special Chars, PII |
| **isTrustedDevice** | Matching, Expired, Never Verified |

### Ausführen der Tests:
```bash
# Alle Tests
npm run test:server

# Nur Device Fingerprint Tests
npx vitest run server/services/auth/device-fingerprint.service.test.ts
```

---

## 7. Sicherheits-Features

### DSGVO-Konformität:
- ✅ Fingerprints werden nur als SHA-256 Hashes gespeichert
- ✅ Keine Klartext-Fingerprints in Logs
- ✅ IPs werden gehasht (nur erste 16 Hex-Zeichen)
- ✅ Keine PII in Fingerprint-Komponenten
- ✅ Trust-Expires für zeitlich begrenztes Vertrauen

### Security Best Practices:
- ✅ Rate Limiting auf Auth-Endpunkten
- ✅ Risk Factor Detection (Automation, Emulator)
- ✅ Trust Scoring mit mehreren Faktoren
- ✅ Impossible Travel Detection
- ✅ Session-Terminierung mit Audit-Logging

---

## 8. Nächste Schritte

1. **Migration ausführen:**
   ```bash
   npx prisma migrate dev --name add_device_fingerprint_fields
   ```

2. **Integration in Auth-Flows:**
   - `verifyDeviceOnLogin` als Middleware hinzufügen
   - `registerDeviceAfterLogin` im Login-Handler aufrufen

3. **Frontend-Integration:**
   - Device-Komponenten sammeln (Screen, Timezone, etc.)
   - `/api/auth/device/register` aufrufen
   - Device-Verifizierung UI implementieren

4. **Monitoring:**
   - Security Events in SIEM integrieren
   - Alerts für `SUSPICIOUS_LOCATION`, `IMPOSSIBLE_TRAVEL`

---

## Dateien-Übersicht

```
anamnese-app/
├── prisma/
│   └── schema.prisma                          # Erweitert: PatientDevice
├── server/
│   ├── index.ts                               # Routes registriert
│   ├── routes/
│   │   └── auth/
│   │       └── device.ts                      # NEW: API Routes
│   ├── services/
│   │   ├── security-audit.service.ts          # Erweitert: SecurityEvent enum
│   │   └── auth/
│   │       ├── device-fingerprint.service.ts  # Erweitert: isTrustedDevice()
│   │       ├── device-fingerprint.service.test.ts
│   │       ├── device-fingerprint.service.test.new.ts  # NEW: Tests
│   │       └── device-fingerprint.integration.example.ts # NEW: Beispiele
│   └── types/
│       └── device-fingerprint.ts              # Bestehend: Typen
```

---

## Compliance

| Standard | Anforderung | Status |
|----------|-------------|--------|
| DSGVO Art. 5 Abs. 2 | Accountability | ✅ Security Audit Logging |
| DSGVO Art. 32 | Sicherheit | ✅ Device Fingerprinting |
| BSI TR-02102 | Passwort/Session | ✅ Trust Scoring |
| HIPAA | Audit Trail | ✅ Security Events |
| gematik TI | Zugriffskontrolle | ✅ Device Verification |
