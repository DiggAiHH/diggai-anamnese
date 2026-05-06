# @diggai/capture

DiggAi Capture — patientenseitige Anamnese-Erfassungs-Komponente.

## Klassifizierung

- **MDR**: Klasse I (Selbstdeklaration nach Anhang IV)
- **Konformität**: Hersteller-Erklärung, keine Benannte Stelle
- **Begründung**: MDR Anhang VIII Regel 11 i.V.m. MDCG 2019-11 §3.5, §4.2, §6.1
- **Zweckbestimmung**: siehe `DiggAi-Capture-Intended-Purpose-v1.0.docx`

## Was ist drin (nach Phase 3)

- **Frontend** (React + Vite): Patient-UI mit Anamnese-Formularen, DSGVO-Consent, elektronischer Unterschrift, Mehrsprachigkeit, Foto-Upload
- **Backend** (Express): Form-Builder, Session-Erstellung, Roh-Datenpersistierung, CSRF-Schutz

## Was ist NICHT drin

- ❌ Triage / Red-Flag-Detection
- ❌ KI-Anamnese-Zusammenfassung
- ❌ Therapie-Vorschläge / ICD-Mapping
- ❌ Symptom-Bewertung
- ❌ Clinical Alerts

Diese Funktionen sind in `@diggai/suite` (separates Klasse-IIa-Produkt) implementiert.

## Status: Scaffold (Phase 1)

Aktuell leer. Code-Migration aus `src/` (Patient-Komponenten) und `server/routes/forms.ts`, `server/services/forms/` erfolgt in **Phase 3**.

## Build und Deployment

- **URL Production**: `diggai.de`, `diggai.de/<bsnr>`
- **API Production**: `capture-api.diggai.de` bzw. `diggai-capture-api.fly.dev`
- **CI**: separate Pipeline, eigener Bundle-Audit auf verbotene Strings (`triage`, `redFlag`, `aiSummary`)

## Compliance Sign-Off

Vor jedem Release dieser Komponente bestätigt der Reviewer:

- [ ] Kein Import aus `../suite/*`
- [ ] Bundle-Analyzer-Output zeigt keine `suite/`- oder `agent-core/`-Pfade
- [ ] Keine neuen UI-Strings, die als medizinische Bewertung interpretierbar sind
- [ ] Marketing-/IFU-Texte stimmen mit Zweckbestimmung überein
- [ ] Tests grün (Unit + E2E + Bundle-Audit)
