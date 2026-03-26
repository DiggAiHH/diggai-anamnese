# DiggAI Troubleshooting Guide

> **Version**: 3.0.0  
> **Last Updated**: 2026-03-23  
> **Support**: support@diggai.de

---

## Table of Contents

1. [Login Issues](#login-issues)
2. [Patient Session Issues](#patient-session-issues)
3. [Technical Issues](#technical-issues)
4. [Export Issues](#export-issues)
5. [Triage Issues](#triage-issues)
6. [Emergency Contacts](#emergency-contacts)

---

## Login Issues

### "Ungültige Anmeldedaten" (Invalid Credentials)

**Symptoms**: Login fails with error message about invalid credentials.

**Common Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| Caps Lock enabled | Check keyboard, disable Caps Lock |
| Wrong keyboard layout | Verify DE/EN layout, special characters |
| Account deactivated | Contact admin to reactivate account |
| Account locked (5 failed attempts) | Wait 15 minutes or contact admin |
| Wrong username format | Use exact username (case-sensitive) |

**Steps to Resolve**:
1. Check Caps Lock indicator on keyboard
2. Try typing password in a text field to verify characters
3. Verify you're using the correct username (e.g., `dr.klaproth` not `Dr.Klaproth`)
4. If account locked, wait 15 minutes or contact administrator
5. Use "Passwort vergessen" if available, or contact admin for password reset

---

### "Session expired" / Token Expired

**Symptoms**: Automatic logout, "Session abgelaufen" message.

**Explanation**: 
- JWT tokens expire after 24 hours
- Inactivity timeout: 4 hours
- Security measure to prevent unauthorized access

**Solution**:
1. Click "Erneut anmelden" or navigate to login page
2. Re-enter credentials
3. Continue work from where you left off

**Prevention**:
- Save work regularly
- Don't leave sensitive patient data open on unattended screens
- Use "Angemeldet bleiben" option on trusted devices

---

### "Zu viele Anmeldeversuche" (Rate Limited)

**Symptoms**: Error message "Bitte warten Sie 15 Minuten"

**Explanation**: 
- 5 login attempts allowed per 15-minute window
- Security measure against brute-force attacks

**Solution**:
1. Wait exactly 15 minutes from last attempt
2. Contact administrator if urgent access needed
3. Administrator can manually unlock from admin panel

---

## Patient Session Issues

### "Session nicht gefunden"

**Symptoms**: Session ID returns 404 error.

**Common Causes**:

| Cause | Solution |
|-------|----------|
| Session expired (24h) | Start new session |
| Wrong session ID | Verify ID from QR code/link |
| Session deleted | Contact admin for recovery |
| Typo in URL | Check session ID carefully |

**Steps**:
1. Check session creation timestamp
2. If > 24 hours old, start new session
3. Verify correct session ID in URL
4. Contact support if data recovery needed

---

### "Session ist bereits abgeschlossen"

**Symptoms**: Cannot submit answers, "Session bereits abgeschlossen" message.

**Explanation**:
- Patient already submitted the form
- Or doctor marked session as completed

**Solutions**:

| Scenario | Action |
|----------|--------|
| Patient needs to edit | Create new correction session |
| Doctor review needed | Access via Arzt Dashboard |
| Data export needed | Use Export function |
| Reactivation required | Admin can change status via database |

---

### "Kann Antwort nicht speichern"

**Symptoms**: Answer submission fails or times out.

**Possible Causes**:
1. **Network connection lost**
   - Check WiFi/Ethernet connection
   - Retry submission
   
2. **Rate limit exceeded**
   - Max 30 answers per minute
   - Wait a moment and retry
   
3. **Invalid atomId**
   - Question ID doesn't exist
   - Refresh page to get valid flow
   
4. **Browser cache issues**
   - Clear browser cache
   - Hard refresh (Ctrl+F5)
   - Try different browser

---

### Progress Not Saving

**Symptoms**: Answers lost when refreshing page.

**Solutions**:

1. **Check browser storage**:
   - Ensure cookies enabled
   - LocalStorage not cleared
   - Private/Incognito mode disabled

2. **Verify auto-save**:
   - Progress saves every 30 seconds
   - Or on each "Weiter" click
   - Check for error messages

3. **Recovery options**:
   - Return patient to waiting room
   - Provide new QR code
   - Pre-fill known data

---

## Technical Issues

### Slow Performance / Loading Issues

**Symptoms**: Pages load slowly, timeouts, laggy interface.

**Diagnostic Steps**:

1. **Check network status**:
   ```bash
   # Run from terminal/command prompt
   ping api.diggai.de
   ```

2. **Check system health**:
   - Visit: `https://status.diggai.de`
   - Or: `GET /api/system/health`

3. **Browser diagnostics**:
   - Open Developer Tools (F12)
   - Check Network tab for failed requests
   - Check Console for JavaScript errors

**Solutions**:

| Issue | Solution |
|-------|----------|
| High latency | Check local network, restart router |
| Browser slow | Clear cache, close other tabs |
| Old browser | Update to latest Chrome/Firefox/Safari |
| Server issues | Check status page, contact support |

---

### Dashboard Not Updating

**Symptoms**: New sessions don't appear, triage alerts stale.

**Solutions**:

1. **Socket.IO connection**:
   - Check browser console for WebSocket errors
   - Refresh page to reconnect
   - Verify firewall allows WebSocket connections

2. **Manual refresh**:
   - Click refresh button in dashboard
   - Or press F5
   - Data always fetches latest from server

3. **Browser compatibility**:
   - Use supported browser (Chrome, Firefox, Safari, Edge)
   - Disable aggressive ad blockers
   - Allow JavaScript execution

---

### Error 500 / Internal Server Error

**Symptoms**: "Interner Serverfehler" message.

**Immediate Actions**:

1. **Don't panic** - Patient data is safe
2. **Note the time** - Helps with log correlation
3. **Try again** - Temporary glitch may resolve
4. **Contact support** if persistent:
   - Email: support@diggai.de
   - Include: timestamp, user action, error message

**Common Causes**:
- Temporary database connectivity issue
- Background job overload
- Memory pressure on server
- Deployment in progress

---

## Export Issues

### Export Fails / Times Out

**Symptoms**: CSV/PDF export doesn't start or fails.

**Solutions**:

| Issue | Solution |
|-------|----------|
| Large session data | Try JSON export first (lighter) |
| Rate limit (10/5min) | Wait 5 minutes, retry |
| Browser pop-up blocked | Allow pop-ups for diggai.de |
| Permission denied | Verify ARZT/MFA/ADMIN role |

**Alternative Export Methods**:
1. Use JSON export (API): `GET /api/export/sessions/{id}/export/json`
2. Direct database query (admin only)
3. Scheduled backup export

---

### PDF Export Format Issues

**Symptoms**: PDF looks wrong, formatting broken.

**Solutions**:
1. Use browser print-to-PDF instead of built-in export
2. Open HTML export and print to PDF
3. Check for special characters in patient data
4. Update browser to latest version

---

## Triage Issues

### Critical Alert Not Firing

**Symptoms**: Patient reports chest pain but no CRITICAL alert.

**Possible Reasons**:
1. **Answer combination incomplete** - ACS requires chest pain + (dyspnea OR paralysis)
2. **Triage already acknowledged** - Check previous alerts
3. **Engine temporarily offline** - Check system health
4. **Rule criteria not met** - Review TRIAGE_RULES.md

**Manual Triage**:
- Always use clinical judgment
- System is assistive, not authoritative
- Document manual triage decisions

---

### Triage Alert Won't Acknowledge

**Symptoms**: Clicking acknowledge doesn't clear alert.

**Solutions**:
1. Check network connection
2. Verify correct triage event ID
3. Try hard refresh (Ctrl+F5)
4. Check if already acknowledged by another doctor
5. Contact admin if persists

---

## Integration Issues

### PVS Export Not Working

**Symptoms**: Cannot export to Praxisverwaltungssystem.

**Checklist**:
- [ ] PVS integration enabled in settings
- [ ] Correct PVS credentials configured
- [ ] PVS server accessible from DiggAI server
- [ ] Patient data complete (name, DOB required)

**Manual Export**:
1. Export as CSV/JSON
2. Import manually into PVS
3. Contact support for integration setup

---

### TI/ePA Connection Failed

**Symptoms**: Cannot access electronic patient record.

**Solutions**:
1. Verify TI_ENABLED environment variable
2. Check Gematik connector status
3. Verify SMC-B card inserted
4. Contact Gematik support if infrastructure issue

---

## Emergency Contacts

### Technical Support

| Channel | Contact | Response Time |
|---------|---------|---------------|
| Email | support@diggai.de | < 4 hours (business) |
| Emergency Hotline | +49 (0) XXX XXX XXX | < 1 hour (24/7) |
| Status Page | https://status.diggai.de | Real-time |

### Medical Emergency

⚠️ **For medical emergencies affecting patient safety:**

1. **Immediate**: Call 112 (German emergency number)
2. **Document**: Note issue in patient record
3. **Report**: Contact DiggAI medical safety team
4. **Follow-up**: Submit incident report within 24h

### Incident Report Template

```
Subject: [CRITICAL/WARNING] - Brief description

Time: YYYY-MM-DD HH:MM
User: username / role
Session ID: (if applicable)
Patient Impact: Yes/No
Description: What happened
Steps Taken: Actions performed
Current Status: Resolved/Ongoing
```

---

## Quick Fixes

### Clear Browser Data

**Chrome**:
1. Settings → Privacy → Clear browsing data
2. Select "Cached images and files"
3. Select "Cookies and other site data"
4. Time range: "Last 24 hours"
5. Click "Clear data"

**Firefox**:
1. Menu → Settings → Privacy & Security
2. Cookies and Site Data → Clear Data
3. Check both boxes → Clear

### Hard Refresh

- **Windows**: Ctrl + F5
- **Mac**: Cmd + Shift + R
- **Linux**: Ctrl + F5

### Check Console for Errors

1. Press F12 to open Developer Tools
2. Click "Console" tab
3. Look for red error messages
4. Screenshot and send to support

---

## FAQ

**Q: Can I recover a deleted session?**  
A: Sessions are soft-deleted for 30 days. Contact admin with session ID for recovery.

**Q: Why is my export missing patient name?**  
A: Check encryption key configuration. If rotated, old data may not decrypt.

**Q: Can I use DiggAI offline?**  
A: Patient form works offline (answers saved locally), but submission requires connection.

**Q: How do I reset my password?**  
A: Contact admin. Self-service password reset coming in v3.1.

---

*This document is maintained by DiggAI Technical Support Team.*
