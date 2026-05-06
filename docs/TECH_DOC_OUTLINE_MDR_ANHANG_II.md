# DiggAi Capture — Technische Dokumentation (MDR Anhang II + IIa)

**Version:** 0.1 (Outline) · **Stand:** 2026-05-06 · **Verfasser:** ENG (Lauf 18) · **Branch:** `restructure/phase-1-workspace`

**Geltungsbereich:** Diese Tech-Doku gilt **ausschließlich für DiggAi Capture** (administrative Patienten-Datenerfassung, Hersteller-Position „kein Medizinprodukt" mit defensiver Fallback-Position MDR Klasse I in Selbstverifizierung). DiggAi Suite (Klasse IIa) bekommt eine **separate Tech-Doku** mit Notified-Body-Konformitätsweg nach MDR Anhang IX — siehe `TECH_DOC_OUTLINE_MDR_SUITE.md` (zu erstellen nach Phase 4).

**Zweck dieses Dokuments:** Strukturierte Outline der 14 verbindlichen Sektionen aus MDR Anhang II / IIa. Pro Sektion: Soll-Inhalt, Quelle (existierende Datei oder Verweis), Status, Owner. Die Outline ist die Klammer für die Items D1–D7 im Open-Items-Tracker.

**Status-Legende:** ⬛ = offen (kein Inhalt) · ◧ = teilweise (Material da, nicht konsolidiert) · ◼ = fertig (in Tech-Doku-Akte aufgenommen)

**Anker-Dokumente:** `docs/STATUS_PLAN_REGULATORIK_FLIP.md`, `docs/REGULATORY_STRATEGY.md`, `docs/INTENDED_USE.md`, `DiggAi-Capture-Intended-Purpose-v1.0.docx`, `DiggAi-Restrukturierungs-Plan-v1.0.docx`.

---

## §1 Produktbeschreibung und Spezifikation (MDR Anh. II Nr. 1)

**Status:** ◧ · **Owner:** ENG + CK · **Tracker-Item:** D2

**Soll-Inhalt:**
- 1.1 Produktname, Modell, Variante, UDI-DI (sobald verfügbar — D4)
- 1.2 Verwendungszweck-Kurzfassung (Patient erfasst Stammdaten + Anliegen + strukturierte Symptom-Stichworte; Output ist Datenobjekt zur administrativen Übergabe an die Praxis)
- 1.3 Zielgruppe der Anwender (Patienten 16+ über Browser-Frontend; Praxispersonal über Routing-Layer; KEIN ärztlicher Anwender im Capture)
- 1.4 Zielgruppe der Patienten (alle Versicherten, gesetzlich + privat, ab 16 Jahren, mehrsprachig DE/EN/TR/AR/UK/ES/FA/IT/FR/PL)
- 1.5 Anwendungsumgebung (Webbrowser auf Smartphone/Tablet/Desktop, ggf. Praxis-Kiosk; Internetverbindung erforderlich für Submit)
- 1.6 Kontraindikationen (keine, da Capture keine medizinische Indikation hat — administrativ)
- 1.7 Komponenten-Übersicht: Frontend (React 19 + TypeScript), Backend (Express 5 + Prisma), Datenbank (PostgreSQL 16), Hosting (Fly.io fra + Neon eu-central-1 + Netlify)
- 1.8 Schnittstellen (HTTPS-Frontend, REST-API, KIM/FHIR optional in Suite, NICHT in Capture)
- 1.9 Versions-Strategie (SemVer, Capture-eigene Major.Minor.Patch in `packages/capture/package.json`; UDI-DI-Reissue bei Major-Update)

**Quellen:**
- `docs/INTENDED_USE.md` (existierend, ◼)
- `DiggAi-Capture-Intended-Purpose-v1.0.docx` (existierend, ◼)
- `Ananmese/diggai-anamnese-master/CLAUDE.md` Sektion „Project Identity" (Stack-Beschreibung)

**Lücken:**
- UDI-DI noch nicht beantragt (D4)
- Versions-Strategie für Capture-Package noch nicht offiziell publiziert (Stand: Capture lebt im Monorepo-Scaffold, kein eigener Release-Pfad)

---

## §2 Risiko-Management-Akte (MDR Anh. II Nr. 3 + ISO 14971)

**Status:** ⬛ · **Owner:** ENG + EXT (Risk-Berater) · **Tracker-Item:** D1

**Soll-Inhalt:**
- 2.1 Risiko-Management-Plan (Methodik, Verantwortlichkeiten, Akzeptanzkriterien)
- 2.2 Risiko-Analyse FMEA (Failure Mode and Effects Analysis), ~30 identifizierte Risiken, jeweils:
  - Auslöser / Failure Mode
  - Auswirkung auf Patient / Anwender / Praxis
  - Wahrscheinlichkeit (Skala 1–5)
  - Schwere (Skala 1–5)
  - Detektierbarkeit (Skala 1–5)
  - Risikoprioritätszahl (RPZ = W × S × D)
  - Mitigations-Maßnahme(n)
  - Resterisiko nach Mitigation
- 2.3 Risiko-Bewertung (Akzeptanz vs. Reduktion erforderlich)
- 2.4 Risiko-Kontrolle (technische, organisatorische, informatorische Maßnahmen)
- 2.5 Restrisiko-Bewertung (Vergleich mit Patientennutzen — bei Capture: hoher administrativer Nutzen, sehr geringes Restrisiko, da kein klinischer Output)
- 2.6 Post-Market-Surveillance-Plan (siehe §10)

**Empfohlene Top-Risiken für FMEA-Erstwurf** (aus Intended-Purpose-v1.0 abgeleitet):
1. Falsch-Eingabe von Stammdaten (Geburtsdatum, Versichertennummer) → falsche Termin-Vergabe
2. Sprachbarriere (mehrsprachige UI nicht ausreichend → Patient versteht Frage nicht) → unvollständige Erfassung
3. Technischer Ausfall (Backend down) → Patient kann sich nicht anmelden
4. Personal-Workflow-Bruch (Daten landen falsch im PVS) → Doppelerfassung
5. Haftungs-Wahrnehmung (Patient/Personal interpretiert Capture-Output als klinische Aussage) → Class-IIa-Re-Klassifizierung
6. PII-Leck durch Backend-Bug → DSGVO-Strafe
7. Browser-Kompatibilität (alter Mobile-Browser) → UI bricht
8. Offline-Submission (Dexie-DB-Konflikt nach Reconnect) → Daten-Doppelung
9. Token-Diebstahl (XSS / CSRF) → unbefugter Zugriff auf Anmelde-Datenobjekt
10. AI-Subsystem-Ausfall in Capture (sollte gar nicht passieren, da `DECISION_SUPPORT_ENABLED=false`) → Verifizierung über `requireDecisionSupport`-Guards
11. Browser-LocalStorage-Überlauf → Session-Verlust
12. Zertifikats-Ablauf (Let's Encrypt) → HTTPS bricht → Patient kann nicht anmelden
13. DDoS / Rate-Limit-Überschreitung → Service-Verweigerung in Praxis-Stoßzeit
14. Falsche Standort-Routing (Multi-Tenant) → Anmeldung landet in falscher Praxis
15. Sprach-Modell-Verzerrung (BPMN i18n falsch übersetzt → Patient bestätigt Falsches) → administrativer Datenfehler

**Lücken:**
- FMEA-Tabelle (Excel + DOCX) muss noch erstellt werden (D1)
- Externe Risiko-Beratung empfohlen (Reuschlaw, GS1, TÜV SÜD)
- Risiko-Akte ist lebendes Dokument: muss bei jeder Architektur-Änderung aktualisiert werden (Tracker I4)

---

## §3 Verifikation und Validierung (MDR Anh. II Nr. 6.1 + 6.2)

**Status:** ◧ · **Owner:** ENG · **Tracker-Item:** D2 §6 + B6/C2

**Soll-Inhalt:**
- 3.1 Software-Lebenszyklus-Plan (IEC 62304 — Klasse A für Capture, da geringes Risiko ohne Patientenharm-Pfad)
- 3.2 Software-Architektur (Monorepo mit `packages/{capture,suite,common}`, technische Trennung via npm-Workspaces, ESLint-Guards, Postgres-Rollen)
- 3.3 Verifikations-Tests:
  - Unit-Tests (Vitest, ~80 % Coverage-Threshold für Server)
  - Integration-Tests (Playwright + Vitest)
  - Bundle-Audit (`scripts/bundle-audit.cjs` — Class-IIa-String-Scan, in CI seit Lauf 16)
  - DB-Permission-Test (C2, Lauf 18 in Vorbereitung)
  - DECISION_SUPPORT_ENABLED-Guard-Tests (B4, Lauf 16 + 18)
- 3.4 Validierungs-Tests (Use-Case-basiert, Patient-Journey-End-to-End, MFA-Workflow, mehrsprachig, Offline-Mode)
- 3.5 Post-Release-Tests (Smoke-Tests `tools/smoke-test-chrome.mjs`, Health-Check täglich via Scheduled Task)

**Quellen:**
- `vitest.config.ts` + `vitest.server.config.ts`
- `playwright.config.ts`
- `.github/workflows/ci.yml`
- `scripts/bundle-audit.cjs`
- `tools/smoke-test-chrome.mjs`
- `server/test/setup.ts`

**Lücken:**
- IEC 62304 Klasse-A-Lebenszyklus-Doku noch nicht formalisiert
- Validierungs-Use-Cases noch nicht in einem konsolidierten Test-Plan
- Test-Coverage-Report-Archiv noch nicht eingerichtet (CI generiert lcov, wird nicht persistiert)

---

## §4 Klinische Bewertung — CER (MDR Anh. II Nr. 6.1.c + Anh. XIV)

**Status:** ⬛ · **Owner:** EXT (Klinischer Bewerter) · **Tracker-Item:** D3

**Soll-Inhalt:**
- 4.1 Klinischer-Bewertungs-Plan (CEP)
- 4.2 Identifikation der relevanten klinischen Daten (Literatur-Recherche, Hersteller-Daten, Post-Market-Daten)
- 4.3 Bewertung der klinischen Daten (Validität, Anwendbarkeit, Nutzen)
- 4.4 Klinischer-Bewertungs-Bericht (CER)

**Capture-Spezifikum:** Da Capture „kein Medizinprodukt" beziehungsweise „Klasse I administrativ" sein soll, ist die klinische Bewertung **stark reduziert**:
- Kein klinischer Output → kein Patientennutzen-vs-Risiko-Argument klassischer Art
- Stattdessen: administrativer Nutzen (schnellere Anmeldung, geringerer Personal-Aufwand, mehrsprachiger Zugang) belegt durch erste Pilot-Praxis-Daten (Klapproth-Praxis als erste Referenz, Tracker F3)
- „CER-Lite" — 5–10 Seiten, nicht 50

**Lücken:**
- Externer klinischer Bewerter wurde noch nicht beauftragt (D3)
- Pilot-Praxis-Daten existieren noch nicht (F3)
- Literatur-Recherche zur Strukturverbesserung in der Hausarztpraxis (digitale Patientenanmeldung) noch ausstehend

---

## §5 Konformitäts-Pfad und harmonisierte Normen (MDR Anh. II Nr. 4)

**Status:** ◧ · **Owner:** ENG + RA · **Tracker-Item:** D2 §5

**Soll-Inhalt:**
- 5.1 Klassifizierungs-Begründung
  - Hersteller-Position 1: „nicht-MDSW" nach MDCG 2019-11 §3.5 (out of MDR)
  - Defensive Position 2: MDR Klasse I in Selbstverifizierung (MDR Anh. VIII Regel 11, 1. Stufe — administrativ, keine klinische Aussage)
- 5.2 Konformitätsbewertungsverfahren: MDR Art. 52 Abs. 7 (Selbstverifizierung für Klasse I, ohne Notified Body)
- 5.3 Harmonisierte Normen (anwendbar oder Stand-der-Technik gleichwertig):
  - ISO 13485:2016 (QM-System) — implementierte Subset (siehe §11)
  - ISO 14971:2019 (Risikomanagement) — siehe §2
  - IEC 62304:2006+A1:2015 (Software-Lebenszyklus) — Klasse A für Capture, siehe §3
  - IEC 62366-1:2015 (Usability Engineering) — Stand-der-Technik in UX-Reviews
  - ISO 15223-1:2021 (Symbole für Kennzeichnung) — bei IFU-Erstellung relevant (D6)
  - ISO 27001 / BSI-Grundschutz — für ISMS (E1, E2)
- 5.4 Konformitätserklärung (Anh. IV) — wird nach §1–§14 fertig erstellt (D7)

**Lücken:**
- Klassifizierungs-Begründung ist im STATUS_PLAN_REGULATORIK_FLIP.md ausführlich, muss aber für die Tech-Doku-Akte als eigenständige 3–5-Seiten-Sektion konsolidiert werden
- Liste der angewandten Normen muss formal mit Konformitäts-Statement je Norm hinterlegt werden

---

## §6 Sicherheits-Konzept (MDR Anh. II Nr. 5 + Cybersec-Guidance MDCG 2019-16)

**Status:** ◧ · **Owner:** ENG + CK · **Tracker-Item:** D2 §6 + E1/E5

**Soll-Inhalt:**
- 6.1 IT-Sicherheits-Architektur:
  - HTTPS-Erzwingung (Let's Encrypt)
  - HTTP-Header (Helmet) — CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  - CORS mit Whitelist-Origins
  - CSRF-Schutz (Double-Submit-Cookie)
  - Rate-Limiting (Express-Rate-Limit + Redis)
  - Input-Sanitization (`server/services/sanitize.ts`)
- 6.2 Authentifizierung und Autorisierung:
  - JWT (HttpOnly-Cookie, 32+ Char Secret, 1h Access + 7d Refresh)
  - RBAC (`server/middleware/auth.ts`) mit Rollen patient/mfa/arzt/admin
  - Pattern-Lock für Patient-Identifikation (SHA-256 + Komplexitäts-Validierung)
- 6.3 Verschlüsselung:
  - Daten in Transit: TLS 1.2+
  - Daten at Rest: AES-256-GCM für PII-Felder (`server/services/encryption.ts`) — siehe E5
  - Patienten-E-Mail: SHA-256-Hash, kein Plaintext
- 6.4 Audit-Logging (HIPAA-style, alle datenrelevanten Endpoints)
- 6.5 Schwachstellen-Management:
  - npm audit in CI (Level high+)
  - Dependabot (gh)
  - Externer Pen-Test mind. jährlich (C3)
- 6.6 Incident-Response-Plan
- 6.7 BSI TR-03161 Konformität (B3S-äquivalent)

**Quellen:**
- `server/index.ts` (Middleware-Stack)
- `server/services/encryption.ts`
- `server/middleware/auth.ts`
- `server/middleware/csrf.ts`
- `.github/workflows/ci.yml` (npm audit step)

**Lücken:**
- Konsolidiertes Sicherheits-Konzept-Dokument fehlt (E5 — heute Lauf 18 in Erstellung als `docs/SECURITY_ENCRYPTION_CONCEPT.md`)
- BSI-Grundschutz-Profil (E1) ausstehend
- Pen-Test-Bericht (C3) ausstehend

---

## §7 Mensch-System-Schnittstelle / Usability (MDR Anh. II Nr. 6 + IEC 62366-1)

**Status:** ◧ · **Owner:** ENG · **Tracker-Item:** D2 §7

**Soll-Inhalt:**
- 7.1 Anwender-Szenarien (Personae): Patient ankommen ohne Termin / mit Termin, MFA Empfang, ARZT in Praxis-Stoßzeit
- 7.2 Risiko-orientierte Use-Case-Analyse (Use-Errors mit Patientenharm-Potenzial)
- 7.3 Anwender-Kompetenz-Annahmen (Patient = Smartphone-Erfahrung B1-Level Deutsch oder Heimatsprache)
- 7.4 Validierung der Anwendung (Usability-Tests mit echten Patienten in der Klapproth-Praxis als Pilot)
- 7.5 Mehrsprachigkeit: 10 Sprachen (de, en, tr, ar, uk, es, fa, it, fr, pl), RTL für ar/fa
- 7.6 Barrierefreiheit (BITV 2.0 / WCAG 2.1 AA — F5 noch nicht zertifiziert, ENG plant Audit)

**Lücken:**
- Strukturierte Personae-Doku fehlt
- Usability-Test-Plan + Pilot-Daten ausstehend
- BITV-Audit ausstehend (F5)

---

## §8 Marktüberwachung und Vigilanz (MDR Anh. III + Art. 87)

**Status:** ⬛ · **Owner:** CK + ENG · **Tracker-Item:** D2 §8

**Soll-Inhalt:**
- 8.1 Post-Market-Surveillance-Plan (PMS-Plan)
- 8.2 Methoden zur Datenerhebung (Beschwerde-Kanal, Vigilanz-Meldewege, Pilot-Praxis-Feedback)
- 8.3 Trend-Analyse-Verfahren
- 8.4 Vigilanz-Meldungen an Behörde (Schwerwiegende Vorfälle: BfArM via DMIDS)
- 8.5 Periodischer-Sicherheits-Bericht (PSUR) — bei Klasse I jährlich

**Capture-Spezifikum:** Da bei Klasse I „administrativ" Patienten-Harm extrem unwahrscheinlich ist, wird der PMS-Plan minimal sein (Beschwerde-Inbox, Pilot-Praxis-Quartalsfeedback, Trend-Review).

**Lücken:**
- Beschwerde-Kanal nicht offiziell eingerichtet (Mail-Adresse `support@diggai.de` reicht juristisch nicht)
- Vigilanz-Meldewege organisatorisch nicht etabliert

---

## §9 IFU — Instructions for Use (MDR Art. 10 + 27 + Anh. I Nr. 23.4)

**Status:** ⬛ · **Owner:** CK + ENG · **Tracker-Item:** D6

**Soll-Inhalt:**
- 9.1 Beschreibung in DE + EN, embedded in Software (z. B. Hilfe-Seite + Cookie-Banner-Erweiterung)
- 9.2 Pflicht-Inhalte:
  - Zweckbestimmung
  - Anwender-Zielgruppe
  - Anwendungsumgebung
  - Sicherheits-Hinweise (KEIN Notfall-Hinweis-Auftrag, da nicht klinisch)
  - Datenschutz-Hinweis (DSGVO Art. 13/14)
  - Hersteller-Kontakt
  - UDI-DI
  - CE-Kennzeichnung (sobald Klasse I bestätigt)
  - Änderungs-Historie
- 9.3 Symbole nach ISO 15223-1
- 9.4 Aktualisierungs-Prozess (PR-Review, Versionsstand sichtbar)

**Lücken:**
- IFU-Inhalt komplett offen (D6)
- UDI-DI ausstehend (D4)
- ISO 15223-1-Symbol-Set noch nicht ausgewählt

---

## §10 Konformitätserklärung Anh. IV (MDR Art. 19 + Anh. IV)

**Status:** ⬛ · **Owner:** CK + RA · **Tracker-Item:** D7

**Soll-Inhalt:**
- 10.1 Hersteller-Identifikation (Name, Anschrift, SRN)
- 10.2 Produkt-Identifikation (Name, UDI-DI)
- 10.3 Klasse (I)
- 10.4 Konformitäts-Aussage (Erfüllt MDR + harmonisierte Normen aus §5)
- 10.5 Datum, Ort, Unterschrift Geschäftsführung

**Vorbedingung:** Alle §1–§9 müssen vor Unterschrift fertig sein. EUDAMED-SRN (D5) muss vorliegen.

---

## §11 Kennzeichnung und Verpackung (MDR Anh. I Nr. 23.2 + 23.3)

**Status:** ⬛ · **Owner:** ENG + CK · **Tracker-Item:** D2 §11

**Soll-Inhalt für Software** (kein physisches Produkt, daher reduziert):
- 11.1 In-Software-Kennzeichnung (Versions-Anzeige, UDI-DI, CE-Marker im Footer)
- 11.2 Splash-Screen oder „Über"-Seite mit Hersteller-Daten
- 11.3 Update-Hinweise bei Major-Version

**Lücken:**
- UI-Komponente für CE-/UDI-Anzeige noch nicht implementiert (`src/components/RegulatoryFooter.tsx` als Vorschlag)

---

## §12 UDI-System (MDR Art. 27 + Durchführungs-VO 2019/2017)

**Status:** ⬛ · **Owner:** CK · **Tracker-Item:** D4 + D5

**Soll-Inhalt:**
- 12.1 UDI-DI-Antrag bei GS1 Germany (Issuing Agency)
- 12.2 UDI-PI (Production Identifier) für Software-Releases (Lot/Version)
- 12.3 UDI-Datenbank EUDAMED-Registrierung (D5)
- 12.4 UDI-Anzeige im Produkt + Tech-Doku

**Lücken:**
- GS1-Antrag noch nicht gestellt (D4)
- EUDAMED-Account noch nicht angelegt (D5)

---

## §13 Quality Management System (MDR Anh. IX + ISO 13485)

**Status:** ⬛ · **Owner:** CK + EXT (QM-Berater) · **Tracker-Item:** D2 §13

**Capture-Spezifikum (Klasse I in Selbstverifizierung):** Vollumfängliches ISO 13485 ist NICHT zwingend für Klasse I, aber ein QM-System-Subset (Dokumenten-Lenkung, Änderungs-Management, CAPA) ist Pflicht.

**Soll-Inhalt:**
- 13.1 QM-Handbuch (Mini-Variante, 10–20 Seiten)
- 13.2 Dokumenten-Lenkungs-Prozess (Git-Branch + PR-Review = QM-Lenkung)
- 13.3 Änderungs-Management (CHANGE_LOG_REGULATORY.md + PR-Review-Checkliste aus §I1 im Tracker)
- 13.4 CAPA-Prozess (Corrective and Preventive Action) bei Vigilanz-Meldungen
- 13.5 Schulung des Teams (CK + ENG-Co-Founders)
- 13.6 Lieferanten-Management (Fly.io-Vertrag, Neon-AVV, Netlify-AGB)

**Quellen:**
- `docs/CHANGE_LOG_REGULATORY.md` (existierend, ◧)
- Per-PR-Compliance-Checkliste aus `DiggAi-Restrukturierungs-Plan-v1.0.docx` §9

**Lücken:**
- QM-Handbuch existiert nicht
- CAPA-Prozess nicht formalisiert
- AVVs (Auftragsverarbeitungs-Verträge) für Fly.io / Neon / Netlify in Vorbereitung

---

## §14 Klinische Daten / Erfolgs-Kriterien (MDR Anh. II Nr. 6.1.d)

**Status:** ⬛ · **Owner:** EXT · **Tracker-Item:** D3 + F2

**Soll-Inhalt:**
- 14.1 Klinische Daten oder Stand-der-Technik-Argument
- 14.2 Erfolgs-Kriterien (für Capture: administrativ messbar — Anmelde-Zeit, Daten-Qualität, Patienten-Zufriedenheit, Personal-Entlastung)
- 14.3 Pilot-Praxis-Studie (Klapproth-Praxis, dann 2–5 weitere)

**Lücken:**
- Studien-Design fehlt (F2)
- Pilot-Praxen unter 5 (F3)

---

## Status-Score nach §-Abschluss

| § | Sektion | Status | Tracker | Owner |
|---|---------|--------|---------|-------|
| §1 | Produktbeschreibung | ◧ | D2 | ENG+CK |
| §2 | Risiko-Management ISO 14971 | ⬛ | D1 | ENG+EXT |
| §3 | V&V | ◧ | D2/B6/C2 | ENG |
| §4 | Klinische Bewertung CER | ⬛ | D3 | EXT |
| §5 | Konformitäts-Pfad | ◧ | D2/D7 | ENG+RA |
| §6 | Sicherheits-Konzept | ◧ | D2/E5 | ENG+CK |
| §7 | Usability | ◧ | D2/F5 | ENG |
| §8 | PMS / Vigilanz | ⬛ | D2 | CK+ENG |
| §9 | IFU | ⬛ | D6 | CK+ENG |
| §10 | Konformitätserklärung | ⬛ | D7 | CK+RA |
| §11 | Kennzeichnung | ⬛ | D2 | ENG+CK |
| §12 | UDI | ⬛ | D4/D5 | CK |
| §13 | QM-System | ⬛ | D2 | CK+EXT |
| §14 | Klinische Daten | ⬛ | D3/F2 | EXT |

**Gesamtstand der Tech-Doku-Akte:** 0 von 14 Sektionen formal fertig. 6 Sektionen mit teilweise vorhandenem Material (§1, §3, §5, §6, §7, plus dieses Dokument als Outline). 8 Sektionen komplett offen.

**Realistischer Time-to-Done bei externer Begleitung:** 6–12 Wochen. Ohne externe Begleitung: 12–18 Wochen.

---

## Nächste 3 Sektionen zum Abschließen (Priorisierung)

1. **§6 Sicherheits-Konzept** — niedrigster Aufwand, da existierende Implementation. Doku heute (Lauf 18) gestartet als `docs/SECURITY_ENCRYPTION_CONCEPT.md`. Liefert E5.
2. **§3 V&V** — meiste Belege existieren (Vitest, Playwright, Bundle-Audit, Test-Coverage). Konsolidierungs-Doku mit Verweisen genügt für 80 % der Sektion. ~2–3 Tage ENG-Aufwand.
3. **§9 IFU** — kein juristischer Show-Stopper, aber UI-Komponente + Übersetzungen + Symbol-Set ~1 Woche ENG.

Dann erst §2 (FMEA — externer Berater) und §4 (CER — externer klinischer Bewerter).

---

## Pflege

Dieses Outline-Dokument wird **bei jeder Material-Ergänzung** aktualisiert (Status-Spalte). Sobald eine Sektion ◼ (fertig) ist, wird der konsolidierte Inhalt in einen eigenen DOCX/PDF-Ordner unter `docs/tech-doc-akte/` gelegt und hier nur noch referenziert.

**Letzte Aktualisierung:** 2026-05-06 (Lauf 18, claude-code, opus-4-7) — Initial-Outline.
