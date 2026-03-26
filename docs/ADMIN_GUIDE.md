# DiggAI Admin Guide

> **For**: System Administrators  
> **Version**: 3.0.0  
> **Required Role**: ADMIN  
> **Last Updated**: 2026-03-23

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [User Management](#user-management)
3. [System Configuration](#system-configuration)
4. [Question Management](#question-management)
5. [Reporting & Analytics](#reporting--analytics)
6. [Backup & Maintenance](#backup--maintenance)
7. [Audit Log](#audit-log)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Admin Login

1. Navigate to: `https://diggai-drklaproth.netlify.app/admin`
2. Login with ADMIN credentials
3. Access full admin dashboard

### Admin Dashboard Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard                              [User Menu]   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 1,250    │  │ 3,420    │  │ 45       │  │ 3        │   │
│  │ Patienten│  │ Sessions │  │ Heute    │  │ Alerts   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│  Navigation: Users | Questions | Reports | System | Audit  │
├─────────────────────────────────────────────────────────────┤
│  Recent Activity                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • User created: mfa.schmidt (10:23)                 │   │
│  │ • Backup completed successfully (08:00)             │   │
│  │ • Session exported: #clu123... (Gestern)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## User Management

### Creating Users

1. Navigate to **Users** menu
2. Click "Neuen Benutzer anlegen"
3. Fill in required fields:

| Field | Description | Requirements |
|-------|-------------|--------------|
| **Username** | Login identifier | 3-50 chars, unique |
| **Password** | Initial password | 8-100 chars, complex |
| **Display Name** | Full name shown | 2-100 chars |
| **Role** | Access level | ARZT / MFA / ADMIN |

4. Click "Speichern"
5. Credentials provided to user securely

### Role Descriptions

| Role | Access | Typical Users |
|------|--------|---------------|
| **ARZT** | All sessions, triage, therapy plans | Physicians |
| **MFA** | Queue, session assignment, chat | Reception staff |
| **ADMIN** | Full system access | IT administrators |

### Managing Permissions

Granular permissions beyond roles:

1. Go to **Users** → Select user
2. Click "Berechtigungen"
3. Toggle individual permissions:

| Permission | Description |
|------------|-------------|
| `admin_users` | Create/edit users |
| `admin_audit` | View audit logs |
| `admin_content` | Manage waiting room content |
| `admin_backup` | Create/restore backups |
| `admin_config` | System configuration |
| `export_data` | Export patient data |
| `delete_sessions` | Delete patient sessions |
| `view_all_sessions` | Access all sessions |

### Deactivating Users

**Soft Delete** (recommended):
1. Edit user profile
2. Toggle "Aktiv" to OFF
3. User cannot login, data preserved

**Why soft delete?**
- Audit trail preserved
- Session history maintained
- Can be reactivated
- Compliant with retention requirements

### Password Reset

1. Find user in user list
2. Click "Passwort zurücksetzen"
3. System generates temporary password
4. Share securely with user
5. User must change on first login

---

## System Configuration

### Feature Flags

Enable/disable features system-wide:

| Flag | Description | Default |
|------|-------------|---------|
| `NFC_ENABLED` | NFC check-in | false |
| `PAYMENT_ENABLED` | Payment processing | false |
| `TELEMED_ENABLED` | Video consultations | false |
| `TI_ENABLED` | Gematik TI integration | false |
| `AI_SUMMARY_ENABLED` | AI session summaries | true |
| `PATIENT_PORTAL_ENABLED` | PWA patient portal | true |

**Configuration via:**
- Environment variables (production)
- Admin UI → System → Features (runtime)

### LLM Provider Settings

Configure AI backend:

1. Go to **System** → **AI Configuration**
2. Select provider:
   - **Ollama** (local, self-hosted)
   - **OpenAI** (cloud API)
   - **None** (rule-based fallback)
3. Enter API credentials
4. Test connection
5. Save settings

### Theme Customization

Customize practice appearance:

1. **System** → **Theme**
2. Configure:
   - Practice logo
   - Primary colors
   - Welcome message
   - Contact information
   - Imprint text

### Session Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Session timeout | 24 hours | Auto-expiry time |
| Max sessions/day | Unlimited | Rate limiting |
| Auto-logout | 4 hours | Inactivity timeout |
| Triage notifications | On | Real-time alerts |

---

## Question Management

### Atom Editor Overview

The atom editor manages the 270+ medical questions:

1. Navigate to **Questions** (Fragenkatalog)
2. View all questions organized by module/section
3. Search, filter, and edit

### Question Structure

```typescript
{
  id: "0001",                    // Unique identifier
  questionText: "Nachname?",     // Display text
  answerType: "text",            // Input type
  section: "basis",              // Grouping
  orderIndex: 1,                 // Display order
  isRequired: true,              // Mandatory?
  isRedFlag: false,              // Triage trigger?
  isPII: true,                   // Personal data?
  options: [...],                // For select/radio
  validationRules: {...},        // Input validation
  branchingLogic: {...}          // Conditional flow
}
```

### Editing Questions

1. Find question via search or browse
2. Click "Bearbeiten"
3. Modify fields:
   - **Question text**: Update wording
   - **Options**: Add/remove choices
   - **Validation**: Change requirements
   - **Logic**: Modify routing
4. Save as draft or publish immediately

### Question Types

| Type | Use Case | Example |
|------|----------|---------|
| `text` | Free text | Name input |
| `textarea` | Long text | Symptom description |
| `radio` | Single choice | Yes/No questions |
| `select` | Dropdown | Country selection |
| `multiselect` | Multiple choice | Medications |
| `date` | Calendar | Birth date |
| `number` | Numeric | Height/weight |
| `signature` | Digital signature | Consent |

### Creating New Questions

1. Click "Neue Frage erstellen"
2. Enter unique ID (e.g., "NEW-001")
3. Fill all required fields
4. Test in preview mode
5. Publish to production

**⚠️ Warning**: Question IDs are permanent routing keys. Choose carefully!

### Reordering Questions

Drag & drop to reorder:

1. Enable "Reorder mode"
2. Drag questions to new positions
3. Changes apply immediately
4. Test patient flow after changes

### Activating/Deactivating

Toggle question status:

- **Active**: Question shown to patients
- **Inactive**: Question hidden but preserved

Use case: Seasonal questions, temporary changes.

---

## Reporting & Analytics

### Dashboard Statistics

View system overview:

**Key Metrics:**
- Total patients registered
- Total sessions completed
- Completion rate (%)
- Average completion time
- Today's activity
- Unresolved triage events

### Session Timeline

Visualize session trends:

- Time range: 7/30/90/365 days
- Grouped by day
- Shows: total, completed, active
- Export to CSV

### Service Analytics

Distribution of services requested:

| Service | Count | Percentage |
|---------|-------|------------|
| Termin / Anamnese | 1,500 | 45% |
| Rezeptanfrage | 800 | 24% |
| AU-Anfrage | 300 | 9% |
| ... | ... | ... |

### Triage Analytics

Monitor triage patterns:

- Critical vs Warning events
- Acknowledgment rates
- Trends over time
- Peak alert times

### Exporting Reports

1. Configure report parameters
2. Click "Export"
3. Choose format: PDF, CSV, JSON
4. Download or email

---

## Backup & Maintenance

### Backup Strategy

**Automatic Backups**:
- Daily full backup: 02:00 UTC
- Hourly incremental
- 30-day retention
- Encrypted storage

**Manual Backup**:
1. Go to **System** → **Backups**
2. Click "Backup erstellen"
3. Select type: Full or Partial
4. Wait for completion
5. Download or keep on server

### Backup Types

| Type | Contents | Size | Frequency |
|------|----------|------|-----------|
| **Full** | All data | ~1 GB | Daily |
| **Partial** | Selected tables | Varies | As needed |
| **Config** | Settings only | ~1 MB | Weekly |

### Restore Procedure

⚠️ **Warning**: Restore overwrites current data!

1. Go to **System** → **Backups**
2. Find backup to restore
3. Click "Wiederherstellen"
4. Confirm understanding:
   - Current data will be replaced
   - Sessions since backup will be lost
   - Cannot be undone
5. Enter confirmation code
6. Wait for restore (may take 10-30 min)
7. Verify data integrity after restore

### Maintenance Windows

Schedule regular maintenance:

| Task | Frequency | Duration |
|------|-----------|----------|
| Database vacuum | Weekly | 5 min |
| Log rotation | Daily | 1 min |
| Cache clear | As needed | Instant |
| Security updates | Monthly | 30 min |
| Full system check | Quarterly | 2 hours |

### Health Monitoring

Check system status:

1. **System** → **Health**
2. View components:
   - Database connection
   - Redis cache
   - LLM service
   - Email service
3. Green = OK, Red = Issue

---

## Audit Log

### Viewing Audit Logs

1. Navigate to **Audit Log**
2. Use filters:
   - Date range
   - User
   - Action type
   - Resource
3. Click entry for details

### Logged Actions

| Category | Actions Logged |
|----------|----------------|
| **Authentication** | Login, logout, failed attempts |
| **User Management** | Create, update, delete users |
| **Session Access** | View, export, modify sessions |
| **Data Export** | CSV, PDF, JSON exports |
| **System Changes** | Config updates, backups |
| **Triage** | Alert creation, acknowledgment |

### Log Retention

- **Security events**: 7 years
- **Access logs**: 3 years
- **System logs**: 1 year

### Exporting Logs

1. Apply desired filters
2. Click "Export"
3. Select format
4. Download file

**Note**: Logs contain sensitive information - handle securely!

---

## Troubleshooting

### User Cannot Login

| Symptom | Solution |
|---------|----------|
| "Invalid credentials" | Reset password |
| "Account locked" | Wait 15 min or unlock manually |
| "Session expired" | Normal, re-login required |
| "No permissions" | Check role assignment |

### Performance Issues

1. Check system health dashboard
2. Review database connection
3. Check memory usage
4. Clear cache: **System** → **Clear Cache**
5. Restart services if needed

### Data Issues

| Issue | Solution |
|-------|----------|
| Missing sessions | Check date filters |
| Export fails | Check disk space |
| Wrong statistics | Refresh cache |
| Sync issues | Check network status |

### Emergency Procedures

**System Down**:
1. Check status page
2. Contact hosting provider
3. Activate backup system
4. Notify all users

**Data Breach Suspected**:
1. Isolate affected systems
2. Preserve logs
3. Contact security team
4. Document timeline
5. Notify authorities per GDPR

---

## Best Practices

### Security

- ✅ Use strong admin passwords
- ✅ Enable 2FA when available
- ✅ Review audit logs weekly
- ✅ Apply updates promptly
- ✅ Limit admin accounts (max 2-3)

### Maintenance

- ✅ Test backup restore monthly
- ✅ Review user access quarterly
- ✅ Archive old logs annually
- ✅ Update documentation
- ✅ Train backup admins

### Operations

- ✅ Monitor dashboard daily
- ✅ Respond to alerts promptly
- ✅ Document configuration changes
- ✅ Maintain runbook
- ✅ Schedule regular reviews

---

## Support Resources

### Documentation

- API Reference: `docs/API_REFERENCE.md`
- Deployment Guide: `docs/DEPLOYMENT.md`
- Security Policies: `docs/SECURITY.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`

### Contacts

| Issue | Contact |
|-------|---------|
| Technical | support@diggai.de |
| Security | security@diggai.de |
| Training | training@diggai.de |
| Emergency | +49 XXX XXX (24/7) |

---

*This guide is for authorized administrators only.*
*Regularly check for updates at https://docs.diggai.de*
