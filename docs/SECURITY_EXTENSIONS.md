# Auth Security Extensions v3.1.0

## Übersicht

Dieses Dokument beschreibt die Auth-Erweiterungen für DiggAI Anamnese Platform v3.1.0:
- Refresh Token Rotation
- Session Management
- Device Fingerprinting
- Security Event Monitoring

## Architektur

### Token Flow

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client    │────▶│    Login     │────▶│  Access Token│
│             │     │              │     │  (15 min)    │
│             │◀────│              │◀────│              │
│             │     │              │     ├──────────────┤
│             │     │              │     │ Refresh Token│
│             │     │              │     │  (7 days)    │
└─────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                ▼
                                        ┌──────────────┐
                                        │   Rotate     │
                                        │  on refresh  │
                                        └──────────────┘
```

### Security Features

| Feature | Beschreibung | Standard |
|---------|--------------|----------|
| Token Theft Detection | Bei Reuse wird gesamte Token-Familie revoked | Aktiviert |
| Device Fingerprinting | SHA-256 Hash für Geräte-Erkennung | Aktiviert |
| Session Timeout | 15 Minuten Inaktivität | Konfigurierbar |
| Concurrent Sessions | Max 5 Sessions pro User | Konfigurierbar |

## API Endpunkte

### Sessions

#### GET /api/auth/sessions
Liste aller aktiven Sessions für den aktuellen User.

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "deviceName": "Chrome on Windows",
      "deviceType": "web",
      "browser": "Chrome",
      "os": "Windows",
      "location": "Berlin, DE",
      "ipHash": "a1b2***",
      "lastActiveAt": "2026-04-01T12:00:00Z",
      "isCurrentSession": true,
      "isTrusted": true
    }
  ]
}
```

#### DELETE /api/auth/sessions/:id
Beendet eine spezifische Session.

**Response:**
```json
{
  "success": true,
  "message": "Session beendet"
}
```

#### DELETE /api/auth/sessions/all
Beendet alle anderen Sessions (außer aktueller).

**Response:**
```json
{
  "success": true,
  "terminatedCount": 3,
  "message": "3 Sessions beendet"
}
```

## Datenbank Schema

### RefreshToken
```prisma
model RefreshToken {
  id            String   @id @default(uuid())
  tokenFamily   String   @default(uuid())
  tokenHash     String   @unique
  userId        String
  userType      String   // 'ARZT' | 'PATIENT'
  deviceId      String?
  issuedAt      DateTime @default(now())
  expiresAt     DateTime
  rotatedAt     DateTime?
  isRevoked     Boolean  @default(false)
  revokedAt     DateTime?
  revokedReason String?
  ipHash        String?
  userAgent     String?
  reuseDetected Boolean  @default(false)
}
```

## Frontend Hooks

### useSessions
```typescript
const { data: sessions, isLoading } = useSessions();
```

### useTerminateSession
```typescript
const mutation = useTerminateSession();
mutation.mutate(sessionId);
```

## Security Events

| Event | Beschreibung |
|-------|--------------|
| TOKEN_REFRESHED | Token wurde rotiert |
| TOKEN_FAMILY_BROKEN | Token Theft erkannt |
| SESSION_TERMINATED | Session beendet |
| ALL_SESSIONS_TERMINATED | Alle Sessions beendet |
| NEW_DEVICE_DETECTED | Neues Gerät erkannt |

## Konfiguration

### Umgebungsvariablen
```env
# Token Lifetimes (Sekunden)
ACCESS_TOKEN_EXPIRY=900        # 15 Minuten
REFRESH_TOKEN_EXPIRY=604800    # 7 Tage

# Security
MAX_CONCURRENT_SESSIONS=5
REUSE_DETECTION_WINDOW=60000   # 1 Minute
```

## Migration

```bash
# Datenbank-Migration
npx prisma migrate dev --name add_refresh_tokens

# Alte Sessions invalidieren (optional)
npm run auth:cleanup-tokens
```

## Troubleshooting

### Problem: "TOKEN_REUSED" Error
**Ursache:** Token wurde bereits rotiert (möglicherweise gestohlen)
**Lösung:** User muss sich neu einloggen

### Problem: Zu viele Sessions
**Ursache:** Limit von 5 Sessions erreicht
**Lösung:** Alte Sessions über UI beenden

## Compliance

| Standard | Status |
|----------|--------|
| DSGVO Art. 32 | ✅ AES-256, Audit-Logging |
| HIPAA | ✅ Session-Management, Encryption |
| BSI TR-02102 | ✅ 12-Zeichen Passwort, bcrypt |
