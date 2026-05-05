# DiggAi — Eingangs-Routing-Regeln

> **Version:** 1.0 | **Datum:** 05.05.2026 | **Status:** Entwurf
> **Quelle:** `server/engine/RoutingEngine.ts`
> **Bezugsdokumente:** [`INTENDED_USE.md`](./INTENDED_USE.md), [`REGULATORY_POSITION.md`](./REGULATORY_POSITION.md), [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md), [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md)
> **Status der Vorgängerdatei:** `docs/TRIAGE_RULES.md` ist die historische Regelreferenz der inzwischen `@deprecated` markierten `TriageEngine`. Inhalte überlappen, aber dieser Datei (`ROUTING_RULES.md`) ist die maßgebliche.

---

## Regulatorische Einordnung — vorab

**Diese Datei beschreibt eine administrative Routing-Komponente, kein Medizinprodukt.**

Die hier dokumentierten Regeln werten Symptom-Stichworte aus, die der Patient in der Anmelde-Maske eingegeben hat, und markieren Anmeldungen für eine vorrangige Sichtung durch das Praxispersonal. Sie geben dem Patienten **keine Diagnose-Hinweise** und treffen **keine medizinischen Entscheidungen**. Die ärztliche Beurteilung verbleibt vollständig beim Praxispersonal.

Patient-facing Texte folgen einer Verbots-Wortliste (siehe [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md) §9.1) und werden technisch durch eine CI-Test-Suite (`server/engine/__tests__/RoutingEngine.regulatory.test.ts` + `e2e/regulatory/no-diagnosis-to-patient.spec.ts`) gegen Diagnose-Sprache abgesichert. Personal-facing Texte dürfen fachliche Begriffe enthalten — der Empfänger ist medizinisches Fachpersonal, nicht der Patient (siehe [`REGULATORY_POSITION.md`](./REGULATORY_POSITION.md) §5.3).

---

## Schema

### Stufen

| Stufe | Bedeutung | Patient-UI | Personal-UI |
|-------|-----------|------------|-------------|
| **PRIORITY** | Anmeldung sollte vom Personal vorrangig gesichtet werden | Vollbild-Overlay (`AnmeldeHinweisOverlay`) mit Workflow-Hinweis + 112-Direktwahl | `routing:hint` Socket-Event mit fachlicher Notiz an alle ARZT/MFA-Clients |
| **INFO** | Hinweis fürs Personal, Patient kann ohne Unterbrechung fortfahren | Inline-Banner (`AnmeldeHinweisBanner`) mit kurzem Workflow-Hinweis | `routing:hint` Socket-Event mit fachlicher Notiz |

### Felder eines `RoutingResult`

| Feld | Inhalt | Sichtbar für |
|------|--------|--------------|
| `ruleId` | stabile Regel-ID, z. B. `PRIORITY_ACS` | Audit, Logs |
| `level` | `INFO` \| `PRIORITY` | Audit, UI-Layout |
| `atomId` | auslösendes Frage-Atom, z. B. `1002` | Audit, Logs |
| `triggerValues` | konkret welche Werte ausgelöst haben | Audit, Logs |
| **`patientMessage`** | **workflow-only** Aufforderung — kein Diagnose-Wort, kein Verdacht. CI-Gate prüft. | Patient |
| **`staffMessage`** | fachliche Strukturierung der Eingaben — fachliche Begriffe erlaubt | Personal (ARZT, MFA) |
| `workflowAction` | `inform_staff_now` \| `priority_queue` \| `mark_for_review` \| `continue` | Workflow-Engine |

### Patient-Message-Bausteine

Vier Standard-Hinweise werden zentral verwaltet (Code: `server/engine/RoutingEngine.ts`), damit i18n nur eine Stelle anfassen muss:

- **PATIENT_HINT_INFORM_NOW** — „Bitte wenden Sie sich umgehend an das Praxispersonal an der Anmeldung. Falls niemand erreichbar ist, wählen Sie den europäischen Notruf 112."
- **PATIENT_HINT_INFORM_STAFF** — „Bitte informieren Sie das Praxispersonal über diesen Vorgang."
- **PATIENT_HINT_SUPPORT_AVAILABLE** — „Wir möchten sicherstellen, dass Sie die richtige Unterstützung erhalten. Bitte sprechen Sie das Praxispersonal an. Sofort und kostenfrei erreichbar: Telefonseelsorge 0800 111 0 111 (24/7)."
- **PATIENT_HINT_REVIEW_INPUTS** — „Bitte überprüfen Sie Ihre Angaben. Falls Sie Hilfe benötigen, wenden Sie sich an das Praxispersonal an der Anmeldung."
- **PATIENT_HINT_REVIEW_AT_RECEPTION** — „Bitte besprechen Sie diesen Punkt mit dem Praxispersonal an der Anmeldung."

---

## PRIORITY-Regeln (4)

Personal sichtet vorrangig. Patient sieht ein Vollbild-Overlay.

### PRIORITY_ACS

| Aspekt | Wert |
|--------|------|
| Atom | `1002` (Beschwerde-Auswahl) |
| Auslöser | Wert enthält `brust`, `atemnot` oder `laehmung` |
| Patient-Hinweis | PATIENT_HINT_INFORM_NOW |
| Personal-Notiz | „Patient meldet Symptome aus Cluster ACS-Verdacht (`<triggers>`). Sofortige ärztliche Sichtung empfohlen." |
| Workflow-Action | `inform_staff_now` |

### PRIORITY_SUIZID

| Aspekt | Wert |
|--------|------|
| Atom | `1C14` (Suizidalitäts-Screening) |
| Auslöser | Wert `'ja'` oder `true` |
| Patient-Hinweis | PATIENT_HINT_SUPPORT_AVAILABLE |
| Personal-Notiz | „Patient bejaht Frage 1C14 (Suizidalitäts-Screening). Sofortige persönliche Ansprache durch Praxispersonal empfohlen; psychotherapeutische Mitbeurteilung erwägen." |
| Workflow-Action | `inform_staff_now` |

### PRIORITY_SAH

| Aspekt | Wert |
|--------|------|
| Atom | `1181` (Kopfschmerz-Charakteristik) |
| Auslöser | Wert enthält `donnerschlag` |
| Patient-Hinweis | PATIENT_HINT_INFORM_NOW |
| Personal-Notiz | „Patient beschreibt plötzlich einsetzenden, stärksten Kopfschmerz (Donnerschlag-Charakteristik). Subarachnoidalblutung differentialdiagnostisch erwägen, vorrangige ärztliche Beurteilung empfohlen." |
| Workflow-Action | `inform_staff_now` |

### PRIORITY_SYNCOPE

| Aspekt | Wert |
|--------|------|
| Atom | `1185` (Bewusstseinsverlust-Frage) |
| Auslöser | Wert enthält `bewusstlosigkeit` oder `bewusstseinsverlust` |
| Patient-Hinweis | PATIENT_HINT_INFORM_STAFF |
| Personal-Notiz | „Patient gibt zwischenzeitlichen Bewusstseinsverlust an. Synkopen-Abklärung empfohlen, vorrangige ärztliche Sichtung." |
| Workflow-Action | `inform_staff_now` |

---

## INFO-Regeln (6)

Hinweis fürs Personal, Patient fährt ohne Unterbrechung fort.

### INFO_BLUTUNG

| Aspekt | Wert |
|--------|------|
| Atome | `7000` (Gerinnungsstörung) **+** `6005` (Antikoagulanzien-Liste) |
| Auslöser | `7000` enthält `gerinnung` **UND** `6005` enthält eines von `marcumar`, `xarelto`, `eliquis`, `pradaxa`, `lixiana` |
| Patient-Hinweis | PATIENT_HINT_REVIEW_AT_RECEPTION |
| Personal-Notiz | „Patient gibt Gerinnungsstörung an und nimmt orale Antikoagulanzien (`<liste>`). Erhöhtes Blutungsrisiko bei invasiven Maßnahmen — bitte berücksichtigen." |
| Workflow-Action | `mark_for_review` |

### INFO_DIABETISCHER_FUSS

| Aspekt | Wert |
|--------|------|
| Atome | `5000` (Diabetes ja/nein) **+** `1002` (Beschwerden) |
| Auslöser | `5000` = `'Ja'` **UND** `1002` enthält `beine` oder `wunde` |
| Patient-Hinweis | PATIENT_HINT_REVIEW_AT_RECEPTION |
| Personal-Notiz | „Patient mit Diabetes mellitus berichtet Bein-/Wundbeschwerden. Diabetisches Fußsyndrom differentialdiagnostisch erwägen." |
| Workflow-Action | `mark_for_review` |

### INFO_RAUCHER_ALTER

| Aspekt | Wert |
|--------|------|
| Atom | `4002` (Rauchen ja/nein) + Kontext `age` |
| Auslöser | `4002` = `'Ja'` **UND** `age > 65` |
| Patient-Hinweis | PATIENT_HINT_REVIEW_AT_RECEPTION |
| Personal-Notiz | „Aktiver Raucher, Alter `<n>`. Vorsorge-Empfehlungen (Lungenfunktion, Herz-Kreislauf-Screening) ggf. ansprechen." |
| Workflow-Action | `mark_for_review` |

### INFO_SCHWANGERSCHAFT_INKONSISTENT

| Aspekt | Wert |
|--------|------|
| Atom | `8800` (Schwangerschaft) + Kontext `gender` |
| Auslöser | `gender` = `'M'` **UND** `8800` = `'ja'` |
| Patient-Hinweis | PATIENT_HINT_REVIEW_INPUTS |
| Personal-Notiz | „Inkonsistente Angabe in den erfassten Stammdaten: Geschlecht männlich + Schwangerschaft bejaht. Patient bitten, Angaben zu prüfen." |
| Workflow-Action | `mark_for_review` |

### INFO_POLYPHARMAZIE

| Aspekt | Wert |
|--------|------|
| Atom | `8900` (Medikamentenliste) |
| Auslöser | Array-Länge > 5 |
| Patient-Hinweis | PATIENT_HINT_REVIEW_AT_RECEPTION |
| Personal-Notiz | „Patient nimmt `<n>` Wirkstoffe ein. Polypharmazie-Check (Wechselwirkungen, Adhärenz) empfohlen." |
| Workflow-Action | `mark_for_review` |

### INFO_DOPPELTE_BLUTVERDUENNUNG

| Aspekt | Wert |
|--------|------|
| Atom | `6005` (Antikoagulanzien-Liste) |
| Auslöser | Array-Länge > 1 |
| Patient-Hinweis | PATIENT_HINT_REVIEW_AT_RECEPTION |
| Personal-Notiz | „Patient nimmt mehr als ein Antikoagulans gleichzeitig (`<liste>`). Indikation und Blutungsrisiko überprüfen." |
| Workflow-Action | `mark_for_review` |

---

## Änderungen an Routing-Regeln

Routing-Regeln berühren das Praxis-Workflow-Verhalten und werden in [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md) protokolliert. Sign-off-Pflicht:

1. **Klinische Begründung** — schriftlich
2. **Sign-off Dr. Klapproth** (Allgemeinmedizin) — alle Regeltypen
3. **Sign-off Dr. Al-Shdaifat** (Innere Medizin) — Pflicht für PRIORITY-Regeln
4. **Patient-Output-Test** — `patientMessage` darf nach Änderung kein Diagnose-Wort enthalten (`RoutingEngine.regulatory.test.ts` muss grün laufen)
5. **Personal-Output-Test** — falls eine bestehende Regel die fachliche Sprache ändert, muss die Personal-UI manuell verifiziert werden
6. **i18n** — bei neuen Patient-Message-Bausteinen alle 10 Sprachfiles ergänzen

---

## Migrationshinweis (TriageEngine → RoutingEngine)

Die alte `TriageEngine` exportiert `TriageResult` mit einem einzelnen `message`-Feld, das **dem Patienten** angezeigt wird. Diese Sprache enthält medizinische Aussagen („… könnten auf einen medizinischen Notfall hindeuten") und würde DiggAi unter MDR Annex VIII Rule 11 als Klasse IIa/IIb-Medizinprodukt qualifizieren.

Die neue `RoutingEngine` ersetzt `message` durch:
- `patientMessage` — workflow-only, gehärtet durch CI-Gate
- `staffMessage` — fachlich, nur Personal-UI

`TriageEngine` ist als `@deprecated` markiert. Aufrufer (`server/routes/answers.ts`, Socket-Listener im Frontend, `RedFlagOverlay`-Konsumenten) werden in folgenden Folge-PRs schrittweise umgestellt — siehe Folge-Aufgaben in [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md).
