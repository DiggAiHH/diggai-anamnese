# DiggAi Capture — IT-Sicherheitskonzept nach BSI-Grundschutz

**Version:** 0.1  
**Stand:** 2026-05-07  
**Verfasser:** ENG (Lauf claude-code-10)  
**Geltungsbereich:** DiggAi Capture — digitale Patientenanmeldung (Klasse I in Selbstverifizierung nach MDR Art. 2(1) / Fallback Klasse I)  
**Klassifizierung:** Intern — Vertraulich  

**Erfüllt:**  
BSI IT-Grundschutz (BSI-Standard 200-2), B3S Krankenhaus-IT (als Referenzrahmen), DSGVO Art. 32, MDR Anh. I Nr. 17.2 + 18 (Cybersecurity), MDCG 2019-16, DiGA-Anforderungskatalog §139e SGB V  

**Querverweise:**  
- E5: `docs/SECURITY_ENCRYPTION_CONCEPT.md` — Verschlüsselungsdetails (§2 dieses Dokuments)  
- E3: `docs/BACKUP_RECOVERY_CONCEPT.md` — Backup-/Recovery-Details (§8 dieses Dokuments)  
- D2: `docs/TECH_DOC_MDR_ANHANG_II_S1_S3_S5_v0.1.md` — MDR-Technische Dokumentation  

---

## §1 Geltungsbereich und Schutzbedarfsfeststellung

### 1.1 Anwendungsbereich

Dieses IT-Sicherheitskonzept gilt für **DiggAi Capture** — die digitale Patientenanmeldungs-Plattform der DiggAi GmbH (i.Gr.), Hamburg. Capture ermöglicht es Patienten, vor dem Praxisbesuch Stammdaten, Anliegen und Einwilligungen digital zu erfassen.

**Nicht im Geltungsbereich:** DiggAi Suite (Arzt-Dashboard, Dokumentation, KI-gestützte Analyse) — diese Komponenten sind durch das `DECISION_SUPPORT_ENABLED`-Flag getrennt und unterliegen einem separaten Sicherheitskonzept.

### 1.2 Schutzbedarfsfeststellung

| Verarbeitete Datenkategorie | Beispiele | Schutzbedarf (BSI) |
|-----------------------------|-----------|-------------------|
| Stammdaten (Identifikatoren) | Name, Geburtsdatum, Adresse, Versichertennummer, E-Mail, Telefon | **sehr hoch** |
| Gesundheitsdaten Art. 9 DSGVO | Anliegen-Freitext, Symptom-Stichworte, strukturierte Antworten | **sehr hoch** |
| Einwilligungserklärungen | DSGVO-Consent-Timestamps mit Session-ID | **hoch** |
| Technische Metadaten | Session-IDs, Tenant-IDs (BSNR), Audit-Log-Einträge | **normal** |
| Öffentliche Inhalte | Landing-Page-Texte, i18n-Dateien, IFU | **normal** |

**Gesamt-Schutzbedarf:** sehr hoch (Hochpunkt-Methode nach BSI 200-2 §8.2). Maßgeblich ist die Verarbeitung von Gesundheitsdaten Art. 9 DSGVO.

### 1.3 Geltende Normen und Standards

| Standard | Relevanz |
|----------|----------|
| BSI IT-Grundschutz BSI-Standard 200-2 | Methodischer Rahmen |
| B3S Krankenhaus-IT (KH-IT) | Branchenspezifischer Referenzrahmen für Gesundheitsanwendungen |
| DSGVO Art. 32 | Technisch-organisatorische Maßnahmen (TOMs) |
| MDR Anh. I Nr. 17.2 + 18 | Cybersecurity-Anforderungen für Medizinprodukte |
| MDCG 2019-16 | Leitfaden Cybersecurity für Medizinprodukte |
| DiGA-Anforderungskatalog BfArM | §139e SGB V: Sicherheitsanforderungen für digitale Gesundheitsanwendungen |
| OWASP Top 10 (2021) | Anwendungssicherheits-Referenz |
| IEC 62443 (informativ) | Industrielle IT-Sicherheit (OT-Aspekte nicht relevant für reine SaaS) |

---

## §2 Systemarchitektur und Asset-Inventar

### 2.1 Systemlandschaft

```
Internet / Patient-Gerät
        │
        ▼ HTTPS/TLS 1.3
┌───────────────────────────────────┐
│   Netlify CDN (EU-Region)        │  ← Frontend (React SPA)
│   diggai.de / diggai-anamnese.   │    Statische Assets
│   netlify.app                    │    CSP, HSTS, X-Frame-Options
└───────────────┬───────────────────┘
                │ HTTPS/TLS 1.3 (API-Calls)
                ▼
┌───────────────────────────────────┐
│   Fly.io App (Region: fra)       │  ← Backend (Express 5 / Node.js)
│   diggai-api.fly.dev             │    JWT-Auth, Prisma ORM
│   Frankfurt, Deutschland         │    AES-256-GCM Feldverschlüsselung
│   (DSGVO §44 Drittlandtransfer   │    Audit-Log, Rate-Limiting
│    entfällt — EU-Region)         │
└───────────────┬───────────────────┘
                │ TLS (Neon Pooler)
                ▼
┌───────────────────────────────────┐
│   Neon Postgres (eu-central-1)   │  ← Datenbank
│   Frankfurt, Deutschland         │    PII-Felder AES-256-GCM
│   Connection Pooling (PgBouncer) │    3 DB-Rollen (Least-Privilege)
└───────────────────────────────────┘
```

### 2.2 Asset-Inventar

| Asset-ID | Asset | Typ | Schutzbedarf | Verantwortlich |
|----------|-------|-----|--------------|----------------|
| A-01 | Netlify SPA-Deployment | Software | hoch | ENG |
| A-02 | Fly.io Express-Backend | Software + Infrastruktur | sehr hoch | ENG |
| A-03 | Neon PostgreSQL-Datenbank | Daten + Infrastruktur | sehr hoch | ENG |
| A-04 | Patientendaten (PII + Art. 9) | Daten | sehr hoch | CK (DSV) |
| A-05 | ENCRYPTION_KEY / JWT_SECRET | Secrets | sehr hoch | ENG |
| A-06 | GitHub-Repository (Quellcode) | Software | hoch | ENG |
| A-07 | CI/CD-Pipeline (GitHub Actions) | Infrastruktur | hoch | ENG |
| A-08 | Administratoren-Zugänge | Identitäten | sehr hoch | CK |
| A-09 | DNS-Konfiguration (Namecheap) | Infrastruktur | hoch | CK |
| A-10 | SSL/TLS-Zertifikate | Kryptografisches Material | hoch | Netlify/Fly (auto) |

### 2.3 Datenfluß-Übersicht

```
Patient-Browser
  → HTTPS POST /api/sessions        (Session-Erstellung, Tenant-Validierung)
  → HTTPS POST /api/answers         (Strukturierte Antworten, PII-Verschlüsselung)
  → HTTPS POST /api/signatures      (DSGVO-Consent, AES-verschlüsselt)
  → HTTPS POST /api/sessions/:id/submit  (Abschluss, Audit-Log-Eintrag)

MFA/Arzt-Browser
  → HTTPS POST /api/auth/login      (JWT-Ausgabe, 24h-Ablauf)
  → HTTPS GET  /api/sessions        (Dashboard-Abruf, PII-Entschlüsselung im Backend)
  → HTTPS GET  /api/sessions/:id/export/fhir  (FHIR-Bundle, nur Admin-only-Daten)
```

---

## §3 Bedrohungsmodell (STRIDE)

### 3.1 Relevante Bedrohungen

| ID | Bedrohung (STRIDE) | Angriffsvector | Wahrscheinlichkeit | Auswirkung | Risiko |
|----|-------------------|---------------|-------------------|-----------|--------|
| T-01 | **S**poofing: Fake-Praxis-Domain | Phishing-Domain imitiert diggai.de | mittel | hoch | **hoch** |
| T-02 | **T**ampering: Manipulation der Antworten in Transit | MITM (fehlende TLS-Pinning) | niedrig (TLS 1.3) | hoch | mittel |
| T-03 | **R**epudiation: Patient leugnet Einwilligung | Fehlende Audit-Spur | niedrig | sehr hoch | **hoch** |
| T-04 | **I**nformation Disclosure: DB-Dump | Kompromittierter DB-Zugang | niedrig | sehr hoch | **hoch** |
| T-05 | **D**enial of Service: API-Überlastung | HTTP-Flooding | mittel | mittel | mittel |
| T-06 | **E**levation of Privilege: Horizontale Tenant-Eskalation | Fehlende BSNR-Validierung | niedrig | sehr hoch | **hoch** |
| T-07 | **I**nformation Disclosure: Secret-Leak im Repo | Versehentliches Git-Commit | niedrig | sehr hoch | **hoch** |
| T-08 | **T**ampering: XSS / Script-Injection | Malicious Input | mittel | hoch | **hoch** |
| T-09 | **S**poofing: JWT-Fälschung | Schwacher JWT-Secret | niedrig (32+ Bytes) | sehr hoch | mittel |
| T-10 | **D**enial of Service: Brute-Force auf Login | Wiederholte Auth-Requests | mittel | mittel | mittel |

### 3.2 Risiko-Akzeptanz-Schwelle

Risiken mit Bewertung **hoch** erfordern implementierte technische Kontrollen (siehe §4). Risiken mit Bewertung **mittel** sind durch organisatorische Maßnahmen oder Monitoring adressiert. Kein Risiko mit Einstufung **sehr hoch** ist akzeptiert ohne aktive Mitigationsmaßnahme.

---

## §4 Technische Sicherheitsmaßnahmen

### 4.1 Transportverschlüsselung

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| TLS 1.3 für alle API-Verbindungen | Fly.io TLS-Termination + Netlify Edge | ◼ aktiv |
| HSTS (HTTP Strict Transport Security) | `netlify.toml` + Express `helmet()` | ◼ aktiv |
| X-Frame-Options: DENY | `helmet()` Middleware | ◼ aktiv |
| Content-Security-Policy | `netlify.toml` CSP-Header | ◼ aktiv |
| Certificate Pinning | Nicht implementiert (SaaS-Kontext) | ⬛ entfällt |

*Referenz: E5 §3 (Verschlüsselung in Transit)*

### 4.2 Datenverschlüsselung at Rest

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| AES-256-GCM Feldverschlüsselung für PII | `server/services/encryption.ts` | ◼ aktiv |
| Schlüssel-Versionierung / Rotation | `encryptVersioned()` + ENV-Keys | ◼ implementiert |
| Key-Speicherung in Fly.io Secrets | `flyctl secrets set ENCRYPTION_KEY` | ◼ aktiv |
| Neon-Datenbank: Encryption at Rest | Neon-managed (AES-256 Disk-Encryption) | ◼ Plattform-seitig |

*Referenz: E5 §2 (Verschlüsselung at Rest)*

### 4.3 Authentifizierung und Autorisierung

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| JWT-basierte Authentifizierung | `server/services/auth.ts`, 24h-TTL | ◼ aktiv |
| JWT-Secret ≥ 256 Bit | Fly.io Secret `JWT_SECRET` (32+ Bytes) | ◼ aktiv |
| Rollen-basierte Zugriffskontrolle | `ProtectedRoute` + `allowedRoles[]` | ◼ aktiv |
| Tenant-Isolation (BSNR-Validierung) | `BsnrLayout` + DB-WHERE-Clauses | ◼ aktiv |
| DB Least-Privilege-Rollen | `diggai_capture`, `diggai_suite`, `diggai_owner` | ◼ aktiv (Lauf 04) |
| Session-Timeout (Inaktivität) | 15 Min Inactivity-Timer (Lauf 14, C18) | ◼ aktiv |

### 4.4 Eingabevalidierung und Injection-Schutz

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| Parameterisierte DB-Queries | Prisma ORM (kein Raw-SQL für User-Input) | ◼ aktiv |
| Input-Sanitisierung | `express-validator` + Zod-Schema-Validierung | ◼ aktiv |
| Honeypot-Felder gegen Bot-Spam | Frontend-Honeypot (Lauf 15, C12) | ◼ aktiv |
| XSS-Schutz (CSP + DOMPurify) | CSP-Header + Sanitize-Middleware | ◼ aktiv |
| Rate-Limiting | Express `rate-limit` auf `/api/auth/*` und `/api/sessions` | ◼ aktiv |
| SQL-Injection | Prisma ORM (kein direktes SQL) | ◼ aktiv |

### 4.5 Audit-Logging

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| Vollständiges Audit-Log für alle Patienteninteraktionen | `server/services/audit.ts` | ◼ aktiv (Lauf 09, E4) |
| Ereignisse: SESSION_CREATED, ANSWER_SUBMITTED, SIGNATURE_CREATED, SESSION_SUBMITTED | Alle 4 Kernpfade geloggt | ◼ aktiv |
| PHI-freie Audit-Einträge | Kein PII in Log-Payloads, nur Session-IDs | ◼ aktiv |
| Log-Aufbewahrung | Fly.io Logging (Fly.io-managed) + DB-AuditLog-Tabelle | ◼ aktiv |
| Nicht-Abstreitbarkeit | Audit-Log append-only, kein DELETE-Grant für `diggai_capture` | ◼ aktiv |

*Referenz: E4 (Audit-Log), E5 §7*

### 4.6 Dependency und Supply-Chain-Sicherheit

| Maßnahme | Implementierung | Status |
|----------|----------------|--------|
| npm audit (CI) | GitHub Actions CI-Workflow | ◼ aktiv |
| Bundle-Audit (verbotene Strings) | `scripts/bundle-audit.cjs` in CI (Lauf 02, K22) | ◼ aktiv |
| Lockfile-Versionierung | `package-lock.json` im Repo | ◼ aktiv |
| Dependabot / Renovate | ⬛ ausstehend (empfohlen, kein Blocker) | ⬛ offen |

---

## §5 Organisatorische Sicherheitsmaßnahmen

### 5.1 Rollen und Verantwortlichkeiten

| Rolle | Person | Sicherheitsverantwortung |
|-------|--------|--------------------------|
| Datenschutzverantwortlicher (DSV) | Christian Klapproth (CK) | DSGVO-Compliance, Betroffenenrechte |
| Technischer Sicherheitsverantwortlicher | ENG-Lead | Umsetzung TOMs, Secret-Rotation, Incident-Response |
| Verarbeitungsverantwortlicher | DiggAi GmbH (i.Gr.) | Gesamtverantwortung |
| Auftragsverarbeiter (AVV) | Fly.io, Neon, Netlify, GitHub | Plattformsicherheit (AVV-Verträge erforderlich, §9.2) |

### 5.2 Passwort- und Zugangspolitik

- **Produktions-Secrets:** Ausschließlich in Fly.io Secret-Store. Kein Hardcoding, kein `.env`-Commit.
- **Admin-Zugang GitHub:** Zwei-Faktor-Authentifizierung (2FA) Pflicht.
- **Admin-Zugang Fly.io:** 2FA Pflicht; `flyctl`-Token mit minimaler Scope.
- **Admin-Zugang Neon:** 2FA; Connection-Strings nur über Fly.io Secrets an Backend.
- **Passwort-Mindestanforderungen:** 12+ Zeichen, Zeichenklassen-Mix, kein Wörterbuch-Wort.
- **Rotation:** Alle Produktions-Secrets mindestens jährlich oder bei Verdacht auf Kompromittierung sofort.

### 5.3 Schulung und Awareness

| Maßnahme | Frequenz | Zielgruppe |
|----------|----------|-----------|
| Sicherheits-Onboarding für neue ENG-Mitarbeiter | Bei Eintritt | Alle ENG |
| DSGVO-Grundlagen-Schulung | Jährlich | Alle Praxis-Nutzer (MFA, Arzt) |
| Phishing-Awareness | Jährlich | CK + Admin-Nutzer |
| Incident-Response-Übung (Tabletop) | Jährlich | ENG-Lead + CK |

### 5.4 Change-Management und Patch-Management

- **Deployment-Prozess:** Alle Produktions-Deployments über CI/CD (GitHub Actions → Fly.io). Kein manuelles Deployment ohne Pull-Request-Review.
- **Security-Patches:** Kritische CVEs (CVSS ≥ 9.0) innerhalb 48h, hohe CVEs (≥ 7.0) innerhalb 7 Tage.
- **npm-Updates:** Wöchentliche `npm audit`-Prüfung, monatliche Dependency-Updates.
- **OS/Platform-Patches:** Fly.io managed (kein direkter OS-Zugriff; Plattform-Updates automatisch).

---

## §6 Netzwerk- und Infrastruktursicherheit

### 6.1 Netzwerk-Segmentierung

DiggAi Capture nutzt eine vollständig gehostete SaaS-Infrastruktur ohne eigene Netzwerksegmente. Die Segmentierung erfolgt auf Plattformebene:

| Segment | Zugang | Schutzmaßnahme |
|---------|--------|----------------|
| Internet → Netlify CDN | Öffentlich | HTTPS/TLS, CSP, WAF (Netlify-Edge) |
| Netlify → Fly.io API | HTTPS (API-Calls) | TLS 1.3, JWT-Auth |
| Fly.io → Neon DB | TLS (Neon Pooler) | Neon Connection-String (Secret) |
| Fly.io internes Netz | Fly.io-managed | Keine öffentliche Exposition der DB |

Die PostgreSQL-Datenbank (Neon) ist **nicht direkt aus dem Internet erreichbar** — Zugriff nur über den Fly.io-Backend-Service. Direct-DB-Verbindungen (für Admin/Migrationen) nur via Neon-Dashboard mit MFA-Schutz.

### 6.2 Firewall und Port-Kontrolle

- **Fly.io:** Öffentlich exponierter Port: 443 (HTTPS). Alle anderen Ports intern (kein SSH-Zugang aus dem Internet).
- **Netlify:** Port 443 (HTTPS). HTTP-zu-HTTPS-Redirect erzwungen.
- **Neon:** Kein öffentlicher DB-Port; Zugriff über Neon-Pooler-Endpoint mit Passwort + TLS.

### 6.3 DDoS-Schutz

| Ebene | Schutz | Anbieter |
|-------|--------|----------|
| CDN-Ebene | Netlify-Edge-DDoS-Mitigation | Netlify |
| Anwendungsebene | Express `rate-limit` (Fly.io) | ENG (eigene Implementierung) |
| Infrastrukturebene | Fly.io Anycast + Routing-Schutz | Fly.io |

---

## §7 Identitäts- und Zugriffsmanagement (IAM)

### 7.1 Produktions-Accounts und Credentials

| System | Zugangsmethode | MFA | Verantwortlich |
|--------|---------------|-----|----------------|
| GitHub (Repo) | OAuth + PAT | Pflicht | CK |
| Fly.io (Backend) | flyctl + Token | Pflicht | CK |
| Neon (Datenbank) | Dashboard + Connection-String | Pflicht | CK |
| Netlify (Frontend) | OAuth | Pflicht | CK |
| Namecheap (DNS) | Login + 2FA | Pflicht | CK |

### 7.2 Service-Accounts

| Service-Account | Scope | Secret-Speicherort |
|----------------|-------|-------------------|
| `diggai_capture` (DB-Rolle) | SELECT, INSERT, UPDATE (keine DELETE, keine DDL) | Fly.io Secret `DATABASE_URL_CAPTURE` |
| `diggai_suite` (DB-Rolle) | Erweitert (Suite-Features) | Fly.io Secret `DATABASE_URL_SUITE` |
| `diggai_owner` (DB-Rolle) | Migrationen, DDL | Nur für Migrate-Step in CI |
| `ENCRYPTION_KEY` | AES-Verschlüsselung | Fly.io Secret |
| `JWT_SECRET` | JWT-Signatur | Fly.io Secret |

### 7.3 Prinzip der minimalen Rechte

- Patients-API-Calls (`/api/sessions`, `/api/answers`) laufen unter `diggai_capture`-Rolle (kein DELETE)
- MFA/Arzt-API-Calls laufen unter `diggai_suite`-Rolle
- DDL-Migrationen ausschließlich durch `diggai_owner` in CI-Schritt

---

## §8 Backup und Business Continuity

*Vollständige Details: `docs/BACKUP_RECOVERY_CONCEPT.md` (E3)*

### 8.1 Zusammenfassung

| Parameter | Wert |
|-----------|------|
| RPO (Recovery Point Objective) | 24 Stunden |
| RTO (Recovery Time Objective) | 4 Stunden |
| Backup-Frequenz | Neon: kontinuierlich (PITR 7 Tage); Fly.io: Volumes täglich |
| Backup-Standort | Neon EU-Central-1 (Frankfurt) — DSGVO-konform |
| Restore-Test | Monatlich (manuell durch ENG-Lead, dokumentiert) |

### 8.2 Disaster-Szenarien

| Szenario | RTO | Maßnahme |
|---------|-----|---------|
| Fly.io-Region-Ausfall | < 4h | Redeployment in Backup-Region (ams) via `fly deploy` |
| Neon-Datenverlust | < 4h | PITR-Restore über Neon-Dashboard |
| Secret-Kompromittierung | < 2h | `flyctl secrets set` + Invalidierung aller aktiven JWTs |
| DNS-Hijacking | < 1h | Namecheap DNS-Korrektur + Netlify-Redeployment |
| Code-Repository-Verlust | < 1h | GitHub-Mirror (sekundärer Remote konfigurieren) |

---

## §9 Datenschutz und DSGVO-Integration

### 9.1 Verarbeitungsverzeichnis-Referenz

Dieses Konzept ist konsistent mit dem DSGVO-Verarbeitungsverzeichnis und der DSFA:
- **DSFA:** `docs/DSFA_DiggAi_Capture_v0.1.md` (C4, Lauf 19)
- **Rechtsgrundlage Capture:** DSGVO Art. 6(1)(a) — Einwilligung (explizite Checkbox + Pflicht-Scroll)
- **Gesundheitsdaten Art. 9:** DSGVO Art. 9(2)(a) — ausdrückliche Einwilligung

### 9.2 Auftragsverarbeiter (AVV)

| Auftragsverarbeiter | Dienst | Rechtsgrundlage | AVV-Status |
|--------------------|--------|----------------|-----------|
| Fly.io Inc. (US) | Backend-Hosting | EU-Standardvertragsklauseln (SCCs) | ⬛ AVV erforderlich (CK) |
| Neon Inc. (US) | PostgreSQL-Datenbank | EU-SCCs + Data-Processing-Agreement | ⬛ AVV erforderlich (CK) |
| Netlify Inc. (US) | CDN + Frontend | EU-SCCs | ⬛ AVV erforderlich (CK) |
| GitHub Inc. (US) | Code-Repository + CI/CD | EU-SCCs | ⬛ AVV erforderlich (CK) |

**Hinweis:** Alle Anbieter verarbeiten Daten in EU-Rechenzentren (Frankfurt). Zusätzlich zu den technischen Maßnahmen sind AVV-Verträge mit allen vier Anbietern zu schließen (Owner: CK, Priorität: hoch).

### 9.3 Betroffenenrechte (technische Umsetzung)

| Betroffenenrecht | Technische Umsetzung | Status |
|-----------------|---------------------|--------|
| Auskunft (Art. 15) | Session-Export via `/sessions/:id/export/fhir` | ◼ aktiv |
| Löschung (Art. 17) | `DELETE /sessions/:id` (soft-delete + Kaskade) | ◼ aktiv |
| Datenportabilität (Art. 20) | FHIR-R4-Bundle-Export | ◼ aktiv (F4, Lauf 07) |
| Einschränkung (Art. 18) | Session-Status-Flag `restricted` | ◧ konzeptionell |
| Widerspruch (Art. 21) | Consent-Widerruf (Löschung der Session) | ◼ aktiv |

---

## §10 Incident Response

### 10.1 Incident-Klassifizierung

| Klasse | Beschreibung | Reaktionszeit | Eskalation |
|--------|-------------|--------------|-----------|
| P1 — Kritisch | Datenpanne (Art. 33 DSGVO), aktiver Angriff, Datenverlust | < 2h | CK + Aufsichtsbehörde (72h-Meldepflicht) |
| P2 — Hoch | Secret-Verdacht, unerwartete Admin-Aktivität, DDoS | < 4h | ENG-Lead + CK |
| P3 — Mittel | Erhöhte Fehlerrate, verdächtige API-Calls | < 24h | ENG-Lead |
| P4 — Niedrig | Einzelne fehlgeschlagene Logins, Monitoring-Alarm | < 48h | ENG |

### 10.2 Incident-Response-Ablauf

1. **Erkennung:** Monitoring-Alarm (Fly.io Metrics / GitHub Security Advisories) oder Meldung durch Nutzer
2. **Bewertung:** Klassifizierung P1–P4; bei P1 sofort CK benachrichtigen
3. **Eindämmung:** Je nach Klasse — Secret-Rotation, Service-Stopp, IP-Block via Fly.io Firewall-Rules
4. **Beseitigung:** Root-Cause-Analyse, Patch, Redeployment
5. **Wiederherstellung:** Service-Restore, Backup-Restore falls nötig
6. **Nachbereitung:** Incident-Bericht, Tracker-Update, Prozessverbesserung
7. **Meldung:** Bei P1-Datenpanne → DSGVO Art. 33 Meldung an Datenschutzbehörde (Hamburg) binnen 72h

### 10.3 Meldewege

| Kontakt | Funktion | Erreichbarkeit |
|---------|---------|----------------|
| CK (Christian Klapproth) | Verantwortlicher, Entscheidungsträger | DiggAIPrakt@gmail.com |
| Hamburgischer Beauftragter für Datenschutz | Datenpannen-Meldung Art. 33 | datenschutz@hmbdi.hamburg.de |
| Fly.io Support | Infrastruktur-Incidents | support@fly.io |
| Neon Support | Datenbank-Incidents | support@neon.tech |

---

## §11 Penetrationstest und Sicherheitsüberprüfung

### 11.1 Geplante Sicherheitsprüfungen

| Prüfung | Methode | Frequenz | Status |
|---------|---------|---------|--------|
| Penetrationstest (Webanwendung) | Externer Anbieter (TÜV SÜD / DEKRA / SySS) | Jährlich | ⬛ Angebote ausstehend (C3, Lauf 21) |
| OWASP Top 10 Self-Assessment | ENG-interner Review | Halbjährlich | ◧ teilweise (via npm audit + bundle-audit) |
| DAST (Dynamic Application Security Testing) | OWASP ZAP oder ähnlich | Halbjährlich | ⬛ nicht implementiert |
| SAST (Static Analysis) | GitHub CodeQL | Kontinuierlich (CI) | ⬛ ausstehend (empfohlen) |
| Dependency Vulnerability Scan | `npm audit` in CI | Bei jedem Push | ◼ aktiv |

### 11.2 Akzeptierte Restrisiken

| Risiko-ID | Beschreibung | Begründung |
|-----------|-------------|-----------|
| R-01 | Kein Certificate-Pinning | SaaS-Umgebung mit automatischer Zertifikatserneuerung; Risiko durch TLS 1.3 minimiert |
| R-02 | Kein DAST/SAST im CI | Ressourcenlimitierung Early-Stage; geplant für Phase 2 |
| R-03 | AVV-Verträge ausstehend | Priorität CK; keine technischen Daten in US-RZ, EU-only |
| R-04 | Dependabot nicht aktiv | manueller `npm audit`-Ersatz aktiv; Dependabot-Setup geplant |

---

## §12 BSI-Grundschutz Baustein-Mapping

| BSI-Baustein | Titel | Umsetzung |
|-------------|-------|----------|
| SYS.1.6 | Containerisierung | Fly.io Container-Deployment | ◼ Plattform-seitig |
| APP.3.1 | Webanwendungen und Webservices | HTTPS, CSP, Helmet, Sanitize, JWT | ◼ |
| APP.4.4 | Kubernetes | Nicht verwendet (Fly.io proprietär) | entfällt |
| CON.1 | Kryptokonzept | E5 + §4.2 dieses Dokuments | ◼ |
| CON.2 | Datenschutz | DSGVO Art. 32, DSFA C4 | ◼ |
| OPS.1.1.3 | Patch- und Änderungsmanagement | CI/CD + npm audit | ◼ |
| OPS.1.2.2 | Archivierung | Backup E3 + Neon PITR | ◼ |
| OPS.1.1.2 | Ordnungsgemäße IT-Administration | Secret-Store, IAM §7 | ◼ |
| DER.1 | Detektion von sicherheitsrelevanten Ereignissen | Audit-Log E4, Fly.io Metrics | ◼ |
| DER.2.1 | Incident Management | §10 dieses Dokuments | ◼ |
| ISMS.1 | Sicherheitsmanagement | Dieses Dokument | ◼ |

---

## §13 Dokumentenhistorie und Review-Zyklus

| Version | Datum | Änderung | Autor |
|---------|-------|----------|-------|
| 0.1 | 2026-05-07 | Erstfassung — vollständiges BSI-Grundschutz-Konzept (§1–§13) | ENG (Lauf claude-code-10) |

**Review-Zyklus:** Jährlich oder bei wesentlichen Systemänderungen (neue Dienste, neuer Anbieter, Incident P1/P2).

**Nächste Schritte:**
1. **AVV-Verträge** (§9.2): CK schließt AVVs mit Fly.io, Neon, Netlify, GitHub ab (Owner: CK, Prio: hoch)
2. **SAST/CodeQL** im CI aktivieren (ENG, Phase 2)
3. **Dependabot** aktivieren (ENG, Phase 2)
4. **DAST** (OWASP ZAP) in halbjährlichen Prüfzyklus integrieren (ENG + EXT)
5. **Penetrationstest** beauftragen (C3-Angebote: TÜV SÜD, DEKRA, SySS — Owner: CK)
6. **ISO 27001 / B3S-Zertifizierung** vorbereiten (E2 — DiGA-Voraussetzung)
