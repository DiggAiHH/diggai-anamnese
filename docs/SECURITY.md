# DiggAI Security Policies

> **Version**: 3.0.0  
> **Classification**: Internal Use  
> **Last Review**: 2026-03-23  
> **Next Review**: 2026-06-23

---

## Table of Contents

1. [Password Policy](#password-policy)
2. [Access Control](#access-control)
3. [Data Encryption](#data-encryption)
4. [Session Security](#session-security)
5. [Audit Logging](#audit-logging)
6. [Incident Response](#incident-response)
7. [Compliance Certifications](#compliance-certifications)
8. [Security Contacts](#security-contacts)

---

## Password Policy

### Requirements

All user accounts must adhere to the following password requirements:

| Requirement | Specification |
|-------------|---------------|
| **Minimum Length** | 12 characters |
| **Maximum Length** | 100 characters |
| **Complexity** | At least 3 of 4 categories: uppercase, lowercase, numbers, special chars |
| **History** | Cannot reuse last 5 passwords |
| **Expiration** | 90 days (configurable) |
| **Lockout** | 5 failed attempts → 15-minute lockout |

### Examples

✅ **Valid Passwords**:
- `Dr.Klaproth!2024`
- `Med1z1n1sch3S1ch3rh3!t`
- `Praxis#Berlin#2024`

❌ **Invalid Passwords**:
- `password123` (too common)
- `Med2024` (too short)
- `DrKlapproth` (no numbers/special chars)

### Password Reset Procedure

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
