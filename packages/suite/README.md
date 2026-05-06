# @diggai/suite

DiggAi Suite — klinische Entscheidungs-Unterstützung für approbierte Ärzte.

## Klassifizierung

- **MDR**: Klasse IIa
- **Konformität**: Anhang IX — durch Benannte Stelle
- **Begründung**: Liefert Information für medizinische Entscheidungen (Triage, KI-Summary, Therapie-Vorschläge), MDR Anhang VIII Regel 11
- **DiGA-Pfad**: §139e SGB V — Aufnahme ins DiGA-Verzeichnis nach DVG (Fast-Track-Verfahren möglich)

## Was ist drin (nach Phase 4)

- **Frontend** (React + Vite): Arzt-Dashboard, Triage-Ampel, Red-Flag-Indikatoren, KI-Anamnese-Summary, Therapie-Plan-UI
- **Backend** (Express): Therapy-Engine, Alert-Engine, AI-Engine (LLM-Client), Episode-Management
- **Agent-Core** (Python): Triage-Agent, Empfangs-Agent, Dokumentations-Agent, Abrechnungs-Agent

## Zugriffs-Modell

- **Login-pflichtig** — nur eingeloggte medizinische Fachkräfte (Arzt, MFA)
- **Niemals direkt für Patienten zugänglich** — Patient nutzt ausschließlich `@diggai/capture`

## Status: Scaffold (Phase 1)

Aktuell leer. Migration aus den 9 Class-IIa-Trigger-Modulen erfolgt in **Phase 4**. Liste der zu migrierenden Dateien siehe Restrukturierungs-Plan §2.1.

## Build und Deployment

- **URL Production**: `app.diggai.de` oder `praxis.diggai.de` (separate Subdomain)
- **API Production**: `suite-api.diggai.de` bzw. `diggai-suite-api.fly.dev`
- **CI**: separate Pipeline mit voller Compliance-Suite (CER, Risk-File-Verification, Code-Audit gegen Zweckbestimmung)

## Compliance — wesentlich anspruchsvoller als Capture

Klasse-IIa erfordert:

- Vollständige technische Dokumentation nach MDR Anhang II
- Klinische Bewertung (CER) mit Literatur-Recherche und ggf. eigener Studie
- ISO 13485 zertifiziertes QMS
- Audit durch Benannte Stelle (TÜV SÜD, mdc, BSI Group, ...)
- Jährliches Surveillance-Audit
- Post-Market Surveillance + Post-Market Clinical Follow-up (PMCF)
- UDI-DI + UDI-PI Generation und EUDAMED-Registrierung mit NB-Cert
