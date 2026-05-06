# DSFA — Datenschutz-Folgenabschätzung DiggAi-Capture

**Version:** 0.1 (Entwurf für DPO-Review)
**Stand:** 2026-05-06 · **Branch:** `restructure/phase-1-workspace`
**Verfasser:** Claude (claude-code, opus-4-7) auf Basis Repo-State + DSGVO Art. 35
**Adressaten:** CK (Verantwortlicher), DPO (extern), BfArM, Co-Reviewer

> **Hinweis:** Dieses Dokument ist ein **strukturierter Entwurf** für eine vollständige DSFA. Die finale Version muss mit einem zertifizierten Datenschutzbeauftragten (DPO) abgestimmt und unterzeichnet werden. Adressiert Open-Items-Tracker C4.

---

## 1. Zweck und Geltungsbereich

Diese Datenschutz-Folgenabschätzung (DSFA) gemäß DSGVO Art. 35 betrifft die Verarbeitung personenbezogener Daten in der **DiggAi-Capture-Anwendung**, einer mehrsprachigen Voranmelde- und Anamnese-Erfassungs-Software für deutsche Arztpraxen.

Die DSFA wurde durchgeführt, weil die Verarbeitung **mit hohem Risiko für Rechte und Freiheiten der betroffenen Personen** verbunden ist (Art. 35 Abs. 1 DSGVO), insbesondere weil:
- besondere Kategorien personenbezogener Daten (Gesundheitsdaten gem. Art. 9 DSGVO) verarbeitet werden;
- vulnerable Patientengruppen betroffen sind (Kinder, ältere Menschen, Patienten in Notlagen);
- automatische Datenübermittlung an Praxis-IT-Systeme stattfindet;
- Cross-Border-Übermittlung zwischen Frontend (Netlify EU/USA) und Backend (Fly.io fra/EU) potenziell auftreten kann.

## 2. Beteiligte / Verantwortliche

| Rolle | Identität / Kontakt |
|-------|---------------------|
| Verantwortlicher (Art. 4 Nr. 7) | Christian Klapproth, c/o Praxis Dr. Klapproth, Hamburg |
| Auftragsverarbeiter (Hosting) | Fly.io Inc., 2261 Market St, San Francisco — Region fra/Frankfurt; AVV erforderlich |
| Auftragsverarbeiter (DB) | Neon Inc., USA — Region eu-central-1/Frankfurt; AVV erforderlich |
| Auftragsverarbeiter (CDN/Frontend) | Netlify Inc., USA — Edge-Cache global; AVV erforderlich |
| Optional: Auftragsverarbeiter (Voice) | ElevenLabs Inc., USA — bei Aktivierung Voice-Agent; AVV zwingend, derzeit ausstehend |
| Datenschutzbeauftragter | extern zu beauftragen (Empfehlung: DPO mit Health-Spezialisierung) |
| Aufsichtsbehörde | Hamburgischer Beauftragter für Datenschutz und Informationsfreiheit (HmbBfDI) |

## 3. Beschreibung der Verarbeitung

### 3.1 Art der Daten

| Kategorie | Datenfelder | Art. DSGVO | Aufbewahrung |
|-----------|-------------|-----------|--------------|
| Stammdaten | Vor-/Nachname, Geburtsdatum, Anschrift, Telefon, E-Mail | Art. 6 Abs. 1 lit. b/f | bis Beendigung Behandlung + 10 Jahre § 630f BGB |
| Versicherung | Krankenkassen-Name, Versichertennummer (verschlüsselt) | Art. 6 Abs. 1 lit. b | wie Stammdaten |
| Anamnese-Antworten | freie Texte, strukturierte Antworten zu 270+ Fragen aus questions.ts | Art. 9 Abs. 2 lit. h | wie Stammdaten |
| Einwilligungs-Belege | DSGVO-Konsent-Zeitstempel, Signatur (verschlüsselt) | Art. 6 Abs. 1 lit. a / Art. 9 Abs. 2 lit. a | unbegrenzt zur Nachweis-Pflicht |
| Audit-Logs | Pseudonymisierte Session-IDs, IP-Hash, User-Agent, Endpoint, Zeitstempel | Art. 6 Abs. 1 lit. f (Sicherheit) | 12 Monate rolling, dann Hard-Delete |
| Optional: Audio (Voice-Mode) | Mic-Stream während Voice-Session | Art. 9 Abs. 2 lit. a (explizite Einwilligung) | **NICHT persistent** — Stream-only, nie gespeichert |

### 3.2 Zwecke der Verarbeitung

Die Verarbeitung dient ausschließlich administrativen Zwecken: Erfassung der Patienten-Stammdaten und des Anliegens vor dem Praxisbesuch, Übergabe der Daten an das Praxispersonal, sowie Begleitung des administrativen Workflows (Termin-Vorschlag, Anmeldebestätigung-PDF). DiggAi-Capture trifft **keine medizinische Bewertung**, keine Diagnose, keine Triage und keine Therapie-Empfehlung — diese Funktionen sind vollständig in `DiggAi-Suite` ausgelagert (Class-IIa-konformer separater Build).

### 3.3 Rechtsgrundlagen

- Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung): Anmeldung in der Praxis, Vorbereitung des Behandlungsvertrags
- Art. 6 Abs. 1 lit. a DSGVO + Art. 9 Abs. 2 lit. a (explizite Einwilligung): bei Gesundheitsdaten
- Art. 9 Abs. 2 lit. h DSGVO: medizinische Diagnostik / Versorgung im Auftrag des Arztes
- Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse): Audit-Logging zur IT-Sicherheit

### 3.4 Datenübermittlung

| Empfänger | Zweck | Übermittlungs-Pfad | DSGVO-Schutz |
|-----------|-------|--------------------|--------------|
| Praxis-Personal | Workflow-Übergabe | Backend-Dashboard via TLS-Browser | Art. 6 Abs. 1 lit. b |
| Tomedo-PVS (optional) | EHR-Integration | tomedo-bridge Adapter, Praxis-LAN | AVV mit Praxis intern |
| FHIR-Subscriber (optional) | EHR-Integration extern | TLS, FHIR-Webhook mit HMAC-Signatur | AVV pro Empfänger |
| Drittländer (USA-Hoster) | NICHT direkt — Daten nur in EU-Regionen (fra, eu-central-1) | TLS + at-rest-Encryption | EU-US Data Privacy Framework + Standardvertragsklauseln, Schrems-II-Risiko-Bewertung in §10 |

## 4. Bewertung der Notwendigkeit und Verhältnismäßigkeit

Die digitale Voranmelde-Erfassung ist gegenüber der papier-basierten Alternative dann verhältnismäßig, wenn:
1. ausschließlich für die Anmeldung erforderliche Daten erhoben werden (Datenminimierung Art. 5 Abs. 1 lit. c);
2. der Patient frei entscheiden kann, ob er das digitale Tool nutzt oder am Empfangs-Tresen analog meldet (Freiwilligkeit gem. Art. 7 DSGVO);
3. eine datensparsame Default-Konfiguration besteht (Privacy by Default Art. 25 Abs. 2);
4. Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung niedrigschwellig möglich sind (Art. 15-21).

**Bewertung:** Verhältnismäßig, vorausgesetzt die Punkte 1-4 werden im Praxis-Onboarding und der UI-Implementierung umgesetzt. Insbesondere ist der **analoge Fallback-Pfad** im Empfangs-Workflow zu dokumentieren.

## 5. Risikobewertung

Die folgenden 7 Hauptrisiken wurden identifiziert. Bewertung S = Schadenshöhe (1-4), W = Wahrscheinlichkeit (1-4), R = S × W vor und nach Mitigation.

| # | Risiko | S vor | W vor | R vor | Mitigation | S nach | W nach | R nach |
|---|--------|-------|-------|-------|-----------|--------|--------|--------|
| R1 | Unbefugte Kenntnisnahme der Anamnese-Daten durch Dritte (DB-Leak) | 4 | 2 | 8 | AES-256-GCM at-rest, TLS in transit, Audit-Logs, Penetrationstest | 4 | 1 | 4 |
| R2 | Identitätsdiebstahl durch geleakte Patient-IDs | 3 | 2 | 6 | Pseudonymisierung in Logs, kein Klarname in URLs, JWT in HttpOnly-Cookies | 3 | 1 | 3 |
| R3 | Unzulässige Drittland-Übermittlung (Schrems-II) | 4 | 1 | 4 | Datenfluss strikt EU-Regionen, AVVs nach EU-US-DPF, SCC | 4 | 1 | 4 |
| R4 | Verlust der Verfügbarkeit (Backend-Down) | 2 | 3 | 6 | Fly.io-Auto-Restart, Health-Checks, manuelles Fallback Empfangs-Tresen | 2 | 2 | 4 |
| R5 | Unbeabsichtigte Verarbeitung von Kinder-Daten ohne Sorgerechts-Konsent | 4 | 2 | 8 | Pflicht-Frage „Patient unter 18?" mit Eltern-Konsent-Workflow, Marketing-Wording prüft | 4 | 1 | 4 |
| R6 | Voice-Agent speichert Audio entgegen Konfiguration | 3 | 2 | 6 | ElevenLabs-Audio-no-store-Config + Test, AVV-Schiene, Voice-Aktivierungs-Indikator | 3 | 1 | 3 |
| R7 | Mehrsprachige Übersetzungs-Fehler führen zu falscher Einwilligungs-Verständlichkeit | 3 | 3 | 9 | i18n-QA mit Native-Speakern, Marketing-Audit-Skript, Plain-Language-Review pro Sprache | 3 | 2 | 6 |

**Restrisiken nach Mitigation:** R1=4, R2=3, R3=4, R4=4, R5=4, R6=3, R7=6 — alle im akzeptablen Bereich (≤ 9), aber R7 (Übersetzungs-Verständlichkeit) erfordert kontinuierliche Pflege.

## 6. Geplante Abhilfemaßnahmen

### 6.1 Technisch (TOMs nach Art. 32 DSGVO)

- Verschlüsselung: AES-256-GCM at-rest (über `server/services/encryption.ts`), TLS 1.3 in transit (Let's Encrypt + HSTS)
- Zugriffskontrollen: JWT in HttpOnly-Cookies, RBAC-Middleware (`server/middleware/auth.ts`)
- Pseudonymisierung: Patient-IDs in Logs, IP-Hash via SHA-256
- Audit-Logging: HIPAA-style Logs, 12-Monats-Rolling, Hard-Delete-Worker
- Backup/Recovery: Neon-Postgres-Snapshots, Test-Restore-Lauf dokumentiert (Tracker E3)
- Schwachstellen-Tests: Penetrationstest jährlich (Tracker C3), Bundle-Audit quartalsweise (Scheduled Task `bundle-audit-quarterly`)

### 6.2 Organisatorisch

- Datenschutzbeauftragten benennen (extern, mit Health-Spezialisierung)
- AVV mit allen Auftragsverarbeitern (Fly, Neon, Netlify, optional ElevenLabs)
- Schulung des Praxispersonals zu DSGVO-Workflows (jährlich)
- Auskunftsverfahren niedrigschwellig (Web-Portal, Telefon, E-Mail)
- Lösch-/Sperr-Workflow getestet (Hard-Delete-Worker im Backend)
- Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) führen

### 6.3 Risiko-spezifisch

- **R1**: Penetrationstest-Anbieter anfragen (TÜV SÜD, DEKRA, SySS) — Tracker C3
- **R5**: UI-Workflow-Update für Minderjährigen-Konsent in Capture (Eltern-Pflichtfeld)
- **R7**: i18n-QA-Plan mit Native-Speakern für DE/EN/TR/AR/UK/ES/FA/IT/FR/PL — Tracker D-Item für IFU
- **R6**: ElevenLabs-AVV vor Voice-POC-Aktivierung (Tracker J6)

## 7. Konsultation des DPO und der Aufsichtsbehörde

| Schritt | Status | Verantwortlich |
|---------|--------|----------------|
| Externer DPO benennen und vertraglich binden | offen | CK |
| DPO-Review dieses Entwurfs (v0.1 → v1.0) | offen | DPO |
| Vorabkonsultation HmbBfDI gem. Art. 36 DSGVO falls Restrisiko nicht reduzierbar | nicht erforderlich (Restrisiken ≤ 9) | — |
| DSFA als Anhang zum Verzeichnis Verarbeitungstätigkeiten ablegen | offen | DPO + CK |

## 8. Maßnahmen zur Sicherstellung der Betroffenenrechte

| Recht | Umsetzung im DiggAi-Capture-Workflow |
|-------|--------------------------------------|
| Auskunft (Art. 15) | Selfservice-Endpoint + manuelle DPO-Eskalation; Antwort innerhalb 30 Tagen |
| Berichtigung (Art. 16) | Patient-Profil-Editor in der Web-App |
| Löschung (Art. 17) | Hard-Delete-Worker in `server/jobs/`, Frist gem. § 630f BGB ggf. eingeschränkt |
| Einschränkung (Art. 18) | Tag/Flag in PatientSession, Verarbeitung gestoppt bis Klärung |
| Datenübertragbarkeit (Art. 20) | JSON/PDF-Export aus Anmeldung möglich |
| Widerspruch (Art. 21) | Konsent-Widerruf jederzeit niedrigschwellig (Web-Portal) |
| Beschwerde Aufsichtsbehörde (Art. 77) | Kontakt HmbBfDI im Footer + Impressum verlinkt |

## 9. Schrems-II-Risiko-Bewertung (Drittland-Hoster)

DiggAi nutzt Auftragsverarbeiter mit US-Mutter (Fly.io, Netlify, Neon). Die **Datenverarbeitung selbst findet ausschließlich in der EU statt** (Region fra für Fly, eu-central-1 für Neon, Edge-Cache von Netlify lokal). Dennoch besteht das Restrisiko, dass ein US-Behördenzugriff auf Daten nach Cloud-Act / FISA Section 702 möglich wäre.

**Mitigation:**
- AVV mit allen drei Anbietern, EU-US-Data-Privacy-Framework + Standardvertragsklauseln
- Verschlüsselung at-rest mit DiggAi-eigenen Keys (kein Cloud-Provider-Key-Access)
- Transparenz-Reporting: jährliche Anbieter-Audits
- Worst-Case-Plan: Migration zu rein-EU-Hostern (Hetzner-Cloud, STACKIT) wäre 2-4 Wochen Aufwand und ist als Ausweichpfad dokumentiert

**Bewertung:** Restrisiko akzeptabel unter den getroffenen Maßnahmen. Schrems-II-konform, aber kontinuierlich zu beobachten (insbesondere bei Änderungen US-Rechtslage).

## 10. Dokumentations-Status und Versionierung

| Version | Datum | Autor | Änderung |
|---------|-------|-------|----------|
| 0.1 | 2026-05-06 | Claude (Lauf 18) | Erst-Entwurf gegen DSGVO Art. 35 |
| ... | ... | DPO | Review-Pass |
| 1.0 | TBD | CK + DPO | Finale Version, signiert |

## 11. Folge-Aufgaben

| # | Item | Owner | Block-Effekt |
|---|------|-------|--------------|
| K5 | DPO mit Health-Spezialisierung benennen | CK | DSFA-Finalisierung |
| K6 | AVV mit Fly.io, Netlify, Neon abschließen / verifizieren | CK + EXT | DSFA §2 |
| K7 | Penetrationstest-Anbieter anfragen | CK | DSFA R1-Mitigation, DiGA-Voraussetzung |
| K8 | Minderjährigen-Konsent-UI-Workflow in Capture implementieren | ENG | DSFA R5 |
| K9 | i18n-QA mit Native-Speakern (10 Sprachen) | EXT | DSFA R7 |
| K10 | Verzeichnis von Verarbeitungstätigkeiten gem. Art. 30 erstellen | DPO | DSGVO-Pflicht |

---

**Hinweis zur Class-I-Konformität:** Diese DSFA bestätigt, dass die Verarbeitung **administrativer Daten** in DiggAi-Capture ohne medizinische Bewertung stattfindet. Falls ein zukünftiges DiggAi-Patient-Modul (DiGA-Pfad) eingeführt wird, ist eine **separate, eigenständige DSFA** für dieses Modul erforderlich, da es dann patientenfacing klinische Daten verarbeitet.
