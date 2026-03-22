# QUESTION_CATALOG.md — Complete Question ID Reference

> **CRITICAL FOR AGENT SAFETY**
>
> Question IDs are **canonical routing keys** — never renumber or reuse an ID after it is created.
> Any change to IDs breaks patient session routing and triage rules.
> Only APPEND new IDs at the end of existing blocks.

Question data source: `src/data/questions.ts` + `src/data/new-questions.ts`

---

## Block Structure Overview

| Block | ID Range / Prefix | Section | Description |
|---|---|---|---|
| 0 | `0000`–`0004`, `RPT-ID` | basis | Patient identification + returning patient fast-track |
| 1 | `2000`–`2001` | versicherung | Insurance enrollment (new patients) |
| 2 | `3000`–`3005` | adresse / kontakt | Address and contact details |
| 3 | `1000`–`1003` | beschwerden | Chief complaint entry |
| 4 | `4000`–`4131` | koerper / beruf | Body systems check + lifestyle |
| 5 | `5000`–`5004` | herz | Cardiology module |
| 6 | `6000`–`6007` | lunge | Pulmonology module |
| 7 | `7000`–`7002` | neurologie | Neurology module |
| 8 | `8000`–`8951` | bauch / magen | GI / Abdominal module |
| 9 | `9000`–`9999` | abschluss | Completion, consent, signature |
| SVC | `RES-*`, `DAT-*`, `AU-*`, `UEB-*`, `ABS-*`, `TEL-*`, `BEF-*`, `MS-*` | (varies) | Service request flows |
| BG | `2080`–`2091`, `BG-BERUF-*` | bg-unfall | Workplace accident (BG) flow |
| EXT | `FIE-*`, `GEW-*`, `KRA-*`, `LUNGE-*`, `ASTHMA-*`, `BRUST-*`, `1B0*` | (varies) | Symptom extension modules |

---

## Block 0 — Identifikation & Besuchsstatus

Entry point for all patients.

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `0000` | radio | Sind Sie bereits als Patient bekannt? | ja → `RPT-ID`; nein → `0001` |
| `0001` | text | Nachname | → `0011` (PII: encrypted) |
| `0011` | text | Vorname | → `0002` (PII: encrypted) |
| `0002` | select | Geschlecht (M/W/D) | → `0003` |
| `0003` | date | Geburtsdatum | nein → `2000`; ja → `RPT-ID` |
| `RPT-ID` | patient-identify | Patienten-Identifikation (Returning Patient) | Routes by `selectedReason` context to service flow |
| `0004` | text | Patienten-ID (PID) — legacy fallback | → `TERM-100`; only shown if `RPT-ID` = fallback |

**Routing note**: `RPT-ID` is the returning patient fast-track. It dispatches directly to service flows based on `selectedReason` context field.

---

## Block 1 — Enrollment (Neu-Patienten)

Only shown to patients where `0000 = nein`.

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `2000` | radio | Versicherungsstatus? (PKV/GKV/Selbstzahler) | → `2001` |
| `2001` | text | Versichertennummer (optional) | → `3000` |

---

## Block 2 — Adresse & Kontakt

| ID | Type | Question (German) | Notes |
|---|---|---|---|
| `3000` | number | PLZ | Required; 10000–99999 |
| `3001` | text | Wohnort | Required |
| `3002` | text | Straße und Hausnummer | Required |
| `3002a` | text | Adresszusatz / c/o (optional) | → `3003` |
| `3003` | email | E-Mail-Adresse (optional) | PII: encrypted in `Answer.encryptedValue` |
| `3004` | tel | Mobilnummer (optional) | PII: encrypted |
| `3004b` | tel | Festnetznummer (optional) | Cross-field validation: min 1 contact required |
| `3005` | radio | Weiter zum gewählten Anliegen? | Routes by `selectedReason` context to service flow |

---

## Block 3 — Beschwerden (Chief Complaint)

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `1000` | radio | Haben Sie aktuell Beschwerden? | ja → `1001`; nein → `4000` (or `MED-100`) |
| `1001` | select | Wie lange bestehen Ihre Beschwerden? | → `1002` |
| `1002` | multiselect | Welche Körperregion ist betroffen? | → `1003` or specialty module entry |
| `1003` | select | Stärke der Beschwerden (0–10 NRS) | → specialty module or `4000` |

---

## Block 4 — Körpersysteme & Lifestyle

### Körpersysteme (Organ System Checklist)

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `4000` | multiselect | Haben Sie Vorerkrankungen? | → `4001` |
| `4001` | multiselect | Haben Sie Allergien? | → `4002` |
| `4002` | multiselect | Bestehende Medikamente? | → `4003` |
| `4003` | radio | Frühere Operationen? | → `4004` |
| `4004` | radio | Krankenhausaufenthalte in letzten 5 Jahren? | → `4005` |
| `4005` | radio | Chronische Schmerzen? | → `4006` |
| `4006` | radio | Schlafprobleme? | → `4100` |
| `4100` | radio | Familienanamnese — Herzerkrankungen? | → `4110` |
| `4100-FT` | radio | Familienanamnese Herz (fast-track variant) | |
| `4110` | radio | Familienanamnese — Krebs? | → `5000` |
| `4110-FT` | radio | Familienanamnese Krebs (fast-track variant) | |

### Lifestyle / Sozialanamnese

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `4120` | select | Beruf / Beschäftigungsstatus | → `4121` |
| `4121` | radio | Berufliche Belastung? | → `4122` |
| `4122` | select | Schlafqualität | → `BEWEG-100` |
| `4130` | select | Alkoholkonsum (Häufigkeit) | → `4131` |
| `4131` | select | Drogen / andere Substanzen? | → `5000` |

---

## Block 5 — Herz / Kreislauf (Cardiology)

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `5000` | radio | Brustschmerzen? | ja → triage evaluation (ACS rule); → `5001` |
| `5001` | radio | Herzklopfen / Herzrasen? | → `5002` |
| `5002` | radio | Dyspnoe (Atemnot)? | → `5004` |
| `5002-FT` | radio | Dyspnoe (fast-track variant) | |
| `5003` | radio | Synkope / Ohnmacht? | → `6000` |
| `5004` | radio | Ödeme (Schwellungen)? | → `5003` |

---

## Block 6 — Lunge / Atemwege (Pulmonology)

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `6000` | radio | Husten? | → `6001` |
| `6001` | radio | Auswurf / Sputum? | → `6002` |
| `6001-FT` | radio | Auswurf (fast-track variant) | |
| `6002` | radio | Giemen / Pfeifen? | → `6003` |
| `6003` | radio | Raucher? | → `6004` (RAUCHER triage rule at >30 pack-years) |
| `6003-FT` | radio | Raucher (fast-track variant) | |
| `6004` | number | Packungsjahre | → `6005` |
| `6005` | radio | Frühere Lungenerkrankungen? | → `6006` |
| `6006` | radio | Asthma bekannt? | → `6007` |
| `6007` | radio | COPD bekannt? | → `7000` |
| `6007-FT` | radio | COPD (fast-track variant) | |

---

## Block 7 — Neurologie

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `7000` | radio | Kopfschmerzen? | → `7001` |
| `7001` | radio | Donnerschlagkopfschmerz? | SAH triage rule if + Bewusstseinsstörung |
| `7001-FT` | radio | Donnerschlagkopfschmerz (fast-track) | |
| `7002` | radio | Schwindel / Gleichgewichtsstörung? | → `8000` |
| `7002-FT` | radio | Schwindel (fast-track) | |

---

## Block 8 — GI / Bauch / Magen

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `8000` | radio | Bauchschmerzen? | → `8800` (GI_BLUTUNG triage if + Antikoagulanzien) |
| `8000-FT` | radio | Bauchschmerzen (fast-track) | |
| `8800` | radio | Übelkeit / Erbrechen? | → `8900` |
| `8900` | radio | Durchfall / Veränderung Stuhlgang? | → `8950` |
| `8950` | radio | Diabetes? | → `8951` (DIAB_FUSS triage rule) |
| `8951` | radio | Fußbeschwerden bei Diabetes? | → `4120` |

---

## Block 9 — Abschluss & Consent

| ID | Type | Question (German) | Routing Notes |
|---|---|---|---|
| `9000` | radio | Zusammenfassung bestätigen | → `9010` |
| `9010` | signature | Einwilligungserklärung (Datenschutz) | → `9011` |
| `9011` | radio | Submission bestätigen | → END (session status → SUBMITTED) |
| `9100` | radio | BG-Unfallmeldung abschließen | End of BG flow |
| `9500` | radio | Kurzanamnese abschließen (Rückkehrer, keine Beschwerden) | End of fast-track |
| `9999` | radio | Fehler / Fallback-Endpunkt | Session error recovery |

---

## Service Flow Entry Points (10 Flows)

Dispatched from `RPT-ID` (returning patients) or `3005` (new patients) via `selectedReason` context field.

| Entry ID | Flow Name | `selectedReason` Value | Description |
|---|---|---|---|
| `TERM-100` | Termin / Anamnese | `"Termin / Anamnese"` | Full anamnesis questionnaire for new appointment |
| `RES-100` | Rezept-Anfrage | `"Medikamente / Rezepte"` | Medication / prescription request |
| `DAT-100` | Datei-Anforderung | `"Dateien / Befunde"` | Request for documents / results |
| `AU-100` | AU-Schein | `"AU (Krankschreibung)"` | Sick note request (Arbeitsunfähigkeitsbescheinigung) |
| `UEB-100` | Überweisung | `"Überweisung"` | Referral request |
| `ABS-100` | Terminabsage | `"Terminabsage"` | Appointment cancellation |
| `TEL-100` | Telefonanfrage | `"Telefonanfrage"` | Phone inquiry |
| `BEF-100` | Befund-Anforderung | `"Dokumente anfordern"` | Medical records request |
| `MS-100` | Nachricht | `"Nachricht schreiben"` | Free-text message to practice |
| `2080` | BG-Unfall | `"Unfallmeldung (BG)"` | Workplace accident report |

### Service Flow Question IDs

| Flow | IDs | Section |
|---|---|---|
| `RES-*` | `RES-100`, `RES-101`, `RES-102`, `RES-103` | rezept |
| `DAT-*` | `DAT-100`, `DAT-101`, `DAT-102` | datei-anforderung |
| `AU-*` | `AU-100`, `AU-101`, `AU-102`, `AU-103` | au-anfrage |
| `UEB-*` | `UEB-100`, `UEB-101` | ueberweisung |
| `ABS-*` | `ABS-100`, `ABS-101` | absage |
| `TEL-*` | `TEL-100`, `TEL-100b`, `TEL-101` | telefon |
| `BEF-*` | `BEF-100`, `BEF-101` | befund-anforderung |
| `MS-*` | `MS-100`, `MS-101` | nachricht |

---

## BG Workplace Accident Flow

Triggered when `selectedReason = "Unfallmeldung (BG)"`. Entry: `2080`.

| ID | Type | Question (German) |
|---|---|---|
| `2080` | bg-form | Details zum Arbeits-/Wegeunfall (BG) — structured composite form |
| `BG-BERUF-100` | text | Beruf des Patienten |
| `2081` | text | Name des Arbeitgebers |
| `2082` | text | Adresse des Arbeitgebers |
| `2083` | select | Zuständige Berufsgenossenschaft |
| `2084` | date | Unfalltag |
| `2085` | time | Unfallzeit |
| `2086` | radio | Art des Unfalls (Arbeitsunfall / Wegeunfall) |
| `2087` | text | Unfallort |
| `2088` | textarea | Unfallhergang (Beschreibung) |
| `2089` | textarea | Art der Verletzung |
| `2090` | text | Name des Ersthelfers |
| `2091` | radio | Erstversorgung erfolgt? |

---

## Extension Modules (new-questions.ts)

Symptom-specific extension modules added in later development phases.

| Prefix | Module | Entry ID | Description |
|---|---|---|---|
| `FIE-*` | Fieber | `FIE-100` | Fever module (temperature, onset, associated symptoms) |
| `FIE-MESS-*` | Fieber-Messung | `FIE-MESS-100` | Temperature measurement detail |
| `GEW-*` | Gewichtsverlust | `GEW-100` | Weight loss screening |
| `KRA-*` | Krampf/Epilepsie | `KRA-100` | Seizure / epilepsy screening |
| `ASTHMA-*` | Asthma | `ASTHMA-100` | Asthma severity assessment |
| `LUNGE-*` | Lunge | `LUNGE-101` – `LUNGE-105` | Pulmonary function extension |
| `BRUST-*` | Brustbeschwerden | `BRUST-100` – `BRUST-102` | Chest complaint detail |
| `SHUNT-*` | Shunt | `SHUNT-100` | Neurosurgical shunt screening |
| `ERBRECH-*` | Erbrechen | `ERBRECH-100` | Vomiting detail |
| `BEWEG-*` | Bewegung | `BEWEG-100` | Physical activity assessment |
| `1A00` | Augen | `1A00` | Ophthalmology entry |
| `1B00`–`1B06` | Brust/Gynäkologie | `1B00` | Breast / gynecology module |
| `1010` | Gelenke | `1010` | Joint complaints |
| `1020` | Haut | `1020` | Dermatology |
| `1030` | Urologie | `1030` | Urology |
| `1040` | Magen-Darm | `1040` | GI extension |
| `1050` | Schmerz | `1050` | Pain management |
| `1110`–`1117` | Neurologie-Detail | `1110` | Detailed neurology sub-module |
| `1121` | Schlaf | `1121` | Sleep disorders |
| `1131` | Psyche | `1131` | Mental health screening |
| `1141` | Bewegungsapparat | `1141` | Musculoskeletal |

---

## Specialty Module Entry Points (13 Specialties)

These are dispatched from `1002` (body region selection) or triage routing:

| Specialty | Entry Point | Routing Condition |
|---|---|---|
| Kardiologie | `5000` | Body region: Herz / Brustkorb |
| Pulmonologie | `6000` | Body region: Lunge / Atemwege |
| Neurologie | `7000` | Body region: Kopf / Nervensystem |
| Gastroenterologie | `8000` | Body region: Bauch / Verdauung |
| Diabetologie | `8950` | Diagnosis: Diabetes |
| Dermatologie | `1020` | Body region: Haut |
| Rheumatologie | `1010` | Body region: Gelenke / Muskeln |
| Urologie | `1030` | Body region: Harnwege |
| Ophthalmologie | `1A00` | Body region: Augen |
| Gynäkologie | `1B00` | Gender: W; Body region: Brust / Unterleib |
| Psychiatrie / Psychosomatik | `1131` | PHQ-9 score or self-report |
| HNO (Hals-Nasen-Ohren) | `1141` | Body region: HNO |
| Orthopädie / Unfallchirurgie | `2080` | selectedReason: BG-Unfall |

---

## Rules for Safely Adding New Questions

> **Never violate these rules. They protect session routing integrity.**

1. **Never renumber existing IDs** — ID changes silently break all sessions that reference the old ID
2. **Never reuse deleted IDs** — even after removing a question, its ID is retired permanently
3. **Only append** — new questions within a block must use the next sequential ID (e.g., after `1003` add `1004`)
4. **Use prefix for new modules** — new specialty modules should use a new descriptive prefix (e.g., `ENDO-*` for Endocrinology)
5. **Document the routing** — every new `logic.next` and `logic.conditional` must be commented
6. **Run i18n after adding** — `node scripts/generate-i18n.ts` must show 0 missing keys
7. **Run E2E test** — `npx playwright test e2e/questionnaire-flow.spec.ts` must pass

### Workflow checklist (see AGENT_WORKFLOWS.md Workflow A for full detail)

```
[ ] Check this file for next available ID in target section
[ ] Confirm ID does not exist: grep "id: '1004'" src/data/questions.ts
[ ] Add QuestionAtom to src/data/questions.ts
[ ] Add German translation to public/locales/de/translation.json
[ ] Add [TODO-TRANSLATE] placeholders to all 9 other language files
[ ] Run: node scripts/generate-i18n.ts  — must show 0 missing
[ ] Run: npm run build                   — must pass with 0 TS errors
[ ] Run: npx playwright test e2e/questionnaire-flow.spec.ts
[ ] Update this file (docs/QUESTION_CATALOG.md) with new question row
```
