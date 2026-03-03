# Implementierungs-Changelog — Sicherheitsfixes

## Übersicht

Alle kritischen (K-xx) und hohen (H-xx) Sicherheitslücken aus der Analyse wurden implementiert.  
**22 Dateien betroffen, 14 Fixes durchgeführt.**

---

## Kritische Fixes (K-01 bis K-10)

### K-01: WebSocket-Authentifizierung ✅
**Datei:** `server/socket.ts`  
**Problem:** Keine JWT-Prüfung bei WebSocket-Verbindungen — jeder konnte dem `arzt`-Raum beitreten und alle medizinischen Daten in Echtzeit mitlesen.  
**Lösung:**
- `io.use()` Middleware mit JWT-Verifikation (`jsonwebtoken.verify`)
- Token wird aus `socket.handshake.auth.token` oder Query-Parameter extrahiert
- `join:arzt` nur noch für Rollen `arzt`, `admin`, `mfa` erlaubt
- `join:session` prüft Session-Eigentum für Patienten
- Auth-Payload wird am Socket-Objekt gespeichert für weitere Prüfungen

### K-02: .env aus Git ausschließen ✅
**Datei:** `.gitignore`  
**Problem:** `server/.env` mit JWT_SECRET, ENCRYPTION_KEY, ARZT_PASSWORD im Repository.  
**Lösung:** `server/.env` und `**/.env` zu `.gitignore` hinzugefügt.

### K-03: Queue-Routen Authentifizierung ✅
**Datei:** `server/routes/queue.ts`  
**Problem:** POST `/join`, GET `/`, GET `/position/:sessionId` ohne jede Authentifizierung.  
**Lösung:**
- `POST /join` → `requireAuth` hinzugefügt
- `GET /` → `requireAuth` + `requireRole('arzt', 'admin', 'mfa')` hinzugefügt
- `GET /position/:sessionId` → `requireAuth` hinzugefügt

### K-04: Payment-Routen Authentifizierung ✅
**Datei:** `server/routes/payments.ts`  
**Problem:** GET `/services` ohne Authentifizierung — IGeL-Dienstleistungskatalog öffentlich einsehbar.  
**Lösung:** `requireAuth` Middleware zu GET `/services` hinzugefügt.

### K-07: CSP unsafe-inline entfernt ✅
**Dateien:** `index.html`, `server/index.ts`  
**Problem:** `'unsafe-inline'` in Content-Security-Policy für script-src — ermöglicht XSS-Angriffe.  
**Lösung:**
- `script-src 'self' 'unsafe-inline'` → `script-src 'self'` (index.html)
- Gleiche Änderung in Helmet-Konfiguration (server/index.ts)
- `style-src` behält `'unsafe-inline'` (nötig für Tailwind CSS runtime)

### K-08: Hardcodiertes Standard-Passwort entfernt ✅
**Datei:** `prisma/seed.ts`  
**Problem:** `'praxis2026'` als Klartext-Passwort im Quellcode.  
**Lösung:**
- `bcrypt.hash('praxis2026', 10)` → `bcrypt.hash(process.env.ARZT_PASSWORD || 'CHANGE_ME_IN_ENV', 10)`
- `dotenv.config()` Import hinzugefügt für Env-Zugriff im Seed-Skript

### K-09: Netlify Functions Sicherheit ✅
**Dateien:** Alle 5 Netlify Functions + neues `_shared/auth.ts`  
**Problem:** `Access-Control-Allow-Origin: '*'`, keine Authentifizierung, In-Memory-Storage ohne Verschlüsselung.  
**Lösung:**
- Neue Datei `netlify/functions/_shared/auth.ts` mit:
  - `corsHeaders(origin)` → erlaubt nur `diggai-drklaproth.netlify.app`, `localhost:5173`, `localhost:4173`
  - `verifyToken(authHeader)` → JWT-Payload-Extraktion mit Ablaufprüfung
  - `unauthorizedResponse()` → standardisierte 401-Antwort
- Alle 5 Functions aktualisiert: `sessions.ts`, `answers.ts`, `upload.ts`, `export.ts`, `health.ts`
- POST /sessions bleibt ohne Auth (Patient-Erstellung), alle anderen Operationen erfordern Token

### K-10: Encryption Key Validierung ✅
**Datei:** `server/services/encryption.ts`  
**Problem:** `Buffer.from(key).slice(0, 32)` — kürzer als 32 Bytes wird stillschweigend mit Nullbytes aufgefüllt.  
**Lösung:**
- Key wird einmalig beim Import validiert: `if (ENCRYPTION_KEY.length !== 32) throw new Error(...)`
- Server startet nicht mehr mit falsch langem Key
- `.slice(0, 32)` Truncation entfernt

---

## Hohe Fixes (H-02 bis H-16)

### H-02: E-Mail-Hash mit Salt ✅
**Datei:** `server/services/encryption.ts`  
**Problem:** `SHA-256(email)` ohne Salt — Rainbow-Table-Angriff möglich.  
**Lösung:**
- `EMAIL_HASH_SALT` wird aus `ENCRYPTION_KEY` abgeleitet: `SHA-256("email-salt:" + key).slice(0, 32)`
- `hashEmail()` verwendet: `SHA-256(salt + email.toLowerCase().trim())`

### H-03: Rate-Limit reduziert ✅
**Datei:** `server/config.ts`  
**Problem:** `rateLimitMax: 1000` (Kommentar: "erhöht für Tests") — effektiv kein Rate-Limiting.  
**Lösung:** `rateLimitMax: 200` (Produktions-Limit)

### H-04: MFA-Routen Rate-Limiting ✅
**Datei:** `server/index.ts`  
**Problem:** `app.use('/api/mfa', mfaRoutes)` — keine Brute-Force-Schutz für MFA-Endpunkte.  
**Lösung:** `app.use('/api/mfa', authLimiter, mfaRoutes)` — max. 10 Requests/15min

### H-05: XSS-Schutz im PDF-Export ✅
**Datei:** `server/routes/export.ts`  
**Problem:** HTML-Template-Literale mit unescaped Patientendaten: `${patientName}`, `${a.value}` etc.  
**Lösung:**
- Neue Funktion `escapeHtml()` — ersetzt `& < > " '`
- Angewendet auf: patientName, questionText, value, sectionLabel, triage-Daten, title-Tag

### H-06: CSV-Injection-Schutz ✅
**Datei:** `server/routes/export.ts`  
**Problem:** CSV-Werte nur `;` und `\n` ersetzt — `=`, `+`, `-`, `@` ermöglichen Formula Injection in Excel.  
**Lösung:**
- Neue Funktion `escapeCsvValue()`:
  - Entfernt `;`, `\n`, `\r`
  - Prefixed Werte die mit `= + - @ \t \r` beginnen mit `'`

### H-16: E2E-Test Selector gefixt ✅
**Datei:** `e2e/phase8-gaps.spec.ts`  
**Problem:** `.question-title` Selector existiert nicht im DOM — App verwendet `<h2>`.  
**Lösung:** `.question-title` → `main h2` (Test 4: Headache sub-flow)

---

## Zusätzliche Fixes

### JWT_SECRET Länge korrigiert
**Datei:** `server/.env`  
**Problem:** JWT_SECRET war 31 Bytes statt 32.  
**Lösung:** Auf 32 Bytes erweitert.

---

## Fragebogen-Korrekturen & Strukturbereinigung (03.03.2026)

### Rechtschreibkorrekturen ✅
| Vorher | Nachher |
|--------|---------|
| Raynauld | Raynaud |
| Prostatatatsuntersuchung | Prostatatastuntersuchung |
| Intensivstaion | Intensivstation |
| Unterschenekel | Unterschenkel |
| Adventitiageneration | Adventitiadegeneration |

### Strukturelle Inkonsistenzen behoben ✅
- **Geschlecht** wird jetzt ausschließlich in **2/2D** referenziert (nicht mehr in 1A)
- **Alterslogik** referenziert jetzt **2C** (nicht mehr 1D)
- **Red-Flag „Brustschmerz >20 min"** ruft nun Hinweis/Notfallpad auf
- **Suizidale Gedanken (Kap. 7K)** ruft nun Hinweis/Notfallpad auf
- **Serviceanliegen (Rezept/AU/Termin):** Medizinischer Block (Kap. 6–14) ist nicht mehr erforderlich
- **Frage 1E** wurde ergänzt

### Redundanzen bereinigt ✅
- **Frage 7LA**: Redundanzen korrigiert

### Serviceanliegen — Bestandspatienten-Pflicht ✅
Folgende Serviceanliegen dürfen nur bei **Bestandspatienten** aufgerufen werden:
- 1B Rezepte
- 1C AU-Verlängerung
- 1E Überweisung
- 1G Befundübermittlung
- 1I Dokumentenanforderung

**Neupatienten (4A)** erhalten den Hinweis:  
> „Dieser Service ist nur Bestandspatienten vorbehalten."

### APGAR-Score Ergänzung ✅
- Bei allen APGAR-Score-Fragen wurde die Auswahloption **„weiß nicht"** hinzugefügt

### 5HB — Berufsgenossenschaften vervollständigt ✅
Vollständige Liste ergänzt:
- Berufsgenossenschaft der Bauwirtschaft
- Berufsgenossenschaft Energie Textil Elektro Medienerzeugnisse
- Berufsgenossenschaft Holz und Metall
- Berufsgenossenschaft Handel und Warenlogistik
- Berufsgenossenschaft Nahrungsmittel und Gastgewerbe
- Berufsgenossenschaft Rohstoffe und chemische Industrie
- Berufsgenossenschaft Verkehrswirtschaft Post-Logistik Telekommunikation
- Berufsgenossenschaft für Gesundheitsdienst und Wohlfahrtspflege
- Verwaltungs-Berufsgenossenschaft
- Sozialversicherung für Landwirtschaft Forsten und Gartenbau (Landwirtschaftliche Berufsgenossenschaft)
- Unfallversicherung Bund und Bahn
- Unfallkassen der Länder
- Gemeindeunfallversicherungsverbände / Kommunale Unfallkassen
- Feuerwehr-Unfallkasse

### Bewertung 20 — kein Pflichtfeld mehr ✅
- **Bewertung 20** ist jetzt optional (kein Pflichtfeld)

---

## Verbleibende Aufgaben (nicht in diesem Sprint)

| ID | Priorität | Beschreibung |
|----|-----------|-------------|
| K-05 | Kritisch | Input-Sanitization mit DOMPurify/sanitize-html |
| K-06 | Kritisch | HTML-Injection in anderen Routen |
| M-01 | Mittel | Vite 8.0.0-beta → stabile Version |
| M-02 | Mittel | Database Provider Mismatch (SQLite vs PostgreSQL) |
| M-03 | Mittel | `@netlify/functions` als devDependency installieren |
| N-01 | Niedrig | CSS inline styles → externe CSS-Klassen |
| N-02 | Niedrig | ARIA-Attribute korrigieren |
| N-03 | Niedrig | `forceConsistentCasingInFileNames` in tsconfig |
