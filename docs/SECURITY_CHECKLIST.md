# Security Checklist - Auth Extensions

## Pre-Deployment Checks

### Authentication
- [ ] JWT uses HS256 algorithm (pinned)
- [ ] JWT secret is 256+ bits
- [ ] Tokens expire after 15 minutes (access) / 7 days (refresh)
- [ ] Refresh tokens rotate on use
- [ ] Token theft detection enabled
- [ ] Token blacklist in Redis
- [ ] 2FA enabled for admin accounts
- [ ] Backup codes generated and stored hashed

### Session Management
- [ ] Max 5 concurrent sessions per user
- [ ] Session timeout after 15 minutes inactivity
- [ ] Device fingerprinting enabled
- [ ] New device detection active
- [ ] "Terminate all sessions" functionality works
- [ ] Session activity logging enabled

### Rate Limiting
- [ ] Login: 5 attempts per 15 minutes
- [ ] 2FA verification: 5 attempts per 15 minutes
- [ ] Password reset: 3 attempts per hour
- [ ] Session listing: 60 requests per minute

### Data Protection
- [ ] Passwords hashed with bcrypt (12 rounds)
- [ ] PII encrypted with AES-256-GCM
- [ ] Backup codes hashed with SHA-256
- [ ] Device fingerprints hashed
- [ ] IP addresses hashed in logs
- [ ] No secrets in logs

### Transport Security
- [ ] HTTPS only in production
- [ ] HSTS header enabled
- [ ] Secure cookie flag
- [ ] HttpOnly cookie flag
- [ ] SameSite=Strict cookie flag
- [ ] CSRF protection enabled

### Headers
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configured
- [ ] Referrer-Policy: strict-origin-when-cross-origin

### API Security
- [ ] Input validation with Zod
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] NoSQL injection prevention
- [ ] XSS prevention (output encoding)
- [ ] Mass assignment protection

### Testing
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security tests passing
- [ ] OWASP ZAP scan (no high/critical issues)

## Post-Deployment Monitoring

- [ ] Failed login attempts logged
- [ ] 2FA challenges logged
- [ ] Token thefts detected and alerted
- [ ] New device logins alerted
- [ ] Session terminations logged
- [ ] Rate limit violations logged

## Compliance

- [ ] DSGVO Art. 32 (technical safeguards)
- [ ] HIPAA Security Rule (if applicable)
- [ ] BSI TR-02102 (cryptography)
- [ ] OWASP ASVS Level 2
