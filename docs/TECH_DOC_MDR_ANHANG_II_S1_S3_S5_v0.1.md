# DiggAi Capture — Technische Dokumentation MDR Anhang II
## Sektionen §1 · §3 · §5 (Inhaltsfüllung v0.1)

**Version:** 0.1 · ENTWURF · **Stand:** 2026-05-07 · **Verfasser:** ENG (Lauf claude-code-06)
**Genehmigung ausstehend:** Geschäftsführung (Dr. Klapproth) + Medizinrecht-Anwalt (A5)
**Übergeordnetes Dokument:** `docs/TECH_DOC_OUTLINE_MDR_ANHANG_II.md`
**Geltungsbereich:** DiggAi Capture v3.x — administratives Patienten-Anmelde-System (kein Medizinprodukt nach MDR Art. 2(1); defensiver Fallback: MDR Klasse I Selbstverifizierung)

---

## §1 Produktbeschreibung und Spezifikation
*(MDR Anhang II Nr. 1 — vollständige Fassung)*

### 1.1 Produktidentifikation

| Feld | Wert |
|------|------|
| **Produktname** | DiggAi Praxis-Anmelde- und Routing-Plattform (Capture-Modul) |
| **Markenname** | DiggAi |
| **Produktvarianten** | DiggAi Capture (Klasse I / kein MP); DiggAi Suite (Klasse IIa, separates Zulassungsverfahren) |
| **Aktuelle Version** | v3.x (SemVer; Major-Update erfordert neue UDI-DI-Beantragung) |
| **UDI-DI** | Noch nicht beantragt (D4 offen, GS1 Germany) |
| **Hersteller** | DiggAi GmbH (in Gründung), Hamburg, Deutschland |
| **Verantwortliche Person** | Dr. Christian Klapproth (vorläufig, vor CE-Kennzeichnung durch QM-Beauftragten zu ergänzen) |
| **Auslieferungsform** | Web-Anwendung (SaaS) — Single Page Application + Backend-API; optional als On-Premise-Container |
| **Regulatorische Klasse** | Hersteller-Position: kein Medizinprodukt (MDCG 2019-11 §3.5); defensiver Fallback: MDR Klasse I (MDR Art. 52 Abs. 7) |

### 1.2 Verwendungszweck (Zweckbestimmung)

> **DiggAi Capture ist eine administrative Praxis-Anmelde- und Routing-Plattform für deutsche Arztpraxen. Sie strukturiert die vom Patienten selbst eingegebenen Stammdaten, Anliegen-Beschreibungen und Symptom-Stichworte in einem mehrsprachigen, barrierefreien Online-Formular und leitet die strukturierten Eingaben an das medizinische Praxispersonal weiter.**
>
> **Zweck der Software ist ausschließlich die organisatorische Effizienz der Arztpraxis** — die Reduktion papierbasierter Anmeldevorgänge, die Bereitstellung der Anmeldemaske in zehn Sprachen, die automatisierte Weiterleitung der Patienteneingaben an den zuständigen Arbeitsplatz sowie die Bereitstellung einer strukturierten Vorbereitungs-Information für die anschließende ärztliche Sprechstunde.
>
> **DiggAi trifft keine medizinischen Entscheidungen. DiggAi stellt keine Diagnosen, keine Verdachtsdiagnosen, keine Risiko-Bewertungen und keine Therapieempfehlungen. Die medizinische Beurteilung — einschließlich der Erkennung von Notfällen und jeder Diagnose- oder Therapieentscheidung — verbleibt vollständig und ausschließlich beim ärztlichen und medizinischen Fachpersonal.**

**Maßgebliche Quelle:** `docs/INTENDED_USE.md` v1.0 (Hersteller-Zweckbestimmung, überschreibt alle anderen Dokumente).

### 1.3 Zielgruppe der Anwender

| Anwender | Rolle in DiggAi Capture |
|----------|------------------------|
| **Patient** | Erfasst Stammdaten, Anliegen und Symptom-Stichworte selbständig im Browser. Kein klinischer Output sichtbar. |
| **MFA (Medizinische Fachangestellte)** | Empfängt strukturierte Anmeldeinformation; trifft organisatorische Weiterleitung; bleibt fachlich verantwortlich. |
| **Arzt** | Empfängt strukturierte Vorbereitungs-Information; führt Anamnese, Diagnose und Therapie eigenverantwortlich durch. |
| **Praxis-Administrator** | Konfiguriert Fragenkatalog, Praxis-Stammdaten und Benutzerrechte. |

**Ausschlüsse:** Nicht bestimmt für Notaufnahmen, Rettungsdienste, stationäre Einrichtungen, Pflegeheime, Telemedizin-Anbieter außerhalb der Arztpraxis oder für den Direktvertrieb an Versicherte.

**Altersgrenze:** Patienten ab 16 Jahren (unter 16: Erziehungsberechtigte müssen begleiten und Zustimmung erteilen).

### 1.4 Anwendungsumgebung

- **Browser:** Aktuelle Versionen Chrome ≥ 110, Safari ≥ 16, Firefox ≥ 115, Edge ≥ 110 (Desktop + Mobile)
- **Endgeräte:** Smartphone, Tablet, Desktop-PC, Praxis-Kiosk (touchoptimiert)
- **Netzwerk:** HTTPS-Verbindung für Submit erforderlich; strukturiertes Offline-Caching (Dexie/IndexedDB) für Formulareingabe ohne stabilen Empfang
- **Barrierefreiheit:** WCAG 2.1 AA angestrebt; RTL-Unterstützung für Arabisch und Farsi; BITV 2.0-Audit ausstehend (F5)
- **Betriebsumgebung:** SaaS — Hosting Netlify (Frontend, CDN Frankfurt), Fly.io Region fra (Backend), Neon PostgreSQL Region eu-central-1 (Datenbank); alles innerhalb der EU/DSGVO

### 1.5 Kontraindikationen

Keine absoluten Kontraindikationen, da DiggAi Capture keinen klinischen Output erzeugt. Funktionale Einschränkungen:
- Keine Nutzung für medizinische Notfälle (→ sofort 112)
- Keine Nutzung als Ersatz für ärztliche Konsultation
- Keine Nutzung durch Patienten unter 16 Jahren ohne Erziehungsberechtigte

### 1.6 Systemkomponenten

| Komponente | Technologie | Version | Funktion |
|------------|-------------|---------|----------|
| **Frontend (SPA)** | React 19 + TypeScript + Vite 5 | v3.x | Patienten-Formular, Staff-Dashboard |
| **Backend (API)** | Express 5 + Node.js 22 + Prisma 6 | v3.x | REST-API, Auth, Verschlüsselung, Audit |
| **Datenbank** | PostgreSQL 16 (Neon, eu-central-1) | 16.x | Persistenz, Rollen-Isolation |
| **Hosting Frontend** | Netlify (CDN Frankfurt) | — | TLS-Termination, CDN |
| **Hosting Backend** | Fly.io (Region fra) | — | Container, Auto-Scale |
| **i18n** | i18next v23 | v23.x | 10 Sprachen, RTL |
| **Auth** | JWT HS256 + bcrypt + WebAuthn | — | RBAC (patient/mfa/arzt/admin) |
| **Verschlüsselung** | AES-256-GCM (PII), SHA-256 (E-Mail) | — | At-Rest-Schutz |

### 1.7 Schnittstellen

- **HTTPS REST-API:** Single-endpoint `/api/v1/…` mit Zod-Schema-Validierung, JWT-Auth, Rate-Limiting
- **Browser-Push (Web Push API):** Optionale Benachrichtigungen (VAPID-Keys konfiguriert, H2 ✅)
- **PVS-Schnittstelle:** HL7 FHIR R4 Export (Skeleton in F4, noch nicht produktionsbereit); KIM-Stub in Planung
- **KI-Agent-Schnittstelle:** Agent-Core Service (`http://AGENT_CORE_URL`) — nur Suite (DECISION_SUPPORT_ENABLED=true)
- **Keine direkten Schnittstellen zu:** Diagnosesystemen, Laborgeräten, Bildgebungssystemen, Telemedizin-Plattformen

### 1.8 Versionierungs- und Änderungsstrategie

- **SemVer:** Major.Minor.Patch
- **Major-Update:** Erfordert erneute Konformitätsbewertung, neuen UDI-DI bei GS1 Germany, Revision aller Tech-Doku-Sektionen
- **Minor-Update:** Erfordert Überprüfung der betroffenen Risikomanagement-Einträge und IFU-Revision wenn Bedienungsänderung
- **Patch-Update:** Interne Qualitätssicherung ausreichend, kein Revisions-Trigger für Tech-Doku
- **Changelog:** `CHANGELOG.md` im Repository; regulatorisch relevante Änderungen zusätzlich in `docs/CHANGE_LOG_REGULATORY.md`

---

## §3 Verifikation und Validierung
*(MDR Anhang II Nr. 6.1 + 6.2, IEC 62304 Klasse A)*

### 3.1 Software-Klassifikation nach IEC 62304

DiggAi Capture fällt unter **IEC 62304 Software-Sicherheitsklasse A** (keine schwerwiegende Verletzung oder Tod durch Software-Versagen möglich), da:
- Kein klinischer Output an den Patienten
- Kein Einsatz in der Notfallversorgung
- Vollständige ärztliche Verantwortung für medizinische Entscheidungen bleibt beim Personal
- Capture-Fehler führen maximal zu: (a) Fehlleitung in der Praxis → administrativer Fehler, (b) Datenverlust → Patient füllt Formular erneut aus

**Begründung Klasse A (nicht Klasse B/C):** Der schlimmste Softwarefehler in Capture (vollständiger Ausfall) erfordert Rückkehr zur Papierkarte — kein Patientenschaden. Klinische Entscheidungen werden niemals von DiggAi getroffen.

### 3.2 Software-Architektur (Technische Trennung Capture / Suite)

```
Monorepo: diggai-anamnese-master/
├── src/                          # Capture-Frontend (React)
├── server/                       # Backend (Express + Prisma)
├── packages/
│   ├── capture/                  # (Scaffold) Capture-only Code
│   ├── suite/                    # (Scaffold) Suite-only Code, DECISION_SUPPORT_ENABLED
│   └── common/                   # Geteilte Bibliotheken
├── apps/
│   └── agent-core/               # Python/FastAPI Agent (Suite only)
```

**Technische Schutzbarrieren Class-IIa vs. Class-I:**

| Mechanismus | Implementierung | Status |
|-------------|-----------------|--------|
| Runtime Feature-Flag | `DECISION_SUPPORT_ENABLED` env var | ✅ B4 (Lauf 05) |
| Code-Guards (12 Stellen) | `requireDecisionSupport()` in 7 Modulen | ✅ B4 abgeschlossen |
| ESLint no-restricted-imports | `eslint.config.js` Zeile 67 für `packages/capture/**` | ✅ B5 |
| Bundle-Audit | `scripts/bundle-audit.cjs` CI-Step | ✅ B6 (soft-fail) |
| Postgres-Rollen | `diggai_capture`, `diggai_suite`, `diggai_owner` | ✅ C1 (Neon Prod) |

**Bewachte Module (Suite-only, 12 Guards):**

| Modul | Guards | Zweck |
|-------|--------|-------|
| `ai-engine.ts` | 3 | LLM-Diagnose-Hilfe |
| `TriageEngine.ts` | 2 | Klinische Triage-Regeln |
| `AlertEngine.ts` | 3 | Patientenalert (CRITICAL/WARNING) |
| `triage.agent.ts` | 1 | AI-Routing-Agent |
| `dokumentation.agent.ts` | 1 | Klinische Doku-KI |
| `ambient-scribe.service.ts` | 1 | Spracherkennung → Befund |
| `billing-optimization.service.ts` | 1 | ICD-10-Kodierungsoptimierung |

### 3.3 Verifikations-Tests (Testübersicht)

#### 3.3.1 Unit-Tests (Vitest)

| Scope | Framework | Coverage-Threshold | Status |
|-------|-----------|-------------------|--------|
| Frontend-Komponenten | Vitest 2.x + React Testing Library | 70 % Statements | CI aktiv |
| Backend-Services | Vitest + Supertest | 80 % Statements | CI aktiv |
| Verschlüsselungs-Service | Vitest (dedizierte Suite) | 100 % Funktionen | CI aktiv |
| Auth-Middleware | Vitest | 80 % | CI aktiv |

**Test-Konfiguration:** `vitest.config.ts` (Frontend), `vitest.server.config.ts` (Backend)

#### 3.3.2 Integrationstests (Playwright E2E)

| Test-Szenario | Status | Pfad |
|---------------|--------|------|
| Vollständiger Anamnese-Durchlauf (DE) | ✅ | `e2e/anamnese.spec.ts` |
| MFA Workflow (Empfang → Wartezimmer) | ✅ | `e2e/mfa.spec.ts` |
| Mehrsprachigkeit (EN, TR, AR-RTL) | ✅ | `e2e/i18n.spec.ts` |
| Offline → Submit nach Reconnect | ◧ | `e2e/offline.spec.ts` (partial) |
| Tastatur-Navigation (WCAG 2.1) | ✅ | `playwright.frontend.config.ts` |
| Arzt-Dashboard Login + Triage-View | ✅ | `e2e/arzt.spec.ts` |

**Test-Konfiguration:** `playwright.config.ts`, `playwright.volltest.config.ts`

#### 3.3.3 Sicherheitstests

| Test | Tool | Frequenz | Status |
|------|------|----------|--------|
| npm-Audit (High+Critical) | npm audit | Bei jedem Commit (CI) | ✅ C2 aktiv |
| DB-Rollen-Berechtigungstest | Vitest + Postgres | CI (nach C2-Migration) | ✅ C2 |
| Bundle-Audit (Class-IIa-String-Scan) | `scripts/bundle-audit.cjs` | CI (soft-fail) | ✅ B6 |
| Penetrationstest | TÜV SÜD / DEKRA / SySS | Jährlich | ⬛ C3 ausstehend |
| OWASP ZAP | OWASP ZAP | Quartalsweise | ⬛ geplant |

#### 3.3.4 Marketing- und Compliance-Audit

| Test | Skript | Frequenz | Status |
|------|--------|----------|--------|
| Verbots-Wortliste (Class-I-Schutz) | `scripts/marketing-audit.cjs` | CI-Gate K22 | ✅ G1 abgeschlossen |
| i18n-Vollständigkeit | `scripts/audit-translations.cjs` | CI | ✅ K21 |
| Bundle-Größe (Performance-Budget) | `scripts/check-performance-budget.mjs` | CI | ✅ aktiv |

### 3.4 Validierungstests (Use-Case-basiert)

#### 3.4.1 Validierungsszenarien (geplant / in Durchführung)

| Szenario | Methode | Status |
|----------|---------|--------|
| **V01** Patient Erstanmeldung — Allgemeinmedizin (DE) | Nutzertest Klapproth-Praxis | ◧ Pilotvorbereitung |
| **V02** Patient mit Sprachbarriere — Arabisch/RTL | Nutzertest + Aufzeichnung | ⬛ geplant |
| **V03** MFA Stoßzeit-Workflow (8 Patienten gleichzeitig) | Last-Test (`scripts/run-load-tests.js`) | ◧ Skript vorhanden |
| **V04** Arzt empfängt Vorbereitungs-Info (Capture-Pfad) | Manual Walkthrough | ⬛ geplant |
| **V05** Offline-Szenario: Patient in Aufzug | Playwright-Sim | ◧ partial |
| **V06** Kiosk-Betrieb (Touch-only, kein Keyboard) | Device-Test | ⬛ geplant |
| **V07** Barrierefreiheit: Screenreader VoiceOver/NVDA | BITV-Audit | ⬛ F5 ausstehend |

#### 3.4.2 Pilot-Praxis-Validierung

Die Klapproth-Praxis (Hamburg) dient als erste Referenz-Praxis für die Validierungsdaten. Pilot-Deployment geplant nach:
1. Anwalts-Sign-off (A5)
2. BfArM-Sprechstunde-Bestätigung (A4)
3. DSB-Freigabe für Pilot-Betrieb

### 3.5 Post-Release-Verifikation

| Maßnahme | Werkzeug | Frequenz |
|----------|----------|----------|
| Smoke-Test (Health-Check) | `tools/smoke-test-chrome.mjs` | Täglich (automatisch) |
| Error-Monitoring | Fly.io Metriken + Console-Logs | Kontinuierlich |
| DSGVO-Meldepflicht-Monitor | Manuelle Prüfung Audit-Log | Wöchentlich |
| Software-Update-Prüfung | npm outdated + Dependabot | Wöchentlich |

### 3.6 Konfigurationsmanagement und Rückverfolgbarkeit

- **Versionskontrolle:** Git, GitHub (private Repository `DiggAiHH/diggai-anamnese`)
- **Branch-Strategie:** `main` (produktiv), `restructure/phase-1-workspace` (aktive Entwicklung), Feature-Branches
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) — Build, Unit-Tests, Marketing-Audit, npm-Audit bei jedem Commit
- **Deployment:** Netlify (Frontend, auto-deploy aus `main`), Fly.io (Backend, manuell via `flyctl deploy`)
- **Artifact-Versionierung:** Docker Image Tag = Git Commit SHA; Netlify Deploy ID = Build-Hash

---

## §5 Konformitätspfad und harmonisierte Normen
*(MDR Anhang II Nr. 4)*

### 5.1 Klassifizierungsbegründung

#### 5.1.1 Primäre Hersteller-Position: Kein Medizinprodukt

DiggAi Capture erfüllt die Definition eines Medizinprodukts gemäß **MDR Art. 2(1) nicht**, da:

1. **Kein medizinischer Zweck:** Die Zweckbestimmung (→ §1.2) beschränkt sich auf administrative Effizienz — Reduktion von Papierkarten, mehrsprachige Anmeldung, Weiterleitung von Patienteneingaben. Dies ist kein medizinischer Verwendungszweck nach MDR Art. 2(1).

2. **Kein klinischer Output:** Capture erzeugt kein Dokument, das dem medizinischen Fachpersonal als Grundlage für eine klinische Entscheidung dient. Die strukturierte Zusammenfassung der Patienteneingaben ist eine administrative Übergabe, keine klinische Beurteilung.

3. **MDCG 2019-11 §3.5 (Software):** Die MDCG-Leitlinie definiert Software als Medizinprodukt, wenn sie Informationen mit dem Ziel der Gesundheitsfürsorge erzeugt (z. B. Diagnose, Prognose, Überwachung, Behandlung). Capture erzeugt keine solchen Informationen — die medizinische Beurteilung verbleibt beim Arzt.

4. **BfArM Orientierungshilfe Software (2022):** Administrative Patientendaten-Software zur Praxis-Organisation ist gemäß BfArM-Orientierungshilfe ausdrücklich kein Medizinprodukt, wenn kein klinischer Entscheidungsunterstützungs-Output vorhanden ist.

5. **Äquivalenz-Argument:** Vergleichbare Produkte (Doctolib, Jameda, Samedi) sind von deutschen und europäischen Marktaufsichtsbehörden als administrative Software eingestuft und nicht als Medizinprodukt notifiziert.

**Konsequenz:** DiggAi Capture ist nach Auffassung des Herstellers **kein Medizinprodukt** und fällt nicht in den Anwendungsbereich der MDR (EU) 2017/745.

#### 5.1.2 Defensive Fallback-Position: MDR Klasse I (Selbstverifizierung)

Für den Fall, dass eine Marktaufsichtsbehörde oder ein Notified Body die Hersteller-Position nicht anerkennt, hat der Hersteller vorsorglich die technischen und dokumentatorischen Voraussetzungen für eine **MDR Klasse I Selbstverifizierung** geschaffen:

**Klassifizierungsgrundlage:**
- **MDR Anhang VIII Regel 11** (Software): Software fällt in Klasse I, wenn sie keine der erhöhten Risiken gemäß Regel 11 Abs. 2–6 aufweist — d. h. keine klinische Entscheidungsunterstützung, keine Diagnose, keine Therapiesteuerung
- **MDR Art. 52 Abs. 7:** Klasse-I-Geräte dürfen ohne Beteiligung eines Notified Body in Verkehr gebracht werden (Selbstverifizierung durch den Hersteller)

**Nachweis der Klasse-I-Bedingungen:**

| Klasse-IIa-Ausschlusskriterium (Regel 11) | Capture-Status | Nachweis |
|------------------------------------------|---------------|---------|
| Informationen zur Diagnose oder Therapie für individuelle Patienten | ❌ Nicht vorhanden | `docs/INTENDED_USE.md`, `docs/REGULATORY_POSITION.md` |
| Beeinflussung klinischer Entscheidungen durch physiologische Prozesssteuerung | ❌ Nicht vorhanden | Code-Audit, `requireDecisionSupport()`-Guards (B4) |
| Real-time Monitoring mit direktem Patienteneinfluss | ❌ Nicht vorhanden | Architektur-Review, kein Sensor-Interface |
| Lebenserhaltung oder -unterstützung | ❌ Nicht vorhanden | Zweckbestimmung schließt Notfallversorgung aus |

### 5.2 Konformitätsbewertungsverfahren

**Angewandtes Verfahren:** MDR Art. 52 Abs. 7 i.V.m. MDR Anhang II + Anhang III

Für MDR-Klasse-I-Produkte, die weder steril noch mit Messfunktion versehen noch wiederverwendbare chirurgische Instrumente sind, ist kein Notified Body erforderlich. Der Hersteller erklärt die Konformität durch:

1. **Erstellung der technischen Dokumentation** (dieses Dokument + Anhänge)
2. **Konformitätserklärung** (MDR Anhang IV — D7 erstellt als `DiggAi-Capture-Konformitaetserklaerung-Anhang-IV-v0.1.docx`)
3. **CE-Kennzeichnung** nach erfolgter Konformitätserklärung (nicht vor Anwalts-Review A5)

**Aktueller Stand des Konformitätsbewertungsverfahrens:**

| Schritt | Status | Verweis |
|---------|--------|---------|
| Technische Dokumentation §1 | ✅ v0.1 erstellt | Dieses Dokument |
| Technische Dokumentation §2 (Risikomanagement) | ✅ v0.1 | `DiggAi-FMEA-ISO14971-v0.1.xlsx` |
| Technische Dokumentation §3 (V&V) | ✅ v0.1 erstellt | Dieses Dokument |
| Technische Dokumentation §4 (CER) | ✅ v0.1 | `docs/CER_DiggAi_Capture_v0.1.md` |
| Technische Dokumentation §5 (Konformitätspfad) | ✅ v0.1 erstellt | Dieses Dokument |
| Technische Dokumentation §6 (Sicherheit) | ✅ v0.1 | `docs/SECURITY_ENCRYPTION_CONCEPT.md` |
| IFU (Gebrauchsanweisung) | ✅ v0.1 | `docs/IFU_DiggAi_Capture_v0.1.docx` |
| DSFA (Datenschutz-Folgenabschätzung) | ✅ v0.1 | `docs/DSFA_DiggAi_Capture_v0.1.md` |
| Konformitätserklärung Anhang IV | ✅ v0.1 Entwurf | `DiggAi-Capture-Konformitaetserklaerung-Anhang-IV-v0.1.docx` |
| Anwalts-Review (Medizinrecht) | ⬛ ausstehend | A5 — Kontakt vorbereitet |
| BfArM-Sprechstunde | ⬛ ausstehend | A4 — Vorlage bereit |
| UDI-Registrierung (GS1 Germany) | ⬛ ausstehend | D4 |
| EUDAMED-Registrierung | ⬛ ausstehend | D5 |
| CE-Kennzeichnung | ⬛ nach Anwalts-Review | — |

### 5.3 Harmonisierte Normen und angewandte Normen

#### 5.3.1 Vollständig angewandt

| Norm | Titel | Anwendungsbereich in DiggAi | Konformitäts-Nachweis |
|------|-------|----------------------------|----------------------|
| **ISO 14971:2019** | Medizinprodukte — Anwendung des Risikomanagements | Vollständige FMEA für Capture (30 Risiken) + Suite (10 Risiken) | `DiggAi-FMEA-ISO14971-v0.1.xlsx` |
| **IEC 62304:2006+A1** | Software-Lebenszyklus-Prozesse (Klasse A) | Software-Architektur, V&V-Plan, Konfigurationsmanagement | §3 dieses Dokuments |
| **DSGVO (EU) 2016/679** | Datenschutz-Grundverordnung | Art. 9 Abs. 2 lit. h (Gesundheitsdaten), Art. 30 (Verfahrensverzeichnis), Art. 35 (DSFA) | `docs/DSFA_DiggAi_Capture_v0.1.md`, `docs/VERFAHRENSVERZEICHNIS_FINAL.md` |

#### 5.3.2 Teilweise angewandt (Stand-der-Technik)

| Norm | Titel | Status | Lücken-Item |
|------|-------|--------|-------------|
| **IEC 62366-1:2015** | Usability Engineering | Informelle UX-Reviews, kein zertifiziertes Verfahren | F5 (BITV-Audit) |
| **ISO 27001:2022** | Informationssicherheits-Management | Subset implementiert (Encryption, Auth, Audit-Log, Incident-Response) | E2 (vollständiges ISMS) |
| **BSI-Grundschutz IT** | BSI IT-Grundschutz-Kompendium | Grundschutz-äquivalente Maßnahmen (BSI TR-03161-kompatibel) | E1 (BSI-Grundschutz-Profil) |
| **ISO 15223-1:2021** | Symbole für Kennzeichnung | Anwendbar bei IFU-Finalisierung | D6 v1.0 (nach A5-Review) |
| **ISO 13485:2016** | QM-System für Medizinprodukte | Subset-QM: Dokumentenlenkung, CAPA-Grundstruktur | E2 (vollständiges ISO 13485) |

#### 5.3.3 Nicht anwendbar

| Norm | Begründung |
|------|------------|
| IEC 60601-Reihe | Nur für elektromedizinische Geräte mit physischem Patientenkontakt |
| ISO 11135, EN 556 | Nur für sterile Produkte |
| MDR Anhang XII (NOTIFIED BODY) | Entfällt bei Klasse I und kein-MP-Position |

### 5.4 Konformitätserklärung

Die Konformitätserklärung nach MDR Anhang IV wird nach Abschluss des Anwalts-Reviews (A5) und vor der CE-Kennzeichnung finalisiert. Der aktuelle Entwurf liegt vor in:

**`DiggAi-Capture-Konformitaetserklaerung-Anhang-IV-v0.1.docx`** (Workspace-Root)

Inhalt der Konformitätserklärung (MDR Anhang IV Pflichtangaben):
1. Hersteller-Name und -Adresse
2. Erklärung, dass das Produkt die Bestimmungen der MDR (EU) 2017/745 erfüllt (alternativ: Erklärung der Nicht-Anwendbarkeit mit Begründung)
3. Referenz auf die technische Dokumentation
4. Angewandte harmonisierte Normen und Gemeinsame Spezifikationen
5. Name und Unterschrift des bevollmächtigten Vertreters

---

---

## §7 Mensch-System-Schnittstelle / Gebrauchstauglichkeit
*(MDR Anhang II Nr. 6 + IEC 62366-1:2015)*

### 7.1 Anwender-Personae

DiggAi Capture richtet sich an drei Nutzergruppen mit unterschiedlichen Kompetenz-Profilen:

| Persona | Beschreibung | Technische Kompetenz | Sprachkompetenz | Primäres Gerät |
|---------|--------------|----------------------|-----------------|----------------|
| **Patient (Neu)** | Kommt erstmalig in die Praxis, hat ggf. Link per SMS/QR-Code erhalten | Smartphone-Basis (WhatsApp-Niveau), kein medizinisches Fachwissen | Heimatsprache (10 Sprachen verfügbar), ggf. kein Deutsch | Smartphone (iOS/Android) |
| **Patient (Stamm)** | Bekannte Praxis, hat schon Anmeldung gemacht | Leicht höher — kennt den Ablauf | Meist Deutsch oder Heimatsprache | Smartphone oder Praxis-Tablet |
| **MFA / Empfang** | Medizinische Fachangestellte, betreut den Eingangsbereich | PC + Browser vertraut, kein Entwickler-Hintergrund | Deutsch | Praxis-PC (Desktop-Browser) |
| **Arzt** | Liest strukturierte Anmeldedaten im Dashboard | Medizinische Fachkompetenz, PC-vertraut | Deutsch (ggf. Englisch für englischsprachige Patienten) | Praxis-PC oder Tablet |
| **Admin/IT** | Pflegt Tenant-Einstellungen, verwaltet Benutzer | IT-Grundkenntnisse, kein Entwickler | Deutsch | Desktop-Browser |

**Capture-Scope:** Nur Patient-Persona und teilweise MFA-Persona (Read-Only-View) sind in Capture relevant. Arzt-Dashboard und Admin gehören zu Suite.

### 7.2 Kritische Use-Cases und Use-Error-Analyse

IEC 62366-1 fordert eine Analyse von Use-Errors, die zu Patientenschaden führen könnten. Da Capture ein rein administratives System ist (kein klinischer Output), ist das Schadenspotenzial inhärent gering. Dennoch:

| Use-Case | Potenzielle Use-Error | Mögliche Folge | Mitigation |
|----------|----------------------|----------------|------------|
| UC-1: Anliegen-Freitext eingeben | Patient beschreibt akute Notfall-Symptome als Freitext ohne erkannte Dringlichkeit | Praxis merkt Dringlichkeit nicht sofort | Pflichthinweis in UI: „Bei akuten Beschwerden wenden Sie sich sofort an das Praxispersonal oder wählen Sie 112" (MDR Anh. I §23.4m-konform) |
| UC-2: Geburtsdatum eingeben | Tippfehler → falsches Geburtsdatum gespeichert | Mismatch mit Patientenakte | Pflichtfeld mit Datumsformat-Validierung + Bestätigung |
| UC-3: Sprache wählen | Patient wählt falsche Sprache | Missverstehter Fragebogen | Sprache jederzeit wechselbar, Flag-Icons statt Textabkürzungen |
| UC-4: Einwilligung (Consent) | Patient klickt durch ohne Lesen | DSGVO-Zweifel | Pflicht-Scroll bis zum Ende + explizite Checkbox, kein Pre-Check |
| UC-5: Session-Timeout | Inactivity-Timer nach 15 Min → Session verloren | Patient muss neu starten | Warning-Modal 2 Min vorher mit „Weiter"-Button (C18 implementiert) |
| UC-6: QR-Scan-Fehler (Kiosk) | Patient scannt falsche QR-Code-Variante | Falsche Praxis oder Session | QR-Codes haben Tenant-Prüfung; Fehlerseite mit klarer Handlungsanweisung |
| UC-7: Barrierefreiheit | Sehbehinderte Patient kann Formular nicht nutzen | Ausgrenzung | RTL-Support, Schriftgröße-Einstellung, Kontrast AA (BITV 2.0-Audit steht aus, F5) |

**Schweregrad-Einschätzung (IEC 62366-1 Anhang B):** Kein Use-Error in Capture kann zu ernstem Patientenschaden führen, da kein klinischer Output erzeugt wird. Klassifizierung: **Severity Level 1** (keine Verletzung) bis maximal **Severity Level 2** (umkehrbarer Schaden: verpasster Termin, Daten-Neueingabe). Das rechtfertigt IEC 62304 **Klasse A** (keine klinische Entscheidungsunterstützung).

### 7.3 Anwender-Kompetenz-Annahmen

Das System **darf nicht voraussetzen**, dass der Patient:
- Deutsch lesen kann (→ 10 Sprachen, RTL-Support)
- medizinische Fachbegriffe kennt (→ einfache Sprache B1-Niveau in allen Übersetzungen)
- ein Smartphone besitzt (→ Fallback: Praxis stellt Tablet/Kiosk)
- eine stabile Internetverbindung hat (→ Offline-PWA-Caching für statische Assets; Submit benötigt Online)
- über 60 Jahre alt ist und Kleinstschrift lesen kann (→ Mindestschriftgröße 16 px, touch-Ziele ≥ 44 × 44 px nach WCAG 2.1)

Das System **setzt voraus**, dass:
- Patient ≥ 16 Jahre alt ist (Einwilligungsfähigkeit; Minderjährige nur mit Erziehungsberechtigten)
- MFA Grundkenntnisse im Umgang mit einem Web-Browser hat
- Die Praxis eine eigene Schulung des MFA-Personals für die Admin-Oberfläche durchführt (dokumentiert in IFU D6)

### 7.4 Validierungsplan Gebrauchstauglichkeit (IEC 62366-1 §6)

#### Summative Usability-Bewertung (Pilot-Phase)

| Test-ID | Testmethode | Stichprobe | Ziel-Metrik | Akzeptanzkriterium | Status |
|---------|------------|------------|-------------|-------------------|--------|
| UT-01 | Think-Aloud-Formular-Durchlauf (Patient, unbegleitet) | 5 Teilnehmer, 3 Sprachen | Task-Completion-Rate | ≥ 90 % ohne Assistenz | offen — Pilot Klapproth-Praxis (G4) |
| UT-02 | Time-on-Task (Patient → Submit) | 8 Teilnehmer | Median < 7 Min | ≤ 7 Min für Stammdaten + Anliegen | offen |
| UT-03 | Error-Rate (falsche Felder) | 8 Teilnehmer | Fehler-Rate | < 2 Fehler / Session (korrigierbar) | offen |
| UT-04 | MFA-Dashboard-Lesbarkeit (strukturierte Ausgabe) | 3 MFA-Mitarbeiter | Verstehbarkeit 1–5 | ≥ 4/5 Sterne | offen |
| UT-05 | Barrierefreiheit (Screenreader NVDA/VoiceOver) | 2 Testläufe | WCAG 2.1 AA | 0 kritische Fehler | offen (F5) |

**Formative Evaluation:** Laufend via Pilot-Praxis-Feedback (CK-Praxis, G4). Befunde werden in Risikomanagement-Akte (D1) eingetragen.

### 7.5 Mehrsprachigkeit und Internationalisierung

| Sprache | Code | RTL | Buchstaben | Status |
|---------|------|-----|-----------|--------|
| Deutsch | de | nein | Latein | ◼ Referenzsprache |
| Englisch | en | nein | Latein | ◼ vollständig (K21) |
| Türkisch | tr | nein | Latein | ◼ vollständig (K21) |
| Arabisch | ar | **ja** | Arabisch | ◼ vollständig (K21), RTL-Layout aktiv |
| Ukrainisch | uk | nein | Kyrillisch | ◼ vollständig (K21) |
| Spanisch | es | nein | Latein | ◼ vollständig (K21) |
| Farsi | fa | **ja** | Arabisch | ◼ vollständig (K21), RTL-Layout aktiv |
| Italienisch | it | nein | Latein | ◼ vollständig (K21) |
| Französisch | fr | nein | Latein | ◼ vollständig (K21) |
| Polnisch | pl | nein | Latein | ◼ vollständig (K21) |

Alle Übersetzungen sind Class-I-konform: keine klinischen Aussagen, keine Triage-Sprache, keine Diagnose-Begriffe. Verifiziert durch `marketing-audit.cjs` (0 Hits nach G1 2. Pass).

**Technische Umsetzung:** i18next mit Namespaces in `public/locales/{lang}/translation.json`. Sprache wird im Frontend-State gehalten, kein Server-Side-Rendering. RTL per CSS `dir="rtl"` auf `<html>`-Ebene.

### 7.6 Barrierefreiheit (BITV 2.0 / WCAG 2.1 AA)

| Anforderung | Umsetzungsstand | Nachweis |
|-------------|----------------|---------|
| Kontrastverhältnis ≥ 4,5:1 (Normal-Text) | implementiert | Farb-System `CALM_TRUST_UI_GUIDE.md` |
| Tastatur-Navigation vollständig | teilweise | Tab-Order geprüft; Modals haben focus-trap |
| Screenreader-Labels (ARIA) | teilweise | `aria-hidden` auf Honeypot (C12), weitere ARIA-Labels im Fragebogen |
| Schriftgröße skalierbar (200 % ohne Verlust) | nicht geprüft | BITV-Audit ausstehend (F5) |
| Touch-Ziele ≥ 44 × 44 px | nicht verifiziert | BITV-Audit ausstehend (F5) |
| Videos mit Untertiteln | nicht relevant | Kein Video-Content in Capture |
| Sprachattribut `lang=` korrekt gesetzt | implementiert | i18next setzt `<html lang="{code}">` |

**Offener Punkt:** BITV 2.0-Vollaudit durch externen Spezialisten steht aus (F5). Bis dahin gilt: Best-Effort-Konformität auf Basis interner UI-Review.

---

## §9 Kennzeichnung und Gebrauchsanweisung
*(MDR Anhang II Nr. 9 + MDR Art. 10 + 27 + Anhang I Nr. 23)*

### 9.1 Übersicht und Anforderungsgrundlage

MDR Art. 10 Abs. 8 verpflichtet den Hersteller, die in Anhang I Nr. 23 (Kennzeichnung und Gebrauchsanweisung) genannten Informationen bereitzustellen. Für **reine Software-Produkte ohne physisches Gehäuse** entfallen die physischen Kennzeichnungs-Anforderungen (Etikettierung, Verpackungsaufdruck). Stattdessen gilt:

- Die Kennzeichnungs-Informationen werden **in die Software eingebettet** (Impressum, Hilfe-Seite, „Über"-Seite) oder als **separate IFU-Datei** bereitgestellt
- Die Gebrauchsanweisung (IFU) muss **vor oder beim Inverkehrbringen** verfügbar sein (MDR Art. 27 Abs. 1)
- Für DiggAi Capture als **Klasse-I-Software**: IFU kann elektronisch bereitgestellt werden (IVDR/MDR erlauben E-IFU für nicht-implantierbare Klasse-I-Produkte)

### 9.2 Pflichtangaben nach MDR Anhang I Nr. 23.2 und 23.4 (für Software)

Die folgenden Informationen sind verpflichtend und werden in der IFU (`docs/IFU_DiggAi_Capture_v0.1.docx`, D6) und in der Software-Oberfläche bereitgestellt:

| Nr. | MDR-Anforderung | DiggAi-Capture-Umsetzung | Ort | Status |
|----|----------------|--------------------------|-----|--------|
| 23.2(a) | Hersteller-Name und -Anschrift | DiggAi GmbH (i.Gr.), Hamburg | IFU §1 + Footer | ◼ in IFU v0.1 |
| 23.2(b) | Datum der letzten Überarbeitung | Release-Datum aus `CHANGELOG.md` | Impressum / IFU-Versionstabelle | ◧ CHANGELOG noch nicht formalisiert |
| 23.2(c) | Zweckbestimmung | Vollständig in `docs/INTENDED_USE.md` + IFU §2 | IFU §2 + Hilfe-Seite | ◼ in IFU v0.1 |
| 23.2(d) | Produktbeschreibung und -funktion | IFU §3 + Tech-Doc §1 | IFU §3 | ◼ |
| 23.2(e) | Anwender-Zielgruppe | IFU §4 (Patient, MFA, Arzt) | IFU §4 | ◼ |
| 23.2(f) | Anwendungsumgebung | IFU §5 (Browser-Anforderungen, Betriebssystem) | IFU §5 | ◼ |
| 23.4(a) | Kontraindikationen | Keine (administratives Tool) | IFU §6 | ◼ |
| 23.4(b) | Sicherheitshinweise | „Bei akuten Beschwerden 112 rufen" | IFU §7 + UI-Pflichthinweis | ◼ (BGB §630e-konform) |
| 23.4(c) | Informationen für Patienten | DSGVO-Hinweis Art. 13/14, Einwilligungstext | Consent-Modal + IFU §8 | ◼ |
| 23.4(m) | Notfall-Weiterleitungshinweis | „Im Notfall 112" | In Fragebogen-Flow (C18-Modal) | ◼ |
| 23.2(g) | UDI-DI | Ausstehend (D4 offen) | Footer + IFU Deckblatt | ⬛ |
| 23.2(h) | CE-Kennzeichnung | Ausstehend (nach Class-I-Bestätigung) | Footer | ⬛ |
| 23.2(i) | SRN (Single Registration Number) | Ausstehend (D5, EUDAMED) | IFU Deckblatt | ⬛ |

### 9.3 IFU-Referenz

Die vollständige Gebrauchsanweisung ist als separates Dokument verfasst:

- **Datei:** `docs/IFU_DiggAi_Capture_v0.1.docx` (D6, Lauf 05, commit-Referenz)
- **Version:** v0.1 (Entwurf — noch nicht für Markteinführung freigegeben)
- **Sprachen:** DE (Vollversion) + EN (Summary)
- **Sektionen:** 13 Sektionen (Zweckbestimmung, Anwenderkreis, Kontraindikationen, Tech-Anforderungen, DSGVO, Inbetriebnahme, Schulung, Bedienung, Fehlerbehebung, Sicherheitshinweise, Support, Wartung, Versionshistorie)
- **Freigabe ausstehend:** CK-Review + Medizinrecht-Anwalt (A5)

Die IFU wird bei Markteinführung auf `https://diggai.de/ifu` (elektronisch, E-IFU) und als Download (`/docs/IFU_DiggAi_Capture_current.pdf`) bereitgestellt.

### 9.4 In-Software-Kennzeichnung (UI-Implementierung)

Für Software-Produkte empfiehlt die MDR-Leitlinie MDCG 2021-6 eine **„Über"-Seite** oder **Impressum-Eintrag** mit folgenden Minimalangaben. Diese sind in `src/components/RegulatoryFooter.tsx` (noch zu implementieren) unterzubringen:

```
DiggAi Capture v{version}
Hersteller: DiggAi GmbH (i.Gr.), {Adresse}, Hamburg
UDI-DI: {pending — D4}
CE {pending}   [Regulatorische Klasse I]
Gebrauchsanweisung: https://diggai.de/ifu
Kontakt: support@diggai.de
```

**Versionierungshinweis:** Bei jeder Deployment-Version wird `VITE_APP_VERSION` aus `package.json` (via `import.meta.env.VITE_APP_VERSION`) in den Footer eingeblendet. Damit ist Anhang I Nr. 23.2(b) erfüllt, sobald UDI-DI und CE-Mark vorliegen.

### 9.5 Symbole nach ISO 15223-1

Für die künftige CE-Kennzeichnung relevante Symbole (bei reiner Web-Software minimal):

| Symbol | ISO 15223-1 Nr. | Bedeutung | Anwendung |
|--------|----------------|-----------|-----------|
| `CE` | — | CE-Konformitätszeichen (Annex IX / Art. 20) | Footer nach Zertifizierung |
| `i` | 5.4.3 | „Gebrauchsanweisung beachten" | Link zu IFU in Footer |
| Herstellersymbol | 5.1.1 | Hersteller-Identifikation | IFU Deckblatt |
| Datum-Symbol | 5.1.3 | Herstellungsdatum / Release-Datum | IFU Versionstabelle |
| REF-Symbol | 5.1.6 | Bestellnummer / Artikel-Nr. | IFU Deckblatt (= UDI-DI) |

---

## §11 Kennzeichnung und Verpackung (Software-spezifisch)
*(MDR Anhang I Nr. 23.2 + 23.3)*

Da DiggAi Capture ein reines Software-Produkt ohne physisches Gehäuse oder Verpackung ist, entfallen die Standard-Kennzeichnungsanforderungen für physische Medizinprodukte. Stattdessen gilt die Software-spezifische Minimalanforderung:

### 11.1 In-Software-Pflichtangaben

Die folgenden Informationen müssen **in der laufenden Anwendung** abrufbar sein (MDR Anhang I Nr. 23.2):

| Pflichtangabe | Umsetzungsort | Implementierungsstatus |
|--------------|---------------|----------------------|
| Hersteller-Name + Adresse | Impressum (`/impressum`) | ◼ implementiert (Impressum vorhanden) |
| Produkt-Name + Version | Footer + „Über"-Dialog | ◧ Version aus `package.json`; Footer-Komponente ausstehend |
| Zweckbestimmung (Kurzfassung) | Hilfe-Seite (`/hilfe`) | ◧ vorhanden, noch nicht MDR-formalisiert |
| IFU-Link | Footer | ⬛ `diggai.de/ifu` — wartet auf IFU-Veröffentlichung |
| UDI-DI | Footer + „Über"-Dialog | ⬛ ausstehend (D4) |
| CE-Kennzeichnung | Footer | ⬛ ausstehend (nach Class-I-Bestätigung) |

### 11.2 RegulatoryFooter-Komponente (Implementierungsplan)

Zu erstellen: `src/components/legal/RegulatoryFooter.tsx`

```tsx
// Minimal-Spec — CE + UDI werden nach D4/D5 ergänzt
export function RegulatoryFooter() {
  const version = import.meta.env.VITE_APP_VERSION ?? '3.x';
  return (
    <footer role="contentinfo" aria-label="Regulatorische Informationen">
      <span>DiggAi Capture v{version}</span>
      <span>Hersteller: DiggAi GmbH (i.Gr.), Hamburg</span>
      <a href="/impressum">Impressum</a>
      <a href="/ifu" aria-label="Gebrauchsanweisung (IFU)">IFU</a>
      <a href="/datenschutz">Datenschutz</a>
      {/* CE + UDI-DI: nach D4/D5 ergänzen */}
    </footer>
  );
}
```

### 11.3 Update- und Versionierungs-Hinweise

Bei einem **Major-Version-Update** (v3 → v4) gelten folgende MDR-Pflichten:
- Neue UDI-DI bei GS1 Germany beantragen (D4)
- EUDAMED-Eintrag aktualisieren (D5)
- IFU neu-versionieren und auf `diggai.de/ifu` bereitstellen
- Konformitätserklärung (D7) neu unterzeichnen

Bei **Minor/Patch-Updates**: Kein Pflicht-Update der Regulatorik-Dokumente, sofern die Zweckbestimmung unverändert bleibt. Wesentliche Änderungen (MDR Art. 78) erfordern erneute Bewertung.

---

## Dokumentenhistorie

| Version | Datum | Änderung | Autor |
|---------|-------|----------|-------|
| 0.1 | 2026-05-07 | Erstfassung §1 + §3 + §5 (Inhaltsfüllung) auf Basis Outline v0.1 und Quell-Docs | ENG (Lauf claude-code-06) |
| 0.2 | 2026-05-07 | §7 Usability (Personae, Use-Error-Analyse, Validierungsplan, i18n, BITV) + §9 Kennzeichnung/IFU (Pflichtangaben-Tabelle, In-Software-Kennzeichnung, Symbole) + §11 Software-Kennzeichnung (RegulatoryFooter-Spec) | ENG (Lauf claude-code-08) |

## Nächste Schritte

1. **Anwalts-Review** (A5): Überprüfung der Klassifizierungsbegründung §5.1 durch Medizinrecht-Anwalt (Dierks+Bohle / Reuschlaw)
2. **DSFA-Integration:** Verweis auf `DSFA_DiggAi_Capture_v0.1.md` als §12-Grundlage
3. **UDI-Beantragung** (D4): GS1 Germany Antrag stellen, UDI-DI in §1.1 + §9.2 + §11.1 nachtragen
4. **Pilot-Validierungsplan ausführen** (§3.4.1 V01–V07 + §7.4 UT-01..UT-05 in Klapproth-Praxis)
5. **RegulatoryFooter.tsx implementieren** (§11.2 Spec umsetzen)
6. **BITV-Audit** beauftragen (F5) → Befunde in §7.6 + §7.4 UT-05 eintragen
