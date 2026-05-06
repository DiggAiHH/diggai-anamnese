# DiggAi Workspace-Pakete

Dieses Verzeichnis enthält die zukünftigen npm-Workspace-Pakete der DiggAi-Plattform. Es ist Teil der Restrukturierung von der heutigen monolithischen Codebase zu einer **3-Pakete-Architektur** mit klarer regulatorischer Trennung.

## Pakete

| Paket | Klasse MDR | Inhalt | Status |
|-------|-----------|--------|--------|
| [`common/`](./common/) | kein Medizinprodukt | Auth, Encryption, Audit, Middleware | Scaffold |
| [`capture/`](./capture/) | Klasse I (Selbstdeklaration) | Patient-UI, Anamnese-Formulare, DSGVO-Consent, Datenerfassung | Scaffold |
| [`suite/`](./suite/) | Klasse IIa (Notified Body) | Triage, AI-Engine, Therapie-Pläne, Clinical Alerts | Scaffold |

## Status

**Phase 1 (jetzt):** Scaffold-only — Verzeichnisse + leere `package.json` angelegt. Der bestehende Code in `src/` und `server/` läuft unverändert weiter. Der Build und Live-Deploy sind nicht betroffen.

**Phase 2 (geplant):** Common-Library extrahieren — Auth, Encryption, Audit aus `server/services/` nach `packages/common/src/`. Bestehender Code referenziert ab dann `@diggai/common`.

**Phase 3 (geplant):** Capture-Code aus `src/` und `server/` (Bucket B aus Audit) nach `packages/capture/`.

**Phase 4 (geplant):** Suite-Code (Bucket A — alle Class-IIa-Trigger) nach `packages/suite/`.

**Phase 5+ (geplant):** Cross-Package-Trennung über ESLint-Regeln, Bundle-Audits, separate CI-Pipelines, separate Fly.io-Apps.

## Referenz-Dokumente

- **DiggAi-Restrukturierungs-Plan-v1.0.docx** — vollständiger Migrations-Plan mit 6 Phasen, Code-Audit, Tests, Timeline
- **DiggAi-Capture-Intended-Purpose-v1.0.docx** — Zweckbestimmung der Class-I-Capture-Komponente
- **DiggAi-Status-Plan-Regulatorik.docx** — Strategische Übersicht und Pfad-Vergleich

## Während der Migration

Nicht in `packages/` arbeiten, solange `src/` und `server/` noch produktiv sind. Jeder Migrations-Schritt ist ein separater PR mit grünen Tests. Siehe `restructure/`-Branches.

## Compliance

Pull-Requests, die Code zwischen den Paketen verschieben, werden gegen die Per-PR-Audit-Checkliste in §9 des Restrukturierungs-Plans geprüft. Reviewer bestätigt, dass:

- kein Class-IIa-Code in `capture/` landet
- keine Marketing-/IFU-Texte in `capture/` medizinische Bewertung implizieren
- ESLint und Bundle-Analyzer grün sind
