# Security Incident Response Runbook

> **DiggAI Anamnese Platform**  
> **Classification:** INTERNAL USE ONLY  
> **Version:** 1.0  
> **Last Updated:** 2026-03-23

---

## 1. Overview

This runbook provides step-by-step procedures for responding to security incidents affecting the DiggAI Anamnese Platform. All personnel must follow these procedures to ensure consistent, effective incident response.

---

## 2. Severity Levels

### 2.1 Critical (P1) 🔴

**Examples:**
- Confirmed data breach
- Ransomware/malware deployment
- Unauthorized admin access
- System-wide availability loss
- PHI/PII exfiltration confirmed

**Response Time:** Immediate (15 minutes)  
**Notification:** All stakeholders within 30 minutes

### 2.2 High (P2) 🟠

**Examples:**
- Multiple unauthorized access attempts
- Suspicious privileged activity
- Malware detection (contained)
- Vulnerability exploitation attempt

**Response Time:** 1 hour  
**Notification:** Management + Security within 1 hour

### 2.3 Medium (P3) 🟡

**Examples:**
- Failed login spike
- Suspicious network traffic
- Policy violation
- Non-critical vulnerability

**Response Time:** 4 hours  
**Notification:** Security team within 4 hours

### 2.4 Low (P4) 🟢

**Examples:**
- Individual failed logins
- Minor configuration issue
- Informational alert

**Response Time:** 24 hours  
**Notification:** Standard ticket tracking

---

## 3. Incident Response Procedures

### Phase 1: Detection & Assessment (0-5 min)

#### Immediate Actions
- [ ] Confirm incident is real (not false positive)
- [ ] Determine initial scope (systems affected)
- [ ] Identify incident type and severity
- [ ] Document start time and initial observations
- [ ] Preserve evidence (logs, screenshots)

#### Key Questions
1. What systems/resources are affected?
2. Is patient data involved?
3. Is the incident ongoing?
4. What is the potential impact?
5. Who else needs to be involved?

#### Documentation Template
```
Incident ID: INC-YYYY-MM-DD-###
Detected: [Timestamp]
Detected By: [Name/Alert Source]
Severity: [P1/P2/P3/P4]
Type: [Data Breach/Malware/Unauthorized Access/Other]
Affected Systems: [List]
Initial Description: [Brief summary]
```

---

### Phase 2: Containment (5-15 min)

#### For Active Intrusions
- [ ] Isolate affected systems (network isolation)
- [ ] Revoke compromised credentials/tokens
- [ ] Block malicious IP addresses
- [ ] Disable affected user accounts
- [ ] Preserve volatile evidence

#### Commands for Immediate Containment

```bash
# Block IP at firewall
sudo ufw deny from <SUSPICIOUS_IP>

# Revoke all sessions for user
# (Run in backend container)
npx prisma db execute --stdin <<EOF
UPDATE "Session" SET "revoked" = true WHERE "userId" = '<USER_ID>';
EOF

# Disable user account
npx prisma db execute --stdin <<EOF
UPDATE "User" SET "active" = false WHERE "email" = '<EMAIL>';
EOF

# Check active connections
netstat -tulpn | grep :3001

# Review recent logins
tail -n 1000 logs/audit.log | grep -i "login\|auth"
```

#### Database Emergency Queries

```sql
-- Revoke all active sessions
UPDATE "Session" SET "revoked" = true WHERE "revoked" = false;

-- Lock affected user
UPDATE "User" SET "locked" = true, "lockReason" = 'Security Incident' WHERE "email" = 'suspicious@example.com';

-- Check recent admin actions
SELECT * FROM "AuditLog" WHERE "timestamp" > NOW() - INTERVAL '1 hour' AND "severity" = 'HIGH';
```

---

### Phase 3: Notification (15-30 min)

#### P1/P2 Notifications (Immediate)

| Role | Contact | Method | Content |
|------|---------|--------|---------|
| Incident Commander | Dr. Klapproth | Phone + Email | Severity, initial scope |
| Technical Lead | DevOps On-call | Phone + Slack | Technical details |
| DSB (Data Protection Officer) | DSB | Phone + Email | If PII involved |
| Legal | Legal Counsel | Email | If legal implications |

#### Notification Templates

**P1 - Data Breach Notification**
```
Subject: [P1 SECURITY INCIDENT] Data Breach Detected - INC-YYYY-MM-DD-###

Severity: CRITICAL (P1)
Incident ID: INC-YYYY-MM-DD-###
Detected: [Timestamp]

SUMMARY:
- Type: Potential data breach
- Scope: [Patient data/PHI/System data]
- Affected Records: [Number/Unknown]
- Status: [Contained/Active]

IMMEDIATE ACTIONS TAKEN:
1. [Action 1]
2. [Action 2]

NEXT STEPS:
1. Full investigation
2. DSGVO assessment
3. Customer notification evaluation

Incident Commander: [Name]
Contact: [Phone/Email]
```

---

### Phase 4: Investigation (30 min - 2 hours)

#### Evidence Collection Checklist

- [ ] System logs (/var/log/)
- [ ] Application logs (logs/audit.log)
- [ ] Database audit logs
- [ ] Network logs (if available)
- [ ] Screenshot of suspicious activity
- [ ] Memory dump (for malware)
- [ ] Backup verification

#### Investigation Commands

```bash
# Application logs
tail -n 5000 logs/audit.log | grep -i "error\|suspicious\|unauthorized"

# Failed login attempts
grep "failed\|invalid\|unauthorized" logs/audit.log | tail -100

# Recent database queries (if query logging enabled)
tail -n 1000 logs/postgresql.log

# Check for new users/modified permissions
npx prisma db execute --stdin <<EOF
SELECT * FROM "User" WHERE "createdAt" > NOW() - INTERVAL '24 hours';
SELECT * FROM "AuditLog" WHERE "action" LIKE '%role%' OR "action" LIKE '%permission%';
EOF

# Network connections
ss -tulpn | grep ESTAB

# Process list
ps aux --sort=-%mem | head -20
```

#### Root Cause Analysis Questions

1. How did the attacker gain access?
2. What vulnerabilities were exploited?
3. What data was accessed/modified?
4. How long was the system compromised?
5. Are there indicators of compromise (IoCs)?

---

### Phase 5: Remediation (2-6 hours)

#### Immediate Remediation

- [ ] Apply security patches
- [ ] Remove malware/backdoors
- [ ] Reset all compromised credentials
- [ ] Reconfigure security controls
- [ ] Verify backup integrity
- [ ] Restore from clean backup (if necessary)

#### System Hardening Checklist

```bash
# Update all dependencies
npm audit fix

# Rotate secrets
# - JWT_SECRET
# - ENCRYPTION_KEY
# - API keys
# - Database passwords

# Review and update firewall rules
sudo ufw status verbose

# Verify file permissions
find /app -type f -perm /o+w -ls

# Check for unauthorized SSH keys
cat ~/.ssh/authorized_keys
```

#### Verification Steps

- [ ] All malicious files removed
- [ ] Systems patched
- [ ] Credentials rotated
- [ ] Security controls functional
- [ ] Monitoring active
- [ ] Logs flowing correctly

---

### Phase 6: Recovery (6-24 hours)

#### Gradual Restoration

1. **Phase 6a:** Restore non-critical systems
2. **Phase 6b:** Monitor for 2 hours (no issues)
3. **Phase 6c:** Restore patient portal (read-only)
4. **Phase 6d:** Full service restoration
5. **Phase 6e:** Enhanced monitoring (7 days)

#### Post-Recovery Monitoring

```bash
# Enhanced logging for 7 days
# - All admin actions
# - All authentication events  
# - All data exports
# - All permission changes

# Daily checks
- Failed login count
- Unusual data access patterns
- New user registrations
- Permission changes
```

---

### Phase 7: Post-Incident Review (24-72 hours)

#### Review Meeting Agenda

1. **Timeline Review**
   - When was incident detected?
   - Response time for each phase
   - What worked well?
   - What could be improved?

2. **Technical Analysis**
   - Root cause
   - Attack vector
   - Impact assessment

3. **Process Review**
   - Communication effectiveness
   - Tool effectiveness
   - Team coordination

4. **Documentation**
   - Update runbook if needed
   - Update playbooks
   - Update detection rules

#### Required Deliverables

- [ ] Incident report (technical)
- [ ] Executive summary
- [ ] Lessons learned document
- [ ] Updated procedures
- [ ] Training recommendations

---

## 4. Specific Incident Types

### 4.1 Data Breach Response

#### Immediate Actions
1. **STOP** - Do not power off systems (preserve evidence)
2. **ISOLATE** - Network isolation of affected systems
3. **DOCUMENT** - Record everything before remediation
4. **NOTIFY** - DSB within 24 hours (DSGVO Art. 33)

#### DSGVO Breach Notification Requirements

| Requirement | Timeline | Responsible |
|-------------|----------|-------------|
| Notify Supervisory Authority | 72 hours | DSB |
| Notify Affected Individuals | Without delay | DSB |
| Document breach | Immediate | Security Team |
| Risk assessment | Immediate | Security Team |

### 4.2 Ransomware Response

#### DO NOT
- ❌ Pay the ransom
- ❌ Delete encrypted files
- ❌ Run cleanup tools before evidence collection

#### DO
1. Isolate infected systems immediately
2. Preserve evidence (memory dump, encrypted files)
3. Identify ransomware variant
4. Check for decryptors (https://www.nomoreransom.org/)
5. Restore from clean backups
6. Report to authorities

### 4.3 Unauthorized Access

#### Response Steps
1. Identify compromised account/system
2. Revoke all sessions for affected accounts
3. Force password reset
4. Review audit logs for lateral movement
5. Check for backdoors/persistence
6. Verify MFA is enabled and functional

### 4.4 DDoS Attack

#### Response Steps
1. Activate DDoS protection (Cloudflare/Netlify)
2. Enable rate limiting (if not already active)
3. Contact hosting provider
4. Implement emergency caching
5. Monitor legitimate traffic

---

## 5. Emergency Contacts

### Internal Contacts

| Role | Name | Phone | Email | Escalation |
|------|------|-------|-------|------------|
| **Incident Commander** | Dr. med. Klapproth | +49-XXX-XXX | security@diggai.de | Level 3 |
| **Technical Lead** | DevOps On-call | +49-XXX-XXX | devops@diggai.de | Level 2 |
| **DSB** | Data Protection Officer | +49-XXX-XXX | dsb@diggai.de | Level 2 |
| **Legal** | Legal Counsel | +49-XXX-XXX | legal@diggai.de | Level 3 |

### External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| **Netlify** | support@netlify.com | Infrastructure issues |
| **Hosting Provider** | *[Configured per deployment]* | Server issues |
| **BSI** | cert@bsi.bund.de | Report cyber incidents |
| **Police** | 110 / cybercrime@polizei.de | Criminal activity |

---

## 6. Tools & Resources

### Incident Response Tools

| Tool | Purpose | Location |
|------|---------|----------|
| Audit Logs | Activity tracking | `logs/audit.log` |
| System Metrics | Performance monitoring | `/api/system/metrics` |
| Database | Direct queries | `npx prisma studio` |
| Log Aggregation | Centralized logging | *[Configured per deployment]* |
| Backup System | Data recovery | `scripts/backup.sh` |

### Reference Documents

- DSGVO Article 33 (Breach Notification)
- BSI IT-Grundschutz
- NIST Cybersecurity Framework
- ISO 27035 (Incident Management)

---

## 7. Playbooks

### 7.1 Compromised Credentials Playbook

```
1. Disable affected account
2. Revoke all active sessions
3. Force password reset on next login
4. Check for unauthorized actions
5. Review MFA status
6. Enable additional monitoring
7. Notify user (if legitimate)
```

### 7.2 Suspicious Network Activity Playbook

```
1. Identify source IP/domain
2. Check firewall logs
3. Block at firewall level
4. Review connection patterns
5. Check for data exfiltration
6. Update threat intelligence
```

### 7.3 Vulnerability Exploitation Playbook

```
1. Identify exploited vulnerability
2. Apply patch/workaround
3. Check for compromise indicators
4. Scan for similar vulnerabilities
5. Update vulnerability management
```

---

## 8. Testing & Maintenance

### Tabletop Exercises

- **Frequency:** Quarterly
- **Participants:** All incident response team members
- **Scenarios:** Data breach, ransomware, insider threat

### Runbook Review

- **Frequency:** Semi-annually
- **Trigger Events:** After each P1/P2 incident
- **Approval:** Security Officer

---

**Document Owner:** Security Team  
**Next Review Date:** 2026-09-23  
**Distribution:** Incident Response Team, Management
