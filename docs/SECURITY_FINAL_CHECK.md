# Pre-Production Security Checklist

> **DiggAI Anamnese Platform v3.0.0**  
> **Classification:** INTERNAL  
> **Version:** 1.0  
> **Last Updated:** 2026-03-23

---

## Executive Summary

This checklist must be completed before any production deployment. Each item requires sign-off from the responsible team member.

---

## 1. Code Security ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 1.1 | No hardcoded secrets in source code | ☐ | Dev | Scan with `scripts/security-check.sh` |
| 1.2 | No hardcoded passwords or API keys | ☐ | Dev | Review all config files |
| 1.3 | No debug code or console.log statements | ☐ | Dev | Check production build |
| 1.4 | Input validation using Zod schemas | ☐ | Dev | Verify all endpoints |
| 1.5 | Output encoding for dynamic content | ☐ | Dev | Check React escape handling |
| 1.6 | No SQL injection vulnerabilities | ☐ | Security | Review Prisma queries |
| 1.7 | No XSS vulnerabilities | ☐ | Security | CSP + output encoding |
| 1.8 | Dependencies scanned with npm audit | ☐ | DevOps | `npm audit --audit-level=moderate` |

**Sign-off:** _______________ Date: _________

---

## 2. Authentication & Authorization ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 2.1 | Strong password policy enforced | ☐ | Dev | Min 12 chars, complexity |
| 2.2 | Rate limiting on auth endpoints | ☐ | Dev | 10 req/15min for login |
| 2.3 | Session management secure | ☐ | Dev | HttpOnly, Secure, SameSite |
| 2.4 | JWT tokens have expiration | ☐ | Dev | Access: 15min, Refresh: 7d |
| 2.5 | Secure cookie attributes | ☐ | Dev | HttpOnly, Secure, SameSite=Strict |
| 2.6 | MFA available and enforced for admins | ☐ | Dev | TOTP-based |
| 2.7 | Account lockout after failed attempts | ☐ | Dev | 5 attempts / 30min lock |
| 2.8 | Password reset flow secure | ☐ | Dev | Time-limited tokens |

**Sign-off:** _______________ Date: _________

---

## 3. Access Control ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 3.1 | RBAC implemented correctly | ☐ | Dev | Admin, Arzt, Reception, Patient |
| 3.2 | Principle of least privilege | ☐ | Security | Minimize permissions |
| 3.3 | Resource ownership checks | ☐ | Dev | Users can only access own data |
| 3.4 | API endpoints require authentication | ☐ | Dev | Except public endpoints |
| 3.5 | Admin endpoints have additional protection | ☐ | Dev | IP whitelist + MFA |
| 3.6 | No IDOR vulnerabilities | ☐ | Security | Test with different users |

**Sign-off:** _______________ Date: _________

---

## 4. Data Protection ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 4.1 | Encryption at rest (AES-256-GCM) | ☐ | Dev | All PII fields encrypted |
| 4.2 | Encryption in transit (TLS 1.3) | ☐ | DevOps | Certificate valid |
| 4.3 | PII handling compliant with DSGVO | ☐ | DSB | Data minimization |
| 4.4 | Data retention policies implemented | ☐ | Dev | Auto-deletion configured |
| 4.5 | Backup encryption enabled | ☐ | DevOps | AES-256 encrypted backups |
| 4.6 | Secure key management | ☐ | DevOps | ENCRYPTION_KEY in secrets |
| 4.7 | Data anonymization for analytics | ☐ | Dev | No direct PII in analytics |

**Sign-off:** _______________ Date: _________

---

## 5. Infrastructure Security ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 5.1 | Security headers configured | ☐ | Dev | Helmet + custom headers |
| 5.2 | CSP policy effective | ☐ | Security | Test with CSP evaluator |
| 5.3 | HSTS enabled | ☐ | Dev | max-age=31536000 |
| 5.4 | TLS 1.3 only (no TLS 1.0/1.1) | ☐ | DevOps | SSL Labs A+ rating |
| 5.5 | Firewall rules configured | ☐ | DevOps | Only required ports open |
| 5.6 | DDoS protection active | ☐ | DevOps | Cloudflare/Netlify |
| 5.7 | Container runs as non-root | ☐ | DevOps | Dockerfile USER directive |
| 5.8 | Container image scanned | ☐ | DevOps | Trivy/Snyk scan |
| 5.9 | Network segmentation | ☐ | DevOps | DB in private subnet |

**Sign-off:** _______________ Date: _________

---

## 6. Monitoring & Logging ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 6.1 | Audit logging enabled | ☐ | Dev | HIPAA-compliant logs |
| 6.2 | Error tracking configured | ☐ | Dev | Sentry integration |
| 6.3 | Security event monitoring | ☐ | DevOps | Failed logins, anomalies |
| 6.4 | Alerting for critical events | ☐ | DevOps | PagerDuty/Slack |
| 6.5 | Log retention policy | ☐ | DevOps | 90 days hot, 1 year cold |
| 6.6 | No sensitive data in logs | ☐ | Security | Verify log sanitization |
| 6.7 | Centralized log aggregation | ☐ | DevOps | ELK/Loki configured |

**Sign-off:** _______________ Date: _________

---

## 7. Incident Response ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 7.1 | Incident response plan documented | ☐ | Security | SECURITY_RUNBOOK.md |
| 7.2 | Contact list up-to-date | ☐ | Security | Emergency contacts |
| 7.3 | Runbook tested | ☐ | Security | Tabletop exercise |
| 7.4 | DSB contact information current | ☐ | DSB | 72h breach notification |
| 7.5 | Backup restore tested | ☐ | DevOps | Monthly restore test |
| 7.6 | Penetration test scheduled | ☐ | Security | See PENTEST_SCOPE.md |

**Sign-off:** _______________ Date: _________

---

## 8. Compliance ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 8.1 | DSGVO compliance verified | ☐ | DSB | Privacy by design |
| 8.2 | Privacy policy current | ☐ | DSB | Published on website |
| 8.3 | Data processing agreement | ☐ | Legal | With all subprocessors |
| 8.4 | Patient consent flow implemented | ☐ | Dev | Digital consent |
| 8.5 | Right to deletion implemented | ☐ | Dev | GDPR Article 17 |
| 8.6 | Data portability feature | ☐ | Dev | GDPR Article 20 |
| 8.7 | HIPAA compliance (if applicable) | ☐ | Security | Audit controls |
| 8.8 | BSI TR-02102 compliance | ☐ | Security | Cryptography |

**Sign-off:** _______________ Date: _________

---

## 9. Testing ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 9.1 | Unit tests pass | ☐ | Dev | `npm test` |
| 9.2 | Integration tests pass | ☐ | Dev | API tests |
| 9.3 | E2E tests pass | ☐ | QA | Playwright suite |
| 9.4 | Security tests pass | ☐ | Security | `server/security-tests/` |
| 9.5 | Penetration test completed | ☐ | Security | Or scheduled |
| 9.6 | Performance testing done | ☐ | DevOps | Load testing |
| 9.7 | Accessibility audit (WCAG 2.1) | ☐ | Dev | Keyboard/screen reader |

**Sign-off:** _______________ Date: _________

---

## 10. Deployment ✅

| # | Check | Status | Responsible | Notes |
|---|-------|--------|-------------|-------|
| 10.1 | Environment variables configured | ☐ | DevOps | `.env.production` |
| 10.2 | Secrets stored securely | ☐ | DevOps | Not in code/repo |
| 10.3 | Database migrations ready | ☐ | Dev | `prisma/migrations/` |
| 10.4 | Rollback plan documented | ☐ | DevOps | Previous version ready |
| 10.5 | Health checks passing | ☐ | DevOps | `/api/health` |
| 10.6 | Monitoring dashboards ready | ☐ | DevOps | Grafana/Datadog |
| 10.7 | SSL certificate valid | ☐ | DevOps | Not expiring soon |
| 10.8 | CDN cache purge strategy | ☐ | DevOps | Invalidate on deploy |

**Sign-off:** _______________ Date: _________

---

## Final Sign-off

### Pre-Production Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Lead Developer** | | | |
| **Security Officer** | | | |
| **DevOps Lead** | | | |
| **Data Protection Officer (DSB)** | | | |
| **Product Owner** | | | |

### Post-Deployment Verification

| Check | Status | Date |
|-------|--------|------|
| Smoke tests pass | ☐ | |
| Health checks green | ☐ | |
| Monitoring active | ☐ | |
| No error spikes | ☐ | |
| User acceptance verified | ☐ | |

---

## Risk Acceptance

If any items above are NOT completed, document risk acceptance below:

| Item # | Risk Description | Mitigation | Accepted By | Date |
|--------|------------------|------------|-------------|------|
| | | | | |
| | | | | |

---

## Appendix: Quick Reference Commands

```bash
# Run security check
./scripts/security-check.sh

# Check security headers
curl -I https://api.diggai.de/api/system/health

# Run all tests
npm run test
npx playwright test

# Check for secrets
grep -r "password\|secret\|api_key" --include="*.ts" --include="*.js" .

# Verify CSP
curl -I https://api.diggai.de | grep -i "content-security-policy"

# Check TLS configuration
openssl s_client -connect api.diggai.de:443 -tls1_3

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image diggai-anamnese:latest
```

---

**Document Owner:** Security Team  
**Review Cycle:** Before each production deployment  
**Template Version:** 1.0
