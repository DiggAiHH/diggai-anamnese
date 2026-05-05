# DiggAi — Cleanup-PR-Anleitung nach Spur-A-Roll-Out

> **Version:** 1.0 | **Datum:** 05.05.2026
> **Zweck:** Diese Datei beschreibt die verbleibenden Cleanup-Aufgaben, die **nach erfolgreichem Roll-Out** des „Spur-A-PRs" durchgeführt werden müssen, um die in der Übergangszeit eingebauten Backwards-Compat-Brücken zu entfernen.
> **Bezugsdokumente:** [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md), [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md), [`ROUTING_RULES.md`](./ROUTING_RULES.md)

---

## Wann darf dieser Cleanup-PR gemerged werden?

Der Cleanup-PR darf **erst** gemerged werden, wenn **alle drei** Bedingungen erfüllt sind:

1. **Spur-A-PR ist live** — die neue Architektur (RoutingEngine, AnmeldeHinweisOverlay, `routing:hint`-Event, `routingHints`-Response, neue i18n-Keys) ist auf https://diggai.de und alle API-Hosts deployt.
2. **Cache-Drain abgeschlossen** — alle aktiven PWA-Service-Worker haben den neuen Bundle ausgeliefert. Konservativer Puffer: **mindestens 14 Tage** nach Live-Deploy, damit Patienten mit selten geöffneter App den neuen Bundle erhalten.
3. **Monitoring zeigt keine `triage:alert`-Frontend-Listener mehr** — Server-seitig kann durch temporäres Logging der noch lauschenden Socket-Verbindungen verifiziert werden, dass alle Frontends auf `routing:hint` umgestellt sind.

---

## Phase 1 — Server-seitige Backwards-Compat entfernen

### 1.1 Socket-Mirror entfernen (`server/socket.ts`)

```diff
 export function emitRoutingHint(sessionId: string, hint: { ... }): void {
   if (!io) return;
   const payload = { sessionId, ...hint, timestamp: new Date().toISOString() };
   io.to('arzt').emit('routing:hint', payload);
-  // Backwards-Compat: alte Listener auf 'triage:alert' weiterhin bedienen.
-  // TODO(REGULATORY-MIGRATION): Entfernen, sobald alle Frontend-Listener
-  // auf 'routing:hint' umgestellt sind (siehe docs/CHANGE_LOG_REGULATORY.md).
-  io.to('arzt').emit('triage:alert', { ... });
 }

-/**
- * @deprecated Verwende `emitRoutingHint`. ...
- */
-export function emitTriageAlert(sessionId: string, alert: {...}): void { ... }
```

### 1.2 `redFlags`-Alias in API-Response entfernen (`server/routes/answers.ts`)

```diff
   res.json({
     success: true,
     answerId: answer.id,
-    routingHints: patientSafeHints.length > 0 ? patientSafeHints : null,
-    redFlags: patientSafeHints.length > 0 ? patientSafeHints : null,
+    routingHints: patientSafeHints.length > 0 ? patientSafeHints : null,
     progress,
   });
```

### 1.3 Imports und Tests aufräumen

- `server/routes/answers.ts`: nur noch `emitRoutingHint` importieren, `emitTriageAlert` raus
- `server/routes/answers.test.ts`: `socketMocks.emitTriageAlert`-Mock entfernen, nur `emitRoutingHint` behalten

---

## Phase 2 — Frontend-Backwards-Compat entfernen

### 2.1 Doppel-Listener auf nur `routing:hint` reduzieren

**`src/hooks/useDashboard/useSupabaseRealtime.ts`** — Zeile mit `s.on('triage:alert', handleRoutingHint)` entfernen, dazu `s.off('triage:alert', handleRoutingHint)` im Cleanup.

**`src/pages/MFADashboard.tsx`** — `socket.on('triage:alert', invalidateMfa)` entfernen, dazu `socket.off('triage:alert', invalidateMfa)`.

**`src/pages/ArztDashboard.tsx`** — den separaten `socket.on('triage:alert', ...)` Listener entfernen (nur `routing:hint`-Listener behalten); `SocketTriageAlert`-Typ-Definition löschen.

### 2.2 Patient-API: `redFlags`-Fallback entfernen

**`src/hooks/useApi/usePatientApi.ts`**:

```diff
-  const hints = response.routingHints ?? response.redFlags ?? [];
+  const hints = response.routingHints ?? [];
```

### 2.3 Typen entrümpeln (`src/hooks/useApi/types.ts`)

- `redFlags`-Feld aus `SubmitAnswerResponse` entfernen
- `TriageAlert`-Typ als `@deprecated` löschen — keine Verwendung mehr

### 2.4 Tests anpassen

- `src/hooks/usePatientApi.test.tsx`: Test `should fall back to redFlags alias when routingHints absent` entfernen oder umkehren (sollte jetzt einen Fehler werfen oder leer rendern)

---

## Phase 3 — Legacy-Engine final löschen

### 3.1 TriageEngine löschen

```bash
rm server/engine/TriageEngine.ts
rm server/engine/TriageEngine.performance.test.ts
rm server/engine/TriageEngine.critical.test.ts
```

Vor dem Löschen verifizieren mit Grep, dass es keine Importe mehr gibt:

```bash
grep -r "from.*TriageEngine" server/ src/ --include="*.ts" --include="*.tsx"
# erwartet: keine Treffer (außer eventuell @deprecated-Doku-Kommentare)
```

### 3.2 RedFlagOverlay löschen

```bash
rm src/components/RedFlagOverlay.tsx
```

Vor dem Löschen Grep auf `RedFlagOverlay`-Imports — alle Konsumenten sollten bereits `AnmeldeHinweisOverlay` nutzen.

### 3.3 Adapter `routingHintFromTriage.ts` evaluieren

Wenn `questions.ts` und `new-questions.ts` weiterhin das `triage`-Feld in der Frage-Struktur tragen (für den Frontend-Adapter), bleibt der Adapter bestehen. Falls ein größerer Refactor das `triage`-Feld komplett aus der Question-Struktur entfernt, kann `routingHintFromTriage.ts` ebenfalls gelöscht werden.

### 3.4 i18n: legacy `redFlag*`-Keys löschen

In allen 10 Sprachfiles die alten `redFlag*`-Keys entfernen (jetzt durch `anmeldeHinweis*` ersetzt):
- `redFlagAck`
- `redFlagCall112`
- `redFlagConfirm`
- `redFlagContinue`
- `redFlagDisclaimer`
- `redFlagReadWarning`
- `redFlagWait`

---

## Phase 4 — Doku-Folgepflege

### 4.1 docs/TRIAGE_RULES.md umleiten

Die alte `docs/TRIAGE_RULES.md` ist inhaltlich durch `docs/ROUTING_RULES.md` ersetzt. Optionen:

**Variante A** — alte Datei löschen:
```bash
rm docs/TRIAGE_RULES.md
```

**Variante B** — alte Datei in eine reine Weiterleitung umwandeln (empfohlen, falls externe Verweise existieren):
```markdown
# Diese Datei ist veraltet
Inhalt verschoben nach [`ROUTING_RULES.md`](./ROUTING_RULES.md). Siehe auch
[`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md) §11.2 für die Migration.
```

### 4.2 CLAUDE.md aktualisieren

Die `CLAUDE.md`-Compliance-Tabelle erwähnt noch in einigen `Fragile Areas`/`Forbidden Actions` die `TriageEngine`. Nach dem Löschen alle Verweise auf `RoutingEngine` aktualisieren.

### 4.3 GESAMTUEBERSICHT.md aktualisieren

Wenn die Backwards-Compat-Phase abgeschlossen ist, in `GESAMTUEBERSICHT.md` einen finalen Stand-Eintrag ergänzen, der den abgeschlossenen Spur-A-Refactor dokumentiert.

---

## Phase 5 — Native-Speaker-Review (extern, parallel)

Die i18n-Keys `anmeldeHinweis*` (15 Keys) sind in 10 Sprachen vorhanden. Native-Übersetzungen existieren für DE, EN, FR, IT, ES. Für TR, AR, FA, UK, PL ist Native-Speaker-Review **vor produktivem Markteintritt im jeweiligen Sprachraum** erforderlich:

| Sprache | Risiko | Was prüfen |
|---------|--------|------------|
| TR | mittel | Standard-Anmeldungs-Sprache, „112" in türkischem Kontext |
| AR | hoch | RTL-Layout im Overlay; Telefonseelsorge-Verweis kulturell sensibel; Frauen-Patient-Anrede prüfen |
| FA | hoch | RTL; Frauen-Patient-Anrede; Telefonseelsorge-Hinweis auf deutsche Nummer 0800 111 0 111 prüfen ob für Iraner verständlich |
| UK | mittel | Geflüchtete-Kontext, sicheres Ansprechen von medizinischen Themen |
| PL | mittel | Standard-Anmeldungs-Sprache, „112" in polnischem Kontext |

Die Reviews sollten von **medizinisch erfahrenen Native-Speakers** stammen — nicht reine Übersetzer, weil der Telefonseelsorge-Hinweis medizinisch-rechtliche Komponenten enthält.

---

## Phase 6 — CI-Lauf erzwingen

Bevor irgendetwas in `master` gemerged wird, muss die gesamte Test-Suite **mindestens einmal grün** durchlaufen sein:

```bash
npm run check-all                          # type-check + lint + i18n + prisma migrate status
npm run test:run                           # Vitest single-pass
npm run test:server                        # Server-Tests
npm run test:e2e                           # Playwright (Chromium + Mobile Chrome)
npx playwright test e2e/regulatory/        # Speziell die regulatorische Suite
```

Erwartete Test-Ergebnisse:
- `RoutingEngine.regulatory.test.ts`: alle Verbots-Wortlisten-Checks grün
- `RoutingEngine.priority.test.ts`: alle Strukturtests + `toPatientSafeView`-Leak-Garantie grün
- `RoutingEngine.performance.test.ts`: alle Performance-Schwellen eingehalten
- `e2e/regulatory/no-diagnosis-to-patient.spec.ts`: Patient-Output frei von verbotenen Wörtern
- `usePatientApi.test.tsx`: neue `routingHints`-Tests + Backwards-Compat-Test grün
- `answers.test.ts`: `emitRoutingHint`-Mock-Erwartung grün

---

## Hygiene-Punkte für die Zukunft (kein direkter Cleanup, aber gut zu wissen)

### 7.1 AdminDashboard-Routing-Liste

`src/pages/AdminDashboard.tsx` und `src/components/admin/tabs/adminData.ts` enthalten eine `TRIAGE_RULES`-Konstante mit medizinischen Begriffen (ACS, SAH, Suizidalität, Diabetisches Fußsyndrom). Diese Liste ist **personal-/admin-facing** und regulatorisch zulässig. Optionale Hygiene: Konstante in `ROUTING_RULES_DOC` umbenennen, Kommentar ergänzen.

### 7.2 Frage-Optionen mit Krankheitsnamen

Frage-Optionen wie „Hatten Sie schon einen Herzinfarkt?" oder „Ischämischer Schlaganfall (Hirninfarkt)" in `questions.ts` / `new-questions.ts` sind **Daten-Erfassung der vom Patienten selbst gemeldeten Vorerkrankungen** — kein Diagnose-Output der Software. Regulatorisch zulässig.

### 7.3 Server-DB-Schema

Die Prisma-Tabelle `triageEvent` (mit Feldern `level`, `message`) ist intern. Eine spätere Schema-Migration zu `routingEvent` mit `staffMessage` ist sinnvoll, aber nicht zwingend für die regulatorische Position.

---

## Zusammenfassung Reihenfolge

1. **Tag 0**: Spur-A-PR mergen + auf `master` deployen
2. **Tag 0–14**: Cache-Drain abwarten, Monitoring auf `triage:alert`-Listener
3. **Tag 14**: Cleanup-PR (Phasen 1–3) öffnen
4. **Tag 15–17**: CI grün, Reviewer-Sign-off
5. **Tag 17**: Cleanup-PR mergen + deployen
6. **Tag 17+**: Phase 4 Doku-Folgepflege im selben oder Folge-PR
7. **Parallel zu allem**: Phase 5 Native-Speaker-Review für TR/AR/FA/UK/PL — Markteintritt im jeweiligen Sprachraum erst nach abgeschlossener Review

Sign-off-Pflicht für Cleanup-PR: Dr. Klapproth (GF) + Tech-Lead.
