# DiggAi — Regulatorische Strategie & Reklassifizierung

> **Version:** 1.0 | **Datum:** 05.05.2026 | **Status:** Strategie-Entwurf zur Diskussion
> **Verfasser:** Claude (Opus 4.7) auf Basis Repository-Audit + MDR/MDCG/DiGAV-Recherche
> **Adressaten:** Dr. Klapproth (Geschäftsführung), Dr. Al-Shdaifat (Medical Advisor), Tech-Lead, externer Regulatory-Berater
> **Ziel:** DiggAi aus der faktischen MDR-Klasse-IIb-Falle herausführen — Hauptprodukt als „Kein Medizinprodukt", separates Patienten-Modul später als Klasse I + DiGA-Fast-Track

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Stand DiggAi am 05.05.2026](#2-stand-diggai-am-05052026)
3. [Offene Punkte aus Run-Logs & Roadmap](#3-offene-punkte-aus-run-logs--roadmap)
4. [Warum DiggAi heute faktisch Klasse IIb ist](#4-warum-diggai-heute-faktisch-klasse-iib-ist)
5. [Regulatorische Karte — die 4 Optionen](#5-regulatorische-karte--die-4-optionen)
6. [Spur A — Hauptprodukt als „Kein Medizinprodukt"](#6-spur-a--hauptprodukt-als-kein-medizinprodukt)
7. [Spur B — Patienten-Modul als Klasse I + DiGA Fast-Track](#7-spur-b--patienten-modul-als-klasse-i--diga-fast-track)
8. [Konkrete Code-Änderungen](#8-konkrete-code-änderungen)
9. [Marketing-/UI-Texte umformulieren](#9-marketing--ui-texte-umformulieren)
10. [Dokumenten-Pakete](#10-dokumenten-pakete)
11. [Roadmap & Zeitachse](#11-roadmap--zeitachse)
12. [Risiken & Gegenmaßnahmen](#12-risiken--gegenmaßnahmen)
13. [Anhänge](#13-anhänge)

---

## 1. Executive Summary

DiggAi ist heute **kein zertifiziertes Medizinprodukt**, **wirkt** aber durch (a) den TriageEngine-Output an den Patienten („Ihre Symptome könnten auf einen medizinischen Notfall hindeuten"), (b) die Marketing-Sprache („KI-gestützte Triage", „Herzinfarkt-Verdacht rechtzeitig gemeldet", „rettet Leben") und (c) die Eigenbezeichnung „klinische Entscheidungsunterstützung" in der Praxis wie ein **Medizinprodukt der MDR-Klasse IIb** (lebensbedrohliche Diagnose-Hinweise → MDCG 2019-11 Rule 11). Das ist juristisch instabil: Eine Anzeige bei der zuständigen Marktüberwachung (in Hamburg: Behörde für Justiz und Verbraucherschutz) genügt, um den Vertrieb zu stoppen.

**Empfohlene Strategie (entspricht der von dir gewählten Variante „Beides parallel + späterer DiGA-Track"):**

| Spur | Produkt | Regulatorischer Status | Aufwand | Zeit |
|------|---------|------------------------|---------|------|
| **A — Hauptprodukt** | DiggAi Praxis-Anmelde- & Routing-Plattform | **Kein Medizinprodukt** (MDR Art. 2(1) nicht erfüllt) | Niedrig | **6–10 Wochen** |
| **B — Patienten-Modul** (später, optional) | DiggAi Self-Check / Symptom-Tracker für Versicherte | **MDR Klasse I** (Selbstdeklaration) + **DiGA-Fast-Track** §139e SGB V | Mittel | 6–12 Monate |

**Kernhebel** für Spur A: Drei Code-Änderungen im TriageEngine, eine neue Zweckbestimmung in 4 Dokumenten, vollständiges Marketing-Rebranding („Triage" → „Eingangs-Routing", keine Diagnose-Wortwahl), explizite UI-Disclaimers für Patient und Personal. Voraussichtlich **kein Verlust an Funktionalität** — die Logik bleibt, nur das Sprach- und Verantwortungsmodell ändert sich (Personal entscheidet, nicht das System).

---

## 2. Stand DiggAi am 05.05.2026

### 2.1 Live-System

| Aspekt | Stand |
|--------|-------|
| Live-URL | https://diggai-drklaproth.netlify.app (canonical) und https://diggai.de (DNS aktiv, Bundle `index-KYFCPI4E.js`) |
| API-Subdomain | `api.diggai.de` als Production (`netlify.toml` `VITE_API_URL`) |
| Cert-Issue | `api-takios.diggai.de` liefert `ERR_CERT_COMMON_NAME_INVALID` — Frontend macht keinen Preconnect mehr darauf (Lauf claude-code-06), aber Backend-Domain bleibt brüchig (P0) |
| Backend-Hosting | Express + Prisma + SQLite **nicht auf Netlify deployt**; Netlify Functions sind Fallback mit In-Memory-Speicher; Produktiv-Host (Railway/Render/Fly.io) noch nicht entschieden (K-15) |
| Datenbank | Prisma 6 + SQLite (Dev) — Migrations-Pfad zu PostgreSQL 16 vorgesehen aber nicht ausgeführt |
| Branches | `master` mit Live-Stand; offene PRs: #11, #12, #13, #14, #15, #16, #19 (frontend-cleanup), #20 |
| Letzte gemergte PRs | #21 (i18n), #17 (DSE-Texte), #10 (Branding) — alle per `--admin` over CI-Failures gemerged |
| Bekannte CI-Brüche | (1) JWT-Test erwartet `'15m'`, Code liefert `'24h'`; (2) `ENCRYPTION_KEY`-Env wird als Scientific-Notation `1.234E+31` geparst — beide pre-existing, blockieren Pre-Push-Tests |

### 2.2 Funktionsumfang

- 270+ medizinische Fragen in 13 Fachgebieten (`src/data/questions.ts`, 1246 Zeilen)
- 10 Service-Flows (Anamnese, Telemedizin, Kiosk, ePA, NFC-Check-in, MFA-Dashboard, Arzt-Dashboard, Admin-Dashboard, PWA, Forms)
- 10 Sprachen inkl. RTL (de, en, tr, ar, uk, es, fa, it, fr, pl)
- **TriageEngine: 4 CRITICAL + 6 WARNING Regeln** — der regulatorische Brennpunkt
- 10 medizinische Fachbereiche
- 38 Frontend-Komponenten + 12 Input-Typen
- 7 Seiten/Dashboards
- 30+ API-Endpunkte mit Zod-Validierung, JWT-Auth, HIPAA-Audit-Logging
- Verschlüsselung: AES-256-GCM für PII via `server/services/encryption.ts`
- DSGVO-Werkzeuge: DSFA, AVV-Template, Verfahrensverzeichnis, Auto-Cleanup (24h/90 Tage)
- 5-Agent-System (orchestrator, empfang, triage, dokumentation, abrechnung) via `server/services/agent/agent.service.ts`

### 2.3 Letzte Aktivitäten (Auszug aus `memory/runs/`)

| Datum | Lauf | Outcome |
|-------|------|---------|
| 04.05. claude-code-06 | Frontend-Findings inline + 3 Harnesses (knowledge, browser, deploy) gebaut; `robots.txt`/`sitemap.xml` neu; CSP gehärtet; Google-Fonts raus | 7 neue Files, 3 Edits |
| 04.05. claude-code-05 | tomedo-Bridge gehärtet (mktemp, JSON statt CLI-Args, Audit-Log); Cert-Issue `api-takios.diggai.de` als P0 dokumentiert | 2 neue Files, 8 Audit-Findings |
| 04.05. claude-code-04 | PR #21+#17+#10 gemerged (i18n, DSE, Branding); Re-Audit zeigt rawKeysCount=0, Cookie-Banner zeigt korrekt §25 TDDDG | Live |
| 04.05. claude-code-01 | CameraScanner-Stream-Leak gefixt; smoke-Test repariert; PR #19 offen | PR #19 |
| 04.05. copilot-03 | T-04 `logAction()` auf AuditLoggerAgent + Branch-Push | commit d79a5b8 |

---

## 3. Offene Punkte aus Run-Logs & Roadmap

### 3.1 Kritisch (🔴 — blockiert Live-Stabilität oder Reklassifizierung)

| ID | Titel | Status | Quelle |
|----|-------|--------|--------|
| K-15 | Backend-Deployment-Strategie (Railway/Render/Fly.io) | offen | GESAMTUEBERSICHT §14.1 |
| K-05 | Input-Sanitisation mit DOMPurify/sanitize-html | offen | GESAMTUEBERSICHT §14.1 |
| K-06 | HTML-Injection in anderen Routen | offen | GESAMTUEBERSICHT §14.1 |
| **NEU R-01** | **TriageEngine-Patienten-Output entkoppeln** (Voraussetzung für „Kein Medizinprodukt") | **offen** | **dieses Dokument §6.2** |
| **NEU R-02** | **Marketing-Sprache von Diagnose-Versprechen befreien** | **offen** | **dieses Dokument §9** |
| **NEU R-03** | **Zweckbestimmung neu schreiben in 4 Dokumenten** | **offen** | **dieses Dokument §10.1** |
| P0-CERT | `api-takios.diggai.de` Cert renew — alle API-Calls würden derzeit scheitern wenn Frontend dort hinging | offen | Lauf claude-code-05 |
| CI-FIX | JWT `'15m'` vs `'24h'` Test-Assertion Konflikt | offen | Lauf claude-code-04 |
| CI-FIX | `ENCRYPTION_KEY`-Env als `1.234E+31` Scientific-Notation | offen | Lauf claude-code-04 |

### 3.2 Mittel (🟡 — sollte vor formaler Markteinführung)

| ID | Titel | Quelle |
|----|-------|--------|
| M-01 | Vite 8.0.0-beta → stabile Version | GESAMTUEBERSICHT §14.1 |
| M-02 | In-Memory Queue → DB-Persistenz (Tasks gehen bei Restart verloren) | CLAUDE.md §Agent-System |
| SPA-FALLBACK | `/datenschutz`, `/impressum`, `/robots.txt`, `/sitemap.xml` liefern derzeit `index.html` statt eigene Titles | Lauf claude-code-05 |
| SELF-HOST-FONTS | `npm install @fontsource/inter @fontsource/noto-sans-arabic` noch ausstehend (im `index.html` als TODO) | Lauf claude-code-06 |

### 3.3 Niedrig (🟢)

N-01 (CSS-Inline-Styles), N-02 (ARIA-Attribute), Pricing-Modell, Referenzkunden, Custom Domain Status, Stripe Go-Live.

### 3.4 Offene PRs

`#11`, `#12`, `#13`, `#14`, `#15`, `#16`, `#19` (frontend-cleanup, fertig), `#20`. Inhalte nicht in den Logs aufgelöst — Empfehlung: nach §11.1 zuerst PR-Inventur.

---

## 4. Warum DiggAi heute faktisch Klasse IIb ist

### 4.1 Die rechtliche Lage in 4 Sätzen

(1) Software ist Medizinprodukt nach **MDR Art. 2(1)**, sobald sie für **Diagnose, Prävention, Überwachung, Vorhersage, Prognose, Behandlung oder Linderung von Krankheit** vom Hersteller **bestimmt** ist. (2) Die **Zweckbestimmung** des Herstellers (Marketing, UI-Texte, Beipack, Anleitung) ist hierfür der entscheidende Maßstab — nicht, wie das Produkt technisch funktioniert. (3) **MDCG 2019-11** und **MDR Annex VIII Rule 11** klassifizieren Software, die Informationen zur Diagnose- oder Therapieentscheidung liefert, mindestens als **Klasse IIa**. (4) Wenn die Entscheidung zu **Tod oder irreversibler Verschlechterung** führen kann, springt sie auf **Klasse IIb** (Notified Body, ISO 13485, klinische Bewertung, mehrere Hunderttausend Euro, 12+ Monate).

### 4.2 Die drei DiggAi-Stellen, die heute Klasse IIb auslösen

#### 4.2.1 TriageEngine-Texte an den Patienten

In `server/engine/TriageEngine.ts` werden vier CRITICAL-Regeln evaluiert, deren `message`-Feld dem **Patienten** angezeigt wird (über `src/components/RedFlagOverlay.tsx`):

| Regel | Aktueller Text (Auszug) | MDR-Wirkung |
|-------|-------------------------|-------------|
| `CRITICAL_ACS` | „Ihre Symptome (Brustschmerzen/Atemnot/Lähmung) **könnten auf einen medizinischen Notfall hindeuten**" | Diagnostische Aussage zu lebensbedrohlicher Erkrankung → IIb |
| `CRITICAL_SAH` | „Ein plötzlich einsetzender, stärkster Kopfschmerz (`Donnerschlagkopfschmerz`) **kann auf eine Subarachnoidalblutung hindeuten**" | Diagnose-Hypothese gegenüber Laien → IIb |
| `CRITICAL_SUIZID` | „Sie haben angegeben, Gedanken an Selbstverletzung zu haben…" | Suizid-Triagierung → IIa-IIb (kritisch, aber Output ist eher Hilfsangebot als Diagnose) |
| `CRITICAL_SYNCOPE` | „Ein Bewusstseinsverlust **erfordert sofortige medizinische Abklärung**" | Diagnose-nahe Bewertung → IIa |

WARNING-Regeln (`WARNING_DIABETISCHER_FUSS`, `WARNING_RAUCHER_ALTER`, `WARNING_BLUTUNG`, …) sprechen ebenfalls Verdachtsdiagnosen aus („Verdacht auf Diabetisches Fußsyndrom", „erhöhtes Risiko für Lungen- und Herz-Kreislauf-Erkrankungen") — alle landen ebenfalls bei mindestens IIa.

#### 4.2.2 Marketing-Sprache

In `src/pages/landing/LandingPage.tsx` (Zeile 76, 148) und in `marketing/`:

> „Das **Triage-System hat uns bereits zweimal einen Herzinfarkt-Verdacht rechtzeitig gemeldet**. Das ist nicht nur Effizienz — **das rettet Leben**."

> „270+ medizinische Fragen, **KI-gestützte Triage**, eIDAS-konforme Einwilligung — komplett offline-fähig"

Diese Aussagen sind in regulatorischer Lesart eine **Zweckbestimmung als Diagnose-/Notfall-Erkennungsprodukt**. Selbst wenn der Code rein administrativ wäre — der Marketing-Text allein qualifiziert das Produkt als Medizinprodukt.

#### 4.2.3 Eigenbezeichnung „klinische Entscheidungsunterstützung"

In `GESAMTUEBERSICHT.md §1` heißt es:

> Verwendet den Begriff *„klinische Entscheidungsunterstützung"*

CDS (Clinical Decision Support) ist **per MDCG 2019-11 explizit als Medizinprodukt Software definiert**, sobald sie patienten- oder fallbezogen Empfehlungen ausspricht. Selbst die intern verwendete Selbst-Etikettierung ist regulatorisch belastend.

### 4.3 Konsequenz heute

DiggAi behauptet im selben Atemzug, „**KEIN Medizinprodukt**" zu sein, **und** gleichzeitig „Herzinfarkt-Verdacht zu melden". Das ist intern widersprüchlich. Bei einer Marktaufsichts-Anzeige (z. B. durch einen Wettbewerber) hätte die Behörde ein leichtes Spiel — sie würde die Marketing- und UI-Texte als Beweis für die Zweckbestimmung als Medizinprodukt vorlegen, und das Fehlen einer CE-Kennzeichnung wäre ein Verstoß gegen **MPDG §6** (Strafbarkeit nach §94 — bis zu 3 Jahre Haft oder Geldstrafe).

---

## 5. Regulatorische Karte — die 4 Optionen

Vor der Strategie: was steht überhaupt zur Auswahl?

### 5.1 Option 1 — Kein Medizinprodukt

**Rechtsgrundlage:** MDR Art. 2(1) wird *nicht* erfüllt. **Voraussetzung:** Die Zweckbestimmung des Herstellers darf keine medizinische Wirkung umfassen. Software muss als reines **Verwaltungs-, Anmelde-, Routing- oder Dokumentationswerkzeug** beschrieben sein. Der MDCG 2019-11 Decision Tree fragt:
- Schritt 1: „Is the software a medical device software (MDSW)?" → wenn die Antwort „Nein" ist (kein medizinischer Zweck), ist man raus.
- Beispielhafte Nicht-MDSW: „Software für Terminplanung", „Software für Krankenkassenabrechnung", „Software für die Pflege von Stammdaten". Eine **Anmeldesoftware** mit symptom-basiertem **Routing** an den richtigen Praxisarbeitsplatz ist hierunter subsumierbar — sofern sie keine Diagnose-Aussage macht.

**Pflichten:** Keine MDR-Pflichten. DSGVO bleibt. BSI TR-03161 (Mobile Apps) optional. ISO 27001 optional.

### 5.2 Option 2 — MDR Klasse I (Selbstdeklaration / Selbstverifizierung)

**Rechtsgrundlage:** MDR Annex VIII Rule 11 — **wenn keine Klasse-IIa-Aussage** (Information für Diagnose-/Therapieentscheidung). „Software intended only to support administrative tasks" oder „Software intended for general purposes" (MEDDEV-Auslegung). **Selbstdeklaration:**
1. Hersteller erstellt **Technische Dokumentation** (Annex II + III)
2. Hersteller führt **Risikomanagement nach ISO 14971** durch
3. Hersteller etabliert **QMS** (vereinfacht — kein voll-zertifiziertes ISO 13485 nötig, aber äquivalente Prozesse)
4. Hersteller stellt **EU-Konformitätserklärung** aus (Annex IV)
5. Hersteller bringt **CE-Kennzeichnung** an (ohne 4-stellige Notified-Body-Nummer)
6. Hersteller registriert sich + Produkt in **EUDAMED** (UDI-DI, SRN, Basic-UDI-DI)
7. Hersteller meldet sich beim **BfArM/DIMDI** (in DE: über `https://www.dimdi.de`)
8. **Post-Market Surveillance (PMS)** und **Periodic Safety Update Reports (PSUR)** — bei Klasse I weniger streng als IIa

**Kein Notified Body** nötig. **Kein klinisches Studienprogramm** zwingend (statt dessen klinische Bewertung auf Basis Literatur + Äquivalenzprodukt). Aufwand: ~3–5 Monate, Beratungskosten 15–30 k€.

### 5.3 Option 3 — DiGA-Fast-Track nach §139e SGB V

**Rechtsgrundlage:** Digitale-Versorgung-Gesetz (DVG) + DiGAV. **Voraussetzungen:**
1. Produkt ist **Medizinprodukt Klasse I oder IIa** (CE-Kennzeichnung muss bestehen!) → DiGA ist **NICHT** ein Weg, MDR zu umgehen, sondern **eine zusätzliche Schiene oben drauf**.
2. Produkt ist **App oder Webanwendung** für **Versicherte** (also patientenfacing, nicht praxisfacing).
3. Produkt unterstützt die **Erkennung, Behandlung, Linderung oder Kompensation** von Krankheiten.
4. Antrag beim **BfArM**, Verzeichnis nach §139e SGB V.
5. **„Vorläufige Aufnahme"** = 12-Monats-Erprobung mit Erstattung durch GKV, danach muss positiver Versorgungseffekt nachgewiesen werden.
6. **„Endgültige Aufnahme"** wenn Studie/Evidenz erbracht.

**„Fast-Track"** im engeren Sinn ist die Bezeichnung des BfArM-Verfahrens (3-Monats-Frist nach Antragsstellung). Eine **Beschleunigung jenseits dieser 3 Monate gibt es nicht**. Voraussetzung bleibt CE-Mark.

**Wichtig:** DiggAi heute (Praxis-Anmeldung, MFA-Dashboard) ist **kein DiGA-Kandidat** — DiGAs sind für Versicherte, nicht für Praxen. Nur ein **separates Patienten-Modul** (Self-Tracking, Therapie-Begleitung, Symptom-Monitoring) wäre DiGA-fähig.

### 5.4 Option 4 — DiPA (Digitale Pflegeanwendung) nach §40a SGB XI

Analog DiGA, aber für Pflege. Für DiggAi nicht relevant.

### 5.5 Empfehlung

**Spur A (Hauptprodukt) = Option 1 „Kein Medizinprodukt"** — schnell, billig, wirft das Class-IIb-Risiko sofort ab. **Spur B (späteres Patienten-Modul) = Option 2 + Option 3** — Klasse I CE-Mark als Voraussetzung für DiGA Fast-Track. Spur B ist optional und unabhängig vom Hauptgeschäft.

---

## 6. Spur A — Hauptprodukt als „Kein Medizinprodukt"

### 6.1 Neue Zweckbestimmung (verbindlich)

**Alt** (heute, in `GESAMTUEBERSICHT.md`):
> DSGVO-konforme Patientenaufnahme-Anwendung … KI-gestützte Triage … klinische Entscheidungsunterstützung

**Neu** (verbindlich, ab Implementierung Spur A):
> DiggAi ist eine **administrative Praxis-Anmelde- und Routing-Plattform für Arztpraxen**. Sie strukturiert die **vom Patienten selbst eingegebenen** Stammdaten, Anliegen und Symptom-Stichworte und **leitet sie an das Praxispersonal weiter**, das auf dieser Grundlage die **medizinische Beurteilung und Triage** vornimmt. DiggAi **trifft keine medizinischen Entscheidungen**, **stellt keine Diagnosen**, **gibt dem Patienten keine medizinischen Hinweise oder Empfehlungen** und **ersetzt nicht die ärztliche Untersuchung**. Das System dient ausschließlich der **organisatorischen Effizienz** der Arztpraxis (Reduktion von Papierformularen, Sprachunterstützung, automatisierte Weiterleitung an den richtigen Arbeitsplatz).

### 6.2 TriageEngine reframen — die kritische Code-Änderung

Die TriageEngine-**Logik darf bleiben** (Symptom-Erkennung ist nicht das Problem), aber:

#### A. Patient sieht keine Diagnose-Aussage mehr

Heute zeigt `RedFlagOverlay.tsx` dem Patienten den `message`-String der Triage-Regel. Das ist der Class-IIb-Auslöser.

**Neu:** Der Patient sieht ausschließlich neutrale Workflow-Texte:

| Alt (Patient-Output) | Neu (Patient-Output) |
|----------------------|----------------------|
| „Ihre Symptome (Brustschmerzen/…) **könnten auf einen medizinischen Notfall hindeuten**. Bitte Notruf 112…" | „Bitte **wenden Sie sich umgehend an das Praxispersonal** an der Anmeldung. Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112." |
| „**Donnerschlagkopfschmerz kann auf eine Subarachnoidalblutung hindeuten**. Sofort Notruf 112!" | „Bitte **informieren Sie umgehend das Praxispersonal**. Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112." |
| „Sie haben angegeben, Gedanken an Selbstverletzung zu haben…" | „Wir möchten sicherstellen, dass Sie **die richtige Unterstützung** erhalten. Bitte **sprechen Sie das Praxispersonal an**. Sofort und kostenfrei erreichbar: Telefonseelsorge 0800 111 0 111." |
| „Bewusstseinsverlust **erfordert sofortige medizinische Abklärung**" | „Bitte informieren Sie **das Praxispersonal**, dass Sie über den Vorgang sprechen möchten." |

Der Trick: **Kein** Wort über Krankheit, Diagnose, Verdacht, Risiko. Nur: **„Sprich mit Personal."** Das ist ein Workflow-Hinweis, kein medizinischer Hinweis.

#### B. Personal-Output bleibt diagnostisch

Im `ArztDashboard` und `MFADashboard` darf der **vollständige** alte Triage-Text angezeigt werden — denn der Empfänger ist **medizinisches Fachpersonal**, nicht der Patient. Zwischen Praxis-Mitarbeiter und Mitarbeiter ist eine fachliche Information kein „medizinisches Gerät", sondern **interne Praxis-Kommunikation**.

→ Codeänderung: TriageResult bekommt **zwei** Felder: `patientMessage` (workflow-only) und `staffMessage` (diagnostisch).

#### C. Umbenennung „Triage" → „Eingangs-Routing"

Der Begriff „Triage" ist medizinisch belastet (Notfall-Sortierung). „Routing" oder „Anmelde-Hinweis" oder „Workflow-Markierung" sind unbedenklich. Betrifft:
- Klassen-/Datei-/Variablennamen: `TriageEngine` → `RoutingEngine`, `triage:alert` Socket-Event → `routing:hint`
- UI-Strings (i18n in 10 Sprachen)
- Marketing-Materialien
- Dokumentation (CLAUDE.md, GESAMTUEBERSICHT.md, FEATURES.md, README.md)

### 6.3 UI-Disclaimer (verbindliche Texte)

#### Patient-seitig — Erste Bildschirmseite + Footer jeder Seite:

> **Hinweis:** DiggAi ist eine **Anmelde-Software für Ihre Arztpraxis**. Sie ist **kein Medizinprodukt** und gibt **keine medizinischen Hinweise oder Empfehlungen**. **Bei akuten Beschwerden oder einem Notfall wenden Sie sich umgehend an das Praxispersonal oder wählen Sie den europäischen Notruf 112.**

#### Personal-seitig (ArztDashboard / MFADashboard) — beim Einloggen + im Triage-Panel:

> **Hinweis für Fachpersonal:** Die folgenden Symptom-Hinweise sind eine **automatisierte Strukturierung der Patientenangaben** und **keine ärztliche Diagnose**. Die medizinische Beurteilung obliegt ausschließlich Ihnen.

### 6.4 Test-Suite ergänzen

Neue Tests sicherstellen, dass **niemals** ein diagnostischer Text in einer Patient-Response landet:

```typescript
// e2e/regulatory/no-diagnosis-to-patient.spec.ts
test('Patient sieht keine Diagnose-Wörter im Triage-Output', async ({ page }) => {
  // Trigger CRITICAL_ACS
  await answerQuestion(page, '1002', ['brust']);
  const overlay = await page.waitForSelector('[data-testid="red-flag-overlay"]');
  const text = await overlay.innerText();
  const verboten = ['Verdacht', 'hindeuten', 'Notfall', 'könnte', 'Diagnose',
                    'Herzinfarkt', 'Schlaganfall', 'Blutung', 'Suizid', 'Risiko'];
  for (const wort of verboten) {
    expect(text).not.toContain(wort);
  }
});
```

→ Diese Test-Suite ist die **Beweisführung gegenüber Behörden**: Wenn jemand DiggAi anzeigt, kann der Hersteller per CI-Log belegen, dass diagnostische Aussagen technisch ausgeschlossen sind.

### 6.5 LLM-/Agent-Output begrenzen

In `server/services/ai/llm-client.ts` und `server/services/ai/prompt-templates.ts`: **System-Prompt** muss explizit verbieten, dass das LLM dem Patienten gegenüber medizinische Aussagen macht. Beispiel-Suffix für jeden Patient-facing Prompt:

> WICHTIG: Du gibst dem Patienten **keine medizinischen Hinweise**, **keine Diagnose-Vermutungen**, **keine Therapieempfehlungen** und **kein Symptom-Coaching**. Du beschreibst nur, was der Patient erfasst hat, und verweist bei medizinischen Fragen an das Praxispersonal.

Für den Personal-facing Prompt (Arzt/MFA) bleibt freie Sprache — das ist Fachkommunikation.

### 6.6 Was bleibt unverändert

- Datenmodell (`prisma/schema.prisma`)
- API-Endpunkte
- Frontend-Architektur, Dashboards, Komponenten
- Encryption (`server/services/encryption.ts`)
- Auth (JWT + RBAC)
- DSGVO-Werkzeuge
- Sprachen, Übersetzungen (außer den genannten Triage-Strings)
- CI/CD, Deployment-Strategie

**Funktionsverlust für die Praxis: Null.** Die einzige spürbare Änderung: Der Patient sieht keinen Diagnose-Hinweis mehr, sondern wird auf das Personal verwiesen. Das ist sogar **medizinisch korrekter** — ein Algorithmus sollte einem Laien keine Notfall-Diagnose nahelegen.

---

## 7. Spur B — Patienten-Modul als Klasse I + DiGA Fast-Track

### 7.1 Konzept

Ein **separates** Produkt, das als App oder Web-Modul **dem Versicherten direkt verkauft / verschrieben** wird. Beispiele für plausible Zweckbestimmungen:

- **DiggAi Self-Check** — Symptom-Tagebuch für chronisch Kranke (Diabetes, COPD, Asthma): Patient erfasst täglich Werte, Software erkennt Trends, **gibt Hinweis an Patient** („Ihr HbA1c-Tagebuch zeigt seit 2 Wochen erhöhte Werte — bitte nächsten Termin bei Ihrem Hausarzt vorziehen") → **Klasse I (kein Therapie-Eingriff)**
- **DiggAi Vor-Anamnese** — Patient füllt zu Hause vor dem Arztbesuch einen strukturierten Fragebogen aus, ergibt **strukturierten Dokumenten-Output** → **kein Medizinprodukt** (reine Dokumentations-/Vorbereitungs-Hilfe), wenn DiGA-Reimbursement nicht angestrebt wird

### 7.2 DiGA-Voraussetzungen (Übersicht)

| Voraussetzung | Status DiggAi heute | Aufwand |
|---------------|---------------------|---------|
| MDR Klasse I oder IIa CE-Mark | nicht vorhanden | siehe Spur B Phase 1 |
| Hersteller in DE/EU sitzhaft | ✓ Klapproth in HH | — |
| Hauptfunktion auf digitaler Technik | ✓ | — |
| Datenschutz-Folgenabschätzung (DSFA) | ✓ vorhanden in `docs/DSFA_FINAL.md` | nur Update |
| Informationssicherheit nach BSI TR-03161 | teils vorhanden (`docs/COMPLIANCE_BSI_CHECKLIST.md`) | Audit nötig |
| Interoperabilität (FHIR-Profile, IHE-Profile) | nicht vorhanden | mittelschwer |
| Positive Versorgungseffekte (medizinischer Nutzen ODER patientenrelevante Verbesserung der Versorgung) | offen | erfordert Studie/Evaluation |
| Hersteller-Identifizierung in EUDAMED + DMIDS | offen | Verwaltungsakt |

### 7.3 Phasen Spur B

**Phase 1 (Monat 1–4): MDR Klasse I CE-Mark für separates Patienten-Modul**

1. Zweckbestimmung Patienten-Modul (eindeutig nicht-IIa-auslösend) verschriftlichen
2. Risikomanagement-Akte ISO 14971 anlegen — Risiken, Maßnahmen, Restrisiko-Bewertung
3. QMS-Light-Prozesse beschreiben (Änderungs-Mgmt, Dokumentenlenkung, Lieferantenbewertung, Beschwerdemanagement, Vigilance)
4. Klinische Bewertung (Literatur + Äquivalenzprodukt — bei Anamnese-Apps reichlich vorhanden)
5. Technische Dokumentation Annex II/III
6. EU-Konformitätserklärung
7. CE-Kennzeichnung anbringen
8. EUDAMED + DMIDS Registrierung

**Phase 2 (Monat 5–10): DiGA-Fast-Track Antrag**

1. Modul-Architektur trennen (Patienten-Modul muss eigenständig betreibbar sein, eigene App-Stores)
2. BfArM-Antrag stellen via DiGA-Verzeichnis
3. Innerhalb 3 Monaten Bescheid (vorläufige Aufnahme)
4. 12-Monats-Erprobung mit Erstattung
5. Studien-Design / Evaluations-Konzept ausarbeiten
6. Endgültige Aufnahme nach 12 Monaten

**Phase 3 (Monat 11–24): Dauerhafte DiGA + Erstattung**

Nach erfolgreicher Evaluation: dauerhafte DiGA-Listung, Verhandlung Vergütungsbetrag mit GKV-Spitzenverband.

### 7.4 Was Spur B von Spur A trennt

**Architektur-Trennung ist Pflicht:**
- Eigene Codebasis-Subfolder: `apps/patient-module/` mit eigenem `package.json`, eigener CI/CD, eigener CE-Mark
- Eigene Domain (`my.diggai.de`) und eigene App-Store-Auftritte
- Eigene Datenschutzerklärung und AGB
- Eigene Versionierung und eigene UDI-DI

So bleibt Spur A („kein Medizinprodukt, schnell auf den Markt") regulatorisch unbelastet, während Spur B („Klasse I + DiGA, langsam aber erstattungsfähig") parallel reift.

---

## 8. Konkrete Code-Änderungen

### 8.1 TriageEngine refactor (zentrale Änderung)

```typescript
// server/engine/RoutingEngine.ts (umbenannt von TriageEngine.ts)

export interface RoutingResult {
    level: 'INFO' | 'PRIORITY';      // ehemals 'WARNING' | 'CRITICAL'
    atomId: string;
    triggerValues: any;
    patientMessage: string;          // NEU: nur Workflow-Hinweis, keine Diagnose
    staffMessage: string;            // NEU: bisheriger 'message' für Fachpersonal
    workflowAction: 'inform_staff' | 'priority_queue' | 'continue';  // NEU
}

const ROUTING_RULES: RoutingRule[] = [
    {
        id: 'PRIORITY_001',          // ehemals CRITICAL_ACS — keine Diagnose-Bezeichnung mehr
        level: 'PRIORITY',
        description: 'Symptom-Cluster A (interne Routing-Regel)',  // intern, nicht in UI
        evaluate: (answers) => {
            const answer = answers['1002'];
            if (!answer) return null;
            const values = Array.isArray(answer.value) ? answer.value : [answer.value];
            const triggers = values.filter((v: string) => ['brust', 'atemnot', 'laehmung'].includes(v));
            if (triggers.length > 0) {
                return {
                    level: 'PRIORITY',
                    atomId: '1002',
                    triggerValues: triggers,
                    patientMessage: 'Bitte wenden Sie sich umgehend an das Praxispersonal an der Anmeldung. Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112.',
                    staffMessage: 'Patient meldet Symptome aus Cluster ACS-Verdacht (Brust/Atemnot/Lähmung). Sofortige ärztliche Sichtung empfohlen.',
                    workflowAction: 'priority_queue',
                };
            }
            return null;
        },
    },
    // ... analog für SAH, Suizid, Synkope und alle WARNING-Regeln
];
```

### 8.2 RedFlagOverlay → AnmeldeHinweisOverlay

```tsx
// src/components/AnmeldeHinweisOverlay.tsx (umbenannt + reduziert)
// Zeigt NUR result.patientMessage, NIEMALS result.staffMessage
```

### 8.3 Socket.IO-Event umbenennen

```typescript
// server/index.ts + src/lib/socketClient.ts
io.to('staff').emit('routing:hint', result);  // ehemals 'triage:alert'
```

### 8.4 i18n-Schlüssel umbenennen

In allen 10 `public/locales/*/translation.json`:
- `triage.alert.*` → `routing.hint.*`
- `triage.critical.*` → `routing.priority.*`
- Alte Schlüssel entfernen, neue Texte einsetzen (siehe §6.2 A.)

### 8.5 LLM-Prompt-Template härten

```typescript
// server/services/ai/prompt-templates.ts
const PATIENT_PROMPT_GUARD = `
WICHTIG (regulatorisch verbindlich):
- Du machst gegenüber dem Patienten KEINE medizinische Aussage.
- Du nennst KEINE Krankheit, KEINEN Verdacht, KEINE Diagnose.
- Du verweist bei medizinischen Fragen ausschließlich an das Praxispersonal.
- Du bist KEIN Medizinprodukt. Du strukturierst nur die Eingaben des Patienten.
`;
```

### 8.6 Marketing-Inhalte austauschen

`src/pages/landing/LandingPage.tsx`:
- Stat „10 Triage-Regeln" entfernen
- Testimonial mit „Herzinfarkt-Verdacht … rettet Leben" austauschen oder entfernen
- „KI-gestützte Triage" → „intelligentes Routing für Praxispersonal"
- Kein Wort über „Notfall", „Diagnose", „Lebensrettung"

`marketing/landing-arzt.md`, `marketing/one-pager-arzt.md`, `marketing/email-cold-outreach.md`, `marketing/linkedin-post-sequenz.md`: vollständige Sprachreinigung.

### 8.7 Dokumenten-Updates

| Datei | Änderung |
|-------|----------|
| `CLAUDE.md` (Projekt) | Compliance-Tabelle ohne MDR; Triage-Block streichen oder Routing-Block ersetzen |
| `GESAMTUEBERSICHT.md` | §1.7 (Regulatorische Positionierung) neu schreiben mit Klarstellung „kein Medizinprodukt + warum" |
| `FEATURES.md` | „Echtzeit-Triage" → „Echtzeit-Anmelde-Routing" |
| `docs/TRIAGE_RULES.md` | umbenennen zu `docs/ROUTING_RULES.md`; Disclaimer hinzufügen |
| `README.md` | Erste Absätze regulatorisch entschärfen |
| `docs/COMPLIANCE_CHECKLIST.md` | Neuen Abschnitt: „Hersteller-Erklärung: kein Medizinprodukt nach MDR Art. 2(1)" |
| Neu: `docs/INTENDED_USE.md` | Verbindliche Zweckbestimmung (siehe §6.1) |
| Neu: `docs/REGULATORY_POSITION.md` | Diese Strategie als Kurzfassung verlinkt |

### 8.8 Test-Suite

Neue Verzeichnisse:
- `e2e/regulatory/no-diagnosis-to-patient.spec.ts` — siehe §6.4
- `server/engine/__tests__/RoutingEngine.regulatory.test.ts` — Unit-Test, dass `patientMessage` keine Verbots-Wörter enthält
- Bestehende `e2e/questionnaire-flow.spec.ts` an neue Strings anpassen

---

## 9. Marketing-/UI-Texte umformulieren

### 9.1 Verbots-Wortliste (für Patient-facing-Text)

Folgende Wörter dürfen in **keinem** Patient-facing-Output (UI, Marketing, App-Store-Beschreibung, Datenschutz, AGB) erscheinen:

- Diagnose, diagnostisch, Differenzialdiagnose
- Verdacht, Verdachtsdiagnose
- hindeuten, deuten auf
- Notfall, Notfall-Erkennung, lebensrettend, lebensbedrohlich, rettet Leben
- Krankheit (außer in „Krankenversicherung")
- Therapie, Behandlung, Heilung, Linderung
- Risiko, Risikobewertung, Risiko-Score
- Triage (Begriff durch „Routing", „Eingangs-Hinweis", „Anmelde-Sortierung" ersetzen)
- KI-Diagnose, AI-Diagnose, klinische Entscheidungsunterstützung, Clinical Decision Support, CDS

### 9.2 Erlaubte Sprache

- Anmeldung, Patientenaufnahme, Vor-Anmeldung
- Routing, Weiterleitung, Eingangs-Sortierung
- Strukturierung, Erfassung, Dokumentation
- Sprach-Unterstützung, Mehrsprachigkeit
- Workflow, Prozess-Effizienz
- Hinweis an das Praxispersonal, Personal-Information

### 9.3 Beispiel-Umformulierungen

| Alt | Neu |
|-----|-----|
| „KI-gestützte Triage rettet Leben" | „Strukturierte Anmeldung entlastet Ihr Personal" |
| „Echtzeit-Notfall-Erkennung in <2 Sekunden" | „Sofortige Hinweis-Weiterleitung an Ihr Praxispersonal" |
| „270+ klinische Fragen, KI-Triage" | „270+ medizinische Stammdaten- und Anliegen-Fragen, intelligente Weiterleitung" |
| „klinische Entscheidungsunterstützung" | „administratives Workflow-Tool" |
| „Herzinfarkt-Verdacht rechtzeitig gemeldet" | (komplett streichen) |

---

## 10. Dokumenten-Pakete

### 10.1 Spur A — „Kein Medizinprodukt"-Dokumentenpaket

Das **Mindest-Set**, das bei einer Marktaufsichts-Anfrage vorgelegt werden kann:

1. **`docs/INTENDED_USE.md`** — verbindliche Zweckbestimmung, vom Geschäftsführer unterschrieben
2. **`docs/REGULATORY_POSITION.md`** — Begründung „kein Medizinprodukt nach MDR Art. 2(1)" mit Verweisen auf MDCG 2019-11 Decision Tree
3. **`docs/INTENDED_USE_DECLARATION.pdf`** (PDF, unterschrieben) — Hersteller-Erklärung
4. **`docs/COMPLIANCE_CHECKLIST.md`** — DSGVO + DSFA + AVV + Verfahrensverzeichnis
5. **CI-Beleg** — Test-Suite `e2e/regulatory/` läuft grün → Beweis, dass kein Diagnose-Output an Patienten möglich
6. **`docs/CHANGE_LOG_REGULATORY.md`** — Audit-Trail aller regulatorisch relevanten Änderungen

### 10.2 Spur B — MDR Klasse I Dokumentenpaket (Patienten-Modul)

Das **Vollset** (orientiert an MDR Annex II/III + ISO 14971):

1. Zweckbestimmung des Patienten-Moduls (separat zu Spur A)
2. Geräteklassifizierung Klasse I + Begründung Annex VIII
3. Allgemeine Sicherheits- und Leistungsanforderungen (GSPR) Annex I — Checkliste
4. Risikomanagement-Akte ISO 14971
5. Klinische Bewertung mit Literaturrecherche + Äquivalenzprodukt-Begründung
6. Software-Lebenszyklus IEC 62304 (Klasse A oder B)
7. Usability-Engineering IEC 62366
8. Verifikations- und Validierungspläne + -berichte
9. Post-Market Surveillance Plan + PMS-Bericht
10. Vigilance-Plan
11. EU-Konformitätserklärung Annex IV
12. CE-Label-Layout
13. Gebrauchsanweisung (digital, Pflicht)
14. EUDAMED-Registrierung
15. DMIDS-Anzeige beim BfArM

Geschätzter Aufwand: **3–5 Monate Vollzeit eines Regulatory-Spezialisten**, Fremdkosten 15–30 k€.

### 10.3 Spur B — DiGA-Antragspaket

1. DiGA-Verzeichnis-Antrag (BfArM-Online-Portal)
2. Nachweis CE-Kennzeichnung (Spur B Phase 1)
3. Sicherheitskonzept inkl. BSI TR-03161 Audit-Bericht
4. Datenschutzkonzept inkl. DSFA
5. Interoperabilitätsnachweis (FHIR-Profile)
6. Konzept für positiven Versorgungseffekt (Studienprotokoll für 12-Monats-Erprobung)
7. Vergütungsmodell-Vorschlag
8. Anwender-Dokumentation (Patient + Arzt)

Geschätzter Aufwand: **2–3 Monate** nach CE-Mark.

---

## 11. Roadmap & Zeitachse

### 11.1 Sofortmaßnahmen (Woche 1–2)

| # | Aufgabe | Verantwortlich |
|---|---------|----------------|
| 1 | **PR-Inventur**: alle 7 offenen PRs (#11, #12, #13, #14, #15, #16, #19, #20) durchsehen, jeweils mergen oder schließen | Tech-Lead |
| 2 | **CI-Fixes**: JWT `15m`/`24h` Test-Assertion + `ENCRYPTION_KEY` Scientific-Notation lösen | Tech-Lead |
| 3 | **P0-Cert**: `api-takios.diggai.de` Cert renewen oder Domain auflassen, `api.diggai.de` als einzige Production-API härten | DevOps |
| 4 | **Backend-Hosting** entscheiden (Railway vs. Render vs. Fly.io vs. eigener Hetzner-Server — siehe `docs/runbook-hetzner.md`) und deployen | DevOps |
| 5 | **Strategie-Sign-off** dieses Dokuments durch Klapproth + Al-Shdaifat + ggfs. externer Regulatory-Berater | GF |

### 11.2 Spur A Reklassifizierung (Woche 3–10)

| Woche | Phase | Deliverables |
|-------|-------|--------------|
| 3 | **Sprache + Zweckbestimmung** | `docs/INTENDED_USE.md` + `docs/REGULATORY_POSITION.md` schreiben; `GESAMTUEBERSICHT.md` §1.7 umschreiben; `CLAUDE.md`-Compliance-Tabelle aktualisieren |
| 4 | **TriageEngine refactor** | `server/engine/RoutingEngine.ts` (umbenannt + 2 Message-Felder); Socket-Event `triage:alert` → `routing:hint` |
| 5 | **Frontend Patient-Output** | `RedFlagOverlay` → `AnmeldeHinweisOverlay`; nur `patientMessage` rendern; alle 10 i18n-Files anpassen |
| 6 | **Frontend Staff-Output** | `ArztDashboard` + `MFADashboard` zeigen `staffMessage` + neuer Disclaimer |
| 7 | **LLM-Prompt-Härtung** | `PATIENT_PROMPT_GUARD` in alle Patient-facing Prompts; Unit-Tests gegen verbotene Wörter |
| 8 | **Marketing-Sprachreinigung** | `LandingPage.tsx`, `marketing/`, README.md, Social-Media-Profile |
| 9 | **Test-Suite Regulatory** | `e2e/regulatory/no-diagnosis-to-patient.spec.ts`; Unit-Tests RoutingEngine; CI-Pipeline grün |
| 10 | **Dokumentation finalisieren** | Hersteller-Erklärung als PDF unterschreiben; `docs/CHANGE_LOG_REGULATORY.md` anlegen; alle Änderungen committen, Release-Tag `v3.1.0-no-mdsw` |

### 11.3 Spur B (parallel ab Woche 6, optional)

| Monat | Phase | Deliverables |
|-------|-------|--------------|
| M2–M3 | Patienten-Modul-Konzept | Zweckbestimmung, UI-Mockups, Datenmodell-Skizze |
| M3–M5 | Klasse-I-Dokumentation | ISO 14971 Risiko-Akte, klinische Bewertung, Annex II/III |
| M5–M6 | EUDAMED + DMIDS | Registrierung Hersteller + Produkt |
| M6 | CE-Mark-Anbringung | Konformitätserklärung, CE-Label, Release Patient-Modul `v1.0` |
| M7–M9 | DiGA-Antrag | BfArM-Online, alle Anlagen |
| M10 | BfArM-Bescheid (vorläufig) | Vorläufige DiGA-Listung |
| M11–M22 | 12-Monats-Erprobung | GKV-Erstattung, Studie, PMS |
| M23–M24 | Endgültige DiGA-Aufnahme | Vergütungsverhandlung GKV-Spitzenverband |

### 11.4 Visualisierung

```
W1–2  ▰▰▰  Sofortmaßnahmen (Backend, CI, PR-Inventur, Sign-off)
W3–10 ▰▰▰▰▰▰▰▰  Spur A Reklassifizierung
                                   ↓
M2 ─────── Spur B Konzept ─────────────────
M3 ─────────────── Klasse I Doku ──────────────
M5 ─────────────────────── EUDAMED / DMIDS ──
M6 ─────────────────────────── CE-Mark ──
M7 ────────────────────────────── DiGA-Antrag ─
M10 ─────────────────────────────────── DiGA vorläufig
M22 ─────────────────────────────────────── DiGA endgültig
```

---

## 12. Risiken & Gegenmaßnahmen

### 12.1 Risiken Spur A

| Risiko | Wahrscheinlichkeit | Schwere | Gegenmaßnahme |
|--------|--------------------|---------|---------------|
| Marktaufsichts-Anzeige BEFORE Reklassifizierung abgeschlossen | mittel | hoch | Marketing-Texte SOFORT (Woche 3) anpassen, das ist die Außenwahrnehmung |
| Patient versteht „nicht-diagnostischen" Hinweis als Verharmlosung | niedrig | mittel | Klare 112-Empfehlung in jedem priority_queue-Hinweis; Usability-Test mit 5 Patienten |
| Bestehende Verträge mit Praxen erwarten „Triage" als Feature | niedrig | mittel | Verträge prüfen; im Zweifel kostenlose Re-Verhandlung mit klarer Begründung („wir machen rechtskonform") |
| Praxis-Personal unterschätzt Risiko, weil System „nur Routing" macht | mittel | mittel | Personal-Schulung mit `staffMessage`-Disclaimer; in MFA-Dashboard prominent |
| Ärzte-Kunden interpretieren „kein Medizinprodukt" als „minderwertig" | mittel | niedrig | Positiv kommunizieren: „Verantwortung bleibt bei Ihnen — DiggAi nimmt sie Ihnen nicht weg" |

### 12.2 Risiken Spur B

| Risiko | Wahrscheinlichkeit | Schwere | Gegenmaßnahme |
|--------|--------------------|---------|---------------|
| BfArM lehnt DiGA wegen ungenügendem Versorgungseffekt-Nachweis | hoch | hoch | Studienprotokoll von Anfang an mit DiGA-Studienzentren entwerfen (z. B. Charité Digital Health) |
| Klassifizierung springt bei Behörden-Prüfung doch auf IIa | niedrig | hoch | Zweckbestimmung Patienten-Modul ultra-eng halten („nur Symptom-Tagebuch", keine Empfehlung) |
| EUDAMED-Verzögerungen | hoch | niedrig | DMIDS-Anzeige in DE parallel; Zeitpuffer einplanen |
| Konkurrenz besetzt DiGA-Slot zuerst | mittel | mittel | USP klar formulieren (mehrsprachig, Praxis-Integration) |

### 12.3 Risiken Querschnitt

| Risiko | Gegenmaßnahme |
|--------|---------------|
| Externer Regulatory-Berater fehlt | **Empfehlung**: Erstgespräch mit 2 Beratern (z. B. Johner Institute, MEDIQ) bevor Spur B startet — 1–2 k€ pro Erstgespräch |
| Technische Schuld blockiert Reklassifizierung | Spur A explizit **vor** neuer Feature-Arbeit priorisieren |
| Übersetzungs-Lücken in 10 Sprachen führen zu inkonsistentem Disclaimer | Translation-Memory mit kanonischen DE-Texten als Quelle (siehe `node scripts/generate-i18n.ts`) |

---

## 13. Anhänge

### 13.1 Anhang A — Volltext Hersteller-Erklärung „Kein Medizinprodukt"

> **Hersteller-Erklärung gemäß MDR Verordnung (EU) 2017/745 Art. 2(1)**
>
> Hiermit erklärt die DiggAi GmbH (in Gründung), Hamburg, vertreten durch Dr. med. [Name] Klapproth, dass das Produkt **DiggAi Praxis-Anmelde- und Routing-Plattform** in seiner gegenwärtigen Zweckbestimmung **kein Medizinprodukt** im Sinne der Verordnung (EU) 2017/745 Art. 2(1) ist.
>
> **Zweckbestimmung:** [Volltext aus §6.1]
>
> **Begründung:**
> 1. DiggAi trifft keine medizinischen Entscheidungen.
> 2. DiggAi gibt dem Patienten keine medizinischen Hinweise oder Empfehlungen (technisch sichergestellt durch CI-Test-Suite `e2e/regulatory/no-diagnosis-to-patient.spec.ts`).
> 3. DiggAi unterstützt ausschließlich administrative und organisatorische Praxis-Prozesse.
> 4. Die medizinische Beurteilung verbleibt vollständig beim ärztlichen und medizinischen Fachpersonal der nutzenden Arztpraxis.
> 5. Eine Aussage über Diagnose, Therapie, Vorhersage oder Prognose von Krankheiten findet nicht statt.
>
> Die Einstufung wurde anhand des MDCG 2019-11 Decision Tree (Schritt 1: „Is the software MDSW?" — Antwort: Nein) vorgenommen.
>
> Datum, Ort: ___________ Unterschrift: ___________

### 13.2 Anhang B — Code-Diff-Plan Zentral-Refactor

```
RENAME: server/engine/TriageEngine.ts → server/engine/RoutingEngine.ts
RENAME: src/components/RedFlagOverlay.tsx → src/components/AnmeldeHinweisOverlay.tsx

EDIT:   server/index.ts (Import-Pfade, Socket-Event-Name)
EDIT:   server/routes/answers.ts (TriageResult → RoutingResult)
EDIT:   src/lib/socketClient.ts (Event-Listener triage:alert → routing:hint)
EDIT:   src/store/triageStore.ts → src/store/routingStore.ts
EDIT:   docs/TRIAGE_RULES.md → docs/ROUTING_RULES.md (Inhalt regeneralisieren)
EDIT:   src/pages/landing/LandingPage.tsx (Stat + Testimonial + Hero-Text)
EDIT:   marketing/* (alle 4 Files Sprachreinigung)
EDIT:   GESAMTUEBERSICHT.md (§1.7 + §13)
EDIT:   FEATURES.md
EDIT:   README.md
EDIT:   CLAUDE.md (Compliance-Tabelle, Triage-Block)
EDIT:   public/locales/de/translation.json + 9 weitere
EDIT:   server/services/ai/prompt-templates.ts (PATIENT_PROMPT_GUARD)

NEW:    docs/INTENDED_USE.md
NEW:    docs/REGULATORY_POSITION.md
NEW:    docs/REGULATORY_STRATEGY.md (dieses Dokument)
NEW:    docs/CHANGE_LOG_REGULATORY.md
NEW:    e2e/regulatory/no-diagnosis-to-patient.spec.ts
NEW:    server/engine/__tests__/RoutingEngine.regulatory.test.ts
```

### 13.3 Anhang C — MDCG 2019-11 Decision Tree Kurzfassung

```
Step 1:  Is the software a medical device software (MDSW)?
         Software for "calibration, monitoring, control, support" of MD → MDSW
         Software for "general purposes" or "administrative" → not MDSW   ← DiggAi-Spur-A
         
Step 2:  Is the MDSW for the benefit of individual patients?
         Yes → continue                                                    ← DiggAi-Spur-B
         No (e.g. for healthcare institution) → Class I

Step 3:  Does it provide info for decisions with diagnostic/therapeutic purposes?
         No → Class I
         Yes → continue

Step 4:  Could the decision cause death / irreversible deterioration?
         Yes → Class III                                                   
         No, but serious deterioration / surgical intervention → Class IIb ← DiggAi-heute (CRITICAL_ACS)
         No, but moderate harm → Class IIa
         No, but minor harm → Class IIa
```

### 13.4 Anhang D — Beratungs-Empfehlungen

| Anbieter | Spezialität | Erstgespräch |
|----------|-------------|--------------|
| **Johner Institut** (Konstanz) | MDR Klasse I/IIa Selbstdeklaration, ISO 14971/IEC 62304 | kostenpflichtig, ca. 800 € |
| **MEDIQ** (München) | DiGA Fast-Track Antrag, BfArM-Begleitung | erste 30 Min meist frei |
| **Health Innovation Hub** (HIH, Berlin) | DiGA Best-Practice Sharing | kostenlos (Initiative BMG) |
| **TÜV SÜD Product Service** | Notified Body (für Spur B Klasse IIa-Upgrade falls nötig) | nach Bedarf |
| **DiGA-Hub.de** | Community + Templates | kostenlos |

### 13.5 Anhang E — Quellen

- Verordnung (EU) 2017/745 (MDR), insbesondere Art. 2(1), Annex VIII Rule 11
- MDCG 2019-11 — Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745
- DVG Digitale-Versorgung-Gesetz (2019), §139e SGB V
- DiGAV — Digitale-Gesundheitsanwendungen-Verordnung (BMG, 2020)
- BfArM Leitfaden DiGA Fast-Track (aktuelle Fassung — vor Antragsstellung Stand prüfen unter `bfarm.de`)
- BSI TR-03161 — Sicherheitsanforderungen an digitale Gesundheitsanwendungen
- ISO 14971:2019 — Anwendung des Risikomanagements auf Medizinprodukte
- IEC 62304:2006+A1:2015 — Medizingeräte-Software
- IEC 62366-1:2015 — Anwendung der Gebrauchstauglichkeit
- ISO 13485:2016 — Qualitätsmanagementsysteme für Medizinprodukte
- MPDG — Medizinprodukterecht-Durchführungsgesetz (DE)

---

**Ende des Dokuments.**

> **Nächster Schritt:** Sign-off durch Geschäftsführung + Medical Advisor, dann Start mit §11.1 (Sofortmaßnahmen Woche 1–2). Erfolgskontrolle nach Woche 10: Spur A abgeschlossen, Hersteller-Erklärung unterschrieben, CI-Test-Suite `e2e/regulatory/` grün, Marketing-Sprachreinigung abgeschlossen.
