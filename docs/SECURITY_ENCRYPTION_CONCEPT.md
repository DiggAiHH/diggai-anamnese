# DiggAi Capture — Verschlüsselungs- und Sicherheits-Konzept

**Version:** 1.0 · **Stand:** 2026-05-06 · **Verfasser:** ENG (Lauf 18) · **Geltungsbereich:** DiggAi Capture (Klasse I in Selbstverifizierung)

**Erfüllt:** DSGVO Art. 32, BSI TR-03161, MDR Anh. I Nr. 17.2 + 18 (Cybersecurity), MDCG 2019-16, HIPAA-style Audit-Logging
**Tracker:** Schließt **E5** vollständig ab und liefert §6 der Tech-Doku-Outline (`TECH_DOC_OUTLINE_MDR_ANHANG_II.md`)

---

## 1. Schutz-Ziele und Klassifizierung

DiggAi Capture verarbeitet personenbezogene Patientendaten (PII) und besondere Kategorien personenbezogener Daten nach DSGVO Art. 9 (Gesundheitsdaten — sobald Symptom-Stichworte oder strukturierte Antworten Teil der Erfassung sind). Die Schutz-Klassifizierung orientiert sich am höchsten Schutzbedarf:

| Schutzziel | Anforderung | Begründung |
|------------|-------------|------------|
| Vertraulichkeit | sehr hoch | Gesundheitsdaten Art. 9, Identifikatoren (Name, Geburtsdatum, Adresse, Versichertennummer) |
| Integrität | sehr hoch | manipulierte Anmelde-Daten führen zu Patientenharm-Risiko (falsche Praxis, falscher Termin) |
| Verfügbarkeit | hoch | Capture ist Erst-Kontakt-Punkt; Ausfall führt zu Praxis-Störung, nicht aber zu unmittelbarem Patientenharm |
| Authentizität | sehr hoch | Patient muss sicher wissen, mit welcher Praxis er kommuniziert |
| Nicht-Abstreitbarkeit | hoch | DSGVO-Einwilligung muss revisionssicher loggbar sein |

Schutzbedarf nach **BSI-Grundschutz** = „hoch" bis „sehr hoch". Anwendbar wird damit der **B3S-Standard** (branchenspezifische Sicherheitsstandards) als Stand-der-Technik-Referenz.

---

## 2. Verschlüsselung at Rest — AES-256-GCM für PII-Felder

**Implementation:** `server/services/encryption.ts` (Stand verifiziert in Lauf 18).

### 2.1 Algorithmus-Wahl

- **Cipher:** AES-256 im GCM-Modus (Galois/Counter Mode)
- **Schlüssellänge:** 256 Bit (32 Bytes)
- **IV-Länge:** 12 Bytes (zufällig pro Verschlüsselungsvorgang, **niemals** wiederverwendet)
- **Auth-Tag-Länge:** 16 Bytes GCM-Authentifizierungstag — schützt vor Tampering
- **Speicherformat:** `<iv_hex>:<authTag_hex>:<ciphertext_hex>` als String in Postgres

GCM ist eine **Authenticated-Encryption-with-Associated-Data**-Konstruktion (AEAD). Sie liefert in einem einzigen kryptografischen Schritt sowohl Vertraulichkeit als auch Integrität — Manipulation am Ciphertext, IV oder Auth-Tag führt beim Entschlüsseln zu einem `Error`, das vom Entschlüsselungs-Caller behandelt wird.

### 2.2 Schlüssel-Verwaltung

- **Master-Key-Quelle:** ENV-Variable `ENCRYPTION_KEY` (32 ASCII-Bytes, beim Start in `server/services/encryption.ts` Z36 als `Buffer` validiert; bei Abweichung → fataler Boot-Abbruch).
- **Schlüssel-Generierung:** Empfohlen `openssl rand -hex 32` — nicht-vorhersagbar, ausreichend Entropie.
- **Schlüssel-Versionierung (Rotation):** Code unterstützt bereits versionierte Keys (`encryptVersioned` / `decryptVersioned`, Z184 ff). Drei ENV-Variablen steuern das:
  - `ENCRYPTION_KEY_CURRENT_VERSION` — welche Version für **neue** Verschlüsselungen
  - `ENCRYPTION_KEY_v1` — alter Master-Key (= `ENCRYPTION_KEY` als Fallback)
  - `ENCRYPTION_KEY_v2`, `_v3`, … — rotierte Keys (jeder weiter nutzbar zum Entschlüsseln alter Daten)
- **Operationale Rotations-Empfehlung:** mindestens jährlich, oder bei Verdacht auf Kompromittierung sofort. Rotation ohne Rückwärts-Inkompatibilität, da alle Versions-Keys parallel zum Decrypt verfügbar bleiben.
- **Speicherort der Keys:** Fly.io Secret-Store (`flyctl secrets set --app diggai-api ENCRYPTION_KEY=...`). Niemals im Repo, niemals in Logs, niemals in Backup-Bundle.

### 2.3 Anwendungs-Bereich (Was wird verschlüsselt)

**`server/services/encryption.ts` `PII_ATOM_IDS`-Set Z123 ff** definiert die Frage-IDs, deren Antworten zwingend verschlüsselt gespeichert werden:

| Atom-ID | Feld |
|---------|------|
| 0001 | Nachname |
| 0011 | Vorname |
| 3000 | PLZ |
| 3001 | Wohnort |
| 3002 | Wohnanschrift |
| 3003 | E-Mail |
| 3004 | Mobilnummer |
| 9010 | Bestätigungs-Email |
| 9011 | Bestätigungs-Telefon |

`isPIIAtom(atomId)` (Z146) gibt `true` zurück, wenn vor Speicherung verschlüsselt werden muss. Routes, die `Answer`-Daten persistieren, prüfen diesen Flag und schreiben das Ergebnis von `encrypt(value)` in die Spalte `encryptedValue`. Die Klartext-Spalte `value` enthält den Sentinel-String `'[encrypted]'`.

**Hinweis zu Symptom-Antworten:** Strukturierte Symptom-Stichworte sind heute nicht in `PII_ATOM_IDS` enthalten. Da sie im engeren Sinne aber besondere Kategorien (Gesundheitsdaten) sein können, wird im Phase-2-Refactor empfohlen, **alle** Antwort-Werte standardmäßig zu verschlüsseln und die Klartext-Spalte zu eliminieren — Technical-Debt-Eintrag im Tracker.

### 2.4 Patienten-E-Mail — Pseudonymisierung statt Klartext

E-Mail-Adressen werden für die Wiedererkennungs-Suche **deterministisch** gehasht:

- Algorithmus: SHA-256 mit ENV-abgeleitetem Salt (`EMAIL_HASH_SALT` = SHA-256 der `email-salt:<ENCRYPTION_KEY>`-Kombi, erste 32 hex-Zeichen).
- Klartext-E-Mail wird in `encrypted-Email`-Spalte AES-GCM-verschlüsselt; Hash in `emailHash`-Spalte für Lookup.
- Lookup-Pfad: User gibt E-Mail ein → Backend hasht → DB-Suche nach `emailHash` → Ergebnis-Patient-Datensatz wird mit `decrypt(encryptedEmail)` zurückgegeben.

Damit bleibt die E-Mail nie unverschlüsselt in der Datenbank, und Lookups laufen ohne Decryption-Round-Trip pro Datensatz.

---

## 3. Verschlüsselung in Transit

- TLS 1.2+ (TLS 1.3 wo unterstützt) für alle Verbindungen Patient ↔ Frontend ↔ Backend ↔ DB
- Zertifikate via Let's Encrypt (automatische Rotation alle 60–90 Tage)
- HSTS-Header (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`) im Helmet-Stack
- HTTPS-Redirect für jeglichen HTTP-Request (Backend wirft 308)
- Postgres-Verbindung: TLS-erzwungen (`?sslmode=require` in `DATABASE_URL`)

---

## 4. Authentifizierung und Autorisierung

### 4.1 Patient-Identifikation

Capture-Patienten authentifizieren sich nicht mit Username/Passwort, sondern über:

1. **Pattern-Lock** (4×4-Punkt-Grid) als zweiter Faktor bei Wieder-Anmeldungen — `src/components/inputs/PatternLock.tsx` + `src/utils/patternAuth.ts`. SHA-256-Hash + Komplexitäts-Validierung. Nicht für Erst-Anmeldung erforderlich.
2. **Identitäts-Verifikation** über Mehr-Faktor (Geburtsdatum + Versichertennummer + 2-Faktor-Code per E-Mail) für sensitive Aktionen.

### 4.2 Personal-Authentifizierung (MFA / Arzt / Admin)

- JWT-Token in HttpOnly-Cookies (kein localStorage / sessionStorage zur XSS-Risiko-Reduktion)
- Access-Token: 1 Stunde gültig, RBAC-Claims (Rolle: `mfa` | `arzt` | `admin`)
- Refresh-Token: 7 Tage gültig, in separatem HttpOnly-Cookie, Server-seitig revozierbar via `RefreshTokenBlacklist`-Tabelle
- Pre-Login-Rate-Limit: 5 Login-Versuche pro IP pro Minute, dann 15 Min Sperrung
- Account-Lockout: 5 Failed-Logins innerhalb 15 Min → 30 Min Sperrung des Accounts

### 4.3 RBAC — Server-seitig erzwungen

`server/middleware/auth.ts`:
- `requireAuth` — Token-Validierung, JWT-Signatur-Prüfung, Ablauf-Check
- `requireRole('arzt' | 'mfa' | 'admin')` — Rolle aus Token-Claim
- `requireSameTenant` — verhindert Cross-Praxis-Datenzugriff in Multi-Tenant

---

## 5. Web-Sicherheits-Header (Helmet-Stack)

Alle in `server/index.ts` middleware-Stack (gehärtet in Lauf 13):

- `Content-Security-Policy` — nonce-basiert, kein `unsafe-inline`, kein `unsafe-eval`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (Clickjacking-Schutz)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — alle Sensoren default off
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

CSP-Nonce wird per Request neu generiert und in alle Inline-Scripte injiziert.

---

## 6. CSRF-Schutz

Double-Submit-Cookie nach OWASP-Empfehlung — `server/middleware/csrf.ts`:
- Bei Login: Server setzt `csrf-token`-Cookie (HttpOnly false, damit JS lesen kann) + sendet CSRF-Header-Token
- Bei jedem Mutating-Request (POST/PUT/PATCH/DELETE): Frontend muss CSRF-Token im Header `X-CSRF-Token` mitschicken
- Server vergleicht Header-Token mit Cookie-Token → bei Abweichung 403
- GET ist CSRF-frei (per Definition)

---

## 7. Input-Sanitization

Alle Eingaben durchlaufen `server/services/sanitize.ts` vor jedem DB-Write:
- HTML-Stripping (kein Inline-HTML in Anmelde-Texten erlaubt)
- SQL-Injection-Schutz (Prisma ORM nutzt Prepared Statements; raw SQL ist verboten außer Health-Checks)
- Path-Traversal-Schutz für Datei-Uploads
- Length-Limits per Feld
- Encoding-Normalisierung (NFC Unicode)

Zusätzlich Zod-Schemas pro Route — strukturelle Validierung, Type-Safety, Fehler-Mapping zu HTTP 400.

---

## 8. Audit-Logging — DSGVO Art. 30 + HIPAA-style

`server/services/audit.ts` schreibt strukturierte Logs für **jeden datenrelevanten Endpoint**:

Geloggt wird:
- Zeitstempel (ISO-8601, UTC)
- Anwender-ID (aus JWT, **nicht** Klartext-Mail)
- Aktion (`READ_PATIENT`, `WRITE_ANSWER`, `LOGIN_SUCCESS`, …)
- Resource-ID (Patient-ID, Session-ID — nie Klartext-Personendaten)
- HTTP-Status
- IP-Adresse (gehasht oder pseudonymisiert)
- User-Agent (gekürzt auf Browser-Familie + Major-Version)

**NICHT geloggt:**
- Klartext-Patientennamen, -E-Mail, -Telefon, -Adresse, -Geburtsdatum
- Antwort-Inhalte (nur die Atom-ID und der Sentinel `[redacted]`)
- Diagnostische Aussagen (gibt's in Capture eh nicht, in Suite via Event-Type)

**Aufbewahrungs-Frist:** Audit-Logs werden 6 Jahre archiviert (HGB-/AO-Frist), danach automatisch gelöscht. Der `cleanup`-Job in `server/jobs/` macht das.

---

## 9. Sicherheits-Tests in CI

`.github/workflows/ci.yml` (Stand verifiziert in Lauf 16):

| Test | Zweck | Gate |
|------|-------|------|
| `npm audit --audit-level=high` | Bekannte Schwachstellen in Dependencies | hard-fail |
| `npm run lint` | ESLint inkl. `no-restricted-imports` für `packages/capture/**` | hard-fail |
| `npm run test:run` | Vitest Unit + Integration + B4-Guard-Tests | hard-fail |
| `npm run audit:bundle` | Bundle-Audit auf Class-IIa-Strings | soft-fail bis Phase 4 |
| `npx tsc -b` | TypeScript-Strict-Compilation | hard-fail |

Plus separate Workflows: `playwright.yml` (E2E-Tests), `security-scan.yml` (CodeQL), `lighthouse.yml` (Performance + a11y), `performance-budget.yml`.

Geplant für Phase 5+: SAST-Scanner (Snyk oder Semgrep), Container-Image-Scan (sobald Backend in Docker läuft).

---

## 10. Penetration-Tests — extern (Tracker C3)

**Plan:**
- Anbieter-Anfrage in Vorbereitung: TÜV SÜD, DEKRA, SySS GmbH
- Scope: Capture + Suite (separat berichtet)
- Frequenz: mindestens jährlich, plus vor Klasse-IIa-Re-Audit oder DiGA-Antrag
- Bericht-Format: Empfehlungen mit CVSS-Bewertung; Critical/High → Fix vor Veröffentlichung; Medium/Low → Backlog

Aktueller Stand: noch kein Pen-Test durchgeführt. C3 im Tracker offen; Owner: CK.

---

## 11. Daten-Standort und Hosting

| Komponente | Standort | DSGVO-Status |
|------------|----------|--------------|
| Frontend (Netlify) | global CDN, Build in EU | reine Statik, kein PII-Speicher |
| Backend (Fly.io fra) | Frankfurt, Deutschland | DSGVO-Plus AVV |
| Datenbank (Neon) | eu-central-1 (Frankfurt) | DSGVO-konform, AVV |
| Logs (Fly + Neon) | EU | unter DSGVO Art. 28 |
| Backup | Neon Snapshots, EU-Region | unter DSGVO Art. 28 |

Externe Dienstleister-Liste mit AVV-Status:
- Fly.io — Standard-AVV signiert
- Neon — Standard-AVV signiert
- Netlify — Standard-AVV signiert (Privacy-Shield-Nachfolger DPF berücksichtigt)
- Cloudflare DNS (DNS-Provider) — nur DNS, keine Daten-Speicherung
- ElevenLabs (Voice — wenn aktiviert): noch kein AVV → BLOCK für F5-Aktivierung

---

## 12. Backup und Restore (Tracker E3)

**Aktueller Stand:**
- Neon erzeugt automatische Point-in-Time-Recovery-Snapshots (PITR, 7 Tage)
- Manueller Snapshot vor jedem Schema-Migration
- RPO (Recovery Point Objective) = ≤ 1 Stunde dank Continuous-WAL-Backup
- RTO (Recovery Time Objective) = ≤ 4 Stunden bei Restore

**Lücken (E3 noch offen):**
- Ein expliziter, dokumentierter Test-Restore-Lauf ist noch nicht durchgeführt
- Cross-Region-Backup (z. B. nach S3 EU-West) ist nicht eingerichtet
- Disaster-Recovery-Plan auf Papier fehlt

---

## 13. Verschlüsselungs-spezifische Restrisiken

| Risiko | Mitigation | Resterisiko |
|--------|------------|-------------|
| ENCRYPTION_KEY-Leck (z. B. via Repo-Commit) | Pre-commit-Hook + GitHub-Secret-Scanning + Schlüssel-Versionierung mit schneller Rotation | gering |
| IV-Wiederverwendung (kryptografisch katastrophal in GCM) | `crypto.randomBytes(IV_LENGTH)` pro Verschlüsselung, niemals wiederverwendet — verifiziert in Z61 | sehr gering |
| Schlüssel-Verlust (kein Backup) | Sealed-Backup im Tresor + Mehr-Personen-Wissen + Cloud-KMS-Migration langfristig | mittel — Action: Sealed-Backup-Prozedur formalisieren |
| Quantum-Computing-Bedrohung | AES-256 nach aktuellem Stand quantenresistent (Grover halbiert effektive Schlüssellänge → noch immer ≥128 Bit) | sehr gering bis 2030+ |
| Browser-Schwachstelle (XSS) → JWT-Diebstahl | HttpOnly-Cookie + nonce-basierte CSP + Helmet-Header | gering |
| CSRF auf authentifizierte Mutating-Endpoints | Double-Submit-Cookie + Origin/Referer-Check | sehr gering |
| Replay-Attacke auf Login-Endpoint | Rate-Limit + JWT-jti-Blacklist bei Logout | gering |

---

## 14. Konformitäts-Mapping

| Anforderung | Erfüllt durch |
|-------------|----------------|
| DSGVO Art. 32(1)(a) Pseudonymisierung | hashEmail() für E-Mail-Lookup |
| DSGVO Art. 32(1)(a) Verschlüsselung | AES-256-GCM für PII-Felder |
| DSGVO Art. 32(1)(b) Vertraulichkeit + Integrität | AEAD-GCM + TLS 1.2+ |
| DSGVO Art. 32(1)(c) Verfügbarkeit + Belastbarkeit | Neon PITR + Fly-Multi-Instance |
| DSGVO Art. 32(1)(d) regelmäßige Tests | npm audit + Playwright + B4-Guard-Tests + CodeQL |
| BSI TR-03161 Datenverschlüsselung | AES-256-GCM + Key-Versionierung |
| MDR Anh. I Nr. 17.2 Cybersecurity (selbst für Klasse I anwendbar) | Helmet + Auth + Encryption + Audit |
| MDCG 2019-16 Software-Cybersecurity | siehe komplettes Kapitel-Mapping in §6 der Tech-Doku-Outline |
| HIPAA-style §164.312 (analog für DSGVO-Aufsicht) | Audit-Logging + Encryption-at-Rest |

---

## 15. Pflege

Dieses Dokument wird **bei jeder kryptografisch relevanten Änderung** aktualisiert:
- Algorithmus-Änderung (z. B. Migration auf XChaCha20-Poly1305)
- Schlüssel-Rotation in Production
- Neue PII-Felder im `PII_ATOM_IDS`-Set
- Neue Auth-Mechanismen
- Pen-Test-Bericht-Lieferung → Mitigations-Update in §13

**Letzte Aktualisierung:** 2026-05-06 (Lauf 18, claude-code, opus-4-7) — Initial-Version, baseline auf existierende `encryption.ts` + Middleware-Stack.

**Nächste Aktualisierungs-Anlässe (vorausschauend):**
- Phase 4 — `PII_ATOM_IDS` für strukturierte Symptom-Antworten erweitern
- Pen-Test (C3) — §13-Tabelle ergänzen
- BSI-Grundschutz-Profil (E1) — separate Zertifizierungs-Sektion ergänzen
- Cloud-KMS-Migration — §2.2 Schlüssel-Verwaltung umstellen
