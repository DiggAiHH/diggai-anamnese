# PR: Spur A — Reklassifizierung „Kein Medizinprodukt nach MDR Art. 2(1)"

> Drop-in PR-Beschreibung für GitHub. Empfohlener Branch-Name: `regulatory/spur-a-no-mdsw`.

---

## Warum dieser PR

DiggAi behauptet im aktuellen `master`-Stand „kein Medizinprodukt" — gibt aber dem Patienten gleichzeitig diagnostische Hinweise aus (TriageEngine: „Ihre Symptome könnten auf einen medizinischen Notfall hindeuten") und vermarktet sich als „KI-Triage" / „rettet Leben". Das ist regulatorisch instabil: Eine Marktaufsichtsanzeige würde das Marketing + den Patient-Output als Zweckbestimmung im Sinne von **MDR Art. 2(1)** lesen, wodurch DiggAi nach **MDR Annex VIII Rule 11** als **Klasse IIa/IIb-Medizinprodukt** eingestuft wäre — was nach **MPDG §6** ohne CE-Kennzeichnung strafbewehrt ist.

Dieser PR setzt **Spur A** der in [`docs/REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md) beschriebenen Strategie um: DiggAi wird konsistent als **administrative Praxis-Anmelde- und Routing-Plattform** repositioniert, Patient-Output ist strukturell frei von Diagnose-Sprache, Marketing widerspricht der Hersteller-Position nicht mehr.

## Was sich ändert

**Architektur:**
- Neue `RoutingEngine` mit strikter Trennung `patientMessage` (workflow-only) ↔ `staffMessage` (fachlich, nur fürs Personal)
- Neue Patient-UI-Komponente `AnmeldeHinweisOverlay` rendert ausschließlich `patientMessage`
- Frontend-Adapter `routingHintFromTriage` verwirft jeglichen diagnostischen Frontend-Text, bevor er an den Patienten gerät
- Neue Methode `RoutingEngine.toPatientSafeView()` ist ein technisches Schloss: API-Edge kann `staffMessage` strukturell nicht mehr leaken

**Aufrufer-Migration:**
- `server/routes/answers.ts` auf RoutingEngine umgestellt + `toPatientSafeView()` in der Response
- `server/socket.ts` mit neuer `emitRoutingHint`-Funktion + Backwards-Compat-Mirror auf altes `triage:alert`
- Frontend-Listener in `useSupabaseRealtime`, `MFADashboard`, `ArztDashboard` lauschen jetzt parallel auf `routing:hint` (kanonisch) und `triage:alert` (Compat)
- `usePatientApi` konsumiert `response.routingHints` → mappt `hint.patientMessage` in den Store
- `Questionnaire.tsx` → `AnmeldeHinweisOverlay` + `AnmeldeHinweisBanner`

**Daten / i18n / Marketing:**
- 12 `triage.message`-Diagnose-Texte aus `questions.ts`/`new-questions.ts` durch interne Marker ersetzt
- 15 neue `anmeldeHinweis*`-i18n-Keys × 10 Sprachen (DE/EN/FR/IT/ES native, TR/AR/FA/UK/PL mit Native-Speaker-Review-TODO)
- `LandingPage.tsx` + 4 `marketing/`-Markdowns: Sprachreinigung („Triage" → „Eingangs-Routing", keine „rettet Leben"-/„Herzinfarkt-Verdacht"-/„KI-Therapie"-Versprechen)
- `docs.feature.triage.*`, `ai.suggestTherapy`, `ai.summarize`, `arzt.aiAnalysis` in DE-i18n entlastet

**Test-Coverage (3 neue Suiten als CI-Gate):**
- `RoutingEngine.regulatory.test.ts` — prüft `patientMessage` aller Regeln gegen Verbots-Wortliste
- `RoutingEngine.priority.test.ts` — Strukturtests + `toPatientSafeView`-Leak-Garantie
- `e2e/regulatory/no-diagnosis-to-patient.spec.ts` — Patient-Output + Landing-Marketing auf UI-Ebene
- `RoutingEngine.performance.test.ts` — 1:1-Portierung der alten Performance-Garantien

**Verbindliche Hersteller-Doks (6 neue Markdowns):**
- `docs/REGULATORY_STRATEGY.md`, `docs/INTENDED_USE.md`, `docs/REGULATORY_POSITION.md`, `docs/CHANGE_LOG_REGULATORY.md`, `docs/ROUTING_RULES.md`, `docs/MIGRATION_NEXT_STEPS.md`

## Defense-in-Depth — sieben Schichten

```
1) Quelldaten:        questions.ts + new-questions.ts ohne Diagnose-Texte
2) Frontend-Adapter:  routingHintFromTriage verwirft jeglichen Quell-Text
3) Engine:            RoutingEngine.toPatientSafeView() — strukturelles Leak-Schloss
4) API-Edge:          res.json mit toPatientSafeView()
5) Client:            usePatientApi liest hint.patientMessage
6) UI-Komponente:     AnmeldeHinweisOverlay rendert nur patientMessage
7) CI-Tests:          regulatory.test + priority.test + e2e/regulatory
```

Vier dieser sieben Schichten können versagen — die übrigen drei verhindern jeden diagnostischen Output an den Patienten.

## Was sich NICHT ändert (bewusst)

- **Backend-Funktionalität**: Personal-Dashboards sehen weiterhin alle fachlichen Hinweise, jetzt im `staffMessage`-Feld
- **Triage-Logik selbst**: Alle 4 PRIORITY (ehem. CRITICAL) und 6 INFO (ehem. WARNING) Regeln sind funktional 1:1 portiert
- **DB-Schema**: `triageEvent`-Tabelle bleibt bestehen, `message`-Feld trägt jetzt `staffMessage`
- **Backwards-Compat**: Alte Frontends mit gecachtem PWA-Bundle funktionieren weiter (siehe Cleanup-PR-Plan)

## Reviewer-Checkliste

### Funktional
- [ ] Patient-Antwort einreichen mit Brustschmerzen → AnmeldeHinweisOverlay zeigt Workflow-Text, kein Diagnose-Wort
- [ ] Personal-Dashboard zeigt fachlichen Hinweis im Toast/Panel
- [ ] Cache-Invalidierung in MFADashboard und ArztDashboard funktioniert beim `routing:hint`-Event
- [ ] Backwards-Compat: Falls ein alter Browser-Cache `triage:alert` lauscht, bekommt er weiterhin Events
- [ ] Marketing-Page (LandingPage + DokumentationPage) zeigt entlastete Sprache

### Regulatorisch (Sign-off Klapproth + Al-Shdaifat)
- [ ] `docs/INTENDED_USE.md` — Zweckbestimmung gelesen und gegengezeichnet
- [ ] `docs/REGULATORY_POSITION.md` — MDCG-2019-11-Subsumtion plausibel
- [ ] `docs/REGULATORY_STRATEGY.md` — Spur-A/B-Strategie verstanden
- [ ] `docs/ROUTING_RULES.md` — alle 10 Regeln klinisch sinnvoll, `staffMessage`-Wortlaut OK
- [ ] CHANGE_LOG-Einträge nachvollziehbar

### Technisch
- [ ] CI grün: `npm run check-all` + `npm run test:run` + `npm run test:server` + `npm run test:e2e`
- [ ] Speziell `npx playwright test e2e/regulatory/` grün
- [ ] Speziell `npx vitest run server/engine/__tests__/RoutingEngine.regulatory.test.ts` grün
- [ ] `node scripts/generate-i18n.ts` — keine fehlenden Keys über 10 Sprachen
- [ ] Type-Check sauber (`npm run type-check`)

### Sprache
- [ ] DE-Übersetzungen der 15 neuen `anmeldeHinweis*`-Keys + 9 entlasteten Werte gelesen und freigegeben
- [ ] EN/FR/IT/ES Spot-Check
- [ ] TR/AR/FA/UK/PL — Native-Speaker-Review als **separater Folge-Schritt** (siehe `MIGRATION_NEXT_STEPS.md` §5) — vor Markteintritt im jeweiligen Sprachraum erforderlich

## Wie testen

```bash
# Lokale Verifikation
npm install
npm run check-all
npm run test:run
npm run test:server
npm run test:e2e

# Speziell die regulatorische Suite
npx vitest run server/engine/__tests__/RoutingEngine.regulatory.test.ts
npx vitest run server/engine/RoutingEngine.priority.test.ts
npx vitest run server/engine/RoutingEngine.performance.test.ts
npx playwright test e2e/regulatory/

# Manueller Smoke-Test (Patient-UI)
npm run dev:all
# → Browser auf http://localhost:5173, Anamnese starten
# → Bei Beschwerde "brust" auswählen → AnmeldeHinweisOverlay sollte zeigen:
#   "Bitte wenden Sie sich umgehend an das Praxispersonal an der Anmeldung.
#    Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112."
# → KEINE Wörter wie "Notfall", "Verdacht", "Herzinfarkt", "hindeuten"
```

## Bekannte Übergangs-Brücken

Diese drei Backwards-Compat-Brücken sind **bewusst** aktiv, damit gecachte PWA-Builds nicht hart brechen:

1. `server/socket.ts`: emittiert sowohl `routing:hint` als auch `triage:alert`
2. `server/routes/answers.ts`: `redFlags`-Response-Alias parallel zu `routingHints`
3. Frontend-Listener: `routing:hint` + `triage:alert` parallel

Plan zum Abbau: siehe [`docs/MIGRATION_NEXT_STEPS.md`](./MIGRATION_NEXT_STEPS.md). Frühestens **14 Tage** nach Live-Deploy als separater kleiner Cleanup-PR.

## Risiken & Gegenmaßnahmen

| Risiko | Wahrscheinlichkeit | Gegenmaßnahme |
|--------|--------------------|---------------|
| Patient interpretiert „nicht-diagnostischen" Hinweis als Verharmlosung | niedrig | Klare 112-Empfehlung in jedem PRIORITY-Hinweis; Usability-Test mit 5 Patienten empfohlen |
| Bestehende Praxis-Verträge erwarten „Triage" als Feature | niedrig | Verträge prüfen; Re-Verhandlung mit Begründung „regulatorisch konform" |
| Alte PWA-Builds verlieren Events während Übergangszeit | sehr niedrig | Backwards-Compat-Mirror auf 14 Tage ausgelegt, dann Cleanup-PR |
| CI-Lauf zeigt Fehler in dieser ersten Iteration | mittel | In dieser Repo-Session war kein CI-Workspace verfügbar — bitte vor Merge erzwingen |
| Native-Speaker-Review TR/AR/FA/UK/PL pending | mittel | Markteintritt im jeweiligen Sprachraum **erst nach** abgeschlossener Review |

## Sign-off-Pflicht

- [ ] **Dr. Klapproth** (Geschäftsführung)
- [ ] **Dr. Al-Shdaifat** (Medical Advisor — Pflicht für PRIORITY-Regeln)
- [ ] **Tech-Lead** (Code-Review)
- [ ] *Optional:* externer Regulatory-Berater (Empfehlungen siehe `REGULATORY_STRATEGY.md` §13.4)

## Stats

- **51 Dateien** geändert (21 NEU + 30 EDIT)
- **8 Sessions** Vorarbeit dokumentiert in `memory/runs/2026-05-05_claude-code_opus-4-7-{01..08}.md`
- **6 Audit-Trail-Einträge** in `docs/CHANGE_LOG_REGULATORY.md`
- **3 neue Test-Suiten** als CI-Gate
- **0 Funktionsverlust** — alle Routing-Regeln 1:1 portiert
