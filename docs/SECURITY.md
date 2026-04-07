# Security & Compliance — Anamnese App

**Last Updated**: 2026-04-07  
**Version**: 3.0.0  
**Minimum Standard**: BSI TR-02102 (Medical), DSGVO, HIPAA Audit-Ready

---

## Table of Contents

1. [DSGVO Compliance](#dsgvo-compliance)
2. [Data Encryption](#data-encryption)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Security](#api-security)
5. [Rate Limiting & DDoS Protection](#rate-limiting--ddos-protection)
6. [Vulnerability Management](#vulnerability-management)
7. [Security Audits & Penetration Testing](#security-audits--penetration-testing)
8. [Incident Response](#incident-response)

---

## DSGVO Compliance

### Data Processing Agreement (Auftragsverarbeitung — AVV)

**Required for all production deployments.**

**Document**: `docs/AVV_TEMPLATE.md`

**Key Obligations:**

| Obligation | Implementation | Status |
|-----------|----------------|--------|
| **Data Inventory** | Catalog of all personal data processed | ✅ In `VERFAHRENSVERZEICHNIS.md` |
| **Data Minimization** | Collect only necessary fields | ✅ Questions optimized |
| **Encryption at Rest** | AES-256-GCM for PII | ✅ Implemented |
| **Encryption in Transit** | TLS 1.2+ only | ✅ Enforced via Helmet |
| **Access Control** | Role-based + field-level encryption | ✅ RBAC + Middleware |
| **Audit Logging** | All data access logged | ✅ 100% coverage |
| **Right to Erasure** | "Hard delete" for DSGVO § 17 | ✅ Scheduled job |
| **Right to Access** | Patient can export all data | ✅ GDPR export endpoint |
| **Data Breach Notification** | Report to BfDI within 72h | ✅ Incident process |
| **Consent Management** | Document all consents | ✅ Consent table + timestamps |
| **Third-Party Audits** | Annual security assessment | ⚠️ Schedule Q2 2026 |

### Privacy Policy (Datenschutzerklärung)

**Required on every website instance.**

**Template**: `docs/DATENSCHUTZ_TEMPLATE.html`

**Must Include:**
- [ ] What data is collected and why
- [ ] How long data is retained
- [ ] Who has access (staff, external processors)
- [ ] Data subject rights (access, erasure, portability)
- [ ] Complaint procedure (to BfDI)
- [ ] Contact: Data Protection Officer (if applicable)

### Data Retention

**Default Policy:**

| Data Type | Retention | Basis |
|-----------|-----------|-------|
| **Session Data** | 10 years | Medical records law (AÄO, GOÄ) |
| **Audit Logs** | 1 year | DSGVO compliance |
| **Backup Copies** | 30 days (inc. encrypted) | Disaster recovery |
| **Deleted Patient Records** | "Hard-deleted" after 90-day grace period | GDPR § 17 |
| **Email Hashes (for dedup)** | Until patient deleted | Service optimization |

**Automated cleanup:**
```bash
# Runs daily via cron job
npx tsx scripts/hard-delete-expired-records.ts
```

---

## Data Encryption

### Encryption Attributes

| Data | Algorithm | Mode | Key Source | Where |
|------|-----------|------|------------|-------|
| **PII (names, addresses)** | AES | 256-GCM | `ENCRYPTION_KEY` env var | Database fields |
| **Email** | SHA-256 | HMAC | Derived from `ENCRYPTION_KEY` | Email_hash field (for lookup) |
| **Passwords** | bcrypt | 12 rounds | N/A (one-way) | User.password_hash |
| **JWT Tokens** | HS256 | Signed | `JWT_SECRET` env var | HttpOnly cookie |
| **Backups** | GPG or AES | 256 | Separate backup key | S3 or external storage |

### File: `server/services/encryption.ts`

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // Exactly 32 bytes

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit nonce for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: IV + authTag + ciphertext (all hex-encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, tagHex, ciphertextHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Email lookup without exposing email
export function hashEmail(email: string): string {
  const salt = ENCRYPTION_KEY.slice(0, 16); // Use key as salt
  return crypto.createHmac('sha256', salt)
    .update(email.toLowerCase().trim())
    .digest('hex');
}
```

### Usage

```typescript
// Encrypt sensitive data
const encryptedName = encrypt(patient.firstName);
await db.patient.create({
  data: {
    firstName_encrypted: encryptedName,
    email_hash: hashEmail(patient.email)
  }
});

// Decrypt when needed (logging: DON'T log personal data!)
const firstName = decrypt(patient.firstName_encrypted);
// logger.info('Patient updated', { patientId }); // ✅ OK
// logger.info('Patient updated', { firstName }); // ❌ NEVER
```

---

## Authentication & Authorization

### JWT Tokens (HS256)

**Token Structure:**
```json
{
  "userId": "cuid_string",
  "role": "ARZT|MFA|ADMIN",
  "permissions": ["read:sessions", "write:therapy"],
  "tenantId": "default",
  "iat": 1680000000,
  "exp": 1680086400,
  "jti": "unique-token-id"
}
```

**Expiry:**
- Access token: 24 hours (medical standard for sensitive ops)
- Refresh token: 30 days (rotated on use)
- Session cookie: `HttpOnly|Secure|SameSite=Strict|Max-Age=86400`

**Token Blacklist (Logout/Revocation):**

```typescript
// On logout, add to blacklist
await redis.setex(`bl:${jti}`, 86400, 'revoked'); // 24h

// On each request, check blacklist
const isRevoked = await redis.get(`bl:${token.jti}`);
if (isRevoked) {
  throw new UnauthorizedError('Token revoked');
}
```

### Roles & Permissions

**Builtin Roles:**

| Role | Scope | Capabilities |
|------|-------|-------------|
| **patient** | Self | View own sessions, export data, request deletion |
| **mfa** | Practice | Manage queue, chat support, view non-sensitive data |
| **arzt** | Practice | Full session access, triage, therapy plans, export |
| **admin** | System | User management, billing, system config |

**Custom Permissions:**

```prisma
model RolePermission {
  id String @id
  role UserRole
  permission String // "read:sessions", "write:therapy", etc.
  description String?
  
  @@unique([role, permission])
}
```

### Password Policy

**Minimum Requirements:**
- 12 characters
- 1 uppercase letter
- 1 number
- 1 special character (!@#$%^&*)
- Not in common password list (checked against HIBP API)

**Hashing:**
```typescript
// bcrypt with 12 rounds
const hash = await bcrypt.hash(password, 12);

// Verify
const isValid = await bcrypt.compare(password, hash);
```

### Multi-Factor Authentication (MFA)

**Supported Methods:**
1. **TOTP** (Time-based OTP, Google Authenticator)
2. **Email OTP** (6-digit code, 5-min expiry)
3. **WebAuthn** (Biometric/FIDO2, hardware keys)

**Enforcement:**
```typescript
// Require MFA for doctors
if (user.role === 'ARZT' && !user.mfaEnabled) {
  throw new ForbiddenError('MFA required for doctors');
}
```

---

## API Security

### CORS Policy

**Allowed Origins (configured in config.ts):**
```typescript
const allowedOrigins = [config.frontendUrl];
if (config.nodeEnv === 'development') {
  allowedOrigins.push('http://localhost:5173');
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'],
}));
```

### CSRF Protection

**Double-Submit Cookie Pattern:**

```typescript
// Middleware generates CSRF token
router.use((req, res, next) => {
  if (!req.cookies.csrf_token) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, { httpOnly: false, secure: true });
  }
  next();
});

// Client sends in header
// fetch('/api/sessions', {
//   method: 'POST',
//   headers: {
//     'X-CSRF-Token': document.cookie.match(/csrf_token=([^;]+)/)[1]
//   }
// })

// Server validates
router.post('/sessions', (req, res, next) => {
  const clientToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies.csrf_token;
  
  if (clientToken !== cookieToken) {
    return res.status(403).json({ error: 'CSRF validation failed' });
  }
  next();
});
```

### Content Security Policy (CSP)

**Helmet Configuration:**

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    }
  }
});
```

### Input Validation & Sanitization

**Schema Validation (Zod):**

```typescript
import { z } from 'zod';

const CreateSessionSchema = z.object({
  patientId: z.string().cuid('Invalid patient ID'),
  tenantId: z.string().default('default'),
  notes: z.string().optional().max(1000)
});

router.post('/sessions', (req, res) => {
  const validated = CreateSessionSchema.parse(req.body);
  // Safe to use `validated` — Zod guarantees structure
});
```

**HTML Sanitization:**

```typescript
import DOMPurify from 'dompurify';

// Before storing user content
const sanitized = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'target']
});
```

### Security Headers

**All applied via Helmet + custom middleware:**

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leak |

---

## Rate Limiting & DDoS Protection

### Global Rate Limiting

**Per IP, per endpoint:**

```typescript
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,                    // 200 requests per window
  standardHeaders: true,       // Return RateLimit-* headers
  skip: (req) => {
    // Skip health-check endpoints
    return ['/api/live', '/api/health'].includes(req.path);
  }
});

app.use(globalLimiter);
```

**Auth-specific rate limiting (stricter):**

```typescript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,  // Only 10 login attempts per 15 min
  store: redisStore, // Use Redis for distributed
});

router.post('/login', authLimiter, loginHandler);
```

### Account Lockout

```typescript
// After 5 failed logins
if (failedAttempts >= 5) {
  await db.user.update({
    where: { id: userId },
    data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) } // 15 min
  });
  
  // Send alert email
  await sendEmail(user.email, 'Account Locked', '...');
  
  throw new TooManyAttemptsError('Account locked for 15 minutes');
}
```

### Fail2Ban Configuration

**For production servers:**

```ini
# /etc/fail2ban/jail.d/anamnese.local
[anamnese-auth]
enabled = true
port = http,https
filter = anamnese-auth
logpath = /var/log/anamnese/auth.log
maxretry = 5
findtime = 600
bantime = 900

[anamnese-api]
enabled = true
port = http,https
filter = anamnese-api
logpath = /var/log/anamnese/api.log
maxretry = 100
findtime = 60
bantime = 300
```

---

## Vulnerability Management

### Dependency Management

**Weekly security audits:**

```bash
npm audit --audit-level=moderate
npm outdated
```

**Automated via GitHub Dependabot:**
- PR for each vulnerability
- Auto-merge patches (if tests pass)
- Manual review for minor/major updates

**CI/CD Check:**
```bash
npm run security:audit
```

### Known CVE Tracking

**Checked against:**
- NVD (nvd.nist.gov)
- npm Security Advisory
- GitHub Advisory Database

**Response SLA:**
- **CRITICAL**: 24h patch + deploy
- **HIGH**: 1 week patch + deploy
- **MEDIUM**: 2 weeks evaluation
- **LOW**: Next regular release

### Regular Patching

**Schedule:**
- **Security patches**: As soon as available
- **Minor updates**: Monthly
- **Major updates**: Quarterly (after testing)

---

## Security Audits & Penetration Testing

### Self-Assessment

**Quarterly checklist (run yourself):**

```bash
npm run security:all
# Includes:
# - npm audit
# - TypeScript strict checks
# - ESLint security rules
# - OWASP Top 10 patterns
```

### Third-Party Assessments

**Annual penetration test (recommended):**
- Scope: Full application + infrastructure
- Tools: Burp Suite, Nessus, OWASP ZAP
- Report: Executive summary + remediation
- Cost: €3,000–8,000 (typical for medical apps)

**Partners:**
- SonarSource (code analysis)
- Checkmarx (SAST)
- Acunetix (DAST)

### Bug Bounty Program

**Consider offering bug bounties:**
- HackerOne or Bugcrowd platform
- Budget: €500–5,000 per vulnerability
- Attracts security researchers

---

## Incident Response

### Data Breach Protocol

**If a breach occurs (suspected or confirmed):**

1. **Immediate (0–2 hours)**
   - Stop the incident (isolate affected system)
   - Document timeline & scope
   - Notify incident response team

2. **Investigation (2–24 hours)**
   - Analyze logs in `server/logs/` & `docker-compose` logs
   - Determine: which data, how many patients, how long exposed
   - Preserve evidence (don't delete logs)

3. **Notification (24–72 hours)**
   - Notify patients (if PII exposed): mail + SMS
   - Report to BfDI (Bavarian Data Protection Authority)
   - Report to TK (Techniche Krankenkasse) if applicable
   - Public statement (if >10,000 people affected)

4. **Remediation (ongoing)**
   - Patch vulnerability
   - Rotate compromised credentials
   - Add monitoring to prevent recurrence
   - Post-mortem review

**Template**: `docs/INCIDENT_RESPONSE.md`

### Security Incident Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| **Security Officer** | security@diggai.de | 24/7 |
| **BfDI (Bavaria DPA)** | +49 89 2877-601 | Business hours |
| **Emergency Hotline** | +49 6221 329329-0 | 24/7 |

### Bug Report

**Responsible Disclosure:**

1. **DO NOT** file public GitHub issue
2. Email: security@diggai.de with:
   - Title: "Security Vulnerability Report"
   - Steps to reproduce
   - Proof of concept (if possible)
   - Suggested fix (if you have one)

3. Expected response: within 48 hours

**Non-Disclosure Agreement:** 90-day window before public disclosure

---

## Security Checklist (Before Production)

- [ ] All environment variables set (no defaults)
- [ ] JWT_SECRET and ENCRYPTION_KEY generated (not copied)
- [ ] Database password strong (20+ chars)
- [ ] HTTPS/SSL enabled (not self-signed)
- [ ] Firewall configured (only 80, 443, 22)
- [ ] Backup encryption enabled
- [ ] Audit logging enabled
- [ ] Rate limiting tested
- [ ] CORS configured correctly (not "*")
- [ ] CSP headers verified
- [ ] DSGVO policies documented
- [ ] Data breach contacts confirmed
- [ ] Monitoring + alerting enabled
- [ ] Security headers tested (https://securityheaders.com)
- [ ] OWASP Top 10 reviewed

---

**Security Questions?** → security@diggai.de  
**Compliance Help?** → compliance@diggai.de

1. **User requests reset** → Admin initiates in dashboard
2. **Temporary password** → Generated (24h expiry)
3. **First login** → Must change password
4. **Old sessions** → Invalidated automatically

---

## Access Control

### Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|------|-------------|--------------|
| **PATIENT** | Anonymous patient session | Own session data only |
| **ARZT** | Physician | All sessions, triage, therapy plans |
| **MFA** | Medical assistant | Queue management, session assignment |
| **ADMIN** | System administrator | Full system access |

### Permission Granularity

Beyond roles, granular permissions exist:

- `admin_users` - User management
- `admin_audit` - View audit logs
- `admin_content` - Manage waiting room content
- `export_data` - Export patient data
- `delete_sessions` - Delete sessions
- `view_all_sessions` - View all patient sessions

### Least Privilege Principle

1. Users receive minimum permissions needed for role
2. Temporary elevated access requires justification
3. Quarterly access reviews conducted
4. Immediate deactivation on role change

---

## Data Encryption

### At Rest

| Data Type | Encryption Method | Key Management |
|-----------|-------------------|----------------|
| Patient PII (names, addresses) | AES-256-GCM | ENCRYPTION_KEY env var |
| Session answers | AES-256-GCM for PII fields | Same as above |
| Database | PostgreSQL native encryption | Database-level |
| Backups | GPG encryption | Separate backup key |

### In Transit

| Protocol | Configuration |
|----------|---------------|
| HTTPS | TLS 1.3 only (TLS 1.2 fallback disabled soon) |
| WebSocket | WSS (WebSocket Secure) |
| Internal API | mTLS between services |

### Key Rotation

- **Encryption keys**: Annually or on suspected compromise
- **JWT secrets**: Every 90 days
- **Database credentials**: Every 180 days
- **Backup keys**: Annually

**Rotation Procedure**:
1. Generate new key
2. Re-encrypt data with new key
3. Update environment variables
4. Restart services
5. Securely destroy old key

---

## Session Security

### JWT Token Security

| Attribute | Value | Purpose |
|-----------|-------|---------|
| Algorithm | HS256 | HMAC with SHA-256 |
| Expiry | 24 hours | Limit exposure window |
| HttpOnly | true | Prevent XSS theft |
| Secure | true | HTTPS only |
| SameSite | Strict | CSRF protection |
| JTI | UUID | Token blacklisting |

### Session Management

- **Automatic timeout**: 4 hours inactivity
- **Concurrent sessions**: Maximum 3 per user
- **Session binding**: Tied to IP + User-Agent hash
- **Logout**: Token blacklisted for 24 hours

### Patient Sessions

- **Auto-expiry**: 24 hours from creation
- **Data retention**: 10 years (§ 630f BGB compliance)
- **Anonymization**: After retention period
- **Hard delete**: Optional after 30-day grace period

---

## Audit Logging

### Logged Events

All of the following are logged with timestamp, user, IP hash:

| Category | Events |
|----------|--------|
| **Authentication** | Login, logout, failed login, password change |
| **Session Access** | View, export, modify, delete |
| **Data Export** | CSV, PDF, JSON exports |
| **Admin Actions** | User CRUD, permission changes, config updates |
| **Triage** | Alert creation, acknowledgment |
| **System** | Backup, restore, health check failures |

### Log Retention

| Log Type | Retention Period |
|----------|------------------|
| Security events | 7 years |
| Access logs | 3 years |
| System logs | 1 year |
| Debug logs | 30 days |

### Log Protection

- Logs stored separately from application database
- Write-once, read-many access model
- Regular integrity checks
- Encrypted at rest

---

## Incident Response

### Security Incident Classification

| Level | Description | Examples | Response Time |
|-------|-------------|----------|---------------|
| **P1 - Critical** | Active breach / data exposure | Unauthorized admin access, data leak | 1 hour |
| **P2 - High** | Potential breach / major vulnerability | Suspicious login patterns, unpatched CVE | 4 hours |
| **P3 - Medium** | Security concern / minor issue | Policy violation, misconfiguration | 24 hours |
| **P4 - Low** | Informational / best practice | Log analysis findings, audit items | 72 hours |

### Incident Response Process

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  DETECT     │───▶│  CONTAIN    │───▶│  ERADICATE  │───▶│   RECOVER   │───▶│   REVIEW    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

#### 1. Detect
- Automated monitoring alerts
- User reports
- Security audit findings

#### 2. Contain
- Isolate affected systems
- Revoke compromised credentials
- Enable additional logging

#### 3. Eradicate
- Remove threat actor access
- Patch vulnerabilities
- Clean infected systems

#### 4. Recover
- Restore from clean backups
- Verify system integrity
- Resume normal operations

#### 5. Review
- Document incident timeline
- Identify root cause
- Update procedures

### Breach Notification

Per GDPR Article 33/34:

| Timeline | Action |
|----------|--------|
| Within 72 hours | Notify supervisory authority (BfDI) |
| Without undue delay | Notify affected individuals if high risk |
| Immediate | Document all details for authorities |

---

## Compliance Certifications

### GDPR (DSGVO) Compliance

| Article | Implementation |
|---------|----------------|
| Art. 5 - Principles | Privacy by design, data minimization |
| Art. 6 - Lawfulness | Consent + contract basis |
| Art. 9 - Special categories | Health data with explicit consent |
| Art. 17 - Right to erasure | Automated deletion workflows |
| Art. 25 - PbD | Encryption, pseudonymization |
| Art. 32 - Security | AES-256, access controls, audits |
| Art. 33 - Breach notification | 72-hour process defined |

### HIPAA Compliance (for international use)

- Administrative Safeguards: Risk analysis, workforce training
- Physical Safeguards: Facility access, workstation security
- Technical Safeguards: Access control, audit controls, integrity, transmission security

### BSI TR-03161

- Cryptographic modules validated
- Key management per standard
- Secure deletion procedures

### Gematik TI/ePA

- Connector integration
- SMC-B card support
- ePA access logging

---

## Security Best Practices

### For Users

1. **Never share credentials** - Each user has individual account
2. **Lock screen** - When leaving workstation
3. **Report suspicious activity** - Immediately to admin
4. **Use strong passwords** - Follow password policy
5. **Log out properly** - Don't just close browser

### For Administrators

1. **Regular audits** - Review user access quarterly
2. **Principle of least privilege** - Minimum necessary access
3. **Monitor logs** - Weekly review of security events
4. **Keep updated** - Apply security patches promptly
5. **Test backups** - Monthly restore verification

### For Developers

1. **Secure coding** - OWASP Top 10 awareness
2. **Code review** - Security-focused reviews mandatory
3. **Dependency scanning** - Automated CVE checks
4. **Secrets management** - Never commit credentials
5. **Security testing** - SAST/DAST in CI/CD

---

## Security Contacts

### Reporting Security Issues

**Email**: security@diggai.de  
**PGP Key**: [Available on request]  
**Response Time**: < 24 hours for critical issues

### Responsible Disclosure

We welcome responsible security research:

1. **Do not** test on production systems
2. **Do not** access data you don't own
3. **Do** provide detailed reproduction steps
4. **Do** allow reasonable time for fixes
5. **We will** acknowledge findings and provide credit

### Bug Bounty

Critical vulnerabilities: €500 - €2,000 reward  
High severity: €200 - €500 reward  
Medium/Low: Hall of Fame recognition

---

## Security Checklist

### Daily
- [ ] Review critical triage alerts
- [ ] Check system health dashboard
- [ ] Verify backup completion

### Weekly
- [ ] Review failed login attempts
- [ ] Check audit log anomalies
- [ ] Update threat intelligence feeds

### Monthly
- [ ] User access review
- [ ] Security patch status
- [ ] Backup restore test
- [ ] Incident response drill

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Policy review and updates
- [ ] Security training refresh

### Annually
- [ ] External security assessment
- [ ] Compliance certification renewal
- [ ] Disaster recovery test
- [ ] Business continuity review

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 3.0.0 | 2026-03-23 | Initial release for production | Security Team |

---

*This document is confidential and for authorized personnel only.*
*© 2026 DiggAI GmbH. All rights reserved.*
