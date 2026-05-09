# DiggAi Capture — Post-Market-Surveillance-Plan v0.1

> **Status:** Entwurf · **Verfasser:** Christian Klaproth · **Stand:** 9. Mai 2026
> **Bezug:** Auch wenn DiggAi Capture als „Kein Medizinprodukt nach MDR Art. 2(1)" deklariert ist, betreibt der Hersteller freiwillig eine PMS-Strategie. Sie schützt vor Reklassifizierungs-Druck und ermöglicht frühzeitige Erkennung von Drift Richtung MDSW.

---

## 1. Zielsetzung

1. **Beobachtung der tatsächlichen Software-Nutzung** — passt das Verhalten in der Praxis noch zur deklarierten Zweckbestimmung?
2. **Beobachtung der externen Wahrnehmung** — wird DiggAi in Marketing/Presse so dargestellt, dass die Class-I-Position erhalten bleibt?
3. **Beobachtung regulatorischer Entwicklungen** — MDCG-Updates, BfArM-Hinweise, EU-Rechtsprechung zur Software-Klassifizierung.
4. **Beobachtung von Patienten- und Praxen-Beschwerden** — Hinweise auf unbeabsichtigte medizinische Aussagen.

## 2. Quartalsweise PMS-Kontrolle (CK persönlich)

Jeweils zum **15. März, 15. Juni, 15. September, 15. Dezember** prüft CK die folgenden Punkte und füllt das Quartalsreport-Template aus:

### 2.1 Code-Drift-Check

- [ ] CI-Test-Suite `e2e/regulatory/no-diagnosis-to-patient.spec.ts` läuft grün
- [ ] CI-Test-Suite `server/engine/__tests__/RoutingEngine.regulatory.test.ts` läuft grün
- [ ] Marketing-Audit `scripts/marketing-audit.cjs` läuft ohne Findings
- [ ] Keine neuen LLM-Prompts ohne `PATIENT_PROMPT_GUARD`
- [ ] Verbots-Wortliste (siehe `docs/REGULATORY_STRATEGY.md` §9.1) nicht in Patient-facing-Strings

### 2.2 Marketing-Drift-Check

- [ ] LandingPage-Texte gegen Verbots-Wortliste prüfen
- [ ] App-Store-Beschreibung (falls existent)
- [ ] Social-Media-Posts (LinkedIn, Twitter, etc.)
- [ ] Praxis-Onboarding-Materialien (Welcome-Letter)

### 2.3 Nutzungs-Drift-Check

- [ ] Wie viele Praxen nutzen DiggAi? (Tenant-Count)
- [ ] Wie viele Patient-Anmeldungen pro Quartal?
- [ ] Welche Services werden genutzt? (Anamnese, Rezept, AU, BG)
- [ ] Welche Sprachen werden genutzt?

### 2.4 Beschwerden-Check

- [ ] Patienten-Beschwerden via DSGVO-Auskunfts-Anfragen: Anzahl?
- [ ] Praxis-Beschwerden / Bug-Reports: Anzahl, Schweregrad?
- [ ] Behörden-Anfragen: gab es welche?

### 2.5 Regulatorischer Drift-Check

- [ ] MDCG hat neue Guidance veröffentlicht?
- [ ] BfArM hat neue DiGA-/Software-Hinweise?
- [ ] EU-Rechtsprechung zu Software-Klassifizierung?
- [ ] Wettbewerber als „Klasse IIa" eingestuft worden, die ähnliche Funktionalität haben?

## 3. Quartalsreport-Template

Jeder Report wird als `docs/PMS/PMS_REPORT_<YYYY-Q1|Q2|Q3|Q4>.md` archiviert.

```markdown
# PMS-Quartalsreport YYYY Qx

## Kennzahlen
- Aktive Tenants: ___
- Patient-Anmeldungen: ___
- Service-Verteilung: Anamnese ___, Rezept ___, AU ___, BG ___
- Top-3-Sprachen: ___, ___, ___

## Code-Drift
- ✅/❌ Regulatorische CI-Tests grün
- Findings: ...

## Marketing-Drift
- ✅/❌ Verbots-Wortliste-Konformität
- Geänderte Texte: ...

## Beschwerden
- DSGVO-Auskünfte: ___
- Bug-Reports: ___
- Behörden-Anfragen: ___ (falls ja: Detail)

## Regulatorisch
- MDCG-Updates: ___
- BfArM-Updates: ___
- Wettbewerber-Reklassifizierungen: ___

## Empfehlung
- ☐ Status quo halten
- ☐ Korrekturmaßnahmen erforderlich (Detail: ___)
- ☐ Reklassifizierungs-Pfad Spur B starten

## Sign-off
- Verfasser: Christian Klaproth, ___ (Datum)
- Medical Advisor: Onkel Laith, ___ (Datum)
```

## 4. Reaktion auf negative Befunde

### 4.1 Code-Drift erkannt

- **Schwere niedrig** (z.B. ein Verbots-Wort in einer Marketing-Kopie): Sofort fixen, dokumentieren in `docs/CHANGE_LOG_REGULATORY.md`.
- **Schwere mittel** (z.B. neue Patient-facing-Funktion mit medizinischer Aussage): Funktion sofort hinter Feature-Flag, Re-Review, ggfs. zurückrollen.
- **Schwere hoch** (z.B. CI-Test-Suite schlägt aus): Production-Deploy-Stop, Hotfix-Sprint.

### 4.2 Beschwerde-Häufung

- ≥3 ähnliche Patienten-Beschwerden pro Quartal: Root-Cause-Analyse + öffentliche Stellungnahme
- ≥1 Behörden-Anfrage: Anwalt einbeziehen, dokumentierte Antwort

### 4.3 Reklassifizierungs-Druck

- Beanstandung durch Marktaufsicht: Stellungnahme via `REGULATORY_POSITION.md` + MDCG-2019-11
- Wenn Behörde an MDSW-Auffassung festhält: Spur B (Class-I-Selbstdeklaration) aktivieren

## 5. Aufbewahrungsfristen

- PMS-Quartalsreports: **mindestens 10 Jahre** (analog MDR-Pflichten obwohl freiwillig)
- Beschwerden + Antworten: **mindestens 5 Jahre**
- Code-CI-Test-Berichte: **mindestens 3 Jahre**

## 6. Erstmalige Aktivierung

**Nächster planmäßiger Report:** **15. Juni 2026** (Q2 2026).

CK trägt das Datum in seinen Praxis-Kalender ein. Reminder per `_System/templates/HEUTE_template.md` am 14. Juni.

---

**Sign-off:**

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Geschäftsführung | Christian Klaproth | _____ | _____ |
| Medical Advisor | Onkel Laith Al-Shdaifat | _____ | _____ |
