# Compliance Evidence Index
## DiggAI Anamnese Platform v3.0.0

**Stand:** März 2026 | **Version:** 3.0-FINAL

---

## Übersicht

Dieses Verzeichnis enthält alle Nachweisdokumente für die Compliance-Zertifizierung der DiggAI Anamnese-Plattform.

| Standard | Status | Letzte Prüfung |
|----------|--------|----------------|
| DSGVO | ✅ Compliant | März 2026 |
| HIPAA | ✅ Compliant | März 2026 |
| BSI TR-02102-1 | ✅ Compliant | März 2026 |
| BSI TR-03161 | ✅ Compliant | März 2026 |

---

## Dokumentenstruktur

```
docs/
├── COMPLIANCE_DSGVO_CHECKLIST.md       # DSGVO Art. 32 TOM Checklist
├── COMPLIANCE_HIPAA_CHECKLIST.md       # HIPAA §164.312 Technical Safeguards
├── COMPLIANCE_BSI_CHECKLIST.md         # BSI TR-02102-1 / TR-03161
├── DSFA_FINAL.md                       # Datenschutz-Folgenabschätzung v3.0
├── VERFAHRENSVERZEICHNIS_FINAL.md      # Art. 30 DSGVO VVT
├── AVV_ANPASSUNG.md                    # Auftragsverarbeitungsverträge
├── TOM_DOKUMENTATION.md                # Technische Maßnahmen v2.0
├── INCIDENT_RESPONSE_PLAN.md           # Incident Response v2.0
├── SECURITY_AUDIT_REPORT_v3.0.0.md     # Sicherheits-Audit
├── compliance-evidence/
│   └── INDEX.md                        # Diese Datei
```

---

## DSGVO Evidence

### Art. 30 - Verzeichnis von Verarbeitungstätigkeiten

| Dokument | Pfad | Status |
|----------|------|--------|
| Verfahrensverzeichnis | `docs/VERFAHRENSVERZEICHNIS_FINAL.md` | ✅ v3.0 |

### Art. 32 - Technische und Organisatorische Maßnahmen (TOM)

| Dokument | Pfad | Status |
|----------|------|--------|
| TOM Dokumentation | `docs/TOM_DOKUMENTATION.md` | ✅ v2.0 |
| DSGVO Checklist | `docs/COMPLIANCE_DSGVO_CHECKLIST.md` | ✅ v3.0 |

### Art. 35 - Datenschutz-Folgenabschätzung (DSFA)

| Dokument | Pfad | Status |
|----------|------|--------|
| DSFA Final | `docs/DSFA_FINAL.md` | ✅ v3.0 |

### Art. 28 - Auftragsverarbeitung

| Dokument | Pfad | Status |
|----------|------|--------|
| AVV Vorlage | `docs/AVV_TEMPLATE.md` | ✅ v2.0 |
| AVV Anpassung | `docs/AVV_ANPASSUNG.md` | ✅ v3.0 |

---

## HIPAA Evidence

### §164.312 - Technical Safeguards

| Anforderung | Dokument | Code-Referenz |
|-------------|----------|---------------|
| Access Control (164.312(a)) | `COMPLIANCE_HIPAA_CHECKLIST.md` | `server/middleware/auth.ts` |
| Audit Controls (164.312(b)) | `COMPLIANCE_HIPAA_CHECKLIST.md` | `server/middleware/audit.ts` |
| Integrity (164.312(c)) | `COMPLIANCE_HIPAA_CHECKLIST.md` | `server/services/encryption.ts` |
| Person Authentication (164.312(d)) | `COMPLIANCE_HIPAA_CHECKLIST.md` | `server/middleware/auth.ts` |
| Transmission Security (164.312(e)) | `COMPLIANCE_HIPAA_CHECKLIST.md` | `docker/nginx.conf` |

---

## BSI Evidence

### TR-02102-1 - Kryptographische Verfahren

| Anforderung | Dokument | Implementierung |
|-------------|----------|-----------------|
| TLS 1.2+ | `COMPLIANCE_BSI_CHECKLIST.md` | `docker/nginx.conf:34` |
| AES-256-GCM | `COMPLIANCE_BSI_CHECKLIST.md` | `server/services/encryption.ts` |
| SHA-256 | `COMPLIANCE_BSI_CHECKLIST.md` | `server/services/encryption.ts:112` |
| HMAC-SHA256 | `COMPLIANCE_BSI_CHECKLIST.md` | `server/middleware/auth.ts:119` |
| ECDHE | `COMPLIANCE_BSI_CHECKLIST.md` | `docker/nginx.conf:35` |
| HSTS | `COMPLIANCE_BSI_CHECKLIST.md` | `docker/nginx.conf:41` |
| Secure Headers | `COMPLIANCE_BSI_CHECKLIST.md` | `docker/nginx.conf:41-47` |

### TR-03161 - eIDAS-Konforme Kryptographie

| Algorithmus | Verwendung | eIDAS-Level | Dokument |
|-------------|------------|-------------|----------|
| AES-256-GCM | Datenverschlüsselung | High | `COMPLIANCE_BSI_CHECKLIST.md` |
| SHA-256 | Hashing | High | `COMPLIANCE_BSI_CHECKLIST.md` |
| HMAC-SHA256 | JWT-Signatur | High | `COMPLIANCE_BSI_CHECKLIST.md` |
| ECDHE | Schlüsselaustausch | High | `COMPLIANCE_BSI_CHECKLIST.md` |

---

## Code Evidence

### Verschlüsselung

| Komponente | Datei | Funktion |
|------------|-------|----------|
| AES-256-GCM | `server/services/encryption.ts` | `encrypt()`, `decrypt()` |
| E-Mail Hashing | `server/services/encryption.ts` | `hashEmail()` |
| PII-Erkennung | `server/services/encryption.ts` | `isPIIAtom()` |

### Authentifizierung

| Komponente | Datei | Funktion |
|------------|-------|----------|
| JWT-Auth | `server/middleware/auth.ts` | `requireAuth()` |
| RBAC | `server/middleware/auth.ts` | `requireRole()` |
| Token-Blacklist | `server/middleware/auth.ts` | `blacklistToken()` |
| Session-Ownership | `server/middleware/auth.ts` | `requireSessionOwner()` |
| Permissions | `server/middleware/auth.ts` | `requirePermission()` |

### Audit

| Komponente | Datei | Funktion |
|------------|-------|----------|
| Audit-Logging | `server/middleware/audit.ts` | `auditLogger()` |
| Sanitisierung | `server/middleware/audit.ts` | `sanitizeObject()` |
| Retry-Logik | `server/middleware/audit.ts` | `writeAuditLogWithRetry()` |

### Input-Validierung

| Komponente | Datei | Funktion |
|------------|-------|----------|
| Text-Sanitisierung | `server/services/sanitize.ts` | `sanitizeText()` |
| Object-Sanitisierung | `server/services/sanitize.ts` | `sanitizeObject()` |
| Middleware | `server/services/sanitize.ts` | `sanitizeBody()` |

### TLS/Sicherheitsheader

| Komponente | Datei | Konfiguration |
|------------|-------|---------------|
| TLS 1.3 | `docker/nginx.conf` | `ssl_protocols` |
| Cipher Suites | `docker/nginx.conf` | `ssl_ciphers` |
| HSTS | `docker/nginx.conf` | `add_header Strict-Transport-Security` |
| Security Headers | `docker/nginx.conf` | `add_header X-Frame-Options`, etc. |

---

## Test Evidence

### Sicherheitstests

| Test | Werkzeug | Frequenz | Letzte Durchführung |
|------|----------|----------|---------------------|
| TLS-Konfiguration | SSL Labs | Bei Änderungen | März 2026 |
| Cipher Suites | testssl.sh | Jährlich | März 2026 |
| HTTP Security Headers | Mozilla Observatory | Bei Änderungen | März 2026 |
| npm Audit | npm audit | Bei jedem Deploy | Laufend |

### Unit Tests

| Komponente | Test-Datei | Status |
|------------|------------|--------|
| Encryption | `server/services/encryption.test.ts` | ✅ Pass |
| Auth | `server/middleware/auth.test.ts` | ✅ Pass |
| Audit | `server/services/audit.service.test.ts` | ✅ Pass |
| Sanitize | `server/services/sanitize.test.ts` | ✅ Pass |
| CSRF | `server/middleware/csrf.test.ts` | ✅ Pass |

### E2E Tests

| Spezifikation | Datei | Status |
|---------------|-------|--------|
| Anamnese-Flow | `e2e/anamnese.spec.ts` | ✅ Pass |
| Security | `e2e/security.spec.ts` | ✅ Pass |
| Questionnaire | `e2e/questionnaire-flow.spec.ts` | ✅ Pass |

---

## Zertifizierungsnachweise

### Hosting (Netlify)

| Zertifizierung | Nachweis | Gültig |
|----------------|----------|--------|
| SOC 2 Type II | Netlify Compliance Page | ✅ |
| ISO 27001 | Netlify Compliance Page | ✅ |
| EU-US Data Privacy Framework | Netlify DPA | ✅ |

### Zusätzliche Nachweise

| Zertifizierung | Status | Anmerkung |
|----------------|--------|-----------|
| ISO 27001 (Projekt) | ⏳ Empfohlen | Für 2027 planen |
| BSI Grundschutz | ✅ Vorbereitet | Dokumentation vorhanden |

---

## Änderungsverzeichnis

| Version | Datum | Änderung | Verantwortlich |
|---------|-------|----------|----------------|
| 1.0 | Juli 2025 | Erstversion | |
| 2.0 | September 2025 | Erweiterung | |
| 3.0 | März 2026 | Go-Live Final | |

---

**Dokument-Version:** 3.0-FINAL  
**Erstellt:** März 2026  
**Nächste Überprüfung:** März 2027
