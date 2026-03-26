# DiggAI Anamnese - User Guide

> **For**: Doctors (Ärzte) and Medical Assistants (MFA)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-03-23

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Sessions](#managing-sessions)
4. [Triage Alerts](#triage-alerts)
5. [Chat Functionality](#chat-functionality)
6. [Exporting Data](#exporting-data)
7. [Tips & Tricks](#tips--tricks)
8. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### First Login

1. Navigate to your practice dashboard:
   - Doctors: `https://diggai-drklaproth.netlify.app/arzt`
   - MFA: `https://diggai-drklaproth.netlify.app/mfa`

2. Enter your credentials:
   - **Username**: Provided by admin (e.g., `dr.klaproth`)
   - **Password**: Your secure password (12+ characters)

3. Click "Anmelden"

4. You'll be taken to your dashboard automatically

### Password Requirements

- At least 12 characters
- Mix of uppercase, lowercase, numbers, and special characters
- Changed every 90 days
- 5 failed attempts = 15-minute lockout

---

## Dashboard Overview

### Main Layout

```
┌─────────────────────────────────────────────────────────────┐
│  DiggAI Logo    Dashboard | Sessions | Reports | Settings   │ Header
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ ACTIVE   │  │ COMPLETED│  │  TODAY   │  │  ALERTS  │   │ Stats Cards
│  │   15     │  │   1,245  │  │   42     │  │    3 ⚠️  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Recent Sessions                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 Erika M.  |  Termin/Anamnese  |  12:34  |  VIEW │   │ Session List
│  │ 🟡 Hans M.   |  Rezeptanfrage    |  12:30  |  VIEW │   │
│  │ ⚪ Maria S.  |  AU-Anfrage       |  12:15  |  VIEW │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dashboard Widgets

| Widget | Description | Action |
|--------|-------------|--------|
| **Active Sessions** | Currently open patient sessions | Click to view list |
| **Completed** | Total completed sessions (all time) | Historical reference |
| **Today** | Sessions started today | Daily overview |
| **Triage Alerts** | Unacknowledged CRITICAL/WARNING | Immediate attention |

### Navigation Menu

| Menu Item | Access Level | Description |
|-----------|--------------|-------------|
| **Dashboard** | All | Main overview and recent sessions |
| **Sessions** | All | Complete session list with filters |
| **Queue** | MFA/Admin | Waiting room queue management |
| **Reports** | Arzt/Admin | Analytics and statistics |
| **Admin** | Admin only | User management, settings |
| **Audit Log** | Admin only | System audit trail |

---

## Managing Sessions

### Viewing a Session

1. From dashboard, click "VIEW" on any session
2. Session details open with:
   - Patient information (decrypted)
   - All answered questions
   - Triage events (if any)
   - Chat history
   - Export options

### Session Status Indicators

| Indicator | Status | Meaning |
|-----------|--------|---------|
| 🟢 Green | ACTIVE | Patient currently filling form |
| 🔵 Blue | COMPLETED | Patient submitted form |
| ⚪ Gray | SUBMITTED | Form submitted, pending review |
| 🔴 Red | CRITICAL | Triage alert - immediate attention |
| 🟡 Yellow | WARNING | Triage warning - review recommended |

### Assigning Sessions (MFA)

1. Go to **Queue** menu
2. Find unassigned session
3. Click "Arzt zuweisen"
4. Select doctor from dropdown
5. Click "Zuweisen"

Session now appears in that doctor's dashboard.

### Marking Sessions Complete

After reviewing patient data:

1. Open session details
2. Click "Als bearbeitet markieren"
3. Optional: Add internal notes
4. Session moves to "Completed" status

---

## Triage Alerts

### Understanding Triage Levels

| Level | Color | Response Time | Action Required |
|-------|-------|---------------|-----------------|
| **CRITICAL** | 🔴 Red | Immediate | Immediate physician review |
| **WARNING** | 🟡 Yellow | Within 15 min | Review recommended |
| **None** | ⚪ Gray | Routine | Normal workflow |

### CRITICAL Alerts

CRITICAL alerts indicate potentially life-threatening conditions:

- **ACS** (Akutes Koronarsyndrom) - Chest pain + dyspnea/paralysis
- **SUIZIDALITAET** - Suicidal ideation
- **SAH** - Subarachnoid hemorrhage symptoms
- **SYNCOPE_ARRHYTHMIE** - Syncope with arrhythmia

**Immediate Actions**:
1. Open session immediately
2. Review patient answers
3. Contact patient if needed
4. Acknowledge alert after action taken
5. Document actions in patient record

### WARNING Alerts

WARNING alerts indicate conditions requiring attention:

- **GI_BLUTUNG** - GI bleeding risk (anticoagulants + abdominal pain)
- **DIAB_FUSS** - Diabetic foot syndrome
- **POLYPHARMAZIE** - Polypharmacy (>5 medications)
- **SCHWANGERSCHAFT_AK** - Pregnancy + anticoagulants
- **DUALE_AK** - Dual anticoagulation
- **RAUCHER** - Heavy smoker (>30 pack-years)

### Acknowledging Alerts

1. Click triage alert banner
2. Review triggered rule details
3. Click "Quittieren" to acknowledge
4. Add notes if needed
5. Alert clears from dashboard

**Note**: Alert is marked with your user ID and timestamp for audit purposes.

---

## Chat Functionality

### Sending Messages to Patients

1. Open patient session
2. Click "Chat" tab
3. Type message in text box
4. Click "Senden"

Message appears in patient's interface immediately (if online) or on next refresh.

### Use Cases for Chat

| Scenario | Example Message |
|----------|-----------------|
| Rezept bereit | "Ihr Rezept liegt zur Abholung bereit." |
| Terminbestätigung | "Ihr Termin ist am 25.03. um 14:00 Uhr." |
| Rückfragen | "Könnten Sie Ihre Beschwerden genauer beschreiben?" |
| AU fertig | "Ihre AU-Bescheinigung können Sie abholen." |

### Automated Messages

System automatically sends messages when:
- Session marked complete for Rezept/AU/Überweisung
- Triage alert acknowledged
- Queue position changes

### Viewing Chat History

All messages are stored per session:
- Full history visible in session details
- Timestamps for all messages
- Sender identification (Doctor/MFA/System)
- Exportable with session data

---

## Exporting Data

### Export Formats

| Format | Best For | File Extension |
|--------|----------|----------------|
| **PDF** | Patient records, printing | .pdf |
| **CSV** | Spreadsheet analysis, statistics | .csv |
| **JSON** | Data integration, backups | .json |

### How to Export

1. Open session details
2. Click "Exportieren" button
3. Select format:
   - "Als PDF herunterladen"
   - "Als CSV exportieren"
   - "JSON Export"
4. File downloads automatically

### PDF Export Features

- Professional medical document layout
- Practice letterhead (configured in admin)
- All answers organized by section
- Triage alerts highlighted
- Signature lines for patient and doctor
- DSGVO compliance footer

### CSV Export Features

- UTF-8 encoded for Excel compatibility
- All session data in tabular format
- Triage events included
- Timestamp for all answers
- BOM header for proper German character display

### Security Notes

- All exports logged in audit trail
- PII decrypted only at export time
- Export rate limited (10 per 5 minutes)
- Files should be stored securely
- Delete downloaded files after use

---

## Tips & Tricks

### Efficiency Tips

1. **Keyboard Navigation**
   - Use Tab to move between fields
   - Enter to confirm actions
   - Escape to close modals

2. **Filtering Sessions**
   - Use status filters: Active, Completed, All
   - Search by patient name
   - Filter by date range
   - Filter by service type

3. **Bulk Actions**
   - Select multiple sessions
   - Export multiple PDFs
   - Mark multiple as reviewed

### Best Practices

1. **Check triage alerts first** - Always prioritize CRITICAL alerts
2. **Acknowledge promptly** - Clear alerts after taking action
3. **Use chat for simple communication** - Reduces phone calls
4. **Export before archiving** - Keep local copies as needed
5. **Log out when done** - Security best practice

### Common Workflows

**New Patient Session**:
1. Patient scans QR code
2. Form appears on dashboard
3. Monitor progress in real-time
4. Review upon completion
5. Export to PVS or print

**Rezeptanfrage**:
1. Patient submits request
2. Review in dashboard
3. Prepare prescription
4. Send "ready for pickup" message
5. Mark complete

**AU-Anfrage**:
1. Patient submits with symptoms
2. Review if AU justified
3. Issue AU if appropriate
4. Send notification
5. Mark complete

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + /` | Show keyboard help |
| `Esc` | Close modal/dialog |
| `Ctrl + R` | Refresh data |

### Dashboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` | Filter: All sessions |
| `2` | Filter: Active only |
| `3` | Filter: With alerts |
| `S` | Focus search box |
| `N` | Next page |
| `P` | Previous page |

### Session View Shortcuts

| Shortcut | Action |
|----------|--------|
| `E` | Export menu |
| `C` | Open chat |
| `Q` | Quick actions |
| `A` | Acknowledge triage |
| `M` | Mark complete |

### Admin Shortcuts

| Shortcut | Action |
|----------|--------|
| `U` | Users list |
| `L` | Audit log |
| `S` | System settings |
| `B` | Backup management |

---

## Support

### Getting Help

| Issue | Contact | Response |
|-------|---------|----------|
| Technical problems | support@diggai.de | < 4 hours |
| Feature requests | feedback@diggai.de | < 24 hours |
| Training needs | training@diggai.de | Schedule |
| Emergency | Hotline: +49 XXX XXX | < 1 hour |

### Training Resources

- **Video Tutorials**: https://diggai.de/training
- **Live Webinars**: Monthly, register on website
- **Documentation**: https://docs.diggai.de
- **FAQ**: See FAQ.md

---

*This guide is regularly updated. Check for the latest version at https://docs.diggai.de*
