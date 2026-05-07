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

## Dokumentenhistorie

| Version | Datum | Änderung | Autor |
|---------|-------|----------|-------|
| 0.1 | 2026-05-07 | Erstfassung §1 + §3 + §5 (Inhaltsfüllung) auf Basis Outline v0.1 und Quell-Docs | ENG (Lauf claude-code-06) |

## Nächste Schritte

1. **Anwalts-Review** (A5): Überprüfung der Klassifizierungsbegründung §5.1 durch Medizinrecht-Anwalt (Dierks+Bohle / Reuschlaw)
2. **§7 Usability + §9 Labeling** füllen (nächster D2-Lauf)
3. **DSFA-Integration:** Verweis auf `DSFA_DiggAi_Capture_v0.1.md` als §12-Grundlage
4. **UDI-Beantragung** (D4): GS1 Germany Antrag stellen, UDI-DI in §1.1 nachtragen
5. **Pilot-Validierungsplan** ausführen (§3.4.1 V01–V07)
