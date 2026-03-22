# Agent Society Governance Blueprint (Phase 0)

> Status: **Policy-Only Rollout**  
> Scope: `anamnese-app/`  
> Ziel: Einfuehrung eines belastbaren Hybrid-Governance-Modells fuer Agenten als Gesellschaft, ohne Runtime-Codeaenderung in Phase 0.

---

## 1) Zielbild

DiggAI fuehrt ein **Hybrid-Modell** ein:

1. **Verfassungsebene (Constitution Layer)**
   - Nicht verhandelbare Regeln (Safety, Privacy, Human Oversight)
2. **Parlamentsebene (Policy Layer)**
   - Anpassbare Arbeitsregeln (SLA, Priorisierung, Quoren)
3. **Gerichtsebene (Review Layer)**
   - Streitfallbehandlung, Overrides, Eskalation, Lessons Learned

Dieses Modell verbindet:

- **Ethical-Social-Governance** (Werte, Fairness, Verantwortung)
- **Klassisches ESG** (E/S/G-Messbarkeit)
- **Social Government Engineering** (Institutionen, Rollen, Anreize, Sanktionen)

---

## 2) Verfassungsprinzipien (Nicht verhandelbar)

1. **Patient Safety First**
   - Klinisch sensible Entscheidungen duerfen nie ohne Human-Review finalisiert werden.
2. **PII-Minimierung in Governance-Artefakten**
   - Governance-Dokumente und Evidence enthalten keine Roh-Patientendaten.
3. **Accountability by Design**
   - Jede relevante Agentenentscheidung muss nachvollziehbar, zeitlich zuordenbar und reviewbar sein.
4. **Least Privilege**
   - Rollen und Agenten erhalten nur den minimal notwendigen Scope.
5. **Human Override Right**
   - Aerztliche/administrative Uebersteuerung bleibt jederzeit moeglich.

---

## 3) Gesellschaftsrollen (Subagent-fokussiert)

### 3.1 Constitutional Guardian

- Waechter der nicht verhandelbaren Regeln
- Blockiert Governance-Entscheidungen, die Safety/Privacy verletzen

### 3.2 Compliance Ombud

- Prueft DSGVO/HIPAA/BSI-Konformitaet von Governance-Entscheidungen
- Erzwingt PII-safe Evidence-Standards

### 3.3 Clinical Safety Twin

- Bewertet klinische Risiken aus Agentenentscheidungen
- Markiert Mandatory-Human-Review-Faelle

### 3.4 Parliament Clerk

- Pflegt abstimmungsfaehige Policies
- Fuehrt Policy-Versionierung und Delta-Protokoll

### 3.5 Evidence Archivist

- Sichert Entscheidungsnachweise in auditierten Artefakten
- Fuehrt Nachweis-Matrix (wer/was/wann/warum)

### 3.6 Escalation Judge

- Entscheidet bei Konflikten zwischen Rollen/Policies
- Triggert verbindliche Eskalationspfade

---

## 4) Entscheidungsarten und Governance-Pfade

| Entscheidungstyp | Beispiel | Quorum/Review | Finalisierung |
| --- | --- | --- | --- |
| Operativ Normal | Prioritaetsanpassung ohne klinischen Einfluss | Simple Majority | Parliament Clerk |
| Sensitiv | Security/Compliance-Konfigurationsentscheidung | Majority + Compliance Ombud | Escalation Judge |
| Klinisch Kritisch | Triage-/Eskalationsnahe KI-Entscheidung | Mandatory Clinical Safety Twin + Human Review | Menschliche Instanz |
| Compliance Kritisch | Potenzieller Datenschutz-/Audit-Verstoss | Mandatory Compliance Ombud + Escalation Judge | Menschliche Instanz |

---

## 5) Eskalationsmodell (Policy)

### 5.1 Hard Stops

- Potenzieller PHI-Leak in Governance-Texten/Evidence
- Klinische Hochrisikoentscheidung ohne Human-Signoff
- Unvollstaendige Audit-Trace bei entscheidungsrelevanten Agent-Aktionen

### 5.2 Eskalationsstufen

1. **Auto-Flag** (Agent/Policy)
2. **Role Review** (Ombud/Twin)
3. **Judge Review** (Escalation Judge)
4. **Human Authority** (Arzt/Admin/Compliance)

### 5.3 SLA-Rahmen (Phase 0 Richtwerte)

- Sensitiv: <= 4h
- Klinisch/Compliance kritisch: <= 30min bis menschliche Sichtung

---

## 6) ESG-Kennzahlenkatalog

### 6.1 E (Environmental)

- Compute-Aufwand pro Task (Proxy)
- Modellkosten pro erfolgreich abgeschlossener Entscheidung
- Wiederholungs-/Retry-Rate als Effizienzsignal

### 6.2 S (Social)

- Human-Override-Rate
- Erklaerbarkeitsabdeckung (entscheidungsrelevante Faelle mit nachvollziehbarer Begruendung)
- Konfliktquote zwischen Rollen

### 6.3 G (Governance)

- Audit-Vollstaendigkeitsquote
- Eskalations-SLA-Einhaltung
- Policy-Compliance-Quote je Entscheidungsart

Ampellogik:

- **Gruen**: >= 95% Zielerfuellung
- **Gelb**: 85–94%
- **Rot**: < 85% + Pflichtmassnahme im naechsten Review-Zyklus

---

## 7) 5-Zyklus-Operationalisierung (kompatibel zu KIMI)

| Zyklus | Governance-Zweck | Pflichtartefakt |
| --- | --- | --- |
| Sunrise | Tages-Commitments, Risiken, Policy-Checks | Cycle-Start-Note |
| Morning | Delta-Review, Drift-Erkennung | Drift-Log |
| Noon | Deep Audit + Eskalationsfenster | Midday Governance Check |
| Afternoon | Abschluss, Handover, offene Risiken | Handover Note |
| Moon | Accountability + Lessons + Policy-Updates | Governance Recap |

---

## 8) RACI (Phase 0 Baseline)

| Aktivitaet | Responsible | Accountable | Consulted | Informed |
| --- | --- | --- | --- | --- |
| Policy-Update vorbereiten | Parliament Clerk | Escalation Judge | Compliance Ombud | Alle Rollen |
| Klinisch kritischen Fall markieren | Clinical Safety Twin | Escalation Judge | Constitutional Guardian | Human Authority |
| Compliance-Konflikt bewerten | Compliance Ombud | Escalation Judge | Constitutional Guardian | Human Authority |
| Evidence-Artefakt sichern | Evidence Archivist | Escalation Judge | Compliance Ombud | Parliament Clerk |
| Hard Stop ausloesen | Constitutional Guardian | Escalation Judge | Compliance Ombud | Human Authority |

---

## 9) Phase-0 Umsetzungsumfang (jetzt)

### In Scope (sofort)

- Governance-Charta dokumentieren
- Rollenmodell + RACI definieren
- KPI-Set + Eskalationsregeln definieren
- Integration in bestehende Workflows/Compliance-Doku

### Out of Scope (spaeter)

- Neue DB-Tabellen/Runtime-Services
- Automatische Voting-Engine
- Durchsetzung via API-Gates

---

## 10) Phase-1+ Vorschau (Design Backlog)

1. Governance-Eventmodell in Audit-Spuren formalisieren
2. Policy-Versionierung mit Approval-Flow
3. Trust-/Reputation-Score pro Agent
4. Teilautomatisierte Eskalationsgates
5. Vollstaendige Hybrid-Governance mit Subagenten-Orchestrierung

---

## 11) Verifikation

Ein Governance-Review gilt als bestanden, wenn:

1. Jede kritische Entscheidung einen Human-Review-Pfad hat
2. Governance-Evidence keine PHI-Rohdaten enthaelt
3. ESG-KPIs fuer E/S/G messbar und reviewbar sind
4. Eskalations-SLAs und Hard Stops klar dokumentiert sind
5. RACI fuer alle kritischen Aktivitaeten hinterlegt ist
