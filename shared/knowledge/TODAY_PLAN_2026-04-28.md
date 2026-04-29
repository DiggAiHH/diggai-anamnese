# Tagesplan — 2026-04-28
## Ziel: ~30 failing Tests fixieren + Health Endpoint auslagern
## Strategie: 3 Wellen × 4 parallele Subagenten = max. Durchsatz, null Interferenz

---

## Meta-Regeln für diese Session

1. **Maximale Parallelität, null Interferenz** — Siehe `ORCHESTRATOR_DOCTRINE.md`
2. **Teamgröße:** 4 Subagenten pro Welle (optimal für Map-Reduce auf Tests)
3. **Isolation:** Kein Team darf eine Datei berühren, die ein anderes Team bearbeitet
4. **Verify-first:** Jeder Subagent muss Tests laufen lassen *vor* und *nach* seiner Änderung
5. **Rollback on red:** Wenn ein Team nach 3 Versuchen nicht grün wird → Revert, nächstes Team blockiert nicht

---

## WELLE 1 — Low-Hanging Fruit (15–20 Minuten)

### Team A — PII Detection Squad
**Scope:** `src/lib/pii-detection/` (nur diese Dateien)
**Task:** 7 failing Tests in `german-pii-patterns.test.ts` fixen
**Root-Cause-Hypothese:** Regex-Patterns für `von/van`-Präfixe, Geburtsjahre, Festnetznummern, Städte und `hasPii()`/`replacePii()` Logikfehler
**Dateien:**
- `src/lib/pii-detection/__tests__/german-pii-patterns.test.ts` (edit)
- `src/lib/pii-detection/german-pii-patterns.ts` (edit)
**Success:** `npx vitest run src/lib/pii-detection/__tests__/german-pii-patterns.test.ts` → all green

### Team B — Queue & Atoms Squad
**Scope:** `server/routes/queue.ts`, `server/routes/atoms.ts`
**Task:** 4 failing Tests fixen
**Root-Cause-Hypothese:**
- Queue: `broadcastQueue` liest `io.queue` aber `io` ist im Test-Context undefined → Mock injizieren
- Atoms: JSON.parse(undefined) bei Publish-Draft → null-check vor JSON.parse
**Dateien:**
- `server/routes/queue.ts` (edit)
- `server/routes/queue.test.ts` (edit)
- `server/routes/atoms.ts` (edit)
- `server/routes/atoms.test.ts` (edit)
**Success:** `npx vitest run server/routes/queue.test.ts server/routes/atoms.test.ts` → all green

### Team C — Security Headers & JWT Squad
**Scope:** `server/routes/auth/`, `server/services/auth/`
**Task:** 4 failing Tests fixen
**Root-Cause-Hypothese:**
- Security headers: Helmet-Konfiguration hat sich geändert (CORS dual-allowlist?), Header fehlen
- Email validation: Zod-Schema oder Regex geändert
- XSS prevention: Sanitize-Logik oder Test-Erwartung divergiert
- JWT weak secrets: Test erwartet striktere Secret-Validierung
**Dateien:**
- `server/routes/auth/security.test.ts` (edit)
- `server/services/auth/jwt-security.test.ts` (edit)
- `server/middleware/auth.ts` (read-only für Kontext)
- `server/services/sanitize.ts` (read-only)
**Success:** `npx vitest run server/routes/auth/security.test.ts server/services/auth/jwt-security.test.ts` → all green

### Team D — Export & Package Squad
**Scope:** `server/services/export/`, `server/routes/export.ts`
**Task:** 4 failing Tests fixen
**Root-Cause-Hypothese:**
- Package roundtrip: AES-256-GCM IV/Tag Handling oder Key-Derivation geändert
- Tampered checksum: Checksum-Validierung
- CCD export auth: Middleware-Reihenfolde nach tenant-Änderungen
- Package import: Encrypt/Decrypt Mismatch
**Dateien:**
- `server/services/export/package.service.test.ts` (edit)
- `server/services/export/package-import.service.test.ts` (edit)
- `server/services/export/package.service.ts` (edit)
- `server/services/export/package-import.service.ts` (edit)
- `server/routes/export.test.ts` (edit)
- `server/routes/export.ts` (read-only)
**Success:** `npx vitest run server/services/export/package.service.test.ts server/services/export/package-import.service.test.ts server/routes/export.test.ts` → all green

---

## WELLE 2 — Auth & Service Layer (15–20 Minuten)

### Team E — Arzt & Session Login Squad
**Scope:** `server/routes/arzt.ts`, `server/routes/sessions.ts`
**Task:** 4 failing Tests fixen (3 arzt + 1 session)
**Root-Cause-Hypothese:**
- RefreshToken-Service erwartet Prisma-Modell `refreshToken` — im Test nicht gemockt
- Login response body enthält JWT trotz cookie-only contract → Response-Shape geändert
- Inactive user login: 401 wird nicht korrekt ausgelöst
**Dateien:**
- `server/routes/arzt.test.ts` (edit)
- `server/routes/sessions.test.ts` (edit)
- `server/routes/arzt.ts` (read-only)
- `server/services/auth/refresh-token.service.ts` (read-only)
**Success:** `npx vitest run server/routes/arzt.test.ts server/routes/sessions.test.ts` → all green

### Team F — Account Lockout Squad
**Scope:** `server/security-tests/account-lockout.test.ts`
**Task:** 2 failing Tests fixen
**Root-Cause-Hypothese:** Gleiche wie Team E — `createTokenPair` bricht wegen fehlendem Prisma-Mock für `refreshToken.create`
**Dateien:**
- `server/security-tests/account-lockout.test.ts` (edit)
- `server/services/auth/refresh-token.service.ts` (read-only)
**Success:** `npx vitest run server/security-tests/account-lockout.test.ts` → all green

### Team G — PVS Sync & DLQ Squad
**Scope:** `server/services/pvs/`
**Task:** 3 failing Tests fixen (2 smart-sync + 1 DLQ)
**Root-Cause-Hypothese:**
- Smart-sync retry: Timeout zu knapp oder Retry-Logik erwartet anderes Error-Format
- DLQ JSON parse: Error-Handling für ungültiges JSON
**Dateien:**
- `server/services/pvs/sync/__tests__/smart-sync.service.test.ts` (edit)
- `server/services/pvs/__tests__/tomedo-dlq.service.test.ts` (edit)
- `server/services/pvs/sync/smart-sync.service.ts` (read-only)
- `server/services/pvs/tomedo-dlq.service.ts` (read-only)
**Success:** `npx vitest run server/services/pvs/sync/__tests__/smart-sync.service.test.ts server/services/pvs/__tests__/tomedo-dlq.service.test.ts` → all green

### Team H — Misc Routes Squad
**Scope:** 5 disparate Test-Suiten
**Task:** 5 failing Tests fixen
**Einzel-Root-Causes:**
- `admin.test.ts`: Test-Name-Kollision nach Audit-Consolidierung → rename
- `therapy.test.ts`: UUID-Format-Validierung akzeptiert `invalid` nicht mehr als Input → Test anpassen
- `payment.test.ts`: Mock für Session-Payments fehlt
- `injection.test.ts`: Path-traversal Regex erkennt Pattern nicht mehr
- `pwa/auth.service.test.ts`: Prisma Mock für `PatientConnection` oder Multi-field lookup fehlt
**Dateien (disjunkt!):**
- `server/routes/admin.test.ts` (edit)
- `server/routes/therapy.test.ts` (edit)
- `server/routes/payment.test.ts` (edit)
- `server/security-tests/injection.test.ts` (edit)
- `server/services/pwa/auth.service.test.ts` (edit)
**Success:** Alle 5 Test-Suiten einzeln grün

---

## WELLE 3 — Deploy Agent & Integration (10–15 Minuten)

### Team I — Deploy Agent Squad
**Scope:** `server/agents/deploy.agent.test.ts`
**Task:** 5 failing Tests fixen
**Root-Cause-Hypothese:** Agent-Metadaten oder Import-Change nach Refactoring
**Dateien:**
- `server/agents/deploy.agent.test.ts` (edit)
- `server/agents/deploy.agent.ts` (read-only)
**Success:** `npx vitest run server/agents/deploy.agent.test.ts` → all green

### Team J — Health Endpoint Extraction Squad
**Scope:** `server/index.ts` → `server/routes/health.ts`
**Task:** Inline `/api/health` aus `server/index.ts` in dedizierte Route extrahieren
**Motivation:** Deploy-preflight warnt aktuell (falsch-positiv behoben, aber saubere Architektur ist besser)
**Dateien:**
- `server/routes/health.ts` (create)
- `server/index.ts` (edit — inline health entfernen, route mounten)
- `scripts/deploy-preflight.mjs` (edit — health check detection vereinfachen)
**Success:**
- `npm run type-check` clean
- `npm run build` clean
- `node scripts/deploy-preflight.mjs` zeigt "Health check endpoint exists" ohne File-Read-Trick

### Team K — Integration Verify Squad
**Scope:** Gesamte Test-Suite
**Task:** Vollständigen Test-Run durchführen und Delta-Bericht erstellen
**Dateien:** Keine edits, nur read/execute
**Success:**
- `npm run test:run` → Bericht: vorher X failed, nachher Y failed
- Ziel: Y < X (signifikanter Fortschritt)

---

## Risikoanalyse & Abbruchkriterien

| Risiko | Mitigation |
|--------|-----------|
| Auth-Tests brauchen alle Prisma-Mock-Fixes → Konflikt | Team E und F bekommen **unterschiedliche** Auth-Test-Suiten, kein gemeinsamer Edit |
| Ein Test-Fix bricht andere Tests | Jeder Agent läuft `test:run` auf *seiner* Suite vorher/nachher |
| Welle 2 braucht Ergebnis von Welle 1 | Wellen sind sequentiell; innerhalb einer Welle ist alles parallel |
| Subagent überschreitet Scope | Jeder Prompt enthält explizite Datei-Whitelist |

**Abbruchkriterium:** Wenn nach Welle 1 mehr als 2 Teams rot bleiben (nach 3 Versuchen), stoppe und reassessiere statt blind weiterzumachen.

---

## Geschätzte Gesamtzeit (Agenten-Zeit)

| Phase | Zeit | Parallelität |
|-------|------|--------------|
| Welle 1 | 20 min | 4 Teams |
| Welle 2 | 20 min | 4 Teams |
| Welle 3 | 15 min | 3 Teams |
| Orchestrator-Overhead | 5 min | — |
| **Gesamt** | **~60 Minuten** | **11 Subagent-Einsätze** |

**Erwartetes Ergebnis:**
- ~25–28 von ~30 failing Tests werden grün
- Health Endpoint sauber extrahiert
- Keine neuen roten Tests
- Build + Type-check bleiben clean

---

## Nach der Session

1. `git diff --stat` review durch Orchestrator
2. Failing-Tests-Delta in `shared/knowledge/TODAY_PLAN_2026-04-28.md` eintragen
3. Nächste Session plant anhand der verbleibenden roten Tests
