# Technische und Organisatorische Maßnahmen (TOM) — Art. 32 DSGVO
## DiggAI Anamnese-Anwendung

---

**Version:** 2.0 | **Stand:** Juli 2025

---

## 1. Vertraulichkeit (Art. 32 Abs. 1 lit. b DSGVO)

### 1.1 Zutrittskontrolle (physisch)

| Maßnahme | Status |
|----------|--------|
| Hosting bei Netlify — SOC 2 Type II, ISO 27001 zertifizierte Rechenzentren | ✅ |
| Kein eigener physischer Server in der Praxis (Cloud-Hosting) | ✅ |
| Praxis: Verschlossene Räume, Zugang nur für autorisiertes Personal | ⚙️ Praxis |

### 1.2 Zugangskontrolle (logisch)

| Maßnahme | Status | Implementierung |
|----------|--------|-----------------|
| JWT-basierte Authentifizierung (Bearer Token) | ✅ | `server/middleware/auth.ts` |
| Passwort-Hashing: bcrypt (12 Runden, Salt) | ✅ | `bcryptjs` |
| Rate Limiting: 5 Login-Versuche / 15 min | ✅ | `express-rate-limit` |
| Kein Token in URLs (nur Authorization Header) | ✅ | Auth Middleware |
| JWT Algorithm Pinning (HS256) | ✅ | Auth Middleware |
| Token-Blacklist bei Logout | ✅ | JTI-basiert |
| MFA für Ärzte/Admin | ⏳ | Phase 3 geplant |

### 1.3 Zugriffskontrolle (Berechtigung)

| Rolle | Berechtigungen |
|-------|---------------|
| **Patient** | Nur eigene Session: Antworten, Chat, Wartezimmer |
| **MFA** | Alle Patientensessions: Lesen, Chat, Terminverwaltung |
| **Arzt** | Alle Sessions: Lesen/Schreiben, Triage, Diagnose |
| **Admin** | Vollzugriff: Benutzerverwaltung, Audit-Logs, Konfiguration |

Implementiert durch: `requireAuth()`, `requireRole()`, `requireSessionOwner()`

### 1.4 Trennungskontrolle

| Maßnahme | Status |
|----------|--------|
| Session-gebundene Datenisolation (Patienten nur eigene Session) | ✅ |
| Rollenbasierte API-Endpunkte (getrennte Routen) | ✅ |
| Getrennte Rate-Limiter pro Endpunkt-Kategorie | ✅ |

---

## 2. Integrität (Art. 32 Abs. 1 lit. b DSGVO)

### 2.1 Weitergabekontrolle (Transport)

| Maßnahme | Detail | Status |
|----------|--------|--------|
| **TLS 1.3** | HTTPS erzwungen über HSTS | ✅ |
| **HSTS** | `max-age=31536000; includeSubDomains; preload` | ✅ |
| **CORS** | Restriktiv: nur `config.frontendUrl` | ✅ |
| **CSP** | Strict: `default-src 'self'`, kein `unsafe-inline` für Scripts | ✅ |
| **X-Frame-Options** | DENY | ✅ |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | ✅ |
| **Permissions-Policy** | Kamera=self, Mikro/Geo/Pay=gesperrt | ✅ |
| **Cross-Origin Policies** | COEP, COOP, CORP: same-origin | ✅ |

### 2.2 Eingabekontrolle (Datenvalidierung)

| Maßnahme | Detail | Status |
|----------|--------|--------|
| **Zod-Validierung** | Serverseitig auf allen Endpunkten | ✅ |
| **Body-Size-Limit** | Max. 10 MB | ✅ |
| **Prisma ORM** | Parameterisierte Queries (kein SQL-Injection) | ✅ |
| **Audit-Log Sanitisierung** | Sensitive Keys redacted, User-Agent sanitized | ✅ |
| **Upload-Validierung** | Dateitypprüfung, Größenlimit, Rate Limiting | ✅ |

---

## 3. Verfügbarkeit und Belastbarkeit (Art. 32 Abs. 1 lit. b+c DSGVO)

### 3.1 Verfügbarkeitskontrolle

| Maßnahme | Status |
|----------|--------|
| Netlify CDN: Multi-Region, automatisches Failover | ✅ |
| SLA: 99.99% Uptime | ✅ |
| Serverless Functions: Auto-Scaling | ✅ |
| Automatische Session-Bereinigung (24h TTL) | ✅ |
| Error Handler: verhindert Server-Crash bei Fehlern | ✅ |

### 3.2 Wiederherstellbarkeit

| Maßnahme | Status |
|----------|--------|
| Datenbank-Backup | ⚙️ Praxis-Verantwortung |
| Code-Versionierung: Git/GitHub | ✅ |
| Infrastructure-as-Code: `netlify.toml`, `prisma/schema.prisma` | ✅ |
| Deploy-Rollback via Netlify | ✅ |

---

## 4. Verfahren zur regelmäßigen Überprüfung (Art. 32 Abs. 1 lit. d DSGVO)

| Maßnahme | Frequenz | Status |
|----------|----------|--------|
| DSFA-Review | Jährlich | ✅ Dokument erstellt |
| Audit-Log-Auswertung | Monatlich | ✅ Infrastruktur vorhanden |
| Penetration Test | Jährlich | ⏳ Empfohlen |
| TOM-Review | Jährlich | ✅ Dieses Dokument |
| Incident Response Übung | Jährlich | ✅ Plan erstellt |
| Datenschutz-Schulung Personal | Jährlich | ⚙️ Praxis |
| Software-Updates / Dependency-Audit | Monatlich | ⏳ |

---

## 5. Verschlüsselung (Art. 32 Abs. 1 lit. a DSGVO)

| Datenkategorie | Verschlüsselung | Algorithmus |
|----------------|-----------------|-------------|
| Transportschicht | TLS 1.3 | ChaCha20-Poly1305 / AES-256-GCM |
| PII-Felder (Name, Adresse, etc.) | Anwendungsebene | AES-256-GCM |
| Passwörter | Hash + Salt | bcrypt (12 Runden) |
| JWT-Tokens | HMAC-Signierung | HS256 |
| Datenbank (SQLite) | Dateisystem-Verschlüsselung | OS/Hosting-abhängig |

---

## 6. Datenlöschung & Datenminimierung

| Maßnahme | Implementierung |
|----------|-----------------|
| Automatische Löschung abgelaufener Sessions (24h TTL) | `server/jobs/cleanup.ts` |
| Bestandspatienten-Gating (keine Doppelerfassung) | `showIf` auf RES-100, AU-100, UEB-100, BEF-100 |
| Konditionale Fragenlogik (nur relevante Fragen) | `questionLogic.ts` |
| Cascade-Löschung (Session → Answers, Chat, Triage) | Prisma `onDelete: Cascade` |
| Log-Retention (3 Jahre für Audit-Logs) | ⏳ Geplant |

---

## 7. Cookie-/Consent-Management

| Maßnahme | Status |
|----------|--------|
| Cookie-Consent-Banner (TTDSG §25) | ✅ `CookieConsent.tsx` |
| Granulare Consent-Kategorien (Essenziell/Funktional/Statistik) | ✅ |
| DSGVO-Einwilligung mit Gamification | ✅ `DatenschutzGame.tsx` |
| Consent-Versionierung (Re-Consent bei Änderungen) | ✅ |
| Datenschutzerklärung (Art. 13/14) | ✅ `/datenschutz` |
| Impressum (§5 DDG) | ✅ `/impressum` |

---

**Erstellt:** Juli 2025  
**Nächste Überprüfung:** Juli 2026  
**Genehmigt von:** [Unterschrift Verantwortlicher]
