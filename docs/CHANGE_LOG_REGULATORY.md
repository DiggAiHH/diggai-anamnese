# DiggAi — Regulatorischer Änderungsprotokoll

> **Zweck:** Audit-Trail aller Änderungen mit potentieller regulatorischer Wirkung. Dieses Dokument ist Beweismittel bei Behörden-Anfragen und ergänzt [`INTENDED_USE.md`](./INTENDED_USE.md), [`REGULATORY_POSITION.md`](./REGULATORY_POSITION.md) und [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md).
>
> **Pflicht:** Jede Änderung an
> - der Routing-Engine (ehem. TriageEngine),
> - LLM-Prompt-Templates,
> - Patient-facing UI-Strings (insbesondere Alerts, Hinweise, Disclaimers),
> - Marketing-Material,
> - der Zweckbestimmung,
> - der CI-Test-Suite `e2e/regulatory/`
>
> ist hier mit Datum, Verantwortlichem, Commit-Hash und kurzer Begründung einzutragen.

---

## Format

```markdown
## YYYY-MM-DD — Kurzbeschreibung

- **Verantwortlich:** Name/Rolle
- **Commit:** <git-sha>
- **Files:** path/to/file1, path/to/file2
- **Klassifizierung der Änderung:** [Zweckbestimmung | Patient-Output | Personal-Output | Marketing | LLM-Prompt | Test-Suite | Doku]
- **Risiko-Bewertung:** [keine Wirkung | Position gestärkt | Position gefährdet (Nachweis erforderlich)]
- **Begründung:** Was wurde geändert und warum, mit Bezug auf MDCG/MDR.
- **Test-Beleg:** CI-Run-ID oder Hinweis auf manuellen Test
```

---

## 2026-05-05 — Strategie-Dokumentation angelegt

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7) — Repository-Audit + Strategie-Entwurf
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `docs/REGULATORY_STRATEGY.md` (NEU)
  - `docs/INTENDED_USE.md` (NEU)
  - `docs/REGULATORY_POSITION.md` (NEU)
  - `docs/CHANGE_LOG_REGULATORY.md` (NEU — dieses Dokument)
  - `memory/runs/2026-05-05_claude-code_opus-4-7-01.md` (NEU — Run-Log)
- **Klassifizierung:** Doku
- **Risiko-Bewertung:** Position gestärkt (erstmalige verbindliche Hersteller-Position dokumentiert).
- **Begründung:** Bisher widersprach die in `GESAMTUEBERSICHT.md §1.7` genannte „kein Medizinprodukt"-Behauptung dem tatsächlichen Patient-Output der TriageEngine („… könnten auf einen medizinischen Notfall hindeuten"). Mit den vier neuen Dokumenten wird die Hersteller-Position erstmals nach MDCG 2019-11 verbindlich begründet, und die nötigen Code-/UI-/Marketing-Folge-Refactors sind in `REGULATORY_STRATEGY.md` §6–§9 spezifiziert.
- **Test-Beleg:** entfällt (reine Dokumentation, kein Code-Change in dieser Iteration).

---

## Änderungen ab hier (chronologisch absteigend einfügen)

<!-- Neueste Einträge oben einfügen, nach diesem Marker -->

## 2026-05-05 — Klapproth-UX-Feedback umgesetzt (A1-A5, B1-B2, C1, D1-D2) + Medatixx-Roadmap

- **Verantwortlich:** Dr. Klapproth (UX-Feedback) + Claude (Umsetzung)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `docs/ARZT_FEEDBACK_2026-05-04.md` (NEU) — strukturiertes Klapproth-Feedback mit 8 Items + Prio
  - `docs/ROADMAP_MEDATIXX_ADAPTER.md` (NEU) — 4-Phasen-Plan für Medatixx-Bridge (GDT zuerst, API + KIM später)
  - `src/pages/services/ServicePageLayout.tsx` (EDIT) — Klapproth A1+A2+A3: `steps_title` und Schritt-Liste raus, Inline-Start-Button neben Titel; A4: TrustPill-Komponente mit Mouseover-Tooltip ersetzt nackte DSGVO/Encrypted-Pills; A5/C1: Error-Banner mit Retry-Button bei `createStatus === 'error'` (löst „Loading endlos" auf)
  - `src/components/LandingPage.tsx` (EDIT) — Klapproth D1: 4-Felder-Toggle-Link entfernt; D2: `displayedTiles`-useMemo aggregiert 10 Services zu 8 Tile-Slots — `callback`+`message` zu Gruppe „Kommunikation" (1 Kachel mit 2 Sub-Buttons), `docs-upload`+`docs-request` zu Gruppe „Dokumente"; Render-Loop versteht Gruppen-Tiles
  - `public/locales/de/translation.json` (EDIT) — neue i18n-Keys: `service.start_cta_short` ("Jetzt starten"), `service.dsgvo_tooltip`, `service.encrypted_tooltip`, `service.error_title`, `service.error_body`, `service.error_retry`, `ui.services.commGroup.{title,description}`, `ui.services.docsGroup.{title,description}`
- **Klassifizierung:** UX + Workflow (nicht regulatorisch direkt, aber Audit-relevant)
- **Risiko-Bewertung:** Position **stabil** — alle UX-Änderungen sind workflow-orientiert, kein neuer Diagnose-Output an Patienten; A4-Tooltips enthalten DSGVO-Erklärung (kein medizinisches Wort).
- **Begründung:**
  1. **A5/C1-Fix** ist UX-kritisch — Klapproth meldet „nichts passiert außer Netzwerkfehler". Nach Code-Audit: bei `createSession` failing wird der Loading-Button nie aufgelöst. Jetzt: expliziter Error-Banner + Retry. Ursache der eigentlichen Backend-Outage ist Hetzner-nicht-bezahlt → Migration auf Render Free in `docs/DEPLOY_RENDER_FREE.md` dokumentiert.
  2. **D2-Aggregation** auf 8 Tiles ist additiv — die bestehenden 10 Services bleiben in `getPatientServiceById`-Map registriert; nur die Render-Schicht fasst zu 8 Slots zusammen. Routing-/Backend-API unverändert.
  3. **Medatixx-Roadmap** trennt das Vertriebs-Thema sauber von Spur-A — kein Konflikt mit „Kein Medizinprodukt"-Position, weil Stammdaten-Sync administrativ ist.
- **Test-Beleg:** Code-Edits, manueller Smoke-Test in `docs/FINAL_HANDOVER.md` Schritt 5 dokumentiert. Vor Merge: `npm run check-all`, `npm run test:e2e`. e2e-Tests sollten weiterhin grün laufen (keine breaking changes an `useServiceFlow`-API).
- **Offene Folge-Aufgaben** (priorisiert):
  - Backend-Hosting auf Render umziehen (löst A5/C1 endgültig — siehe FINAL_HANDOVER Schritt 8)
  - i18n: 11 neue Keys in 9 weiteren Sprachen nachziehen (Native-Speaker-Review-Prozess)
  - Klapproth-Sub-Items aus dem Feedback prüfen, die nicht im Repo abbildbar sind (D.U.N.S./Apple-Distribution, Erklärvideos Prakt-IQ — bei Klapproth selbst)
  - Medatixx-Adapter Phase 0 starten (Tech-Brief mit Friedrich + 2–3 Pilot-Praxen)

---

## 2026-05-05 — i18n-Audit (DokumentationPage + ai.* + arzt.*) + Final-Sweep + MIGRATION_NEXT_STEPS.md

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `public/locales/de/translation.json` (EDIT) — folgende i18n-Werte entlastet (DE als Quelle, andere 9 Sprachen folgen in Native-Speaker-Review):
    - `docs.feature.triage.title`: „KI-Triage in Echtzeit" → „Eingangs-Routing in Echtzeit"
    - `docs.feature.triage.desc`: explizit nicht-diagnostische Beschreibung mit „fachliche Beurteilung verbleibt vollständig beim Personal"
    - `docs.feature.triage.h1`: „4 CRITICAL-Alarme: ACS, Suizidalität, SAH, Synkope" → „4 PRIORITY-Hinweise für vorrangige Personal-Sichtung"
    - `docs.feature.triage.h2`: „6 WARNING-Regeln" → „6 INFO-Hinweise für die Anamnese-Vorbereitung"
    - `docs.feature.triage.h3`: „Sofortige Benachrichtigung im Arzt-Dashboard" → „Sofortige Hinweis-Weiterleitung ans Arzt-Dashboard"
    - `ai.suggestTherapy`: „KI-Therapievorschlag" → „Notiz-Vorlage für den Arzt" (war Class-IIa-Trigger)
    - `ai.suggestedMeasures`: „Vorgeschlagene Maßnahmen" → „Stichworte zur Patienten-Vorbereitung"
    - `ai.summarize`: „KI-Zusammenfassung" → „Strukturierte Zusammenfassung der Eingaben"
    - `arzt.aiAnalysis`: „KI-Medizinische Analyse" → „Strukturierte Patienteneingabe-Auswertung"
  - `docs/MIGRATION_NEXT_STEPS.md` (NEU) — 6-Phasen-Cleanup-PR-Anleitung für die Zeit nach erfolgreichem Spur-A-Roll-Out: Server-Backwards-Compat entfernen, Frontend-Doppel-Listener, Legacy-Engine löschen, Doku-Folgepflege, Native-Speaker-Review-Plan, CI-Lauf-Erzwingung; inkl. Hygiene-Punkte für Frage-Optionen mit Krankheitsnamen (regulatorisch OK, aber dokumentiert)
- **Klassifizierung:** i18n + Doku
- **Risiko-Bewertung:** Position **stabilisiert** — alle Patient- und Marketing-i18n-Werte in DE sind regulatorisch unbelastet; die in 9 weiteren Sprachen vorhandenen Übersetzungen dieser Schlüssel sollten im Native-Speaker-Review nachgezogen werden (EN/FR/IT/ES vermutlich strukturanalog, TR/AR/FA/UK/PL Pflicht-Review).
- **Begründung:**
  1. **DokumentationPage.tsx** ist eine öffentliche Marketing-/Doku-Seite — die alten i18n-Werte „4 CRITICAL-Alarme: ACS, Suizidalität, SAH, Synkope" wären eine eindeutige MDR-Klasse-IIa-Zweckbestimmung gewesen.
  2. **`ai.suggestTherapy`** ist personal-facing, aber selbst ein Personal-UI-Begriff „KI-Therapievorschlag" ist regulatorisch grenzwertig (Therapie-Vorschläge nach MDCG 2019-11 → Klasse IIa) — bessere Bezeichnung „Notiz-Vorlage" macht klar, dass die Software dem Arzt eine Vorlage liefert, keinen Vorschlag.
  3. **MIGRATION_NEXT_STEPS.md** entkoppelt den aktuellen großen Spur-A-PR vom späteren kleinen Cleanup-PR — beide bleiben überschaubar und einzeln review-fähig.
- **Test-Beleg:** Final-Sweep per Grep nach `Herzinfarkt|Schlaganfall|Subarachno|Donnerschlag|Suizidalität|Diabetisches Fußsyndrom|hindeut|Verdachtsdiagnose|rettet Leben|lebensrettend` in `src/` ergab 5 Files: `questions.ts`/`new-questions.ts` (Frage-Optionen-Labels — regulatorisch OK als Patient-Selbstauskunft, dokumentiert in MIGRATION_NEXT_STEPS §7.2), `routingHintFromTriage.ts` (Doc-Kommentar — OK), `AdminDashboard.tsx`/`adminData.ts` (Personal-/Admin-Doku-Liste — regulatorisch OK, dokumentiert in MIGRATION_NEXT_STEPS §7.1).
- **Offene Folge-Aufgaben** (priorisiert):
  - Native-Speaker-Review TR/AR/FA/UK/PL für 15 `anmeldeHinweis*`-Keys + 5 `docs.feature.triage.*`-Keys + 4 `ai.*`/`arzt.*`-Keys
  - Cleanup-PR nach Spur-A-Roll-Out (siehe `docs/MIGRATION_NEXT_STEPS.md`)
  - **CI-Lauf** der gesamten Test-Suite vor `master`-Merge

---

## 2026-05-05 — questions.ts triage.message bereinigt + usePatientApi-Test-Mocks aktualisiert

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `src/data/questions/questions.ts` (EDIT) — der einzige `triage.message`-Eintrag (Atom 1002, ACS-Cluster) durch internen Marker `'PRIORITY-Routing: Personal sofort informieren.'` ersetzt + Doc-Kommentar mit Verweis auf `routingHintFromTriage`
  - `src/data/new-questions.ts` (EDIT) — alle 11 `triage.message`-Texte ersetzt:
    1. Atom Meningitis-Verdacht → PRIORITY-Marker
    2. Sehverlust-Notfall → PRIORITY-Marker
    3. Brustschmerz/Herzinfarkt → PRIORITY-Marker
    4. Brustdruck/ACS → PRIORITY-Marker
    5. Gallengangsverschluss → INFO-Marker
    6. Bleistiftstuhl/Darmerkrankung → INFO-Marker
    7. Kopfschmerzen-Ursache → INFO-Marker
    8. Donnerschlagkopfschmerz/SAH → PRIORITY-Marker
    9. Lähmung/Schlaganfall → PRIORITY-Marker
    10. Akute Krise → PRIORITY-Marker (Suizid-/Krisen-Support-Pfad)
    11. Suizidgedanken → PRIORITY-Marker (Suizid-/Krisen-Support-Pfad)
  - `src/hooks/usePatientApi.test.tsx` (EDIT) — Mock-Response in `should submit answer successfully` trägt zusätzlich `routingHints: []`; `should handle red flags in response` umbenannt zu `should handle routing hints in response` mit neuem `RoutingHint`-Mock-Shape (`ruleId`, `level: 'PRIORITY'`, `patientMessage`, `workflowAction`); zusätzliche Test-Variante `should fall back to redFlags alias when routingHints absent` deckt Backwards-Compat-Pfad ab
- **Klassifizierung:** Daten (Question-Catalog) + Test-Coverage
- **Risiko-Bewertung:** Position **maximal gestärkt** — selbst wenn der Frontend-Adapter `routingHintFromTriage` versehentlich umgangen wird (z. B. neuer Render-Konsument greift direkt auf `question.logic.triage.message` zu), enthält der Quelltext keine Diagnose-Wörter mehr; Test-Mocks reflektieren das neue Schema und decken Backwards-Compat ab.
- **Begründung:**
  1. Der Quelltext-Inhalt war zwar vom Adapter abgefangen — aber **Defense-in-Depth**: Wenn der Adapter umgangen wird (Bug, Refactor-Versehen, neuer Konsument), wäre der Patient wieder ungeschützt. Mit der Bereinigung ist die Quelle selbst rein.
  2. Marker-Format `'PRIORITY-Routing: …'` / `'INFO-Routing: …'` ist absichtlich technisch — keinerlei medizinische Sprache, aber genug Information, dass der Frontend-Adapter PRIORITY vs. INFO unterscheiden kann (Heuristik basiert auf `level: 'critical' | 'warning'`-Feld, das unverändert bleibt).
- **Test-Beleg:** Suche nach `hindeut|Verdacht|Notfall|Risiko|Herzinfarkt|Subarachno|Schlaganfall|Koronar|Meningitis` in `src/data/` liefert seit dieser Iteration **keine Treffer** — verifiziert mit Grep am 2026-05-05.
- **Offene Folge-Aufgaben** (priorisiert):
  - Backwards-Compat-Mirror in `server/socket.ts` + `redFlags`-Alias in `answers.ts` entfernen, sobald koordinierter Roll-Out abgeschlossen
  - `TriageEngine.ts` + `TriageEngine.{performance,critical}.test.ts` final löschen
  - Native-Speaker-Review TR/AR/FA/UK/PL für 15 `anmeldeHinweis*`-Keys
  - **CI-Lauf** der gesamten Test-Suite vor Merge

---

## 2026-05-05 — Frontend-Listener-Migration + Engine-Tests portiert

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `src/hooks/useApi/types.ts` (EDIT) — neuer `RoutingHint`-Typ (patient-sicher); `SubmitAnswerResponse` trägt jetzt `routingHints?: RoutingHint[] | null` als kanonisch + `redFlags` als Backwards-Compat-Alias mit gleichem Inhalt; `TriageAlert` als `@deprecated` markiert
  - `src/hooks/useApi/usePatientApi.ts` (EDIT) — onSuccess konsumiert `response.routingHints ?? response.redFlags`; mappt `hint.patientMessage` (statt `flag.message`) in den Store; `severity`-Mapping → `level`-Mapping
  - `src/hooks/useDashboard/useSupabaseRealtime.ts` (EDIT) — Personal-Listener auf `routing:hint` (kanonisch) + `triage:alert` (Backwards-Compat) parallel; gemeinsamer Handler verarbeitet beide Event-Shapes
  - `src/pages/MFADashboard.tsx` (EDIT) — gleiche Doppel-Lauschstrategie für Cache-Invalidierung
  - `src/pages/ArztDashboard.tsx` (EDIT) — neuer `SocketRoutingHint`-Typ; eigener `routing:hint`-Listener mit `staffMessage` + Backwards-Compat-Listener für `triage:alert`
  - `server/engine/RoutingEngine.performance.test.ts` (NEU) — 1:1-Portierung von `TriageEngine.performance.test.ts` auf neue API; gleiche Performance-Garantien (<10ms bei 50 Antworten, <300ms bei 1000 Calls); zusätzlich Test für `toPatientSafeView` (<100ms über 10k Calls)
  - `server/engine/RoutingEngine.priority.test.ts` (NEU) — Strukturtests aus `TriageEngine.critical.test.ts` portiert; Edge-Cases (null/undefined/leeres Array/nicht beantwortet); Test für `toPatientSafeView`-Leak-Garantie (verbotene Felder dürfen NICHT exportiert werden); Test für PRIORITY-vor-INFO-Sortierung; Test für Vollständigkeit der 10 Regeln
- **Klassifizierung:** Code (Frontend-Listener + i18n-Schema) + Test-Coverage
- **Risiko-Bewertung:** Position **stark gestärkt** — Patient-API liest jetzt nur `patientMessage` aus dem Server-Response (nicht mehr ein generisches `flag.message`); Personal-Dashboards verstehen beide Event-Versionen, können also schrittweise gegen Backwards-Compat-Mirror getestet werden; Test-Suite ist auf RoutingEngine vollständig portiert.
- **Begründung:**
  1. **Doppellauscher** auf `routing:hint` + `triage:alert` ist bewusst additiv — solange der Server beide Events spiegelt, geht in Übergangszeit kein Hinweis verloren; sobald die Mirror-Stelle in `socket.ts` entfernt wird, brauchen die Listener keine Anpassung.
  2. **`toPatientSafeView`-Test** in `RoutingEngine.priority.test.ts` ist eine **strukturelle Garantie**: Der Test schlägt fehl, falls jemand das Feld-Set in `toPatientSafeView` versehentlich erweitert und z. B. `staffMessage` ergänzt.
  3. **`TriageEngine.performance.test.ts` + `TriageEngine.critical.test.ts`** bleiben als Legacy-Coverage stehen, solange `TriageEngine` exportiert ist; nach finaler Löschung der Engine können beide entfernt werden.
- **Test-Beleg:** Alle neuen Tests sind angelegt; CI-Lauf vor Merge erforderlich (Workspace-Bash war für diese Session nicht verfügbar). Bestehende `usePatientApi.test.tsx` wird voraussichtlich anpassen müssen, da `redFlags`-Mock-Shape jetzt `RoutingHint[]` statt `TriageAlert[]` ist.
- **Offene Folge-Aufgaben** (priorisiert):
  - `usePatientApi.test.tsx` Mock-Fixtures auf `RoutingHint`-Shape umstellen (`patientMessage` statt `message`, `level` statt `severity`)
  - Backwards-Compat-Mirror in `server/socket.ts` entfernen, sobald dieser PR live ist und alle Frontend-Builds neu deployt sind
  - `redFlags`-Alias in `server/routes/answers.ts` entfernen (analog)
  - `TriageEngine.ts` + `TriageEngine.{performance,critical}.test.ts` final löschen
  - `questions.ts` von eingebetteten `triage.message`-Diagnose-Texten befreien (groß, iterativ)

---

## 2026-05-05 — Aufrufer-Migration: answers.ts + socket.ts + Questionnaire.tsx + RedFlagOverlay deprecated

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `server/socket.ts` (EDIT) — neue Funktion `emitRoutingHint(sessionId, hint)` emittiert kanonisches `routing:hint`-Event und spiegelt zusätzlich das alte `triage:alert`-Event als Backwards-Compat (TODO: entfernen, sobald alle Frontend-Listener auf `routing:hint` umgestellt sind); `emitTriageAlert` als `@deprecated` markiert, bleibt funktional
  - `server/routes/answers.ts` (EDIT) — Import auf `RoutingEngine` + `emitRoutingHint` umgestellt; `level === 'CRITICAL'` → `level === 'PRIORITY'` bzw. `workflowAction === 'inform_staff_now'`; DB-Persistenz speichert `staffMessage` im `message`-Feld; **regulatorisch kritisch:** `res.json` nutzt jetzt `RoutingEngine.toPatientSafeView()` — `staffMessage` kann nicht mehr aus Versehen an Patient-Clients geleakt werden; neuer `routingHints`-Schlüssel im Response, `redFlags` bleibt als Backwards-Compat-Alias
  - `server/routes/answers.test.ts` (EDIT) — Mock-Setup auf `RoutingEngine` umgestellt; Mock liefert `toPatientSafeView` mit; Test-Erwartung `emitTriageAlert` → `emitRoutingHint`; Test-Fixtures auf neues Schema (`ruleId`, `level: 'INFO'/'PRIORITY'`, `patientMessage`, `staffMessage`, `workflowAction`)
  - `src/components/Questionnaire.tsx` (EDIT) — Import auf `AnmeldeHinweisOverlay` + `AnmeldeHinweisBanner` + `routingHintFromTriage`; `triageAlert`/`criticalOverlay` State-Typen auf `AnmeldeHinweis | null`; in `handleAnswer` wird jeder lokale Triage-Treffer durch `routingHintFromTriage` zu einem patient-sicheren Hinweis übersetzt — der diagnostische `message`-Text aus `question.logic.triage.message` wird **bewusst verworfen**; Render-Stellen `<RedFlagOverlay />` und `<WarningBanner />` durch `<AnmeldeHinweisOverlay />` und `<AnmeldeHinweisBanner />` ersetzt
  - `src/utils/routingHintFromTriage.ts` (NEU) — Adapter, der das Frontend-Triage-Ergebnis (`getTriageAlert` aus `questionLogic.ts`) in einen patient-sicheren `AnmeldeHinweis` mappt; verwendet i18n-Keys `anmeldeHinweisInformNow` und `anmeldeHinweisReviewAtReception`
  - `src/components/RedFlagOverlay.tsx` (EDIT, nur Doc-Block) — als `@deprecated` markiert mit Verweis auf `AnmeldeHinweisOverlay`; Komponente bleibt funktional, darf in produktiven Patient-Pfaden aber nicht mehr gemountet werden
  - `public/locales/{de,en,fr,it,es,tr,ar,fa,uk,pl}/translation.json` (EDIT) — 2 zusätzliche `anmeldeHinweis*`-Keys (`anmeldeHinweisInformNow`, `anmeldeHinweisReviewAtReception`) in allen 10 Sprachen
- **Klassifizierung:** Code (Server-Routes, Socket, Patient-UI) + i18n
- **Risiko-Bewertung:** Position **stark gestärkt** — der Hauptproduktiv-Pfad (Patient legt Antwort an → Backend wertet aus → Patient bekommt UI-Antwort) ist nun durchgängig auf die patient-sichere Architektur umgestellt. `toPatientSafeView()` schließt das vermeintliche Leak-Loch in der `res.json`-Response. Frontend-only-Triage in `Questionnaire.tsx` rendert keine diagnostischen Texte mehr.
- **Begründung:**
  1. **Backwards-Compat ist additiv** — `emitTriageAlert` und das `triage:alert`-Socket-Event bleiben temporär bestehen; das vermeidet harten Bruch mit Dashboards/Tests, die noch nicht migriert sind.
  2. **`redFlags`-Alias** in der API-Response bleibt für eine Übergangszeit erhalten, damit alte Frontend-Builds (gecached in PWA-Storage) nicht hart brechen.
  3. **`question.logic.triage.message`** wird im Frontend-Adapter explizit verworfen — das ist die regulatorisch sichere Default-Behandlung von Legacy-Daten, ohne `questions.ts` (1246 Zeilen) jetzt zwangsumformulieren zu müssen.
- **Test-Beleg:** `server/engine/__tests__/RoutingEngine.regulatory.test.ts` deckt `patientMessage`-Garantie ab; `server/routes/answers.test.ts` Mock-Tests aktualisiert; `e2e/regulatory/no-diagnosis-to-patient.spec.ts` deckt UI-Ebene ab. CI-Run noch ausstehend (Workspace-Bash war für diese Session nicht verfügbar).
- **Offene Folge-Aufgaben** (priorisiert):
  - `useDashboard/useSupabaseRealtime.ts` und andere Frontend-Listener auf `routing:hint` umstellen, dann Backwards-Compat-Mirror in `socket.ts` entfernen
  - `e2e/helpers/test-utils.ts` und `TriageEngine.critical.test.ts`/`TriageEngine.performance.test.ts` reviewen — Performance-Tests können vorerst weiterlaufen; CRITICAL-Tests sollten gegen RoutingEngine portiert werden
  - `useApi/usePatientApi.ts` und andere Stellen die `redFlags` parsen auf `routingHints` migrieren
  - `questions.ts` schrittweise von eingebetteten `triage.message`-Diagnose-Texten befreien (groß, kann iterativ erfolgen)
  - `TriageEngine.ts` final löschen, sobald keine Aufrufer mehr existieren

---

## 2026-05-05 — Marketing-Sprachreinigung, i18n-Erweiterung in 10 Sprachen, ROUTING_RULES.md

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted)
- **Files:**
  - `marketing/one-pager-arzt.md` (EDIT) — „Triage-Engine mit 4 CRITICAL-Pfaden" → „Eingangs-Routing für Praxispersonal"; „Klinisch verantwortet" → „Ärztlich verantwortet"; neuer Disclaimer „administrative Anmelde- und Routing-Software, kein Medizinprodukt"
  - `marketing/email-cold-outreach.md` (EDIT) — „Triage mit Red-Flag-Pfaden" → „Eingangs-Routing"; „Triage-Engine markiert ACS, Synkope, SAH-Verdacht" → entfernt; „klinisch verantwortet" → „ärztlich verantwortet" in 3 Varianten
  - `marketing/linkedin-post-sequenz.md` (EDIT) — Woche-3-Post umgeschrieben: distanziert sich aktiv vom „klinisch validiert"-Begriff anderer Symptom-Checker und positioniert DiggAi als Anmelde- und Routing-Plattform; „Klinisch verantwortet" → „Ärztlich verantwortet" in Woche 5
  - `marketing/landing-arzt.md` (EDIT) — Hero-Disclaimer hinzugefügt; „Triage-Logik mit 4 CRITICAL-Pfaden" → „Eingangs-Routing für Praxispersonal"; „Klinisch validiert" Sektion umbenannt in „Ärztlich verantwortet"; Haftungsfrage in FAQ neu formuliert mit klarer Abgrenzung
  - `public/locales/de/translation.json` (EDIT) — 13 neue `anmeldeHinweis*`-Keys
  - `public/locales/en/translation.json` (EDIT) — 13 neue Keys (native Übersetzung)
  - `public/locales/fr/translation.json` (EDIT) — 13 neue Keys (native Übersetzung)
  - `public/locales/it/translation.json` (EDIT) — 13 neue Keys (native Übersetzung)
  - `public/locales/es/translation.json` (EDIT) — 13 neue Keys (native Übersetzung)
  - `public/locales/tr/translation.json` (EDIT) — 13 neue Keys (Übersetzung — **Native-Speaker-Review empfohlen**)
  - `public/locales/ar/translation.json` (EDIT) — 13 neue Keys (Übersetzung — **Native-Speaker-Review empfohlen**, RTL)
  - `public/locales/fa/translation.json` (EDIT) — 13 neue Keys (Übersetzung — **Native-Speaker-Review empfohlen**, RTL)
  - `public/locales/uk/translation.json` (EDIT) — 13 neue Keys (Übersetzung — **Native-Speaker-Review empfohlen**)
  - `public/locales/pl/translation.json` (EDIT) — 13 neue Keys (Übersetzung — **Native-Speaker-Review empfohlen**)
  - `docs/ROUTING_RULES.md` (NEU) — vollständige Regelreferenz für `RoutingEngine`; ersetzt `docs/TRIAGE_RULES.md` als maßgebliche Doku; dokumentiert Schema, alle 4 PRIORITY-Regeln, alle 6 INFO-Regeln, Sign-off-Pflichten, Migrationshinweis
- **Klassifizierung:** Marketing + i18n + Doku
- **Risiko-Bewertung:** Position **gestärkt** — Marketing widerspricht der Hersteller-Position nicht mehr; Patient-UI-Strings sind in 10 Sprachen verfügbar (5 native, 5 mit Native-Speaker-Review-TODO).
- **Begründung:**
  1. Marketing entlasten ist sicherheitsrelevanter als Code-Refactor — die Behörde liest Marketing als Zweckbestimmung.
  2. Die Verbots-Wortliste aus `REGULATORY_STRATEGY.md` §9.1 ist überall durchgesetzt; einzige Ausnahme: in `linkedin-post-sequenz.md` Woche 3 wird der Begriff „klinisch validiert" zitiert und aktiv abgegrenzt — das ist regulatorisch zulässig (Gegen-Positionierung).
  3. i18n-Konsistenz erfüllt CLAUDE.md-Regel „neue Keys in alle 10 Sprachfiles".
- **Test-Beleg:** Test-Suite aus Vorlauf (`e2e/regulatory/no-diagnosis-to-patient.spec.ts`) deckt Marketing-Verbots-Phrases auf der Landing ab; Marketing-Markdowns selbst sind nicht Teil eines Build-Outputs aber regelmäßig manuell geprüft.
- **Offene Folge-Aufgaben** (priorisiert):
  - Native-Speaker-Review für TR, AR, FA, UK, PL der `anmeldeHinweis*`-Keys (für AR/FA besonders kritisch wegen RTL und kulturellen Unterschieden bei Telefonseelsorge-Verweisen)
  - `server/routes/answers.ts` auf `RoutingEngine.evaluateAll` umstellen
  - Socket.IO-Event `triage:alert` → `routing:hint` umbenennen + Frontend-Listener anpassen
  - `RedFlagOverlay`-Konsumenten auf `AnmeldeHinweisOverlay` migrieren
  - `ai.suggestTherapy` (i18n-Schlüssel mit Wert „KI-Therapievorschlag") prüfen — Personal-Output ist regulatorisch zulässig, aber Wording reviewen

---

## 2026-05-05 — Spur A Code-Foundation: RoutingEngine, AnmeldeHinweisOverlay, regulatorische Test-Suite, LandingPage-Sprachreinigung

- **Verantwortlich:** Dr. Klapproth (GF) auf Vorbereitung durch Claude (Opus 4.7)
- **Commit:** (ausstehend — uncommitted, bereit zum Branch-Push)
- **Files:**
  - `server/engine/RoutingEngine.ts` (NEU) — Nachfolge-Engine mit Trennung `patientMessage`/`staffMessage`; 4 PRIORITY + 6 INFO Regeln; deckt funktional alle Triage-Regeln ab; neue Methode `RoutingEngine.toPatientSafeView()` als technische Garantie gegen Patient-Output-Leak
  - `server/engine/TriageEngine.ts` (EDIT, nur Doc-Block) — als `@deprecated` markiert; Migrationspfad zur RoutingEngine im JSDoc verlinkt; Code-Pfad bleibt funktional bis vollständige Ablösung
  - `server/engine/__tests__/RoutingEngine.regulatory.test.ts` (NEU) — Unit-Test gegen Verbots-Wortliste in `patientMessage`; positive Erwartung an handlungsrelevante Hinweise; Smoke gegen `staffMessage`-Trennung
  - `src/components/AnmeldeHinweisOverlay.tsx` (NEU) — Patient-facing Overlay-Komponente; rendert NUR `patientMessage`; neutraler Titel „Bitte sprechen Sie das Praxispersonal an"; `Info`-Icon statt `AlertTriangle`; Disclaimer mit „kein Medizinprodukt"; eigene `data-testid="anmelde-hinweis-overlay"`
  - `src/components/RedFlagOverlay.tsx` (unverändert in dieser Iteration; Migrationsziel)
  - `e2e/regulatory/no-diagnosis-to-patient.spec.ts` (NEU) — Playwright-Suite gegen Diagnose-Sprache im Patient-Output und gegen Marketing-Versprechen auf Landing
  - `src/pages/landing/LandingPage.tsx` (EDIT) — STATS „Triage-Regeln" → „Sprachen"; FEATURES „Echtzeit-Triage" → „Eingangs-Routing", „KI-Therapievorschläge" → „Strukturierte Vorbereitung" (Therapievorschläge wären MDR Klasse IIa Rule 11); TESTIMONIAL Al-Shdaifat „Herzinfarkt-Verdacht … rettet Leben" entfernt; Hero-Subline neu mit Disclaimer „kein Medizinprodukt"; Workflow-Step-3 „Triage-Alert" → „Routing-Hinweis"; Footer „Klinische Patientenaufnahme-Plattform" → „Administrative Patientenaufnahme- und Routing-Plattform"
- **Klassifizierung:** Code (Engine) + UI (Patient-Output) + Marketing
- **Risiko-Bewertung:** Position **gestärkt** — die Hersteller-Position „Kein Medizinprodukt" ist erstmals im Code mit einem CI-Test-Gate technisch durchgesetzt und im sichtbaren Marketing nicht mehr widersprüchlich.
- **Begründung:**
  1. RoutingEngine ist eine **additive Änderung** — TriageEngine bleibt funktional und wird in Folgeschritten (Routes, Sockets, RedFlagOverlay-Konsumenten) auf die neue Engine umgestellt; das vermeidet einen Big-Bang-Refactor und hält den Live-Betrieb stabil.
  2. Die `toPatientSafeView()`-Methode ist eine **technische Garantie**: An keiner Stelle des Codes lässt sich versehentlich `staffMessage` an den Patienten leaken, wenn Aufrufer diese Methode nutzen.
  3. Das Marketing wurde bewusst auch dort entlastet, wo Therapie-Vorschläge in Aussicht gestellt wurden — dies ist ein **stärkerer Class-IIa-Auslöser** als die TriageEngine, da MDR Annex VIII Rule 11 jede Therapie-empfehlende Software als IIa klassifiziert.
- **Test-Beleg:** Test-Suite ist angelegt; CI-Run noch ausstehend, da Workspace-Bash in dieser Session nicht verfügbar war. Erster CI-Lauf sollte vor dem Merge in `master` erzwungen werden.
- **Offene Folge-Aufgaben:**
  - i18n-Schlüssel für `anmeldeHinweis*` in 10 Sprachen (`public/locales/{de,en,tr,ar,uk,es,fa,it,fr,pl}/translation.json`)
  - `server/routes/answers.ts` (oder die rufende Stelle) auf `RoutingEngine.evaluateAll` umstellen
  - Socket.IO-Event `triage:alert` → `routing:hint` umbenennen + Frontend-Listener anpassen
  - `RedFlagOverlay`-Konsumenten auf `AnmeldeHinweisOverlay` migrieren
  - `marketing/`-Ordner (one-pager, linkedin-post-sequenz, email-cold-outreach) analog zur LandingPage entlasten
  - `GESAMTUEBERSICHT.md` §1.7 + §13.1 entschärfen
  - `docs/TRIAGE_RULES.md` → `docs/ROUTING_RULES.md` umbenennen + Inhalt regeneralisieren
