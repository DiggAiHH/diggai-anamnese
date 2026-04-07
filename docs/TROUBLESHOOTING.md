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

### Browser Compatibility Issues

**Symptoms**: Features don't work (voice input, file upload), styling broken.

**Browser Support Matrix**:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| **Voice Input** | ✅ v50+ | ✅ v53+ | ✅ v14.1+ | ✅ v79+ |
| **WebAuthn** | ✅ v67+ | ✅ v67+ | ⚠️ iOS only | ✅ v79+ |
| **IndexedDB** | ✅ | ✅ | ✅ | ✅ |
| **Service Worker** | ✅ | ✅ | ✅ | ✅ |
| **PDF Export** | ✅ | ✅ | ✅ | ✅ |

**Solutions**:
1. Update to latest browser version
2. Disable browser extensions (ad blockers, VPNs)
3. Try incognito/private mode
4. Clear cache and cookies
5. Try different browser

---

### "Cannot Read Property..." (JavaScript Errors)

**Symptoms**: Error messages like "Cannot read property 'map' of undefined"

**Common Causes**:
1. **API endpoint returns unexpected format** → Check API_REFERENCE.md
2. **Component receives null props** → Verify data loading
3. **Stale data in localStorage** → Clear browser storage
4. **Browser extension interference** → Disable all extensions

**Debug Steps**:
```javascript
// Open browser console (F12)
// Check:
localStorage.clear(); // Clear cache
location.reload(); // Reload page

// Check API response
fetch('/api/sessions')
  .then(r => r.json())
  .then(d => console.log(d))
```

---

### PDF Export Not Working

**Symptoms**: Export button doesn't respond, PDF corrupted, blank PDF.

**Common Issues**:

| Symptom | Cause | Solution |
|---------|-------|----------|
| Export button disabled | Session not completed | Complete session first |
| Blank PDF generated | CSS not loaded | Disable adblockers |
| PDF too large (>50MB) | Session too long | Trim session data, try again |
| Export times out | Large file (>100 pages) | Save as HTML instead, print to PDF |
| Special chars corrupt | Encoding issue | Use Chrome/Chromium browser |

**Steps**:
1. Verify session is fully completed
2. Check browser memory (Close other tabs)
3. Try export from different browser
4. Contact support if data urgently needed

---

## Export & Data Issues

### "Export Failed" or "Download Interrupted"

**Symptoms**: Export process starts but fails, download incomplete.

**Solutions**:

1. **Network interruption**:
   - Check internet connection
   - Retry export
   - Use mobile hotspot if WiFi unstable

2. **Browser download settings**:
   - Enable downloads
   - Check download folder has space
   - Restart browser if stuck

3. **Server timeout**:
   - For exports >100MB, try later
   - Contact support for technical export

---

### "Cannot Export Patient Data" (GDPR)

**Symptoms**: Data export via GDPR "Right to Access" fails.

**What This Feature Does**:
- Exports: Patient record, all sessions, documents, audit log
- Format: JSON + PDF
- Time: Usually within 24-48 hours

**If Export Fails**:
1. Verify patient email is correct
2. Check spam folder for email link
3. Contact Data Protection Officer
4. Response SLA: 30 days (GDPR legal requirement)

---

### Import Data / Bulk Upload

**Symptoms**: Cannot import patient list, medical records, or previous histories.

**Important Note**: 
- Currently import NOT supported (v3.0)
- Planned for v3.2
- Manual entry or PVS sync required

**Workaround**:
- Use PVS integration (Tomedo, etc.) to auto-sync patients
- Contact support for custom import script

---

## Triage & Medical Issues

### Triage Alert Not Triggering

**Symptoms**: Patient reports critical symptoms but no alert appears.

**Check Triage Rules**:
Visit: https://github.com/DiggAiHH/diggai-anamnese/blob/main/docs/TRIAGE_RULES.md

**Possible Causes**:

| Cause | Solution |
|-------|----------|
| Symptom not in trigger list | Review TRIAGE_RULES.md, add if needed |
| Question ID wrong | Verify question exists in catalog |
| Tenant disabled rule | Admin check: Tenant → Triage Settings |
| Time-based rule (only certain hours) | Check if office hours filter |

**Manual Alert Option**:
- Doctor can manually mark as CRITICAL from dashboard
- Alert sent immediately to all staff

---

### "ICD-10 Code Not Found"

**Symptoms**: AI recommends code that doesn't exist, or code rejected by PVS.

**Solutions**:
1. Check code against official German ICD-10 GMT catalog
2. Use closest valid code (e.g., A00.0 if A00 not accepted)
3. Contact coding department for clarification
4. Log issue for AI model update

**Reference**: https://www.bfarm.de/DE/Kodiersysteme/ICD/ICD-10-GM/icd-10-gm-node.html

---

### Therapy Plan Not Generating

**Symptoms**: AI skips therapy plan, shows empty recommendations.

**Possible Causes**:
- Session incomplete (need all critical Q's answered)
- Medical record insufficient for AI
- AI service unavailable (check status)
- Tenant has AI disabled

**Check**:
1. Verify session 100% complete
2. Check if AI service online: `GET /api/ai/health`
3. Admin → Tenant Settings → AI Enabled?
4. Contact support if AI persistently fails

---

## Network & Connectivity Issues

### "Network Error" / "API Unreachable"

**Symptoms**: All API calls fail, "Cannot connect to server" message.

**Diagnostic Steps**:

```bash
# 1. Check server status
curl https://api.diggai.de/api/live

# 2. Check DNS
nslookup api.diggai.de

# 3. Check firewall
# (On company network?) Contact IT

# 4. Check VPN
# (Using VPN?) Try disabling to test
```

**Solutions**:

| Scenario | Action |
|----------|--------|
| You see error, others don't | Local network issue |
| Everyone affected | Server down, check status page |
| Only API fails, website works | Backend service down |
| Only mobile/WiFi fails | Network quality issue |

---

### CORS Error (Cross-Origin Request)

**Symptoms**: Browser console shows: "CORS error" or "Access-Control-Allow-Origin"

**Explanation**:
- Frontend and backend on different domains
- Security measure to prevent unauthorized access

**Common Causes**:
1. Accessing from wrong domain
2. Frontend URL not configured in backend
3. Using self-signed SSL cert with different domain

**Solutions**:
1. **Admin check backend config**:
   - `FRONTEND_URL` env var correct?
   - Matches your actual frontend domain?

2. **Verify domains match**:
   - Frontend: https://yourdomain.com
   - Backend: https://api.yourdomain.com
   - Both must be same origin (or configured in CORS)

3. **Development workaround**:
   - Use localhost:5173 + localhost:3001 together

---

### SSL/Certificate Issues

**Symptoms**: "Unsafe", "Certificate expired", "ERR_CERT_*" messages.

**Causes**:

| Message | Cause | Solution |
|---------|-------|----------|
| "Not Secure" | No HTTPS | Use HTTPS URL only |
| Certificate expired | Cert renewal failed | Renew with certbot |
| Wrong domain | Cert for different domain | Get cert for correct domain |
| Self-signed | Dev cert used in production | Get real cert from Let's Encrypt |

**Verify Certificate**:
```bash
# Check expiration
openssl s_client -connect yourdomain.com:443

# Check certificate details
curl -vI https://yourdomain.com 2>&1 | grep -i certificate
```

---

## Docker & Infrastructure Issues

### Docker Container Won't Start

**Symptoms**: `docker compose up` fails, container exits immediately.

**Diagnostic Steps**:

```bash
# 1. Check logs
docker compose logs app

# 2. Check database connection
docker compose logs db

# 3. Check environment
docker compose config | grep -E 'DATABASE_URL|JWT_SECRET'

# 4. Restart everything
docker compose down && docker compose up --build
```

**Common Causes**:

| Error | Solution |
|-------|----------|
| Port already in use | `docker compose down`, or use different port |
| Database won't start | Check disk space, Docker image corrupt → `docker system prune` |
| OutOfMemory error | Docker not enough RAM → increase Docker Desktop memory |
| Permission denied | Run `sudo ... ` or add user to docker group |

---

### Database Connection Failures

**Symptoms**: "Connection timeout", "Database unavailable", "ECONNREFUSED".

**Solutions**:

```bash
# 1. Check database running
docker compose ps | grep postgres

# 2. Check database logs
docker compose logs db

# 3. Verify connection string
echo $DATABASE_URL

# 4. Test connection manually
PGPASSWORD=password psql -h localhost -U postgres -d anamnese_dev

# 5. Restart database
docker compose restart db
```

**Common Issues**:
- Wrong DATABASE_URL format
- Database container not started
- Password incorrect
- Disk full (no space for database)

---

### Redis Connection Issues (Optional)

**Symptoms**: Rate limiting not working, cache not working.

**Check**:
```bash
# Redis running?
docker compose ps | grep redis

# Can connect?
redis-cli ping

# Check keys
redis-cli KEYS "*"
```

**Note**: Redis is optional. App works fine without it (slower rate limiting).

---

## Performance & Load Issues

### Dashboard Slow with Large Datasets

**Symptoms**: Admin dashboard loads slowly (>5 seconds) with many sessions.

**Cause**: Pagination not yet implemented for session list.

**Solutions**:

1. **Filter by date range**:
   - Load only last 30 days
   - Use search/filter features

2. **Use API directly** (for custom reports):
   ```bash
   curl "https://api.diggai.de/api/sessions?skip=0&take=100" \
     -H "Authorization: Bearer <token>"
   ```

3. **Contact support for full export**:
   - Can export all sessions to CSV

---

### High CPU / Memory Usage

**Symptoms**: Server sluggish, CPU at 100%, browser slow.

**Diagnose**:

```bash
# Check resource usage
docker stats

# Check slow database queries
docker compose exec db psql -U postgres -c "\timing" -c "SELECT * FROM sessions LIMIT 1"
```

**Solutions**:
1. Increase server resources (VPS plan)
2. Reduce cache retention (Redis config)
3. Archive old sessions (move to backup database)
4. Contact support for query optimization

---

## File Upload & Storage Issues

### File Upload Fails

**Symptoms**: Upload button doesn't work, file rejected, upload times out.

**Common Issues**:

| Issue | Solution |
|-------|----------|
| File too large (>10MB) | Use smaller file (< 5MB recommended) |
| Wrong file type | Only PDF, JPG, PNG supported |
| Upload times out | Large file + slow internet, retry |
| Space full | Server disk full, contact admin |
| Permissions denied | User doesn't have upload permission |

**Allowed File Types**:
- Images: JPG, PNG (max 2MB)
- Documents: PDF (max 10MB)
- Medical records: DICOM (max 20MB)

---

### Missing Uploaded Files

**Symptoms**: File uploaded successfully but doesn't appear, or gets deleted.

**Explanation**:
- Files auto-deleted after 30 days
- Or archived to separate storage

**Recovery**:
- Check archive/backup storage
- Request recovery from support (within 90 days)
- After 90 days, permanently deleted (GDPR)

---

## Admin & Configuration Issues

### Cannot Log In as Admin

**Symptoms**: Admin login fails, insufficient permissions, access denied.

**Check Account Status**:
1. Verify user exists: Admin → Users → Search by name
2. Check role: Should be "Admin"
3. Check if locked: If locked, unlock from database
4. Reset password: Admin → Reset User Password

**Direct Database Recovery**:
```sql
-- Check if admin exists
SELECT * FROM "User" WHERE role = 'ADMIN';

-- If none, create one
INSERT INTO "User" (id, username, password_hash, role)
VALUES ('user123', 'admin', '<bcrypt-hash>', 'ADMIN');
```

---

### Settings Changes Not Taking Effect

**Symptoms**: Update setting but no change, reverts back.

**Solutions**:
1. Hard refresh page (Ctrl+Shift+R)
2. Verify setting saved (check database)
3. Clear browser cache
4. Restart backend: `docker compose restart app`

---

## Billing & Stripe Issues

### Stripe Integration Failing

**Symptoms**: Cannot create subscription, payment rejected, Stripe API errors.

**Check**:
1. Verify keys in `.env`:
   ```bash
   echo $STRIPE_SECRET_KEY $STRIPE_PUBLIC_KEY
   ```
2. Are keys live (not test)? Live keys start with `sk_live_`
3. Check webhook secret configured
4. Test API key: `curl https://api.stripe.com/v1/customers -u sk_xxx:`

**Common Issues**:

| Issue | Solution |
|-------|----------|
| "Invalid API Key" | Copy key exactly (no extra spaces) |
| "Webhook secret invalid" | Update STRIPE_WEBHOOK_SECRET in .env |
| "Payment declined" | Check card is valid, try different card |
| "Wrong account" | Using test keys? Switch to live |

---

## Email & Communication Issues

### Confirmation Emails Not Received

**Symptoms**: Patient doesn't receive MFA email, password reset email, etc.

**Solutions**:

1. **Check spam folder** (most common!)
2. **Check sender email configured**:
   - Admin → Email Settings
   - Verify `EMAIL_FROM` correct

3. **Check SMTP server** (if using custom):
   ```bash
   curl -X POST http://localhost:3001/api/system/test-email \
     -H "Authorization: Bearer <token>" \
     -d '{"to": "test@example.de"}'
   ```

4. **Contact email provider**:
   - Some block automated emails
   - May need to whitelist `mail.diggai.de`

---

### SMS Not Sending (If Enabled)

**Symptoms**: SMS not received, SMS integration fails.

**Note**: SMS not bundled (Twilio integration optional).

**If Using Twilio**:
1. Verify API credentials in `.env`
2. Check account has credits
3. Verify phone numbers in E.164 format (+49...)
4. Contact Twilio support for delivery issues

---

## Multi-Language & Localization Issues

### Text Not Translating / Wrong Language

**Symptoms**: German text showing instead of Turkish, placeholders showing (t('key.missing'))

**Solutions**:
1. Check browser language: Settings → Language
2. Clear cache: Clearing browser cache
3. Verify translation file exists:
   - Check `public/locales/{lang}/translation.json`
4. Admin must add active language

**Adding Language*:
1. Admin → Localization
2. Select language (e.g., Chinese, Japanese)
3. Translations load automatically

---

### Special Characters Broken (Umlauts, Arabic, etc.)

**Symptoms**: Ü shows as "Â»", Arabic text renders backwards.

**Solutions**:
1. Ensure UTF-8 encoding (should be default)
2. Update browser (old versions have charset bugs)
3. Check PDF font supports characters
4. Contact support for RTL language issues

---

## Integration Issues

### PVS Integration Not Syncing

**Symptoms**: Patient list not importing, diagnoses not sending to PVS, notes not syncing back.

**Check Connection**:
```bash
curl -X GET "https://api.diggai.de/api/pvs/health" \
  -H "Authorization: Bearer <token>"
```

**Tomedo Sync Issues**:
1. Verify API key in Admin → PVS Settings
2. Test connection (green checkmark should appear)
3. Check Tomedo on same network (if on-premises)
4. Check firewall allows outbound to Tomedo IP

**Manual Sync**:
```bash
curl -X POST "https://api.diggai.de/api/pvs/sync-all" \
  -H "Authorization: Bearer <token>"
```

---

### Webhook Not Receiving Events

**Symptoms**: Configured webhook but no events arrive.

**Check**:
1. Webhook URL public + accessible (not localhost!)
2. Verify TLS certificate valid
3. Check firewall allows inbound on webhook port
4. Verify secret key correct (for signature validation)
5. Check logs: Admin → Webhooks → View Logs

**Test Webhook**:
```bash
curl -X POST "https://yourpvs.com/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Emergency Contacts

| Situation | Contact | Response Time |
|-----------|---------|----------------|
| **Critical (patient data loss)** | security@diggai.de | 2 hours |
| **High (system down)** | support@diggai.de | 4 hours |
| **Medium (features broken)** | support@diggai.de | 24 hours |
| **Low (question/documentation)** | faq@diggai.de | 48 hours |
| **Compliance/Legal** | compliance@diggai.de | 24 hours |
| **Security Vulnerability** | security@diggai.de | 24 hours |

---

**Still need help?**
- 📚 Full docs: [README.md](../README.md)
- 🚀 Getting started: [QUICKSTART.md](./QUICKSTART.md)
- 🔒 Security: [SECURITY.md](./SECURITY.md)
- 🤖 API: [API_REFERENCE.md](./API_REFERENCE.md)

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
