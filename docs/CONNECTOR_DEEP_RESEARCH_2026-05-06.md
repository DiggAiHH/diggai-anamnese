# DiggAi — Connector Deep-Research & Maximierungs-Plan

**Stand:** 2026-05-06 · **Branch:** `restructure/phase-1-workspace`
**Verfasser:** Claude (claude-code, opus-4-7) · **Adressaten:** CK (GF), Engineering, Co-Reviewer

---

## 0. Worum geht es

In der aktuellen Cowork-Session hat CK angeordnet, **jeden verfügbaren Connector / Tool / MCP-Server systematisch deep zu recherchieren**, **konkret auf DiggAi zu mappen** und **die wertvollsten zu implementieren**. Dieses Dokument ist die Foundation: es listet alle 22 verfügbaren Connector-Familien, bewertet ihren DiggAi-Use-Case, identifiziert Quick-Wins und legt die Implementierungs-Reihenfolge fest.

**Anker-Constraint:** Die DiggAi-Klassifizierungs-Strategie (Capture = Class I, Suite = Class IIa, siehe `docs/STATUS_PLAN_REGULATORIK_FLIP.md`) ist bindend. Jede Connector-Implementierung wird **explizit gegen den Regulatory Guard** geprüft: nichts darf in Capture klinische Entscheidungs-Sprache, Triage-Output oder Risiko-Score erzeugen. Suite-Side-Implementierungen sind erlaubt, aber bleiben über `DECISION_SUPPORT_ENABLED`-Feature-Flag und Bundle-Audit isoliert.

---

## 1. Connector-Inventar (22 Familien)

| # | Connector / MCP | Familie | DiggAi-Eignung | Priorität |
|---|-----------------|---------|----------------|-----------|
| 1 | **Apify** | Web-Scraping | Hoch — DiGA-Verzeichnis-Monitor, BfArM-Updates, ICD-10-Sync | P1 |
| 2 | **Desktop Commander** | Desktop-Automation | Mittel — Build-Bats, Health-Checks | P3 |
| 3 | **ElevenLabs Agents** | Voice-AI | **Sehr hoch** — Voice-Anamnese (BITV 2.0 / F5), Mehrsprach | P1 |
| 4 | **Figma** | Design-System | Mittel — Capture-vs-Suite-Mockups, IFU-Visuals | P2 |
| 5 | **Kubernetes** | Cluster-Ops | Niedrig — DiggAi läuft auf Fly.io, K8s erst ab Skalierung | P4 |
| 6 | **PDF Tools** (15 Tools) | PDF-Processing | **Sehr hoch** — IFU, Annex II, Konformitätserklärung, Patient-Briefe | P1 |
| 7 | **PopHIVE Public Health** | Daten-API | Mittel — nur Suite-seitig, Epidemiologie-Kontext | P3 |
| 8 | **ToolUniverse** | Bio-Med-Meta | Hoch — nur Suite-seitig, klinische APIs | P2 |
| 9 | **Cowork Artifacts** | Live-Dashboards | Hoch — Status-Dashboard, KPI-Monitor | P1 |
| 10 | **Plugin/Skill-System** | Custom-Skills | Hoch — DiggAi-spezifische Skills (audit-marketing, check-triage-strings) | P2 |
| 11 | **Computer Use (Windows)** | Desktop-Automation | Mittel — Phase-1b-Retry, Build-Trigger | P3 |
| 12 | **Chrome MCP** | Browser-Automation | Hoch — Live-Site-Monitoring, DiGA-Verzeichnis-Crawl | P2 |
| 13 | **WebSearch / WebFetch** | Recherche | Hoch — BfArM/MDCG-Update-Monitor | P1 |
| 14 | **Scheduled Tasks** | Cron-System | **Sehr hoch** — Daily Health-Check, Wöchentliche DiGA-Updates | P1 |
| 15 | **PDF Viewer** | Anzeige | Mittel — IFU-Preview im Cowork-Sidepanel | P3 |
| 16 | **MCP Registry** | Connector-Discovery | Niedrig — Meta-Tool, kein direkter Use-Case | P4 |
| 17 | **Session Info** | Cross-Chat | Hoch — Co-Reviewer-Befunde aus Chat B importieren | P2 |
| 18 | **Skills (docx/pptx/xlsx/pdf)** | Doc-Building | **Sehr hoch** — bereits genutzt, Maximierung möglich | P1 |
| 19 | **Visualize** | SVG/Chart | Hoch — Architektur-Diagramme für Tech-Doc | P2 |
| 20 | **Workspace Bash** | Linux-Sandbox | Mittel — derzeit DOWN, Fallback auf Read/Write/Edit | P3 |
| 21 | **AskUserQuestion** | Clarification | Hoch — strukturierte CK-Entscheidungen | P1 |
| 22 | **TaskList / TodoWrite** | Progress | Hoch — diese Session zeigt es | P1 |

**P1 = sofort implementieren (Quick-Win)** · **P2 = Phase 2** · **P3 = bei Gelegenheit** · **P4 = parken**

---

## 2. Deep-Research je Connector (mit konkreten Patches)

### 2.1 Apify — Web-Scraping & Datenextraktion (P1)

**Was es kann:**
- 4500+ vorgefertigte Actors für Web-Scraping (Google, LinkedIn, Twitter, YouTube, Maps, Amazon, …)
- RAG-Web-Browser für AI-fähigen Crawl mit Markdown-Output
- Custom-Actor-Aufrufe via `call-actor` mit beliebigen Inputs
- Asynchrone Runs mit Output-Polling

**DiggAi-Use-Cases:**
1. **DiGA-Verzeichnis-Monitor** (Wöchentlich, Scheduled) — `https://diga.bfarm.de/` crawlen, neue Listings parsen, in `docs/competitor-monitor/` ablegen. Insight: welche Konkurrenz hat DiGA-Status, welche Versorgungseffekt-Studien laufen.
2. **MDCG-Guidance-Updater** (Monatlich) — `https://health.ec.europa.eu/medical-devices-sector/new-regulations/guidance-mdcg-endorsed-documents-and-other-guidance_en` scrapen, neue MDCG-Versionen erkennen. Wenn MDCG 2019-11 Revision rauskommt → Alert in Run-Log.
3. **ICD-10-WHO-Sync** (Quartalsweise) — `https://icd.who.int/browse10` für aktuelle ICD-10-GM-Codes; Pflege des Question-Catalog.
4. **Pharma-Preis-Watcher** (für späteres Suite-Modul) — Lauer-Taxe / ABDATA Daten ziehen, Therapie-Kosten-Schätzung.
5. **Konkurrenz-Watcher** für CompuGroup, Doctolib, Jameda — Feature-Vergleich, Pricing-Updates.

**Implementierung:** Scheduled Task `monitor-diga-verzeichnis` (siehe §3.1).

**Regulatory-Check:** Apify-Daten dürfen nur in **Suite-Side-Tooling** oder **Strategie-Doku** landen, nicht in Patient-facing-Strings im Capture-Bundle.

---

### 2.2 Desktop Commander — Windows-Automation (P3)

**Was es kann:**
- `start_process` / `interact_with_process` — Long-running Prozesse starten (npm dev, PowerShell)
- `read_file` / `write_file` / `edit_block` — Direkter Filesystem-Zugriff
- `start_search` — Volltextsuche über Repo
- Process-Liste, Force-Terminate, Read-Output

**DiggAi-Use-Cases:**
1. **Phase-1b-Retry** ohne RAM-Limits — fresh boot detect via `list_processes`, dann `npm ci --legacy-peer-deps --ignore-scripts` mit `NODE_OPTIONS=--max-old-space-size=8192` und Verifikation.
2. **Live-Backend-Watch** — `npm run dev:server` starten, Output in Echtzeit auswerten, Fehler in Run-Log.
3. **Bundle-Audit-Watcher** — Bei jedem Build `node scripts/bundle-audit.cjs` triggern, Treffer-Diff zum Vorlauf protokollieren.

**Implementierung:** Optional, niedrige Priorität. Aktuell gibt's `START_DEV_DB.bat` etc. die der User per Doppelklick triggert.

---

### 2.3 ElevenLabs Agents — Voice-AI (P1, **Game-Changer**)

**Was es kann:**
- `create_agent` — Conversational Voice-Agent mit definiertem Prompt + System-Verhalten
- `search_voices` — Library mit deutschen Stimmen (Accessibility-relevant)
- `update_agent` — Iterative Verfeinerung
- Multi-Language-Support (10+ Sprachen, deckt DiggAi i18n)

**DiggAi-Use-Cases — der größte Hebel der ganzen Tool-Liste:**

1. **Voice-Anamnese-Modus für Capture** — adressiert direkt **F5 (BITV 2.0 Barrierefreiheit, DiGA-Voraussetzung)** und **G4/G5 (Klapproth-Pilot)**. Ältere Patienten, sehbehinderte Patienten, Patienten mit motorischen Einschränkungen können Anamnese **per Sprache** machen. UI bleibt visuell als Backup, aber Voice ist primär.
2. **Multi-Language-Voice-Intake** — DiggAi unterstützt schon DE/EN/TR/AR/UK/ES/FA/IT/FR/PL über i18next; ElevenLabs hat passende Stimmen für alle 10. Türkische / Arabische / Farsi-Patienten in Klapproth-Praxis bekommen native Voice-Erfahrung.
3. **Receptionist-Voice-Agent (Suite-Side)** — Telefonische Erstanmeldung: Patient ruft an, Agent erfasst Stammdaten, sendet sie an Empfangs-Dashboard. **Kein Triage-Output** an Patient, nur Datenerfassung — bleibt Class-I-konform.
4. **Voice-Reminder für Termine** — TTS für Termin-Erinnerungen statt Standard-SMS, höhere Compliance bei älteren Patienten.

**Implementierung — Phase-1-Skeleton:**
- `packages/capture/src/voice/voiceCapture.ts` — Voice-Mode-Toggle in `Questionnaire.tsx`, ElevenLabs-Agent-ID aus `.env`
- Agent-Prompt strikt aus `docs/INTENDED_USE.md` Capture-Wortliste (kein „Diagnose", kein „Verdacht", kein „Risiko")
- Audio-Stream über Browser-WebRTC, kein Audio-Speicher (DSGVO)
- Fallback auf Text-Mode bei Fehlern

**Regulatory-Check:** Capture-Voice-Agent darf **nur erfassen**, nicht antworten mit Empfehlung. Promp-Template ist Teil der Tech-Doku (MDR Annex II §6 — Software-Lebenszyklus).

**Aufwand:** 2-3 Tage POC, 1 Woche Production-Ready inkl. DSGVO-Doku.

---

### 2.4 Figma — Design-System (P2)

**Was es kann:**
- `get_design_context` — Strukturierter Zugriff auf Frames, Komponenten, Variables
- `get_screenshot` — Frame-Visuals für Doku
- `get_variable_defs` — Design-Tokens (Spacing, Colors, Typography)
- `get_code_connect_map` / `add_code_connect_map` — Mapping zwischen Figma-Komponenten und Code-Komponenten
- `create_design_system_rules` — Regelwerk für UI-Konsistenz

**DiggAi-Use-Cases:**
1. **IFU-Visuals** (D6) — Screenshots aus Figma direkt in DOCX einbetten, ohne manuelle Browser-Captures.
2. **Capture-vs-Suite-Mockups** — Visuelle Unterscheidung zwischen den zwei Anwendungen (verschiedene Farb-Akzente, Logo-Varianten).
3. **Design-Token-Sync** mit `src/design/tokens.ts` — Single-Source-of-Truth.
4. **Architektur-Diagramme** für MDR Annex II — direkt in Figma als Vector ziehen, dann embed.

**Implementierung:** Voraussetzt einen Figma-File mit DiggAi-Designs. Falls vorhanden: Token-Sync-Script bauen. Wenn nicht: parken.

**Frage an CK:** Existiert ein DiggAi-Figma-File? Wenn ja, URL?

---

### 2.5 Kubernetes — Cluster-Ops (P4)

**Was es kann:**
- Vollständiger kubectl-Zugriff (apply, create, delete, describe, get, logs, rollout, scale)
- Helm-Chart-Install/Upgrade/Uninstall
- Pod-Exec, Port-Forward
- Cluster-Cleanup, Node-Management

**DiggAi-Use-Cases:**
- **Aktuell: kein direkter Use-Case.** DiggAi läuft auf Fly.io (1 Machine, shared-cpu-1x, 512MB) + Neon-Postgres + Netlify-Frontend. K8s wäre Overengineering.
- **Skalierungs-Szenario** (>100 Praxen, >10k DAU): Migration auf Hetzner-Cloud-K8s oder STACKIT (DSGVO-konformer Hyperscaler) — dann Helm-Charts, Multi-Region-Deploy, Auto-Scaling.
- **DiGA-Voraussetzung:** §5 DiGAV verlangt skalierbare, verfügbare Architektur. K8s wäre ein Argument für Belastbarkeits-Nachweis im DiGA-Antrag.

**Implementierung:** Parken bis Skalierungs-Bedarf. Vorbereitung als Helm-Chart-Skeleton wäre aber 1-Tages-Aufwand und gut für DiGA-Antrag-Visualisierung.

---

### 2.6 PDF Tools — Document Processing (P1, sehr breite Tool-Familie)

**Was es kann (15 Tools):**
- `display_pdf` / `read_pdf_content` / `read_pdf_fields` — Lesen, Anzeigen
- `fill_pdf` / `bulk_fill_from_csv` / `fill_with_profile` / `save_profile` / `load_profile` — Form-Fill
- `extract_to_csv` — Tabellen-Extraktion
- `merge_pdfs` / `split_pdf` — Composition
- `reorder_pdf_pages` / `rotate_pdf_pages` / `apply_page_plan` — Page-Management
- `get_page_analysis` / `get_pdf_info` / `validate_pdf` — Inspection
- `list_profiles` / `list_pdfs` — Verwaltung

**DiggAi-Use-Cases:**

1. **D6 — IFU für Capture als PDF** mit Form-Fields für Praxis-Variablen (Praxisname, Anschrift, MDR-Status). `bulk_fill_from_csv`: 1 IFU pro Praxis-Tenant aus einer CSV erzeugen.
2. **D7 — Konformitätserklärung Anhang IV** als Template-PDF mit Signatur-Feld; `fill_pdf` für jede Version.
3. **Patienten-Brief-Generator** (Capture-Side erlaubt, da rein administrativ) — Anmeldebestätigung, Termin-Brief, DSGVO-Einverständniserklärung als PDF aus Template.
4. **Arzt-Befundbrief-Renderer** (Suite-Side) — strukturierte Zusammenfassung der Anamnese als PDF, signiert mit Praxis-Briefkopf.
5. **DSFA-Template-Filler** (C4) — Datenschutz-Folgenabschätzung als PDF-Form, gemeinsam mit DPO ausgefüllt.
6. **Annex-II-Tech-Doc-Komposition** — bestehende DOCX → PDF konvertieren, dann `merge_pdfs` für Gesamt-Tech-Doc-Bundle.

**Implementierung:**
- Quick-Win: PDF-Generator-Service in `server/services/pdf/` mit Templates für Anmeldebestätigung, DSGVO, Befundbrief.
- Dependency: `pdf-lib` (bereits compatible) + Templates in `templates/pdf/`.
- Aufwand: 2 Tage für Anmeldebestätigung-Template + Service + API-Endpoint + React-Hook.

**Regulatory-Check:** Capture-PDFs dürfen keine klinischen Aussagen, Diagnose-Vermutungen oder Triage-Empfehlungen enthalten. Nur administrative Inhalte (Termin, Stammdaten, DSGVO-Konsent).

---

### 2.7 PopHIVE Public Health Data (P3)

**Was es kann:**
- `search_health_data` / `get_available_datasets` — Public-Health-Datenbank-Zugriff
- `compare_states` / `filter_data` — US-State-Vergleich
- `time_series_analysis` — Trends über Zeit

**DiggAi-Use-Cases:**
- **Kein direkter Use-Case für Capture** (das wäre klinischer Kontext = MDSW).
- **Suite-Side Möglichkeit:** Epidemiologische Hintergrund-Daten für Therapieplan-KI (z. B. Influenza-Wellen-Erkennung). Aber: PopHIVE ist US-fokussiert (HHS-Daten), nicht EU. Für DiggAi vorrangig nutzlos.
- **Forschungs-/PR-Use-Case:** Vergleich „Praxis-Ressourcen-Bedarf USA vs. EU" als Marketing-Asset.

**Implementierung:** Parken. Wenn DiggAi später nach UK/USA expandiert, neu evaluieren.

---

### 2.8 ToolUniverse — Bio-Med-Meta-API (P2)

**Was es kann:**
- `find_tools` / `list_tools` / `get_tool_info` — Discovery über 300+ biomedizinische APIs
- `execute_tool` — Direkter Aufruf jedes ToolUniverse-Tools
- `grep_tools` — Filter nach Keywords

**DiggAi-Use-Cases (alle Suite-Side, mit `DECISION_SUPPORT_ENABLED=true`):**
1. **Drug-Drug-Interaction-Checker** (DrugBank, OpenFDA) — vor Therapieplan-Vorschlag.
2. **PubMed-Literature-Sync** für CER-Lite (D3) — relevante Literatur zu Anamnese-Software für Klinische Bewertung.
3. **ICD-10-Code-Lookup mit kontextueller Hilfe** — Suite-MFA-Tool.
4. **OMIM/Orphanet** für seltene Erkrankungen — Suite-Triage-Engine-Erweiterung.

**Implementierung:** Erst nach Phase 4 (Bucket-A nach `packages/suite/`). Danach 1 Quick-Win pro Sprint.

**Regulatory-Check:** Diese Tools sind **explizit Class-IIa-Trigger** — gehören NIE in Capture. ESLint-Guard `no-restricted-imports` muss das verhindern. Bundle-Audit muss `pubmed`, `drugbank`, `interaction` zu verbotenen Strings im Capture-Bundle hinzufügen.

---

### 2.9 Cowork Artifacts — Live-Dashboards (P1)

**Was es kann:**
- `create_artifact` — Persistente HTML-Page mit Cowork-Sidebar-Rendering
- `update_artifact` — Inkrementelle Aktualisierung
- `list_artifacts` — Inventar
- Inside: `window.cowork.callMcpTool()`, `window.cowork.askClaude()`, `window.cowork.runScheduledTask()`
- CDN: Chart.js, Grid.js, Mermaid (nur diese drei)
- localStorage erlaubt für UI-State

**DiggAi-Use-Cases:**
1. **Status-Dashboard** — Live-Ansicht: Frontend/Backend/DB-Health, Open-Items-Counter, Bundle-Audit-Treffer, Phase-Progress.
2. **Open-Items-Tracker** als interaktive Sortier-Filter-Tabelle (Grid.js).
3. **MDR-Tech-Doc-Progress** — Mermaid-Gantt mit den 7 D-Items.
4. **Compliance-Heatmap** — Welche der 47 Tracker-Items hängen an welchen Block-Effekten?
5. **Connector-Coverage-Dashboard** — dieses Dokument als interaktive Version, mit Status pro Connector.

**Implementierung:** Quick-Win. 2-3 Stunden für ein Dashboard mit Mermaid-Roadmap + Grid.js-Tracker + Chart.js-Phase-Progress.

---

### 2.10 Plugin / Skill-System (P2)

**Was es kann:**
- `list_plugins` / `search_plugins` / `suggest_plugin_install` — Marketplace
- `list_skills` — Installierte Skills
- Eigene Skills bauen via `skill-creator`

**DiggAi-Use-Cases — Custom-Skill-Ideen:**
1. **`audit-marketing-copy`** — Skill der Marketing-Texte gegen Capture-Verbots-Wortliste prüft (siehe Regulatory Guard in `CLAUDE.md`).
2. **`check-triage-strings`** — Audit über UI-Strings + Bundle nach 22 verbotenen Strings.
3. **`generate-ifu-from-template`** — Skill der aus Praxis-Daten + IFU-Master ein Praxis-spezifisches IFU-PDF baut.
4. **`monitor-diga-verzeichnis`** — Wöchentlicher DiGA-Listings-Crawl.
5. **`update-tech-doc`** — Macht Annex-II-Outline-Inkrement (z. B. „füge alle Phase-3-Migration-Outputs als §6.2 ein").

**Implementierung:** 1 Skill pro Woche. Erstes: `check-triage-strings` (greift auf bestehendes `bundle-audit.cjs` zurück).

---

### 2.11 Computer Use (Windows) (P3)

**Was es kann:**
- Direkter Desktop-Zugriff: Maus, Keyboard, Screenshots
- App-Allowlist via `request_access`
- Tier-System (browser=read, terminal=click, others=full)

**DiggAi-Use-Cases:**
1. **Phase-1b-Retry-Automation** — Notepad / Eingabeaufforderung öffnen, `npm ci` triggern, Output prüfen.
2. **Manual-Browser-Test** für Live-Site (aber: Chrome-Tab ist read-only, nur Screenshot möglich, Klicken über Chrome-MCP).
3. **Drag-Drop-File-Operations** für Tech-Doc-Bündelung.

**Implementierung:** Bei Bedarf. Aktuell hat User die `.bat`-Files für lokale Aufgaben.

---

### 2.12 Chrome MCP (P2)

**Was es kann:**
- `navigate` / `find` / `read_page` / `get_page_text` — DOM-Zugriff
- `computer` (mit Tab-ID) — Klicken, Tippen
- `javascript_tool` — JS in Page-Context ausführen
- `read_console_messages` / `read_network_requests` — Debugging
- `gif_creator` — Demo-GIFs für Marketing
- `shortcuts_execute` / `shortcuts_list` — Workflow-Automation

**DiggAi-Use-Cases:**
1. **Live-Site-Smoke-Test** — Nach jedem Deploy: navigate diggai.de → check Bundle-URL contains `diggai-api.fly.dev` → screenshot. Catches Regressions like Lauf-07.
2. **DiGA-Verzeichnis-Crawler** — Parsen der `diga.bfarm.de` Liste (Apify-Alternative für Public-Pages).
3. **Marketing-GIF-Maker** — Demo-Videos der Capture-Anmeldung für Website.
4. **Console-Error-Watcher** — Nach Deploy Console auf Errors prüfen, Auto-Issue im Tracker.

**Implementierung:** `tools/smoke-test-chrome.mjs` — JS-Skript das mit Chrome-MCP arbeitet. Run nach jedem `npm run deploy`.

---

### 2.13 WebSearch / WebFetch (P1, Basistool)

**Was es kann:**
- WebSearch — Google/DuckDuckGo-Search mit Domain-Filter
- WebFetch — URL-Inhalt fetchen (eingeschränkt durch Allowlist)

**DiggAi-Use-Cases:**
1. **BfArM-Update-Watcher** — Wöchentlich `bfarm.de` für DiGA-Verzeichnis-Änderungen.
2. **MDCG-Revision-Tracker** — `health.ec.europa.eu/medical-devices` für neue MDCG-Versionen.
3. **gematik-TI-Updates** für KIM/FHIR (F4) — `gematik.de` für API-Spec-Änderungen.
4. **Notified-Body-Verzeichnis-Check** — TÜV SÜD / DEKRA für Verfügbarkeit (Suite-Cert).
5. **Konkurrenz-Monitoring** — Doctolib, CompuGroup News.

**Implementierung:** Scheduled Task `weekly-regulatory-update` (siehe §3.1).

---

### 2.14 Scheduled Tasks (P1, **Hebel-Multiplikator**)

**Was es kann:**
- `create_scheduled_task` — Cron oder One-Shot
- `list_scheduled_tasks` / `update_scheduled_task` — Verwaltung
- Lokal-Zeit-aware Cron (kein UTC-Footgun)
- Notifications bei Completion

**DiggAi-Use-Cases — der Königs-Connector für Operations:**

1. **`monitor-diga-verzeichnis`** — Wöchentlich Mo 09:00 — DiGA-BfArM-Listings + neue Apps crawlen + Diff in Run-Log.
2. **`weekly-regulatory-update`** — Wöchentlich Mo 09:30 — BfArM/MDCG/gematik-Updates fetchen + Summary in Run-Log.
3. **`daily-health-check`** — Täglich 08:00 — Frontend / Backend / DB-Health-Endpoints prüfen + Alert wenn != 200.
4. **`bundle-audit-quarterly`** — Quartalsweise (1. des Quartals 10:00) — `node scripts/bundle-audit.cjs --strict` gegen Capture-Bundle laufen lassen + Treffer-Diff.
5. **`netlify-token-rotation-reminder`** — Monatlich 1. um 09:00 — Reminder im Run-Log: Token älter als 30 Tage?
6. **`open-items-progress-snapshot`** — Wöchentlich Fr 17:00 — Snapshot der 47 Items + Status-Score, in `memory/runs/`.

**Implementierung:** Sofort. 6 Scheduled Tasks à 5-10 Min Setup-Zeit = halber Tag Arbeit.

---

### 2.15 PDF Viewer (P3)

**Was es kann:**
- `display_pdf` — PDF im Cowork-Sidebar anzeigen
- `interact` — Form-Fields, Page-Navigation
- `list_pdfs` — Inventar

**DiggAi-Use-Cases:**
1. **IFU-Preview** im Cowork während Doc-Bauen.
2. **Annex-II-Inspektion** — schneller als externes PDF-Tool öffnen.
3. **Patienten-Brief-Vorschau** vor PDF-Versand.

**Implementierung:** Nutzen wenn PDFs gebaut sind. Kein dediziertes Setup.

---

### 2.16 MCP Registry (P4)

**Was es kann:**
- `search_mcp_registry` — Welche neuen MCPs gibt es?
- `list_connectors` — Was ist installiert?
- `suggest_connectors` — UI-Card für CK

**DiggAi-Use-Cases:**
1. **Vermisste Connectors finden:**
   - Slack/Discord für Team-Coordination?
   - Linear/Jira für Issue-Tracking (statt Markdown-Tracker)?
   - Sentry für Error-Monitoring?
   - Stripe für Billing (wenn H3 aktiviert)?
   - Salesforce/HubSpot für CRM (Marketing G-Items)?

**Implementierung:** Single-Shot-Recherche. Wenn relevant → suggest_connectors-Card an CK.

---

### 2.17 Session Info (P2)

**Was es kann:**
- `list_sessions` — Andere offene/letzte Sessions
- `read_transcript` — Full-Transcript einer Session

**DiggAi-Use-Cases:**
1. **Co-Reviewer-Befunde** — Wenn CK Co-Reviewer in Chat B aktiviert (A6), dessen Befunde via `read_transcript` importieren und in den Tracker einbauen.
2. **Cross-Agent-Sync** — Wenn Copilot/Codex parallel arbeiten, deren Output sehen.

**Implementierung:** Sobald Co-Reviewer aktiv ist, dessen Session lesen, Konsolidierung in Run-Log.

---

### 2.18 Skills: docx / pptx / xlsx / pdf (P1, **schon im Einsatz**)

**Was sie können (kondensiert):**
- **docx** — Word-Dokumente bauen mit docx-js, Tabellen, Bilder, Headers/Footers, TOC
- **pptx** — PowerPoint-Decks via python-pptx, Slide-Layouts, Charts
- **xlsx** — Excel-Files via openpyxl, Formeln, Charts, Conditional-Format
- **pdf** — PDF-Generation via pypdf/reportlab, Form-Fill, OCR

**DiggAi-Use-Cases (Maximierung):**
1. **docx**: alle 6 strategischen Dokumente sind schon damit. **Maximierung:** automatische Versionierung mit `Co-Reviewer-Konsistenz-Pruefliste.md` als Sub-Skill.
2. **xlsx**: **NEU einsetzen** — Open-Items-Tracker als XLSX mit Filter, conditional-format auf Status-Spalte, Pivot-Table nach Owner. Für CK auf dem Handy/Tablet in Excel besser zu lesen als Markdown.
3. **pptx**: **NEU einsetzen** — BfArM-Pitch-Deck (10-15 Slides) als Vorbereitung für die Sprechstunde A4. „Was ist DiggAi-Capture, warum Klasse I, was ist die Trennung zu Suite". Anwalt + BfArM-Kontakt bekommen das Deck als Visual-Anker.
4. **pdf**: bereits Skill geladen, aber nicht genutzt für IFU/Konformitätserklärung — siehe §2.6.

**Implementierung:** Sofort.
- **xlsx** — `tools/build-tracker-xlsx.cjs` — DiggAi-Open-Items-Tracker.xlsx mit Filter/Pivot.
- **pptx** — `DiggAi-BfArM-Sprechstunde-Deck.pptx` — 12 Slides für CK.

---

### 2.19 Visualize (SVG + HTML) (P2)

**Was es kann:**
- `show_widget` — Inline-Rendering von SVG/HTML in der Konversation
- `read_me` — Lädt module-spezifische Best-Practices (diagram, chart, art, …)

**DiggAi-Use-Cases:**
1. **Architektur-Diagramme** — Capture-vs-Suite vertikale Firewall (existiert schon in PNG). SVG-Variante für Tech-Doc.
2. **Klassifizierungs-Decision-Tree** als SVG (MDCG 2019-11 §3.5).
3. **Phase-Roadmap-Gantt** als interaktives SVG.
4. **Feature-Flag-Schema** als Dataflow-Diagram.

**Implementierung:** On-Demand wenn Tech-Doc-Visuals gebraucht werden.

---

### 2.20 Workspace Bash + Web Fetch (P3, derzeit DOWN)

**Was es kann:**
- Linux-Sandbox mit npm/pip/git
- Allowlisted Web-Fetch

**DiggAi-Use-Cases:**
- `npm run build` / `npm test` / `npx prisma migrate` — alle CI-Steps
- `git diff` für Phase-Migrations
- `pip install fhirclient` für FHIR-Tooling (F4)

**Implementierung:** Sobald Workspace wieder da ist. Aktuell Fallback auf Read/Write/Edit + User-Bats.

---

### 2.21 AskUserQuestion (P1, **Process-Tool**)

**Was es kann:**
- 1-4 Fragen mit 2-4 Optionen, Multi-Select möglich
- Annotations / Notes
- Strukturierte Entscheidungen statt Chat-Frage

**DiggAi-Use-Cases:**
1. **Strategie-Entscheidungen** für CK — Recommended für jeden komplexen Step (siehe diese Session).
2. **Connector-Konfigurations-Choices** — Welche Voice für ElevenLabs? Welche Cron-Frequenz?
3. **Tech-Doc-Template-Choices** — Welche Annex-II-Sektion zuerst?

**Implementierung:** Bereits im Einsatz. Maximierung = bei jedem Multi-Step-Task am Anfang nutzen.

---

### 2.22 TaskList / TaskCreate / TaskUpdate (P1, **Process-Tool**)

**Was es kann:**
- 8 Sub-Tools (List/Get/Create/Update/Stop)
- Owner, Blocks, BlockedBy, Status (pending / in_progress / completed)
- Renderbar als Cowork-Widget

**DiggAi-Use-Cases:**
1. **Diese Session zeigt es** — 8 Tasks, in_progress-Tracking, Done-Markierung.
2. **Long-Running Phases** — Phase 2 = 6 Sub-Tasks mit Dependencies.
3. **CK-Pareto-3-Tracking** — A1, A4, A5 als Tasks mit Owner=CK, Reminder-Notifications.

**Implementierung:** Per Session 1× am Anfang aufsetzen, mid-Session aktualisieren.

---

## 3. Quick-Win-Implementierungs-Plan

### 3.1 Sechs Scheduled Tasks (heute aufzusetzen, 30 Min)

```javascript
// 1. monitor-diga-verzeichnis (Mo 09:00 wöchentlich)
// 2. weekly-regulatory-update (Mo 09:30 wöchentlich)
// 3. daily-health-check (täglich 08:00)
// 4. bundle-audit-quarterly (1. des Quartals 10:00)
// 5. netlify-token-rotation-reminder (1. des Monats 09:00)
// 6. open-items-progress-snapshot (Fr 17:00 wöchentlich)
```

Diese 6 Tasks erzeugen je einen automatischen Run-Log-Eintrag und halten Memory ohne Mensch-Aufwand frisch.

### 3.2 Fünf Code-Änderungen (1-2 Tage Engineering)

| # | Datei | Was | Connector | Block-Effekt |
|---|-------|-----|-----------|--------------|
| 1 | `scripts/connector-monitor.cjs` | Master-Skript für die 6 Scheduled-Tasks (zentralisiert) | Apify + WebFetch | Operations |
| 2 | `server/services/pdf/anmeldebestaetigung.ts` | PDF-Generator für Capture-Anmeldebrief | PDF Tools | D6 (IFU-Vorstufe) |
| 3 | `server/services/voice/elevenlabsAgent.ts` (Skeleton) | ElevenLabs-Agent-Wrapper für Voice-Anamnese | ElevenLabs | F5 (BITV) |
| 4 | `scripts/build-tracker-xlsx.cjs` | XLSX-Build des Open-Items-Trackers | xlsx Skill | CK-Mobilität |
| 5 | `tools/smoke-test-chrome.mjs` | Post-Deploy-Smoke-Test | Chrome MCP | Regression-Prevention |

### 3.3 Drei neue Dokumente

| # | Datei | Connector | Zweck |
|---|-------|-----------|-------|
| 1 | `DiggAi-BfArM-Sprechstunde-Deck.pptx` | pptx Skill | A4 — CK präsentiert vor BfArM |
| 2 | `DiggAi-Open-Items-Tracker.xlsx` | xlsx Skill | Filter/Pivot-fähige Tracker-Version |
| 3 | `DiggAi-Connector-Strategie-2026-05-06.docx` | docx Skill | Konsolidierte Strategie + Konnektoren |

### 3.4 Live-Artifact

| # | Artifact | Connector | Zweck |
|---|---------|-----------|-------|
| 1 | `diggai-status-dashboard` | Cowork Artifact + Mermaid + Grid.js | Persistent KPI-Monitor |

---

## 4. Reihenfolge & Aufwand

| Phase | Item | Aufwand | Reihenfolge |
|-------|------|---------|-------------|
| **Heute (jetzt in dieser Session)** | Connector-Strategie-Doc (DOCX) | 30 Min | 1 |
| Heute | XLSX-Tracker-Build | 20 Min | 2 |
| Heute | PPTX-BfArM-Deck-Skeleton | 30 Min | 3 |
| Heute | 6 Scheduled-Tasks aufsetzen | 30 Min | 4 |
| Heute | Status-Dashboard-Artifact | 30 Min | 5 |
| Heute | Anmeldebestätigung-PDF-Service-Skeleton | 30 Min | 6 |
| Heute | Run-Log-Eintrag | 5 Min | 7 |
| **Diese Woche** | ElevenLabs-Voice-POC | 2-3 Tage | nach Heute |
| Diese Woche | smoke-test-chrome.mjs | 4 h | nach Voice |
| Diese Woche | Custom-Skill `check-triage-strings` | 1 Tag | nach smoke |
| **Nächste Woche** | Phase 1b retry (auf Maschine mit RAM) | 4 h (mit Glück) | parallel |
| Nächste Woche | DSFA-Template-PDF-Filler | 1 Tag | parallel |
| Nächste Woche | Co-Reviewer-Session-Reading | 1 h | nach CK aktiviert |

**Heute-Stunden-Summe:** ~3-4 h Claude-Arbeit, 0 h CK-Wartezeit.
**Diese-Woche-Summe:** +2-3 Tage Claude/Engineering.

---

## 5. Was diese Connector-Strategie zur DiggAi-Reklassifizierung beiträgt

Die Connector-Maximierung ist **kein eigenständiger Strang** — sie verstärkt den **bestehenden Class-IIa→Class-I-Flip**:

1. **Voice-Anamnese (ElevenLabs)** → adressiert **F5 (BITV 2.0)** als DiGA-Voraussetzung; macht Capture **inklusiver** und damit für Versorgungseffekt-Studie attraktiver.
2. **PDF-Tools** → liefert **D6 (IFU)** und **D7 (Konformitätserklärung)** als automatisierte Outputs statt Manual-Word-Building.
3. **Scheduled Tasks** → operationalisiert die **Compliance-Verifikation (I1-I5)**: jährliche Reviews werden automatisierte Reminders.
4. **Cowork Artifact** → ersetzt Status-Mails; CK + Anwalt + BfArM-Sprechstunde haben **Single-Source-of-Truth**.
5. **Apify + WebFetch** → frühzeitige Erkennung von **MDCG/MDR-Revisionen** (Risiko: BfArM ändert MDSW-Decision-Tree); Vorlauf für Anpassung der drei Strategie-Docs.
6. **xlsx-Tracker** → CK kann **mobil im Praxis-Alltag** Status checken statt Markdown auf Laptop zu lesen.

**Kernformel:** Jeder Connector, der eingesetzt wird, **reduziert manuelle Compliance-Arbeit** und **erhöht Audit-Traceability**. Beides ist DiGA-Voraussetzung (§§4-7 DiGAV) und MDR-Voraussetzung (Annex IX §4 — QM-System).

---

## 6. Was bewusst nicht in der Connector-Strategie ist

- **Suite-Side-Connectors (ToolUniverse, PopHIVE)** — werden erst in Phase 4 nach dem `packages/suite/` Move aktiviert. Vorher kein Risiko, dass sie versehentlich in Capture leaken.
- **Stripe / Billing** — wartet auf H3, nach DiGA-Erstattungs-Klärung.
- **Slack / Discord für Team** — kein Use-Case, solange Team = CK + Engineering-Agent.
- **Sentry / Error-Monitoring** — wird in Phase 5 als Suite-only-Tool aktiviert.

---

## 7. Update-Reihenfolge des Trackers

Wenn Items aus dieser Strategie umgesetzt werden, in `DiggAi-Open-Items-Tracker.md` aktualisieren:

- A6 (Co-Reviewer aktivieren) → bekommt einen neuen Sub-Task „Session-Reading via mcp__session_info__read_transcript"
- B6 (Bundle-Analyzer-CI) → wird zur Scheduled Task `bundle-audit-quarterly`
- D6 (IFU schreiben) → bekommt PDF-Generator-Service als Tool
- F5 (BITV) → bekommt ElevenLabs-Voice-POC als Erfüllung
- I1-I5 (Compliance laufend) → werden Scheduled Tasks

Ein neuer Tracker-Block **J. Connector-Operations** wird ergänzt:

```
J1 — 6 Scheduled Tasks aktiv und protokollierend
J2 — ElevenLabs Voice-POC in Capture
J3 — PDF-Generator für Anmeldebestätigung produktiv
J4 — Status-Dashboard-Artifact persistent
J5 — XLSX-Tracker für CK mobil
J6 — Custom-Skill check-triage-strings
J7 — smoke-test-chrome nach jedem Deploy
```

---

## 8. Quellen

- MDCG 2019-11 — Software Qualifikation/Klassifizierung
- DiGAV §§4-7 — Voraussetzungen DiGA
- BSI TR-03161 — Sicherheitsanforderungen DiGA
- ISO 14971:2019 — Risikomanagement
- IEC 62304:2006+A1:2015 — Software-Lebenszyklus
- BITV 2.0 — Barrierefreie Informationstechnik
- DiggAi `docs/STATUS_PLAN_REGULATORIK_FLIP.md` (2026-05-06)
- DiggAi `DiggAi-Open-Items-Tracker.md` (47 Items)

---

**Nächster Schritt:** Implementierung in der Reihenfolge §4. Beginnt mit DOCX, dann XLSX, dann Scheduled Tasks, dann Artifact, dann Code-Skeletons.
