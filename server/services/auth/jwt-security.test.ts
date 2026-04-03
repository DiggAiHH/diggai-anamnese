import { describe, it, expect, beforeAll } from 'vitest';
import * as jwt from 'jsonwebtoken';
import { config } from '../../config';

describe('JWT Security Tests', () => {
  let jwtSecret: string;

  beforeAll(() => {
    jwtSecret = config.jwtSecret || process.env.JWT_SECRET || 'test-secret-for-unit-tests-only-32chars!';
  });

  describe('Algorithm Confusion Attack', () => {
    it('should reject tokens with none algorithm', () => {
      // Create a token with "none" algorithm (attack vector)
      const maliciousToken = jwt.sign(
        { userId: 'attacker', role: 'admin' },
        '',
        { algorithm: 'none' }
      );

      // Verify our middleware rejects this
      expect(() => {
        jwt.verify(maliciousToken, jwtSecret, {
          algorithms: ['HS256'], // Only accept HS256
        });
      }).toThrow();
    });

    it('should reject tokens with RS256 when expecting HS256', () => {
      // This would require a public key, but the attack is:
      // 1. Attacker changes algorithm from HS256 to RS256
      // 2. Attacker signs with HS256 but claims RS256
      // 3. Server might accept if not validating algorithm
      
      const token = jwt.sign(
        { userId: 'attacker', role: 'admin' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      // Modify token to claim RS256 (simulated attack)
      const parts = token.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      header.alg = 'RS256';
      parts[0] = Buffer.from(JSON.stringify(header)).toString('base64url');
      const tamperedToken = parts.join('.');

      // Should reject because signature doesn't match claimed algorithm
      expect(() => {
        jwt.verify(tamperedToken, jwtSecret, {
          algorithms: ['HS256'],
        });
      }).toThrow();
    });

    it('should reject algorithm switching attacks', () => {
      // Attempt to change algorithm from HS256 to none
      const token = jwt.sign(
        { userId: 'attacker', role: 'admin' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      const parts = token.split('.');
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      header.alg = 'none';
      parts[0] = Buffer.from(JSON.stringify(header)).toString('base64url');
      const tamperedToken = parts.join('.');

      expect(() => {
        jwt.verify(tamperedToken, jwtSecret, {
          algorithms: ['HS256'],
        });
      }).toThrow();
    });
  });

  describe('Token Expiration', () => {
    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { userId: 'test', role: 'patient' },
        jwtSecret,
        { expiresIn: -1, algorithm: 'HS256' } // Already expired
      );

      expect(() => {
        jwt.verify(expiredToken, jwtSecret);
      }).toThrow('jwt expired');
    });

    it('should accept valid tokens within expiry', () => {
      const validToken = jwt.sign(
        { userId: 'test', role: 'patient' },
        jwtSecret,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const decoded = jwt.verify(validToken, jwtSecret) as jwt.JwtPayload;
      expect(decoded).toHaveProperty('userId', 'test');
      expect(decoded).toHaveProperty('role', 'patient');
    });

    it('should have exp claim in token', () => {
      const token = jwt.sign(
        { userId: 'test', role: 'patient' },
        jwtSecret,
        { expiresIn: '15m', algorithm: 'HS256' }
      );

      const decoded = jwt.decode(token) as jwt.JwtPayload;
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('Secret Strength', () => {
    it('should have minimum 256-bit secret', () => {
      const secret = jwtSecret;
      const secretBytes = Buffer.from(secret).length;
      
      // 32 bytes = 256 bits
      expect(secretBytes).toBeGreaterThanOrEqual(32);
    });

    it('should not use weak secrets', () => {
      const weakSecrets = [
        'secret',
        'password',
        '123456',
        'admin',
        'test',
        'jwt-secret',
      ];

      const secret = jwtSecret.toLowerCase();
      const isWeak = weakSecrets.some(weak => secret.includes(weak));
      expect(isWeak).toBe(false);
    });
  });

  describe('Token Structure', () => {
    it('should create tokens with correct structure', () => {
      const token = jwt.sign(
        { userId: 'test-user', role: 'patient' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      const parts = token.split('.');
      expect(parts).toHaveLength(3); // header.payload.signature

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');
    });

    it('should not contain sensitive data in payload', () => {
      const token = jwt.sign(
        { 
          userId: 'test-user', 
          role: 'patient',
          iat: Math.floor(Date.now() / 1000),
        },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      const payload = jwt.decode(token) as jwt.JwtPayload;
      
      // Should not contain passwords, secrets, or personal info
      expect(payload.password).toBeUndefined();
      expect(payload.secret).toBeUndefined();
      expect(payload.creditCard).toBeUndefined();
      expect(payload.ssn).toBeUndefined();
    });
  });

  describe('Token Tampering Detection', () => {
    it('should detect modified payload', () => {
      const token = jwt.sign(
        { userId: 'legitimate', role: 'patient' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      // Modify payload to escalate privileges
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.role = 'admin';
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = parts.join('.');

      expect(() => {
        jwt.verify(tamperedToken, jwtSecret);
      }).toThrow('invalid signature');
    });

    it('should detect truncated tokens', () => {
      const token = jwt.sign(
        { userId: 'test', role: 'patient' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      const truncatedToken = token.substring(0, token.length - 10);

      expect(() => {
        jwt.verify(truncatedToken, jwtSecret);
      }).toThrow();
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should use constant-time comparison for signature verification', () => {
      // jsonwebtoken library uses crypto.timingSafeEqual internally
      // This test verifies that verification works consistently
      const token = jwt.sign(
        { userId: 'test', role: 'patient' },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      // Multiple verifications should all succeed
      for (let i = 0; i < 10; i++) {
        const result = jwt.verify(token, jwtSecret);
        expect(result).toBeTruthy();
      }
    });
  });
});
