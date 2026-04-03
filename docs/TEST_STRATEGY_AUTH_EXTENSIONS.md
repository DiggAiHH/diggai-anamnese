# Auth-System Erweiterungen - Test-Strategie-Plan

> **Ziel:** 90%+ Coverage für TOTP, Token Rotation, Device Fingerprinting, Session Management, Security Event Logging
> **Basis:** Vitest (Unit/Integration) + Playwright (E2E)

---

## Übersicht: Test-Pyramide

```
        /\
       /  \    E2E Tests (Playwright)
      /____\        ~15 Tests, ~45min Runtime
     /      \
    /________\   Integration Tests (Vitest)
   /          \      ~40 Tests, ~5min Runtime
  /____________\
 /              \  Unit Tests (Vitest)
/________________\     ~120 Tests, ~2min Runtime
```

---

## Phase 1: TOTP Service (Höchste Priorität)

**Geschätzte Gesamtzeit:** 8-10 Stunden

### 1.1 Unit Tests (`server/services/totp.service.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateSecret, 
  generateQRCode, 
  verifyTOTP, 
  generateBackupCodes,
  verifyBackupCode,
  isReplayAttack,
  markCodeAsUsed 
} from './totp.service';
import { getRedisClient } from '../redis';

// Mock Redis für Replay-Protection
vi.mock('../redis', () => ({
  getRedisClient: vi.fn(),
}));

describe('TOTP Service', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      get: vi.fn(),
      setex: vi.fn(),
      sadd: vi.fn(),
      sismember: vi.fn(),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSecret', () => {
    it('should generate 32-byte base32 secret', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
      expect(secret.length).toBeGreaterThanOrEqual(32);
    });

    it('should generate unique secrets on each call', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('verifyTOTP', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    
    it('should verify valid TOTP code within time window', () => {
      // Mock Zeit auf festen Wert setzen
      const fixedTime = 1700000000000;
      vi.setSystemTime(fixedTime);
      
      const validCode = generateTOTP(secret, fixedTime); // Hilfsfunktion für Test
      const result = verifyTOTP(secret, validCode);
      
      expect(result.valid).toBe(true);
      expect(result.remainingAttempts).toBe(3);
    });

    it('should reject invalid TOTP code', () => {
      const result = verifyTOTP(secret, '000000');
      expect(result.valid).toBe(false);
      expect(result.remainingAttempts).toBe(2);
    });

    it('should accept code from previous time window (grace period)', () => {
      const fixedTime = 1700000000000;
      vi.setSystemTime(fixedTime);
      
      const previousWindowCode = generateTOTP(secret, fixedTime - 30000);
      const result = verifyTOTP(secret, previousWindowCode, { window: 1 });
      
      expect(result.valid).toBe(true);
    });

    it('should reject code from far past', () => {
      const fixedTime = 1700000000000;
      vi.setSystemTime(fixedTime);
      
      const oldCode = generateTOTP(secret, fixedTime - 120000);
      const result = verifyTOTP(secret, oldCode, { window: 1 });
      
      expect(result.valid).toBe(false);
    });

    it('should lock after 3 failed attempts', () => {
      verifyTOTP(secret, '111111');
      verifyTOTP(secret, '222222');
      const result = verifyTOTP(secret, '333333');
      
      expect(result.valid).toBe(false);
      expect(result.locked).toBe(true);
      expect(result.lockExpiresAt).toBeDefined();
    });
  });

  describe('Replay Protection', () => {
    it('should detect replay attack for used code', async () => {
      const code = '123456';
      const userId = 'user-123';
      
      mockRedis.sismember.mockResolvedValue(1);
      
      const result = await isReplayAttack(userId, code);
      expect(result).toBe(true);
    });

    it('should allow fresh code', async () => {
      const code = '123456';
      const userId = 'user-123';
      
      mockRedis.sismember.mockResolvedValue(0);
      
      const result = await isReplayAttack(userId, code);
      expect(result).toBe(false);
    });

    it('should mark code as used with 2-minute TTL', async () => {
      const code = '123456';
      const userId = 'user-123';
      
      await markCodeAsUsed(userId, code);
      
      expect(mockRedis.sadd).toHaveBeenCalledWith(
        `totp:used:${userId}`,
        code
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        `totp:used:${userId}`,
        120
      );
    });

    it('should handle Redis unavailability gracefully', async () => {
      vi.mocked(getRedisClient).mockReturnValue(null);
      
      const result = await isReplayAttack('user-123', '123456');
      // Replay-Protection deaktiviert, aber Trotzdem erlauben
      expect(result).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate 10 backup codes', () => {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it('should generate codes in XXXX-XXXX-XXXX format', () => {
      const codes = generateBackupCodes();
      codes.forEach(code => {
        expect(code).toMatch(/^\d{4}-\d{4}-\d{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes();
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should return hashed codes and plaintext for display', () => {
      const { plaintext, hashed } = generateBackupCodes();
      expect(plaintext).toHaveLength(10);
      expect(hashed).toHaveLength(10);
      expect(plaintext[0]).not.toBe(hashed[0]);
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code', async () => {
      const code = '1234-5678-9012';
      const hashedCodes = [await hashCode(code), 'other-hash'];
      
      const result = await verifyBackupCode(code, hashedCodes);
      expect(result.valid).toBe(true);
      expect(result.codeIndex).toBe(0);
    });

    it('should reject invalid backup code', async () => {
      const hashedCodes = ['hash1', 'hash2'];
      
      const result = await verifyBackupCode('0000-0000-0000', hashedCodes);
      expect(result.valid).toBe(false);
    });

    it('should reject already used backup code', async () => {
      const code = '1234-5678-9012';
      const hashedCodes = [await hashCode(code)];
      const usedIndices = new Set([0]);
      
      const result = await verifyBackupCode(code, hashedCodes, usedIndices);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CODE_ALREADY_USED');
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 1.2 Integration Tests (`server/routes/auth/totp.integration.test.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createTestApp } from '../../test-utils';
import { prisma } from '../../db';

describe('TOTP Integration', () => {
  let app: Express;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
    
    // Test-User erstellen
    const user = await prisma.arztUser.create({
      data: {
        email: 'totp.test@example.com',
        passwordHash: await hashPassword('TestPass123!'),
        name: 'TOTP Test',
      }
    });
    userId = user.id;
    
    authToken = await loginUser(app, 'totp.test@example.com', 'TestPass123!');
  });

  afterAll(async () => {
    await prisma.arztUser.delete({ where: { id: userId } });
  });

  describe('POST /api/auth/totp/setup', () => {
    it('should setup TOTP for authenticated user', async () => {
      const response = await supertest(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.secret).toBeDefined();
      expect(response.body.qrCode).toMatch(/^data:image\/png;/);
      expect(response.body.backupCodes).toHaveLength(10);
    });

    it('should require authentication', async () => {
      await supertest(app)
        .post('/api/auth/totp/setup')
        .expect(401);
    });

    it('should not allow duplicate setup for active TOTP', async () => {
      await supertest(app)
        .post('/api/auth/totp/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });

  describe('POST /api/auth/totp/verify', () => {
    it('should verify TOTP and enable 2FA', async () => {
      const secret = await getUserTOTPSecret(userId);
      const code = generateTOTPCode(secret);

      const response = await supertest(app)
        .post('/api/auth/totp/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code })
        .expect(200);

      expect(response.body.enabled).toBe(true);
    });

    it('should reject invalid code during verification', async () => {
      await supertest(app)
        .post('/api/auth/totp/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: '000000' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login (with TOTP)', () => {
    it('should require TOTP after 2FA enabled', async () => {
      const response = await supertest(app)
        .post('/api/auth/login')
        .send({
          email: 'totp.test@example.com',
          password: 'TestPass123!'
        })
        .expect(202); // Accepted, but TOTP required

      expect(response.body.requiresTOTP).toBe(true);
      expect(response.body.tempToken).toBeDefined();
    });

    it('should complete login with valid TOTP', async () => {
      const tempToken = await getTempToken(userId);
      const secret = await getUserTOTPSecret(userId);
      const code = generateTOTPCode(secret);

      const response = await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken, code })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should accept backup code when TOTP unavailable', async () => {
      const tempToken = await getTempToken(userId);
      const backupCode = await getUnusedBackupCode(userId);

      const response = await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken, code: backupCode, isBackupCode: true })
        .expect(200);

      expect(response.body.token).toBeDefined();
    });

    it('should invalidate used backup code', async () => {
      const backupCode = await getUnusedBackupCode(userId);
      const tempToken = await getTempToken(userId);

      // Erste Verwendung
      await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken, code: backupCode, isBackupCode: true })
        .expect(200);

      // Zweite Verwendung sollte fehlschlagen
      const tempToken2 = await getTempToken(userId);
      await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken: tempToken2, code: backupCode, isBackupCode: true })
        .expect(400);
    });
  });

  describe('Replay Attack Protection', () => {
    it('should reject reused TOTP code within 2 minutes', async () => {
      const secret = await getUserTOTPSecret(userId);
      const code = generateTOTPCode(secret);
      const tempToken = await getTempToken(userId);

      // Erste Verwendung
      await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken, code })
        .expect(200);

      // Replay-Versuch
      const tempToken2 = await getTempToken(userId);
      const response = await supertest(app)
        .post('/api/auth/totp/login')
        .send({ tempToken: tempToken2, code })
        .expect(400);

      expect(response.body.error).toBe('CODE_ALREADY_USED');
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 1.3 E2E Tests (`e2e/totp-auth.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { loginStaff } from './helpers/auth-helpers';
import { generateTOTP } from 'otpauth';

test.describe('TOTP Authentication Flow', () => {
  test('enables 2FA and logs in with TOTP', async ({ page }) => {
    // 1. Login als Arzt
    await loginStaff(page, { username: 'test.arzt', password: 'TestPass123!' });
    
    // 2. Navigate zu 2FA Einstellungen
    await page.goto('/verwaltung/settings/security');
    
    // 3. TOTP Setup starten
    await page.getByRole('button', { name: 'Zwei-Faktor-Authentifizierung aktivieren' }).click();
    
    // 4. QR-Code scannen (Secret extrahieren)
    const qrCode = await page.getByAltText('TOTP QR Code');
    const secret = await qrCode.getAttribute('data-secret');
    
    // 5. TOTP Code generieren
    const totp = new generateTOTP({ secret });
    const code = totp.generate();
    
    // 6. Code eingeben
    await page.getByLabel('Verifizierungscode').fill(code);
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    
    // 7. Backup Codes speichern
    const backupCodes = await page.locator('[data-testid="backup-code"]').allTextContents();
    expect(backupCodes).toHaveLength(10);
    
    await page.getByRole('button', { name: 'Verstanden' }).click();
    
    // 8. Logout
    await page.getByTestId('staff-logout').click();
    
    // 9. Re-Login mit TOTP
    await page.goto('/verwaltung/login');
    await page.getByTestId('staff-username').fill('test.arzt');
    await page.getByTestId('staff-password').fill('TestPass123!');
    await page.getByTestId('staff-login-submit').click();
    
    // 10. TOTP Eingabe erwartet
    await expect(page.getByText('Verifizierungscode eingeben')).toBeVisible();
    
    const newCode = totp.generate();
    await page.getByLabel('Verifizierungscode').fill(newCode);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    
    // 11. Dashboard erreicht
    await expect(page).toHaveURL(/\/verwaltung\/arzt$/);
  });

  test('uses backup code when authenticator unavailable', async ({ page }) => {
    // Setup: 2FA aktiviert, Backup-Codes gespeichert
    const backupCode = '1234-5678-9012'; // Aus vorherigem Test
    
    await page.goto('/verwaltung/login');
    await page.getByTestId('staff-username').fill('test.arzt');
    await page.getByTestId('staff-password').fill('TestPass123!');
    await page.getByTestId('staff-login-submit').click();
    
    // "Authenticator nicht verfügbar" klicken
    await page.getByText('Authenticator-App nicht verfügbar?').click();
    
    // Backup Code eingeben
    await page.getByLabel('Backup-Code').fill(backupCode);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    
    await expect(page).toHaveURL(/\/verwaltung\/arzt$/);
  });

  test('blocks reused TOTP codes', async ({ page }) => {
    await loginStaff(page, { username: 'test.arzt', password: 'TestPass123!' });
    // Logout für Re-Login Test
    await page.getByTestId('staff-logout').click();
    
    // Erster Login-Versuch
    await page.goto('/verwaltung/login');
    await page.getByTestId('staff-username').fill('test.arzt');
    await page.getByTestId('staff-password').fill('TestPass123!');
    await page.getByTestId('staff-login-submit').click();
    
    const code = '123456'; // Gleicher Code
    await page.getByLabel('Verifizierungscode').fill(code);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    // Erfolgreich...
    
    // Logout und sofortiger Re-Login mit gleichem Code
    await page.getByTestId('staff-logout').click();
    await page.goto('/verwaltung/login');
    await page.getByTestId('staff-username').fill('test.arzt');
    await page.getByTestId('staff-password').fill('TestPass123!');
    await page.getByTestId('staff-login-submit').click();
    
    await page.getByLabel('Verifizierungscode').fill(code);
    await page.getByRole('button', { name: 'Anmelden' }).click();
    
    // Sollte fehlschlagen (Replay-Protection)
    await expect(page.getByText('Code wurde bereits verwendet')).toBeVisible();
  });
});
```

**Zeit:** 2 Stunden

### 1.4 Security/Edge Cases

| Case | Test | Erwartung |
|------|------|-----------|
| Zeit-Drift | Code aus ±1 Zeitfenster | Akzeptiert mit Warning |
| Zeit-Manipulation | Client-Uhr falsch | Server-Zeit gilt |
| Rate Limiting | 5 falsche Codes | 15min Lockout |
| Brute Force | 100 Requests/s | 429 Too Many Requests |
| Secret Exposure | Secret in Logs | Niemals geloggt |
| Backup Code Guessing | 1000 Versuche | Exponentielles Backoff |

**Zeit:** 1 Stunde

---

## Phase 2: Token Rotation (Hoch Priorität)

**Geschätzte Gesamtzeit:** 8-10 Stunden

### 2.1 Unit Tests (`server/services/token-rotation.service.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTokenFamily,
  rotateTokens,
  detectTheft,
  revokeFamily,
  getTokenFamily
} from './token-rotation.service';
import { getRedisClient } from '../redis';
import jwt from 'jsonwebtoken';

vi.mock('../redis', () => ({
  getRedisClient: vi.fn(),
}));

describe('Token Rotation Service', () => {
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      hset: vi.fn(),
      hgetall: vi.fn(),
      hget: vi.fn(),
      del: vi.fn(),
      expire: vi.fn(),
    };
    vi.mocked(getRedisClient).mockReturnValue(mockRedis);
    vi.spyOn(jwt, 'sign').mockReturnValue('mock-jwt-token');
    vi.spyOn(jwt, 'verify').mockReturnValue({ 
      userId: 'user-123', 
      family: 'family-abc',
      jti: 'token-xyz'
    });
  });

  describe('createTokenFamily', () => {
    it('should create new token family with access and refresh token', async () => {
      const result = await createTokenFamily('user-123', {
        deviceId: 'device-1',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0'
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.familyId).toMatch(/^family:[a-z0-9]+$/);
      
      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringMatching(/^family:[a-z0-9]+$/),
        expect.objectContaining({
          userId: 'user-123',
          currentToken: expect.any(String),
          deviceId: 'device-1',
        })
      );
    });

    it('should set expiration matching refresh token lifetime', async () => {
      await createTokenFamily('user-123', {});
      
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        7 * 24 * 60 * 60 // 7 Tage
      );
    });
  });

  describe('rotateTokens', () => {
    const validRefreshToken = 'valid.refresh.token';
    
    it('should rotate tokens with valid refresh token', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: validRefreshToken,
        deviceId: 'device-1',
      });

      const result = await rotateTokens(validRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(validRefreshToken);
    });

    it('should update token family with new current token', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: validRefreshToken,
      });

      await rotateTokens(validRefreshToken);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.any(String),
        'currentToken',
        'mock-jwt-token'
      );
    });

    it('should reject rotation for already used refresh token', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: 'different-token',
      });

      await expect(rotateTokens(validRefreshToken)).rejects.toThrow('TOKEN_REUSE_DETECTED');
    });

    it('should reject expired refresh token', async () => {
      vi.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      await expect(rotateTokens(validRefreshToken)).rejects.toThrow('TOKEN_EXPIRED');
    });
  });

  describe('detectTheft', () => {
    it('should detect token reuse as theft indicator', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: 'newer-token',
        compromised: 'false',
      });

      const result = await detectTheft('old-token', 'family-abc');

      expect(result.isTheft).toBe(true);
      expect(result.reason).toBe('TOKEN_REUSE');
    });

    it('should mark family as compromised after theft detection', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: 'newer-token',
      });

      await detectTheft('old-token', 'family-abc');

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'family-abc',
        'compromised',
        'true'
      );
    });

    it('should revoke all tokens in compromised family', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: 'newer-token',
      });

      await detectTheft('old-token', 'family-abc');

      expect(mockRedis.del).toHaveBeenCalledWith('family-abc');
    });

    it('should emit security event on theft detection', async () => {
      const emitSpy = vi.spyOn(SecurityEventEmitter, 'emit');

      mockRedis.hgetall.mockResolvedValue({
        userId: 'user-123',
        currentToken: 'newer-token',
        deviceId: 'device-1',
        ip: '192.168.1.1',
      });

      await detectTheft('old-token', 'family-abc');

      expect(emitSpy).toHaveBeenCalledWith('TOKEN_THEFT_DETECTED', expect.objectContaining({
        userId: 'user-123',
        familyId: 'family-abc',
      }));
    });
  });

  describe('concurrent session handling', () => {
    it('should maintain separate token families per device', async () => {
      await createTokenFamily('user-123', { deviceId: 'device-1' });
      await createTokenFamily('user-123', { deviceId: 'device-2' });

      expect(mockRedis.hset).toHaveBeenCalledTimes(2);
    });

    it('should limit max concurrent families per user', async () => {
      // 6 Geräte simulieren (Limit = 5)
      for (let i = 1; i <= 6; i++) {
        await createTokenFamily('user-123', { deviceId: `device-${i}` });
      }

      // Älteste Familie sollte entfernt worden sein
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('revokeFamily', () => {
    it('should revoke specific token family', async () => {
      await revokeFamily('family-abc', 'user-123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('family-abc');
    });

    it('should validate user ownership before revocation', async () => {
      mockRedis.hgetall.mockResolvedValue({
        userId: 'different-user',
      });

      await expect(
        revokeFamily('family-abc', 'user-123')
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 2.2 Integration Tests

```typescript
describe('Token Rotation Integration', () => {
  it('should rotate tokens on protected route access', async () => {
    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass' });
    
    const { accessToken, refreshToken } = loginRes.body;
    
    // Access protected route
    await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    
    // Refresh tokens
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.refreshToken).not.toBe(refreshToken);
  });

  it('should detect theft on old refresh token reuse', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass' });
    
    const oldRefreshToken = loginRes.body.refreshToken;
    
    // First refresh (valid)
    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(200);
    
    // Reuse old token (theft!)
    const refreshRes2 = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken })
      .expect(401);
    
    expect(refreshRes2.body.error).toBe('TOKEN_THEFT_DETECTED');
    
    // New token should also be invalid now
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: refreshRes1.body.refreshToken })
      .expect(401);
  });
});
```

**Zeit:** 2-3 Stunden

### 2.3 E2E Tests

```typescript
test('token rotation works transparently in UI', async ({ page, context }) => {
  await loginStaff(page, { username: 'test.arzt', password: 'pass' });
  
  // Warte auf Token-Refresh (nach Ablauf)
  await page.waitForTimeout(accessTokenExpiry + 1000);
  
  // API-Call sollte automatisch mit neuem Token funktionieren
  await page.click('[data-testid="load-data"]');
  await expect(page.getByText('Daten geladen')).toBeVisible();
  
  // Cookie sollte aktualisiert sein
  const cookies = await context.cookies();
  const tokenCookie = cookies.find(c => c.name === 'access_token');
  expect(tokenCookie).toBeDefined();
  expect(tokenCookie?.expires).toBeGreaterThan(Date.now() / 1000);
});

test('detects and handles token theft', async ({ page, browser }) => {
  // Login auf Gerät 1
  await loginStaff(page, { username: 'test.arzt', password: 'pass' });
  
  // Cookie extrahieren
  const cookies1 = await page.context().cookies();
  const refreshToken1 = cookies1.find(c => c.name === 'refresh_token')?.value;
  
  // Neuer Browser-Kontext (Gerät 2) mit gleichem Token
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await context2.addCookies(cookies1);
  
  // Gerät 2 macht Refresh
  await page2.goto('/verwaltung/arzt');
  
  // Gerät 1 sollte ausgeloggt sein
  await page.reload();
  await expect(page).toHaveURL(/\/verwaltung\/login$/);
  
  // Security Alert sollte angezeigt werden
  await expect(page.getByText('Sicherheitswarnung')).toBeVisible();
});
```

**Zeit:** 2-3 Stunden

---

## Phase 3: Device Fingerprinting (Mittlere Priorität)

**Geschätzte Gesamtzeit:** 6-8 Stunden

### 3.1 Unit Tests

```typescript
describe('Device Fingerprinting', () => {
  describe('generateFingerprint', () => {
    it('should generate consistent hash for same device', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
        'dnt': '1',
      };

      const fp1 = generateFingerprint(headers);
      const fp2 = generateFingerprint(headers);

      expect(fp1).toBe(fp2);
      expect(fp1).toMatch(/^[a-f0-9]{64}$/); // SHA-256
    });

    it('should generate different hash for different user agents', () => {
      const fp1 = generateFingerprint({
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0)',
      });
      const fp2 = generateFingerprint({
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      });

      expect(fp1).not.toBe(fp2);
    });

    it('should ignore volatile headers', () => {
      const baseHeaders = {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'de-DE',
      };

      const fp1 = generateFingerprint({
        ...baseHeaders,
        'x-forwarded-for': '192.168.1.1',
      });
      const fp2 = generateFingerprint({
        ...baseHeaders,
        'x-forwarded-for': '192.168.1.2', // Andere IP
      });

      // Fingerprint sollte gleich bleiben (IP wird ignoriert)
      expect(fp1).toBe(fp2);
    });
  });

  describe('detectDeviceChange', () => {
    it('should detect new device', async () => {
      const result = await detectDeviceChange('user-123', 'fingerprint-abc');
      expect(result.isNewDevice).toBe(true);
      expect(result.requiresVerification).toBe(true);
    });

    it('should recognize known device', async () => {
      mockRedis.sismember.mockResolvedValue(1);
      
      const result = await detectDeviceChange('user-123', 'fingerprint-abc');
      expect(result.isNewDevice).toBe(false);
      expect(result.requiresVerification).toBe(false);
    });

    it('should trigger email notification for new device', async () => {
      const sendMailSpy = vi.spyOn(mailService, 'send');
      
      await detectDeviceChange('user-123', 'fingerprint-xyz', {
        userAgent: 'Chrome 120',
        ip: '203.0.113.1',
      });

      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'new-device-login',
          data: expect.objectContaining({
            deviceInfo: 'Chrome 120',
            ipAddress: '203.0.113.1',
          }),
        })
      );
    });
  });

  describe('privacy compliance', () => {
    it('should not store personally identifiable information', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0',
        'accept-language': 'de-DE',
      };

      const fp = generateFingerprint(headers);
      
      // Original-Daten können nicht aus Fingerprint rekonstruiert werden
      expect(fp).not.toContain('Mozilla');
      expect(fp).not.toContain('de-DE');
    });

    it('should respect DNT header', () => {
      const headersWithDNT = {
        'user-agent': 'Mozilla/5.0',
        'dnt': '1',
      };

      // Wenn DNT gesetzt, sollte Fingerprinting abgeschwächt sein
      const fp = generateFingerprint(headersWithDNT);
      const entropy = calculateEntropy(fp);
      
      expect(entropy).toBeLessThan(200); // Weniger eindeutig
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 3.2 E2E Tests

```typescript
test('new device login triggers notification', async ({ page, browser }) => {
  // Login mit normalem Browser
  await loginStaff(page, { username: 'test.arzt', password: 'pass' });
  await page.getByTestId('staff-logout').click();
  
  // User Agent ändern (neues "Gerät" simulieren)
  const context2 = await browser.newContext({
    userAgent: 'Mozilla/5.0 (New Device)',
  });
  const page2 = await context2.newPage();
  
  // Login mit "neuem" Gerät
  await page2.goto('/verwaltung/login');
  await page2.getByTestId('staff-username').fill('test.arzt');
  await page2.getByTestId('staff-password').fill('pass');
  await page2.getByTestId('staff-login-submit').click();
  
  // Verifizierung sollte erforderlich sein
  await expect(page2.getByText('Neues Gerät erkannt')).toBeVisible();
  await expect(page2.getByText('Verifizierungs-E-Mail gesendet')).toBeVisible();
});
```

**Zeit:** 2-3 Stunden

---

## Phase 4: Session Management (Mittlere Priorität)

**Geschätzte Gesamtzeit:** 6-8 Stunden

### 4.1 Unit Tests

```typescript
describe('Session Management', () => {
  describe('concurrent sessions', () => {
    it('should allow multiple concurrent sessions per user', async () => {
      const session1 = await createSession('user-123', { deviceId: 'device-1' });
      const session2 = await createSession('user-123', { deviceId: 'device-2' });

      expect(session1.id).not.toBe(session2.id);
      expect(session1.token).not.toBe(session2.token);
    });

    it('should enforce max concurrent sessions limit', async () => {
      // Max 5 Sessions
      for (let i = 0; i < 6; i++) {
        await createSession('user-123', { deviceId: `device-${i}` });
      }

      const sessions = await getActiveSessions('user-123');
      expect(sessions).toHaveLength(5);
    });

    it('should revoke oldest session when limit exceeded', async () => {
      // Session 1 erstellen
      const session1 = await createSession('user-123', { deviceId: 'device-1' });
      
      // 5 weitere Sessions (Session 1 sollte revoked werden)
      for (let i = 2; i <= 6; i++) {
        await createSession('user-123', { deviceId: `device-${i}` });
      }

      const isValid = await validateSession(session1.token);
      expect(isValid).toBe(false);
    });
  });

  describe('session revocation', () => {
    it('should revoke single session', async () => {
      const session = await createSession('user-123', {});
      
      await revokeSession(session.id, 'user-123');
      
      const isValid = await validateSession(session.token);
      expect(isValid).toBe(false);
    });

    it('should revoke all user sessions', async () => {
      await createSession('user-123', { deviceId: 'device-1' });
      await createSession('user-123', { deviceId: 'device-2' });

      await revokeAllUserSessions('user-123');

      const sessions = await getActiveSessions('user-123');
      expect(sessions).toHaveLength(0);
    });

    it('should prevent privilege escalation via session manipulation', async () => {
      const session = await createSession('user-123', { role: 'arzt' });

      // Versuch, Rolle zu ändern
      await expect(
        updateSession(session.id, { role: 'admin' })
      ).rejects.toThrow('IMMUTABLE_FIELD');
    });
  });

  describe('session activity tracking', () => {
    it('should update lastActivity on token use', async () => {
      const session = await createSession('user-123', {});
      const before = session.lastActivity;

      // Token verwenden
      await validateSession(session.token);

      const after = (await getSession(session.id)).lastActivity;
      expect(after.getTime()).toBeGreaterThan(before.getTime());
    });

    it('should expire inactive sessions', async () => {
      const session = await createSession('user-123', {});
      
      // 30 Tage zurückdatieren
      await setSessionLastActivity(session.id, new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));

      const isValid = await validateSession(session.token);
      expect(isValid).toBe(false);
    });
  });

  describe('session metadata', () => {
    it('should store device information', async () => {
      const session = await createSession('user-123', {
        deviceId: 'device-1',
        deviceName: 'iPhone 15',
        deviceType: 'mobile',
      });

      expect(session.deviceName).toBe('iPhone 15');
      expect(session.deviceType).toBe('mobile');
    });

    it('should track login location', async () => {
      const session = await createSession('user-123', {
        ip: '203.0.113.1',
      });

      expect(session.ip).toBe('203.0.113.1');
      expect(session.location).toBeDefined(); // GeoIP Lookup
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 4.2 E2E Tests

```typescript
test('user can manage active sessions', async ({ page, browser }) => {
  // Login auf 2 Geräten
  await loginStaff(page, { username: 'test.arzt', password: 'pass' });
  
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await loginStaff(page2, { username: 'test.arzt', password: 'pass' });
  
  // Sessions anzeigen
  await page.goto('/verwaltung/settings/sessions');
  await expect(page.getByText('2 aktive Sessions')).toBeVisible();
  
  // Eine Session beenden
  await page.getByTestId('session-item').nth(1).getByRole('button', { name: 'Beenden' }).click();
  
  // Auf anderem Gerät sollte Logout erfolgt sein
  await page2.reload();
  await expect(page2).toHaveURL(/\/verwaltung\/login$/);
});

test('password change revokes all sessions', async ({ page, browser }) => {
  // Multi-Device Login
  await loginStaff(page, { username: 'test.arzt', password: 'pass' });
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await loginStaff(page2, { username: 'test.arzt', password: 'pass' });
  
  // Passwort ändern
  await page.goto('/verwaltung/settings/security');
  await page.getByLabel('Aktuelles Passwort').fill('pass');
  await page.getByLabel('Neues Passwort').fill('NewPass123!');
  await page.getByRole('button', { name: 'Passwort ändern' }).click();
  
  // Beide Geräte ausgeloggt
  await page.reload();
  await expect(page).toHaveURL(/\/verwaltung\/login$/);
  
  await page2.reload();
  await expect(page2).toHaveURL(/\/verwaltung\/login$/);
});
```

**Zeit:** 2-3 Stunden

---

## Phase 5: Security Event Logging (Hoch Priorität)

**Geschätzte Gesamtzeit:** 5-7 Stunden

### 5.1 Unit Tests

```typescript
describe('Security Event Logging', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      securityEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };
  });

  describe('event types', () => {
    it.each([
      ['LOGIN_SUCCESS', { userId: 'user-123', ip: '192.168.1.1' }],
      ['LOGIN_FAILURE', { identifier: 'test@example.com', reason: 'INVALID_PASSWORD' }],
      ['LOGOUT', { userId: 'user-123', sessionId: 'sess-456' }],
      ['TOKEN_REFRESH', { userId: 'user-123', familyId: 'fam-789' }],
      ['TOKEN_THEFT_DETECTED', { userId: 'user-123', familyId: 'fam-789' }],
      ['TOTP_SETUP', { userId: 'user-123' }],
      ['TOTP_VERIFY', { userId: 'user-123', success: true }],
      ['BACKUP_CODE_USED', { userId: 'user-123', codeIndex: 0 }],
      ['DEVICE_CHANGE', { userId: 'user-123', fingerprint: 'fp-abc' }],
      ['SESSION_REVOKED', { userId: 'user-123', sessionId: 'sess-456' }],
      ['PASSWORD_CHANGE', { userId: 'user-123' }],
      ['PERMISSION_DENIED', { userId: 'user-123', resource: '/admin', required: 'admin' }],
      ['RATE_LIMIT_EXCEEDED', { ip: '192.168.1.1', endpoint: '/api/auth/login' }],
    ])('should log %s event', async (eventType, data) => {
      await logSecurityEvent(eventType as SecurityEventType, data);

      expect(mockPrisma.securityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: eventType,
            timestamp: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('event data sanitization', () => {
    it('should never log passwords', async () => {
      await logSecurityEvent('LOGIN_FAILURE', {
        identifier: 'test@example.com',
        password: 'SecretPass123!',
      });

      const call = mockPrisma.securityEvent.create.mock.calls[0][0];
      expect(call.data.metadata).not.toContain('SecretPass123');
      expect(call.data.metadata).not.toContain('password');
    });

    it('should never log TOTP secrets', async () => {
      await logSecurityEvent('TOTP_SETUP', {
        userId: 'user-123',
        secret: 'JBSWY3DPEHPK3PXP',
      });

      const call = mockPrisma.securityEvent.create.mock.calls[0][0];
      expect(call.data.metadata).not.toContain('JBSWY3DPEHPK3PXP');
    });

    it('should hash sensitive identifiers', async () => {
      await logSecurityEvent('LOGIN_SUCCESS', {
        userId: 'user-123',
        email: 'test@example.com',
      });

      const call = mockPrisma.securityEvent.create.mock.calls[0][0];
      expect(call.data.metadata.email).toMatch(/^[a-f0-9]{64}$/); // SHA-256
    });
  });

  describe('event aggregation', () => {
    it('should detect brute force attempts', async () => {
      // 5 Failed logins in 1 minute
      for (let i = 0; i < 5; i++) {
        await logSecurityEvent('LOGIN_FAILURE', {
          identifier: 'test@example.com',
          ip: '192.168.1.1',
        });
      }

      const isBruteForce = await detectBruteForce('192.168.1.1');
      expect(isBruteForce).toBe(true);
    });

    it('should trigger alert on suspicious pattern', async () => {
      const alertSpy = vi.spyOn(AlertService, 'send');

      // Login von 3 verschiedenen Ländern in 1 Stunde
      await logSecurityEvent('LOGIN_SUCCESS', {
        userId: 'user-123',
        ip: '1.1.1.1',
        country: 'DE',
      });
      await logSecurityEvent('LOGIN_SUCCESS', {
        userId: 'user-123',
        ip: '2.2.2.2',
        country: 'US',
      });
      await logSecurityEvent('LOGIN_SUCCESS', {
        userId: 'user-123',
        ip: '3.3.3.3',
        country: 'RU',
      });

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IMPOSSIBLE_TRAVEL',
          userId: 'user-123',
        })
      );
    });
  });

  describe('event retention', () => {
    it('should archive events older than 90 days', async () => {
      await archiveOldEvents(90);

      expect(mockPrisma.securityEvent.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: {
              lt: expect.any(Date),
            },
          },
        })
      );
    });

    it('should export to SIEM before deletion', async () => {
      const exportSpy = vi.spyOn(SIEMService, 'export');

      await archiveOldEvents(90);

      expect(exportSpy).toHaveBeenCalledBefore(
        mockPrisma.securityEvent.deleteMany
      );
    });
  });

  describe('query interface', () => {
    it('should query events by user', async () => {
      await getSecurityEvents({ userId: 'user-123' });

      expect(mockPrisma.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
          orderBy: { timestamp: 'desc' },
        })
      );
    });

    it('should query events by time range', async () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');

      await getSecurityEvents({ startDate: start, endDate: end });

      expect(mockPrisma.securityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: {
              gte: start,
              lte: end,
            },
          },
        })
      );
    });
  });
});
```

**Zeit:** 3-4 Stunden

### 5.2 E2E Tests

```typescript
test('security events are logged for all auth actions', async ({ page, request }) => {
  // Failed login
  await page.goto('/verwaltung/login');
  await page.getByTestId('staff-username').fill('test.arzt');
  await page.getByTestId('staff-password').fill('wrong-password');
  await page.getByTestId('staff-login-submit').click();
  
  // Success login
  await page.getByTestId('staff-password').fill('correct-password');
  await page.getByTestId('staff-login-submit').click();
  
  // Logout
  await page.getByTestId('staff-logout').click();
  
  // Als Admin: Events prüfen
  const adminPage = await loginAsAdmin();
  await adminPage.goto('/verwaltung/admin/security-events');
  
  await expect(adminPage.getByText('LOGIN_FAILURE')).toBeVisible();
  await expect(adminPage.getByText('LOGIN_SUCCESS')).toBeVisible();
  await expect(adminPage.getByText('LOGOUT')).toBeVisible();
});
```

**Zeit:** 2-3 Stunden

---

## Mocking-Strategien

### Zeit-basierte Tests

```typescript
// Vitest Zeit-Mocking
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// TOTP Zeitfenster simulieren
it('should handle time drift', () => {
  const baseTime = new Date('2026-01-01T12:00:00Z');
  vi.setSystemTime(baseTime);
  
  const code = generateTOTP(secret);
  
  // 30 Sekunden später
  vi.advanceTimersByTime(30000);
  
  const result = verifyTOTP(secret, code, { window: 1 });
  expect(result.valid).toBe(true);
});
```

### Redis Mocking

```typescript
// Redis Mock mit ioredis-mock oder manuell
const mockRedis = new Map();

vi.mock('../redis', () => ({
  getRedisClient: () => ({
    get: (key: string) => Promise.resolve(mockRedis.get(key)),
    setex: (key: string, ttl: number, value: string) => {
      mockRedis.set(key, value);
      setTimeout(() => mockRedis.delete(key), ttl * 1000);
      return Promise.resolve('OK');
    },
    sadd: (key: string, ...members: string[]) => {
      if (!mockRedis.has(key)) mockRedis.set(key, new Set());
      members.forEach(m => mockRedis.get(key).add(m));
      return Promise.resolve(members.length);
    },
    sismember: (key: string, member: string) => {
      const set = mockRedis.get(key);
      return Promise.resolve(set?.has(member) ? 1 : 0);
    },
  }),
}));
```

### Crypto Mocking

```typescript
// Für deterministische Tests
vi.mock('crypto', () => ({
  randomBytes: (size: number) => Buffer.alloc(size, 0xAB),
  randomUUID: () => 'mocked-uuid-1234',
  createHash: (algorithm: string) => ({
    update: () => ({
      digest: () => 'mocked-hash',
    }),
  }),
}));
```

---

## Priorisierte Test-Implementierungs-Reihenfolge

| Phase | Feature | Priorität | Zeit | Abhängigkeiten |
|-------|---------|-----------|------|----------------|
| **1** | TOTP Service (Unit) | 🔴 Kritisch | 3-4h | - |
| **1** | TOTP Service (Integration) | 🔴 Kritisch | 3-4h | Unit Tests |
| **1** | Security Event Logging (Unit) | 🔴 Kritisch | 3-4h | - |
| **2** | Token Rotation (Unit) | 🟠 Hoch | 3-4h | Security Logging |
| **2** | Token Rotation (Integration) | 🟠 Hoch | 2-3h | Unit Tests |
| **2** | TOTP Service (E2E) | 🟠 Hoch | 2h | Integration Tests |
| **3** | Session Management (Unit) | 🟡 Mittel | 3-4h | Token Rotation |
| **3** | Device Fingerprinting (Unit) | 🟡 Mittel | 3-4h | Session Management |
| **4** | Token Rotation (E2E) | 🟡 Mittel | 2-3h | Integration Tests |
| **4** | Session Management (E2E) | 🟢 Normal | 2-3h | Unit Tests |
| **5** | Device Fingerprinting (E2E) | 🟢 Normal | 2-3h | Unit Tests |
| **5** | Security Event Logging (E2E) | 🟢 Normal | 2-3h | Unit Tests |

### Parallelisierungs-Strategie

```
Woche 1: ═══════════════════════════════════════════════════════
          [TOTP Unit]─────┬───[TOTP Integration]────┬──[TOTP E2E]
          [Security Log]──┘

Woche 2: ═══════════════════════════════════════════════════════
          [Token Rot. Unit]──┬──[Token Rot. Int.]──┬──[Token Rot. E2E]
          [Session Mgmt Unit]─┘

Woche 3: ═══════════════════════════════════════════════════════
          [Device FP Unit]──┬──[Session Mgmt E2E]
          [Remaining E2E]───┘
```

---

## Test-Coverage-Ziele pro Feature

| Feature | Unit | Integration | E2E | Gesamt |
|---------|------|-------------|-----|--------|
| TOTP Service | 95% | 90% | 85% | **93%** |
| Token Rotation | 95% | 90% | 80% | **92%** |
| Device Fingerprinting | 90% | 85% | 75% | **87%** |
| Session Management | 92% | 88% | 80% | **89%** |
| Security Event Logging | 94% | 85% | 70% | **88%** |
| **GESAMT** | **93%** | **88%** | **78%** | **90%** |

---

## CI/CD Integration

```yaml
# .github/workflows/auth-tests.yml
name: Auth System Tests

on:
  push:
    paths:
      - 'server/services/totp/**'
      - 'server/services/token-rotation/**'
      - 'server/services/device-fingerprint/**'
      - 'server/services/session/**'
      - 'server/services/security-audit/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Unit Tests
        run: npm run test:unit -- --coverage
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          fail_ci_if_error: true
          minimum_coverage: 90

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - name: Run Integration Tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E Tests
        run: npx playwright test e2e/totp-auth.spec.ts e2e/token-rotation.spec.ts
```

---

## Zusammenfassung

| Metrik | Wert |
|--------|------|
| **Gesamte Test-Implementierungszeit** | ~34-43 Stunden |
| **Unit Tests** | ~120 Tests |
| **Integration Tests** | ~40 Tests |
| **E2E Tests** | ~15 Tests |
| **Ziel-Coverage** | 90%+ |
| **Parallele Entwicklung** | 3 Phasen |

**Empfohlene Reihenfolge:**
1. Security Event Logging (Foundation)
2. TOTP Service (Highest Security Impact)
3. Token Rotation (Session Security)
4. Session Management (UX)
5. Device Fingerprinting (Enhanced Security)
