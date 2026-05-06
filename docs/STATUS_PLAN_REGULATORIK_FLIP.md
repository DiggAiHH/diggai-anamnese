# DiggAi — Stand, Plan und Regulatorik-Flip

**Version:** 1.0 · **Stand:** 2026-05-06 · **Branch:** `restructure/phase-1-workspace`
**Verfasser:** Claude (claude-code, opus-4-7) · **Adressaten:** CK (GF), Anwalt, BfArM-Sprechstunde, Co-Reviewer

---

## 1. Executive Summary in einer Minute

Wir stehen vor einer doppelten Aufgabe und beide Spuren laufen synchron:

DiggAi ist heute **online und durchgängig EU-DSGVO-konform** auf Fly.io Frankfurt + Neon Frankfurt + Netlify, und die Live-Strecke (Patient → diggai.de → diggai-api.fly.dev → DB) ist seit dem 2026-05-06 grün. Parallel haben wir im selben Tag drei strategische Dokumente gebaut, die das Produkt aus der **Class-IIa-Falle** herausführen: Strategie-Doc, Intended-Purpose v1.0 (DE+EN, ca. 16 Seiten) und Restrukturierungs-Plan v1.0. Phase 1a (Workspace-Scaffold mit `packages/{capture,suite,common}`) ist gepusht; Phase 1b (npm-Workspace-Aktivierung) wurde wegen RAM-Engpass rolled-back und wartet auf eine fitterer Build-Maschine.

Der Regulatorik-Flip — der Kern dieses Dokuments — funktioniert über drei Hebel: **Produkt-Split** (zwei Anwendungen statt einer), **Intended-Purpose-Disziplin** nach MDCG 2019-11 §3.5/§4.2/§6.1 (Capture als reine Daten-Erfassung ohne klinische Empfehlung), und **technische Trennung im Bundle** (separate Build-Artefakte, Postgres-Rollen, ESLint-Guards). Damit wird Capture als **MDR Klasse I in Selbstverifizierung** zertifizierbar und Suite separat als **Klasse IIa** mit der Möglichkeit eines späteren **DiGA-Antrags** nach §139e SGB V.

Die nächsten drei Wochen entscheiden: BfArM-Sprechstunde buchen (kostenlos, validiert die Strategie behördlich), Anwalts-Erstgutachten beauftragen (2–5 k€, juristische Härtung der Class-I-Position), und Phase 1b auf einer Maschine mit ≥8 GB freiem RAM oder fresh boot wiederholen.

---

## 2. Stand am 2026-05-06 — was läuft, was nicht

### 2.1 Live-Strecke (Patient zur Datenbank)

| Schicht | Stand | URL / Detail |
|---------|-------|--------------|
| Frontend | grün | `https://diggai.de` (Custom-Domain) und `https://diggai-anamnese.netlify.app` (Netlify default) |
| Backend | grün | `https://diggai-api.fly.dev` (Fly.io, Region `fra` — DSGVO) |
| Datenbank | grün | Neon Postgres, Region `eu-central-1` Frankfurt |
| Deploy-Pipeline | grün | Build lokal mit `NODE_OPTIONS=--max-old-space-size=4096`, `netlify deploy --no-build` für Production |
| Cert / TLS | grün | Let's Encrypt für Fly + Netlify SSL |
| Bundle-Korrektheit | grün | `index-C6ycMWCw.js` zeigt `Gn=i("https://diggai-api.fly.dev/api")`, kein altes Hetzner-Vorkommen |

### 2.2 Was deprecated ist und wartet auf Aufräumung

- `api.diggai.de` (Hetzner) hat kaputtes TLS-Zertifikat seit Lauf claude-code-03. DNS-Cutover auf Fly (A `66.241.125.72`, AAAA `2a09:8280:1::111:b83f:0`) ist vorbereitet (`flyctl certs add api.diggai.de` durchgeführt), wartet auf User-DNS-Aktion.
- Hetzner-VPS kann gekündigt werden, sobald DNS 24–48 h propagiert ist (~50 €/Mon Einsparung).
- Netlify-Token im Repo geleakt — Rotation steht aus (Sicherheits-Hygiene).

### 2.3 Was wir am 2026-05-06 in 12 Läufen gebaut haben

| Lauf | Outcome |
|------|---------|
| 01 | Backend-Bootstrap-Fix (RabbitMQ-Toggle), 5 Helper-Bats, Cloud-DB-Vorbereitung |
| 02 | Cloud-DB live, Production-Deploy auf Netlify (Site `4e24807c-…`) |
| 03 | UI-Drift-Fix: i18n-Leaks + Signature-Buttons + Live-Mode-Diagnose |
| 04 | **Backend-Migration Hetzner → Fly.io Frankfurt** (Live-Mode wieder funktional) |
| 05 | Strategie-Dokument `DiggAi-Status-Plan-Regulatorik.docx` (~14 Seiten, 25 KB) |
| 06 | Schema-Drift-Cleanup `seed-demo.ts`, DNS-Vorbereitung `api.diggai.de` |
| 07 | Bundle-Bug `netlify.toml` (Hetzner-URL hardcoded) gefixt |
| 08 | **Intended-Purpose v1.0 DE+EN** (`DiggAi-Capture-Intended-Purpose-v1.0.docx`, 22 KB) + Architektur-Diagramm |
| 09 | **Restrukturierungs-Plan v1.0** (`DiggAi-Restrukturierungs-Plan-v1.0.docx`, 23 KB) |
| 10 | Phase 1a Scaffold gepusht (`packages/{capture,suite,common}/` mit `diggaiClassification`-Metadata) |
| 11 | Co-Reviewer-Paket + Compliance-Toolkit (`featureFlags.ts`, `bundle-audit.cjs`, `01_postgres_roles.sql`, ESLint-Guard) |

### 2.4 Was wir bewusst nicht angefasst haben

Die TriageEngine, das Question-Catalog (270+ Fragen), die Encryption-Layer, das Auth-System — alles **funktional unverändert**. Der Flip betrifft Architektur, Build und Wording, nicht die fachliche Substanz.

---

## 3. Der Regulatorik-Flip — wie wir aus Class IIa rauskommen

### 3.1 Warum wir ohne Flip in Class IIa landen würden

Nach **MDR Anhang VIII Regel 11** ist Software, die „Informationen liefert, die für Entscheidungen mit diagnostischen oder therapeutischen Zwecken herangezogen werden", mindestens **Klasse IIa**. Wenn die Entscheidung schwere Verschlechterung oder chirurgischen Eingriff verhindert, springt sie auf **IIb**, bei Lebensgefahr auf **III**. DiggAi würde heute mit einer monolithischen Architektur und einer durchmischten Zweckbestimmung („KI-Triage", „klinische Entscheidungsunterstützung", „rettet Leben") in der Class-IIa- bis IIb-Falle landen — Notified Body, ISO 13485, klinische Bewertung, 60–100 k€ Erstzertifizierung, 12+ Monate Vorlauf, 15–30 k€/Jahr Surveillance.

### 3.2 Die drei Hebel des Flips

#### Hebel 1: Produkt-Split (eine Anwendung wird zwei)

Die alte Architektur hat **Capture** (Patientendaten erfassen, strukturieren, weiterleiten) und **Suite** (Triage-Empfehlungen für Personal, Therapieplan-KI, klinische Alerts) im selben Bundle vermischt. Im Flip teilen wir das in zwei eigenständige Anwendungen:

- **DiggAi Capture** — Patient erfasst Stammdaten + Anliegen + strukturierte Symptom-Stichworte. Output ist ein **Datenobjekt** an die Praxis, **kein klinischer Hinweis**. Geltungsbereich: nur Erfassung und Übergabe. Kein Empfehlungs-, Triage-, Diagnose- oder Risiko-Output an Patient oder Personal.
- **DiggAi Suite** — Vollständige Praxis-Software mit TriageEngine, KI-Therapieplan, Alerts, Dashboards. Empfänger ist medizinisches Fachpersonal, nicht der Patient.

Beide laufen technisch separat: eigene Domain (`diggai.de` für Capture, `praxis.diggai.de` für Suite), eigene Builds, eigene Deployment-Pipelines, eigene Datenbankrollen, eigene Versionsnummern und eigene UDI-DI.

#### Hebel 2: Intended-Purpose-Disziplin nach MDCG 2019-11

MDCG 2019-11 (das einschlägige EU-Guidance-Dokument für Medizingeräte-Software) macht in §3.5, §4.2 und §6.1 klar: Die **Zweckbestimmung des Herstellers** ist der erste und wichtigste Maßstab. Eine Software, deren Hersteller-Erklärung ausschließlich „Datenerfassung und -Weiterleitung" beschreibt und die technisch keine **Information für klinische Entscheidungen** liefert, fällt unter den **MDSW-Decision-Tree-Schritt 1 mit Antwort „No"** und ist damit **nicht MDSW** — also kein klassifiziertes Medizinprodukt.

Capture wird in genau dieser Logik dokumentiert (siehe `DiggAi-Capture-Intended-Purpose-v1.0.docx`):
- IN-SCOPE (11 Items): Stammdaten-Erfassung, Mehrsprachigkeit, Einwilligung, strukturierte Übergabe an die Praxis
- OUT-OF-SCOPE (11 Items): Triage-Output an Patient, KI-Empfehlung, Alert-Erzeugung, Therapie-Vorschlag, Risk-Score
- 5 Restrisiken mit Mitigation (Falsch-Eingabe, Sprachbarriere, technischer Ausfall, Personal-Workflow-Bruch, Haftungs-Wahrnehmung)

Das ist die **Class-I-Argumentationsbasis** — wenn der Anwalt Capture verteidigen muss, hat er ein 16-Seiten-Dokument mit MDCG-Anker.

#### Hebel 3: Technische Trennung im Bundle (Defense-in-Depth)

Der Anwalt allein reicht nicht — die Behörde will sehen, dass die Trennung **technisch nicht umgehbar** ist. Daher die fünf konkreten Mechanismen aus dem Restrukturierungs-Plan:

1. **npm-Workspaces** (`packages/capture`, `packages/suite`, `packages/common`) — separate `package.json`, separater Build-Output, separate `dist/`-Pfade
2. **Feature-Flag `DECISION_SUPPORT_ENABLED`** — Server-Setting mit `requireDecisionSupport`-Guard. In Capture-Build hartkodiert auf `false`, kein Code-Pfad für Triage-Output erreichbar
3. **Postgres-Rollen** (`diggai_capture`, `diggai_suite`, `diggai_owner`) — Capture-DB-User hat **kein** Schreibrecht auf `TherapyPlan`, `ClinicalAlert`, `AISummary`-Tabellen; Integration-Test verifiziert das
4. **Bundle-Audit-Skript** (`scripts/bundle-audit.cjs`) — greppt Production-JS nach 22 verbotenen Strings (`triage`, `redFlag`, `aiSummary`, `clinicalAlert`, `therapyPlan`, …); CI-Schritt failt, wenn Capture-Bundle einen Treffer enthält. Aktueller monolithischer Bundle-Stand: 19 erwartete Treffer (Beleg, dass Audit funktional ist)
5. **ESLint `no-restricted-imports`** — `packages/capture/src/**` darf nicht aus `packages/suite/**` oder `@diggai/suite` importieren; Build bricht bei Verstoß

### 3.3 Klassifizierungs-Pfad nach MDR Anhang VIII Regel 11

Capture (so wie nach dem Flip dokumentiert) durchläuft den MDCG-Decision-Tree wie folgt:

| Schritt | Frage | Antwort Capture | Konsequenz |
|---------|-------|-----------------|------------|
| 1 | Ist die Software MDSW (Medical Device Software)? | **Nein** — keine medizinische Zweckbestimmung; reine Datenerfassung und Weiterleitung | Out of MDR |
| (1a) | Falls als MDSW eingeordnet (Vorsichts-Pfad): leitet sie Information für klinische Entscheidungen? | **Nein** — Output ist ein Datenobjekt für administrative Übergabe | Klasse I |
| 2 | Wenn doch MDSW + administrativ: Klasse? | Klasse I (administrativ, keine klinische Aussage) | **Selbstverifizierung** |

**Bewusst defensiv positioniert:** Selbst im pessimistischen Fall, dass die Behörde Capture als MDSW einstuft (was wir nicht tun, aber als Fallback-Position vorbereitet ist), bleibt es **Klasse I in Selbstverifizierung** ohne Notified Body. Damit liegt der Erstzertifizierungs-Aufwand bei **15–30 k€** statt 60–100 k€, und die Surveillance ist intern statt mit jährlichem NB-Audit (15–30 k€/Jahr gespart).

Suite bleibt vom Flip unberührt: Sie ist und bleibt **Klasse IIa** (CE über Notified Body, ISO 13485, klinische Bewertung, IEC 62304 Klasse B). Aber sie ist nicht mehr Block-Effekt für die Capture-Markteinführung.

### 3.4 Fast-DiGA-Pfad nach §139e SGB V

DiGA-Fast-Track ist **kein Weg, MDR zu umgehen** — es ist eine **zweite Schiene oben drauf** für ein bereits CE-konformes Produkt, das einer Krankenkasse zur Erstattung angeboten wird. Voraussetzungen:

1. CE-Mark als Klasse I oder IIa (Capture mit Selbstverifizierung erfüllt das, sobald die technische Doku steht)
2. Adressat: **Versicherte**, also patientenfacing — nicht praxisfacing
3. Unterstützung der „Erkennung, Behandlung, Linderung oder Kompensation von Krankheiten" oder Strukturverbesserung der Versorgung
4. Antrag beim BfArM via DiGA-Verzeichnis, 3-Monats-Frist nach Antragstellung
5. Vorläufige Aufnahme = 12-Monats-Erprobung mit GKV-Erstattung
6. Endgültige Aufnahme nach Studie / Versorgungseffekt-Nachweis

**Was DiggAi im DiGA-Pfad anbieten kann:** Nicht das aktuelle Capture (das ist B2B-Praxis-Software), sondern ein **separates Patienten-Modul** — z. B. eine Vor-Anmelde-App für Versicherte zur Vorbereitung des Arztbesuchs zu Hause, oder ein Symptom-Tagebuch, das Trends erkennt und Hinweise an den Versicherten gibt. Dieses Modul wäre eine **dritte Codebase** (`apps/patient-module/`), eigene Domain (`my.diggai.de`), eigener App-Store-Auftritt, eigene UDI-DI.

**Realistischer DiGA-Zeitpunkt:** Frühestens 12–15 Monate nach Capture-CE-Mark, da das Patienten-Modul erst gebaut, getestet, dokumentiert und CE-zertifiziert sein muss, bevor der DiGA-Antrag gestellt werden kann. „Fast-DiGA" bezieht sich auf die 3-Monats-Bescheid-Frist, nicht auf eine Beschleunigung der Vorarbeit.

### 3.5 Vergleich: was kostet welcher Pfad

| Pfad | Erstzertifizierung | Jährlich | Time-to-Market | Notified Body |
|------|--------------------|----------|----------------|---------------|
| Class IIa (Status quo bei untrenntem Bundle) | 60–100 k€ | 15–30 k€ Surveillance | 12+ Monate | ja (TÜV SÜD, DEKRA) |
| **Class I Selbstverifizierung (Capture nach Flip)** | **15–30 k€** | **0–5 k€** intern | **2–2,5 Monate** ab Engineering-Start | **nein** |
| DiGA-Antrag (Patienten-Modul, separat) | + 5–15 k€ Antragsbegleitung | Studienkosten 50–150 k€ über 12 Monate | + 3 Monate Bescheid + 12 Monate Erprobung | nein, aber CE-Vorlage erforderlich |

**Einsparung Capture-Erstzertifizierung allein: 50–70 k€**, plus 15–30 k€/Jahr Surveillance, plus 6+ Monate früherer Markteintritt.

---

## 4. Was in den drei strategischen Dokumenten steht und wie sie zusammenspielen

| Dokument | Pfad | Rolle |
|----------|------|-------|
| **Strategie** | `DiggAi-Status-Plan-Regulatorik.docx` (Workspace-Root) | Executive-Sicht, 4-Wochen-Sprint-Plan, 6 Regulatorik-Kapitel, Kosten-Vergleich, externe Beratungs-Adressen |
| **Intended Purpose** | `DiggAi-Capture-Intended-Purpose-v1.0.docx` (Workspace-Root) | Verbindliche Zweckbestimmung Capture, IN/OUT-Scope, MDCG-Argumentation, Risiko-Restmaßnahmen, Architektur-Diagramm |
| **Restrukturierungs-Plan** | `DiggAi-Restrukturierungs-Plan-v1.0.docx` (Workspace-Root) | File-by-file Migrations-Plan, 6-Phasen-Timeline, Postgres-Rollen, Bundle-Audit, ESLint-Regeln, Per-PR-Checkliste |

Die drei Dokumente sind als **konsistentes Set** entworfen: jedes beruft sich auf dieselbe MDCG-Klausel, dieselben Bucket-A-Items, dieselben URLs. Der Co-Reviewer (in Chat B) prüft die Konsistenz nach der `Co-Reviewer-Konsistenz-Pruefliste.md` mit 10 Checkpoints.

---

## 5. Was offen ist — sortiert nach Block-Effekt

### 5.1 Block-Effekt-Reihenfolge

Aus den 47 Items des Open-Items-Trackers sind 6 Items **block-kritisch** für die nächsten 3 Wochen. Die Reihenfolge ergibt sich aus Block-Effekt: Was blockiert, was wir als nächstes tun können?

1. **A4 — BfArM-DiGA-Sprechstunde buchen.** Kostet nichts, validiert die Class-I-Argumentation behördlich. **Block-Effekt:** ohne behördliche Vor-Indikation traut sich der Anwalt vielleicht nicht ans Class-I-Gutachten heran.
2. **A5 — Anwalts-Erstgutachten für Class-I-Position.** 2–5 k€, Spezialisten: Dierks+Bohle, RobotMD, Reuschlaw. **Block-Effekt:** ohne juristische Härtung der Class-I-Position fehlt das Risiko-Backing für Vertrieb.
3. **A1 + A2 — DNS-Cutover `api.diggai.de` → Fly + Hetzner-Kündigung.** 5 Minuten DNS-Edit + 24–48 h Propagation. **Block-Effekt:** laufende Kosten Hetzner ~50 €/Mon, kein Nutzen.
4. **B1 — Phase 1b auf Maschine mit ≥8 GB freiem RAM wiederholen.** **Block-Effekt:** ohne npm-Workspaces aktiv keine echte Bundle-Trennung, daher kein Phase-2-Engineering-Start.
5. **A3 — Netlify-Token rotieren.** Sicherheits-Hygiene (im Repo geleakt). **Block-Effekt:** keiner direkt, aber Audit-Befund.
6. **A6 — Co-Reviewer in 2. Chat aktivieren.** **Block-Effekt:** ohne Konsistenz-Review der drei Docs riskieren wir Drift, die später teuer korrigiert werden muss.

### 5.2 Was danach kommt — Phase-2-Engineering und MDR-Tech-Doc

| Cluster | Items | Aufwand | Block-Effekt für |
|---------|-------|---------|------------------|
| Engineering: Code-Migration capture/suite/common | B2, B3, B4, B5, B6 | 2–4 Wochen | DI-Pfad, Bundle-Trennung |
| Datenbank: Postgres-Rollen + Permission-Test | C1, C2 | 3–5 Tage | Class-I-Defense-in-Depth |
| MDR-Tech-Doc Capture | D1 (Risk-File ISO 14971), D2 (Anhang II Outline), D3 (CER-Lite), D4 (UDI-DI), D5 (EUDAMED), D6 (IFU), D7 (Konformitätserklärung) | 6–12 Wochen mit externer Hilfe | CE-Mark-Anbringung |
| ISMS / DiGA-Vor-Voraussetzungen | E1 (BSI-Grundschutz), E2 (ISO 27001 / B3S), C3 (Pen-Test), C4 (DSFA) | parallel zur Tech-Doc | DiGA-Antrag |
| DiGA-Pfad für Patienten-Modul | F1–F5 | nach Capture-CE-Mark + 6–9 Monate | Erstattungsfähigkeit |

### 5.3 Was nicht eilig ist (aber nicht vergessen werden darf)

- H2 (VAPID-Keys für Push-Notifications)
- H3 (Stripe-Keys für Billing — derzeit Dummy)
- H4 (Agent-Core Python-Service als eigene Fly-App)
- G1–G5 (Marketing-Texte gegen Zweckbestimmung prüfen, Capture- + Suite-Landing-Pages, Reseller-Modell)

---

## 6. Forward-Plan — die nächsten 3 Wochen

### 6.1 Woche 1 (KW 19, ab heute)

| Tag | Aufgabe | Owner | Deliverable |
|-----|---------|-------|-------------|
| Mo | DNS-Cutover `api.diggai.de` (A + AAAA an Fly) | CK | Propagation gestartet |
| Mo | BfArM-Sprechstunde buchen (`bfarm.de`, kostenlos) | CK | Termin-Bestätigung |
| Di | Anwalts-Erstkontakt (Mail an Dierks+Bohle / Reuschlaw / RobotMD mit drei Doc-Anhängen) | CK | Erstgespräch terminiert |
| Di | Co-Reviewer aktivieren in Chat B (Briefing als Prompt) | CK | Review-Befund-Mail |
| Mi–Do | Phase 1b retry (Maschine mit ≥8 GB freiem RAM, fresh boot, npm ci --legacy-peer-deps) | ENG | `workspaces`-Field aktiv, Build grün |
| Fr | Netlify-Token rotieren | CK | neuer Token in `.env` + Fly-Secret + Dashboard |
| Fr | Hetzner-Kündigung initiieren (sobald DNS propagiert) | CK | Kündigungs-Mail raus |

### 6.2 Woche 2 (KW 20)

| Block | Aufgabe | Owner |
|-------|---------|-------|
| ENG | Phase 2: `common/`-Library aus `server/services/{auth,encryption,audit}` extrahieren; alle Imports auf `@diggai/common` umstellen | ENG |
| ENG | Feature-Flag `DECISION_SUPPORT_ENABLED` einbauen + `requireDecisionSupport`-Guard auf den 9 Class-IIa-Trigger-Routen | ENG |
| ENG | Postgres-Rollen (`diggai_capture`, `diggai_suite`, `diggai_owner`) auf Neon einrichten + Integration-Test | ENG |
| CK | Anwaltstermin durchführen, Class-I-Gutachten in Auftrag geben (Liefer-Frist 4–8 Wochen) | CK |

### 6.3 Woche 3 (KW 21)

| Block | Aufgabe | Owner |
|-------|---------|-------|
| ENG | Phase 3: Bucket-A (Class-IIa-Trigger-Module) nach `packages/suite/` verschieben — alert-engine, alert-rules, ai-engine, llm-client, response-parser, prompt-templates, lite-engine, session-summary, episode + 4 Routes + 2 Python-Agents | ENG |
| ENG | Phase 4: Bucket-B (Pure-Capture) nach `packages/capture/` verschieben — DSGVOConsent, ChunkedQuestionnaire, PatientOnboarding, formService, weitere | ENG |
| ENG | Bundle-Audit gegen `packages/capture/dist/`: 0 Treffer als Ziel | ENG |
| CK | BfArM-Sprechstunde durchführen, Protokoll als Anker für Anwalts-Gutachten weiterleiten | CK |

### 6.4 Was im Anschluss kommt (W4 bis Markteintritt Capture)

Phase 5: ESLint-Guard scharf stellen, Test-Suite Capture-only durchlaufen lassen, Doku-Updates (CLAUDE.md, README, FEATURES.md). Phase 6: Capture-CE-Mark-Anbringung, EUDAMED-Registrierung, IFU finalisieren. Realistischer Markteintritt Capture: **Q3 2026** (~2–2,5 Monate ab heutigem Engineering-Start).

---

## 7. Risiken und Showstopper

### 7.1 Was den Flip kippen könnte

| Risiko | Wahrscheinlichkeit | Schwere | Gegenmaßnahme |
|--------|--------------------|---------|---------------|
| BfArM bewertet Capture trotz Flip als MDSW Klasse IIa | gering | hoch | Anwalts-Gutachten als Pre-Defense, IP enger fassen, Ausstiegs-Pfad „Capture = Klasse I administrativ" hartkodieren |
| Anwalt rät, Class-I-Position juristisch nicht zu vertreten | mittel | hoch | Zweite Meinung, Strategie-Anpassung in Richtung „beide Class IIa von Anfang an" |
| Phase 1b lässt sich auch auf neuer Maschine nicht aktivieren (npm-Hoisting-Bug) | gering | mittel | Alternativ: Bun, pnpm-Workspaces, oder Lerna |
| Pilot-Praxen für DiGA-Studie nicht verfügbar | mittel | mittel | Klapproth-Praxis als erste, weitere über MVZ-Kontakte und Hamburg-Region |
| Bundle-Audit findet nach Phase 4 trotzdem Treffer in Capture (Imports leaken) | mittel | mittel | ESLint-Guard scharf stellen vor Phase-4-Merge, Per-PR-Audit-Checkliste |

### 7.2 Showstopper-Detektor (kritisch — nicht umsetzbar bis geklärt)

- IP-Argumentation hängt an einer falsch-zitierten MDCG-Klausel — Co-Reviewer muss MDCG 2019-11 §3.5/§4.2/§6.1 nachprüfen
- Phase-Reihenfolge bricht das Live-System irreversibel — Phase 2/3/4 dürfen den master-Branch nie ungetestet erreichen, daher PR-Reviews mit Bundle-Audit als Pflicht
- Eines der drei strategischen Docs widerspricht den anderen — Konsistenz-Pruefliste vor Anwalts-Versand durchspielen
- DSGVO-Lücke: Roh-Patientendaten ohne Verschlüsselung über Capture/Suite-Trennung hinweg — Encryption-Layer im `common/` belassen, Rollen-Test gegen Plaintext-Lecks

---

## 8. Was CK heute anstoßen kann (Pareto-3)

1. **BfArM-DiGA-Sprechstunde-Termin buchen.** Link: `https://www.bfarm.de` → Digitale Gesundheitsanwendungen → Beratung. Kostet nichts, dauert 30 Min Kalender-Eintrag. Ergebnis nach 2–4 Wochen Wartezeit.
2. **Anwalts-Erstkontakt-Mail an einen der drei Spezialisten.** Anhänge: die drei DOCX (`DiggAi-Status-Plan-Regulatorik.docx`, `DiggAi-Capture-Intended-Purpose-v1.0.docx`, `DiggAi-Restrukturierungs-Plan-v1.0.docx`). Bitte um Einschätzung der Class-I-Verteidigungsfähigkeit.
3. **DNS-Eintrag im Provider-Panel ändern.** A-Record `api.diggai.de` → `66.241.125.72`, AAAA → `2a09:8280:1::111:b83f:0`. 5 Minuten Edit, dann 24–48 h Propagation, dann Hetzner-Kündigung.

Alles weitere wartet auf eines dieser drei Outcomes.

---

## 9. Quellen und Verweise

- Verordnung (EU) 2017/745 (MDR), insbesondere Art. 2(1) und Anhang VIII Regel 11
- MDCG 2019-11 — „Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745", insbesondere §3.5, §4.2, §6.1
- DVG Digitale-Versorgung-Gesetz (2019), §139e SGB V
- DiGAV — Digitale-Gesundheitsanwendungen-Verordnung (BMG, 2020)
- BfArM Leitfaden DiGA-Fast-Track, aktuelle Fassung unter `bfarm.de`
- BSI TR-03161 — Sicherheitsanforderungen an digitale Gesundheitsanwendungen
- ISO 14971:2019 — Risikomanagement Medizinprodukte
- IEC 62304:2006+A1:2015 — Medizingeräte-Software-Lebenszyklus
- ISO 13485:2016 — QM-System Medizinprodukte
- MPDG — Medizinprodukterecht-Durchführungsgesetz (DE)

Verlinkte Dokumente im Repo:
- `docs/REGULATORY_STRATEGY.md` (langfassung der Strategie)
- `docs/REGULATORY_POSITION.md` (kurze Hersteller-Position)
- `docs/INTENDED_USE.md` (verbindliche Zweckbestimmung)
- `Co-Reviewer-Briefing.md` und `Co-Reviewer-Konsistenz-Pruefliste.md` (Workspace-Root)
- `DiggAi-Open-Items-Tracker.md` (Workspace-Root, lebende Liste)

---

## 10. Nächster Run-Log-Eintrag

```
2026-05-06T12:00+02:00 | Lauf claude-code-12 | Stand+Plan+Regulatorik-Flip konsolidiert
---
- Aktion: STATUS_PLAN_REGULATORIK_FLIP.md (~10 Seiten) in docs/ + DOCX-Spiegel im Workspace-Root erstellt. Konsolidierung der 11 Läufe vom 2026-05-06, Open-Items-Tracker, drei strategischer Docs zu einem fokussierten Stand+Plan-Dokument mit Schwerpunkt Class-IIa→Class-I-Flip.
- Blocker: —
- Fix: —
- Ergebnis: D:\Klaproth Projekte\DiggAi\Ananmese\diggai-anamnese-master\docs\STATUS_PLAN_REGULATORIK_FLIP.md + D:\Klaproth Projekte\DiggAi\DiggAi-Stand-Plan-Regulatorik-Flip.docx
- Out: Pareto-3 für CK definiert (BfArM-Sprechstunde + Anwalt + DNS-Cutover). Phase 1b retry als nächster Engineering-Schritt klar. Drei strategische Docs bleiben unverändert; dieses Dokument verlinkt sie.
```
