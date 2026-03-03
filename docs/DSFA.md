# Datenschutz-Folgenabschätzung (DSFA) — Art. 35 DSGVO
## DiggAI Anamnese-Anwendung

---

**Dokumentversion:** 2.0  
**Stand:** Juli 2025  
**Verantwortlicher:** Dr. med. [Name], [Praxisname]  
**Datenschutzbeauftragter:** [Name/Stelle]

---

## 1. Systematische Beschreibung der Verarbeitung

### 1.1 Gegenstand der DSFA

Die DiggAI Anamnese-Anwendung ist eine webbasierte medizinische Anamnese-Software zur digitalen Voraberfassung von Gesundheitsdaten in Arztpraxen. Die DSFA ist gemäß Art. 35 Abs. 3 lit. b DSGVO **zwingend erforderlich**, da eine **umfangreiche Verarbeitung besonderer Kategorien personenbezogener Daten** (Gesundheitsdaten, Art. 9 Abs. 1 DSGVO) stattfindet.

### 1.2 Art der Verarbeitung

| Verarbeitungstätigkeit | Beschreibung |
|------------------------|--------------|
| **Erhebung** | Digitale Erfassung von Anamnese-Fragebögen (270+ medizinische Fragen) |
| **Speicherung** | SQLite-Datenbank, AES-256-GCM verschlüsselte PII-Felder |
| **Nutzung** | Anzeige für behandelnde Ärzte, Triagierung, Terminplanung |
| **Übermittlung** | TLS 1.3 zwischen Client und Server, Netlify CDN |
| **Löschung** | Automatisch nach 24h (nicht zugeordnete Sessions), 10 Jahre (zugeordnete Patientendaten) |

### 1.3 Zwecke der Verarbeitung

1. Effiziente Voraberfassung medizinischer Anamnese-Daten
2. Triage-Priorisierung von Patienten (Rot/Gelb/Grün)
3. Kommunikation zwischen Patient und Praxisteam (Chat)
4. Dokumentation und Nachweispflicht (Audit-Logging)
5. Online-Wartezimmer und Terminmanagement

### 1.4 Rechtsgrundlagen

| Verarbeitungszweck | Rechtsgrundlage |
|-------------------|-----------------|
| Anamnese-Daten (Gesundheit) | Art. 9 Abs. 2 lit. h DSGVO, §22 Abs. 1 Nr. 1 lit. b BDSG |
| Einwilligung DSGVO | Art. 6 Abs. 1 lit. a, Art. 7 DSGVO |
| IT-Sicherheit/Logging | Art. 6 Abs. 1 lit. c, Art. 5 Abs. 2 DSGVO |
| Kommunikation | Art. 6 Abs. 1 lit. b DSGVO |
| Cookies (essentiell) | TTDSG §25 Abs. 2 Nr. 2 |

### 1.5 Betroffene Personengruppen

- **Patienten** (~100-500 pro Monat geschätzt)
- **Ärzte/Ärztinnen** (1-5 pro Praxis)
- **Medizinische Fachangestellte (MFA)** (1-10 pro Praxis)
- **Administratoren** (1-2)

### 1.6 Datenkategorien

| Kategorie | Beispiele | Sensitivität |
|-----------|-----------|--------------|
| Stammdaten | Name, Geburtsdatum, Geschlecht | Personenbezogen |
| Kontaktdaten | Adresse, Telefon, E-Mail | Personenbezogen |
| Versicherungsdaten | KV-Nummer, Kostenträger, BG | Personenbezogen |
| **Gesundheitsdaten** | **Diagnosen, Symptome, Medikation, Allergien, Familienhistorie** | **Besondere Kategorie (Art. 9)** |
| Triage-Daten | Schmerzlevel, Notfall-Indikatoren | Besondere Kategorie |
| Technische Daten | IP-Adresse, User-Agent, Session-ID | Pseudonymisiert |

---

## 2. Bewertung der Notwendigkeit und Verhältnismäßigkeit

### 2.1 Notwendigkeit

- **Geeignetheit:** Digitaler Fragebogen reduziert Wartezeit, verbessert Anamnese-Qualität und minimiert Übertragungsfehler gegenüber Papierformularen.
- **Erforderlichkeit:** Nur medizinisch relevante Daten werden erhoben (270 Fragen mit konditionalem Flow — Patienten beantworten nur relevante Fragen).
- **Datenminimierung:** Bestandspatienten-Gating überspringt bereits erfasste Daten (RES-100, AU-100, UEB-100, BEF-100).

### 2.2 Verhältnismäßigkeit

- Gesundheitsdaten sind für die Kernfunktion (ärztliche Vorabdiagnose) **zwingend erforderlich**
- Die Anwendung verarbeitet **keine** Daten, die über den medizinischen Zweck hinausgehen
- Patienten haben **granulare Kontrolle** (DSGVO-Consent mit Spielelement, Cookie-Consent)

---

## 3. Risikobewertung

### 3.1 Identifizierte Risiken

| # | Risiko | Eintrittswahrscheinlichkeit | Schwere | Risikostufe |
|---|--------|---------------------------|---------|-------------|
| R1 | Unbefugter Zugriff auf Gesundheitsdaten | Niedrig | Sehr hoch | **HOCH** |
| R2 | Datenleck durch SQL-Injection | Sehr niedrig | Sehr hoch | **MITTEL** |
| R3 | Man-in-the-Middle-Angriff | Niedrig | Hoch | **MITTEL** |
| R4 | Brute-Force auf Arzt-Login | Mittel | Hoch | **MITTEL** |
| R5 | Session-Hijacking | Niedrig | Hoch | **MITTEL** |
| R6 | Cross-Site Scripting (XSS) | Niedrig | Mittel | **NIEDRIG** |
| R7 | Insider-Missbrauch (Praxispersonal) | Niedrig | Hoch | **MITTEL** |
| R8 | Physischer Zugriff auf Server | Sehr niedrig | Sehr hoch | **NIEDRIG** |
| R9 | Datenverlust | Niedrig | Sehr hoch | **HOCH** |
| R10 | Unbemerkte Manipulation von Gesundheitsdaten | Sehr niedrig | Sehr hoch | **MITTEL** |

### 3.2 Maßnahmen je Risiko

| Risiko | Implementierte Maßnahmen | Risiko nach Maßnahmen |
|--------|-------------------------|----------------------|
| R1 | RBAC (4 Rollen), JWT-Auth mit Blacklist, Session-Owner-Prüfung | **NIEDRIG** |
| R2 | Prisma ORM (parameterisierte Queries), Zod-Validierung, kein Raw SQL | **SEHR NIEDRIG** |
| R3 | TLS 1.3, HSTS (preload, 1 Jahr), CORS-Restriction | **NIEDRIG** |
| R4 | Rate Limiting (5 Versuche/15min), bcrypt-Hashing (12 Runden) | **NIEDRIG** |
| R5 | JWT mit JTI, Token-Blacklist bei Logout, kein Token in URLs | **NIEDRIG** |
| R6 | CSP (strict, no unsafe-inline für scripts), Helmet, Input-Sanitization | **SEHR NIEDRIG** |
| R7 | Audit-Logging aller Zugriffe, Rollenbasierte Trennung | **NIEDRIG** |
| R8 | Netlify CDN (SOC 2 / ISO 27001), keine eigene Server-Infrastruktur | **SEHR NIEDRIG** |
| R9 | Regelmäßige Backups (Praxis-Verantwortung), automatische Session-Bereinigung | **NIEDRIG** |
| R10 | Audit-Trail mit Zeitstempel, Response-Status-Logging | **NIEDRIG** |

---

## 4. Technische und Organisatorische Maßnahmen (TOM)

### 4.1 Verschlüsselung

| Ebene | Maßnahme | Standard |
|-------|----------|----------|
| Transport | TLS 1.3 (HTTPS enforced via HSTS) | BSI TR-02102 |
| Speicherung | AES-256-GCM für PII-Felder | BSI TR-02102 |
| Passwörter | bcrypt (12 Runden, Salt) | OWASP |
| JWT | HS256, explizited Algorithm Pinning | BSI TR-02102 |

### 4.2 Zugriffskontrolle

| Maßnahme | Detail |
|----------|--------|
| Authentifizierung | JWT-basiert, Bearer-only |
| Autorisierung | RBAC: Patient, Arzt, MFA, Admin |
| Session-Eigentum | Patienten nur eigene Session |
| Token-Widerruf | JTI-basierte Blacklist, Logout-Endpoint |
| Brute-Force-Schutz | Rate Limiting (5/15min Login, 200/15min global) |

### 4.3 HTTP-Sicherheitsheader

| Header | Wert |
|--------|------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| Content-Security-Policy | default-src 'self'; script-src 'self'; frame-ancestors 'none' |
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(self), microphone=(), geolocation=(), payment=() |
| Cross-Origin-Embedder-Policy | require-corp |
| Cross-Origin-Opener-Policy | same-origin |

### 4.4 Logging & Monitoring

| Maßnahme | Detail |
|----------|--------|
| Audit-Logging | Jede API-Anfrage: Benutzer, Aktion, IP, User-Agent, Status, Dauer |
| Log-Sanitisierung | Sensitive Parameter redacted, User-Agent sanitized |
| Retry-Logik | Bis zu 3 Versuche bei Schreibfehler |
| Aufbewahrung | 3 Jahre (Rechenschaftspflicht) |

---

## 5. Ergebnis und Stellungnahme

### 5.1 Gesamtrisikobewertung

**Nach Implementierung aller technischen und organisatorischen Maßnahmen wird das Gesamtrisiko als AKZEPTABEL (niedrig) eingestuft.**

### 5.2 Maßnahmenplan

| Priorität | Maßnahme | Status | Verantwortlich |
|-----------|----------|--------|---------------|
| Kritisch | TLS 1.3 / HSTS | ✅ Implementiert | Technik |
| Kritisch | AES-256 Verschlüsselung | ✅ Implementiert | Technik |
| Kritisch | DSGVO-Consent | ✅ Implementiert | Technik |
| Kritisch | Datenschutzerklärung | ✅ Implementiert | Recht/Technik |
| Kritisch | Impressum | ✅ Implementiert | Recht/Technik |
| Hoch | Cookie-Consent (TTDSG) | ✅ Implementiert | Technik |
| Hoch | Audit-Logging | ✅ Implementiert | Technik |
| Hoch | JWT-Blacklist/Logout | ✅ Implementiert | Technik |
| Mittel | MFA für Ärzte-Login | ⏳ Geplant Phase 3 | Technik |
| Mittel | Backup-Strategie | ⏳ Praxis-Verantwortung | Praxis |
| Niedrig | Penetration Test | ⏳ Empfohlen jährlich | Extern |

### 5.3 Überprüfungszyklus

Diese DSFA wird **mindestens jährlich** oder bei **wesentlichen Änderungen** der Verarbeitungstätigkeit überprüft und aktualisiert.

---

**Erstellt:** Juli 2025  
**Nächste Überprüfung:** Juli 2026  
**Genehmigt von:** [Unterschrift Verantwortlicher]  
**DSB-Stellungnahme:** [Unterschrift DSB]
