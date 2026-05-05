# DiggAi — Regulatorische Position

> **Version:** 1.0 | **Status:** Entwurf — wartet auf Sign-off Geschäftsführung
> **Zweck:** Begründung, dass DiggAi in seiner geltenden Zweckbestimmung **kein Medizinprodukt** im Sinne der MDR (Verordnung (EU) 2017/745) ist.
> **Bezugsdokumente:** [`INTENDED_USE.md`](./INTENDED_USE.md), [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md), MDCG 2019-11.
> **Auslegung:** Diese Position kann bei einer Anfrage durch die zuständige Marktüberwachung (in Hamburg: Behörde für Justiz und Verbraucherschutz) als Hersteller-Begründung vorgelegt werden.

---

## 1. Frage

Erfüllt DiggAi in der Zweckbestimmung gemäß [`INTENDED_USE.md`](./INTENDED_USE.md) den Medizinprodukte-Begriff nach **Verordnung (EU) 2017/745 Artikel 2 Absatz 1**?

## 2. Antwort (Zusammenfassung)

**Nein.** DiggAi ist in der dokumentierten Zweckbestimmung als **administratives Werkzeug** zur Praxis-Anmeldung und zum Praxis-internen Routing klassifiziert. Es ist nicht „vom Hersteller bestimmt für den Einsatz beim Menschen für einen oder mehrere der folgenden medizinischen Zwecke" (MDR Art. 2(1)) — weder Diagnose, Verhütung, Überwachung, Vorhersage, Prognose, Behandlung noch Linderung von Krankheiten. Folglich ist DiggAi kein Medizinprodukt und unterliegt nicht der MDR.

Die Begründung folgt MDCG 2019-11, dem offiziellen Auslegungs-Leitfaden der EU-Kommission zur Qualifizierung und Klassifizierung von Software unter der MDR.

## 3. MDR Artikel 2 Absatz 1 — Subsumtion

Art. 2(1) definiert ein Medizinprodukt als „**Instrument, Apparat, Gerät, Software, Implantat, Reagenz, Material oder anderer Gegenstand**, dem [der/das] vom Hersteller zur Anwendung beim Menschen für einen oder mehrere der folgenden **spezifischen medizinischen Zwecke** bestimmt ist:

- Diagnose, Verhütung, Überwachung, Vorhersage, Prognose, Behandlung oder Linderung von Krankheiten,
- Diagnose, Überwachung, Behandlung, Linderung von oder Kompensierung von Verletzungen oder Behinderungen,
- Untersuchung, Ersatz oder Veränderung der Anatomie oder eines physiologischen oder pathologischen Vorgangs oder Zustands,
- Gewinnung von Informationen durch die In-vitro-Untersuchung von aus dem menschlichen Körper — auch aus Organ-, Blut- und Gewebespenden — stammenden Proben."

| Tatbestandsmerkmal | DiggAi-Bezug | Erfüllt? |
|--------------------|--------------|----------|
| Software | DiggAi ist Software | ja |
| **vom Hersteller bestimmt** | maßgeblich ist die Hersteller-Zweckbestimmung in [`INTENDED_USE.md`](./INTENDED_USE.md) | — |
| Anwendung beim Menschen | Patient-Eingaben werden erfasst | ja, aber irrelevant ohne medizinischen Zweck |
| **medizinischer Zweck** (Diagnose / Verhütung / Überwachung / Vorhersage / Prognose / Behandlung / Linderung) | DiggAi: keiner dieser Zwecke; Hersteller-Bestimmung explizit administrativ | **nein** |

→ Da das Tatbestandsmerkmal „medizinischer Zweck" **vom Hersteller nicht festgelegt wird**, ist die Definition des Art. 2(1) MDR **nicht erfüllt**. DiggAi ist kein Medizinprodukt.

## 4. MDCG 2019-11 Decision Tree

MDCG 2019-11 ist der EU-weit anerkannte Auslegungs-Leitfaden zur Qualifizierung und Klassifizierung von Software unter MDR/IVDR. Er stellt einen Entscheidungsbaum bereit, dessen erster Schritt für DiggAi entscheidend ist.

### 4.1 Schritt 1: Ist die Software überhaupt MDSW (Medical Device Software)?

> *„Is the software performing an action different from storage, archival, communication or simple search?"*
> *„Is the action for the benefit of individual patients?"*
> *„Is the action a medical purpose?"*

**Anwendung auf DiggAi:**

- DiggAi führt Aktionen aus, die über reine Speicherung hinausgehen (Strukturierung, Routing, Sprach-Übersetzung).
- Die Aktionen dienen jedoch **organisatorischen Zwecken der Arztpraxis** — nicht dem direkten **medizinischen Nutzen** des einzelnen Patienten.
  - Sprach-Übersetzung des Anmelde-Formulars dient der Barrierefreiheit, nicht der medizinischen Behandlung.
  - Workflow-Routing an die richtige Praxis-Station ist eine Verwaltungsaktion.
  - Das einzige Element mit potentiellem Patient-Bezug ist die Anzeige eines Workflow-Hinweises („Bitte sprechen Sie das Personal an") — diese ist explizit **nicht-medizinisch** formuliert (keine Diagnose, kein Verdacht, keine Empfehlung) und entspricht einer Aufforderung wie „Bitte gehen Sie zum Schalter 3".
- **Ergebnis Schritt 1:** Die Software ist **kein MDSW**. Der Decision Tree endet hier.

### 4.2 Schritt-1-Beispiele aus MDCG 2019-11 selbst

Der Leitfaden nennt explizit als Nicht-MDSW-Beispiele:

- *„Software for keeping medical records, billing, scheduling, accounting"* — Verwaltungssoftware.
- *„Software for general purpose information storage and retrieval"* — Informationsverwaltung.
- *„Software intended only to support administrative tasks (e.g. patient management, scheduling)"* — Administrative Aufgaben einschließlich Patient-Management.

DiggAi fällt unter „administrative tasks" und „patient management": Es **verwaltet** den Anmelde-Vorgang und **leitet** die Anmeldung an die richtige Stelle in der Praxis weiter.

## 5. Behandlung der bisherigen „Triage-Engine"

### 5.1 Historischer Stand

Bis einschließlich Repository-Stand 04.05.2026 enthielt DiggAi eine als „TriageEngine" bezeichnete Komponente, deren CRITICAL-Regeln dem **Patienten** Diagnose-Hypothesen ausgaben (Beispiele aus `server/engine/TriageEngine.ts`):

- „Ihre Symptome ... könnten auf einen medizinischen Notfall hindeuten" (Regel `CRITICAL_ACS`)
- „Donnerschlagkopfschmerz kann auf eine Subarachnoidalblutung hindeuten" (Regel `CRITICAL_SAH`)

Diese Texte wären isoliert betrachtet **diagnostische Aussagen** im Sinne von MDR Art. 2(1) und hätten den Status als MDSW (mindestens Klasse IIa nach MDR Annex VIII Rule 11) ausgelöst.

### 5.2 Refactor zur Wahrung der Nicht-MDSW-Position

Mit dem Refactor gemäß [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md) §6.2 (Implementation in Phase „Spur A") wird:

1. die Komponente in **`RoutingEngine`** umbenannt;
2. der Patient-Output strikt auf **Workflow-Hinweise** reduziert (kein medizinischer Begriff, kein Verdacht, keine Diagnose) — Beispiel: „Bitte wenden Sie sich umgehend an das Praxispersonal";
3. der diagnostische Text ausschließlich an das **Praxispersonal** (Arzt, MFA) ausgegeben — dort handelt es sich um interne Praxis-Kommunikation zwischen Fachpersonen, nicht um eine medizinische Aussage der Software gegenüber dem Patienten;
4. die Trennung **technisch durch CI-Tests abgesichert** (`e2e/regulatory/no-diagnosis-to-patient.spec.ts`).

Nach Abschluss des Refactors gibt DiggAi gegenüber dem Patienten **keine medizinische Aussage** mehr aus. Die fachliche Information an das Personal ist eine Praxis-interne Workflow-Kommunikation, keine medizinische Bewertung der Software an einen Patienten.

### 5.3 Position der Hinweise an das Personal

Der Hinweis an das Praxispersonal („Patient meldet Symptome aus Cluster X — sofortige ärztliche Sichtung empfohlen") ist eine **Strukturierung der Patient-Eingaben**, kein eigenes Werturteil der Software. Vergleichbar mit einer:

- Notiz der Empfangssekretärin, die einem Arzt zuruft: „Patient X hat starke Brustschmerzen erwähnt";
- Markierung in einer Aufgabenliste, die einen Vorgang als „dringend" einstuft.

Diese Form der **Sortier- und Hinweis-Kommunikation zwischen medizinischem Fachpersonal innerhalb derselben Praxis** ist keine medizinische Aussage *des Geräts*, sondern eine Praxis-interne Organisations-Information. Der Arzt bleibt der medizinische Entscheider.

## 6. Abgrenzung zu DiGA und IVD

| Regime | Trifft auf DiggAi zu? | Begründung |
|--------|------------------------|------------|
| **MDR (Medizinprodukt)** | nein | siehe oben |
| **IVDR (In-vitro-Diagnostikum)** | nein | DiggAi untersucht keine Körperproben |
| **DiGA (§139e SGB V)** | nein | DiGAs sind Versicherten-Apps mit ärztlicher Verordnung; DiggAi ist eine Praxis-Software |
| **DiPA (§40a SGB XI)** | nein | DiPAs sind Pflegeanwendungen für Pflegebedürftige |
| **MPDG (Medizinprodukterecht-Durchführungsgesetz)** | nein | greift nur, wenn MDR greift |
| **DSGVO (DSGVO Art. 9 Gesundheitsdaten)** | **ja** | DiggAi verarbeitet besondere personenbezogene Daten |
| **TI-Anbindung verpflichtend (§291a SGB V)** | nein | DiggAi ersetzt keine Komponente der TI; optionale ePA-Schnittstelle bleibt freiwillig |
| **BSI TR-03161 (Mobile Apps)** | optional | nicht verpflichtend, aber als Best-Practice-Referenz herangezogen |

## 7. Verbleibende regulatorische Pflichten

Auch ohne MDR bleibt DiggAi an folgende Regelwerke gebunden:

| Regelwerk | Status |
|-----------|--------|
| DSGVO + BDSG | erfüllt — DSFA, AVV, Verfahrensverzeichnis vorhanden |
| TTDSG / TDDDG (Cookies, Endgerät-Zugriff) | erfüllt — Cookie-Banner mit § 25 TDDDG, granular |
| Patientendaten-Schutzgesetz (PDSG) | erfüllt im DSGVO-Rahmen |
| Telemediengesetz (TMG / DSA-Folgegesetz) | erfüllt — Impressum, Verantwortlichkeit |
| Heilmittelwerbegesetz (HWG) | **kritisch** — Marketing darf keine medizinischen Versprechen enthalten (siehe `REGULATORY_STRATEGY.md` §9) |
| eIDAS-Verordnung (Signaturen) | adressiert — qualifizierte Signaturen optional |
| Berufsordnung Ärzte (z. B. Hamburg, §1) | tangiert — DiggAi unterstützt, ersetzt nicht |
| BGB (Vertragsrecht mit Praxen) | beachtet — AGB, AVV |

## 8. Hersteller-Pflicht zur Beobachtung

Der Hersteller verpflichtet sich, mindestens halbjährlich zu überprüfen, ob:

1. die Zweckbestimmung in [`INTENDED_USE.md`](./INTENDED_USE.md) noch dem tatsächlichen Produktverhalten entspricht;
2. neue Funktionen (z. B. erweiterte LLM-Outputs, neue Routing-Regeln) den Status als „Nicht-MDSW" gefährden;
3. Marketing- und UI-Texte sich nicht in eine medizinische Zweckbestimmung verschoben haben (Verbots-Wortliste prüfen);
4. behördliche Auslegungs-Leitlinien (MDCG-Updates, BfArM-Hinweise) sich geändert haben.

Die Ergebnisse werden in [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md) dokumentiert.

## 9. Reaktion bei Reklassifizierungs-Druck

Falls die Marktaufsichtsbehörde, ein Notified Body, ein Wettbewerber oder ein Kunde gegenüber dem Hersteller die Auffassung vertritt, DiggAi sei doch ein Medizinprodukt:

1. **Erste Reaktion:** Übersendung dieses Dokuments + [`INTENDED_USE.md`](./INTENDED_USE.md) + CI-Beleg `e2e/regulatory/`-Suite;
2. **Zweite Reaktion:** Stellungnahme mit MDCG-2019-11-Decision-Tree-Subsumtion;
3. **Dritte Reaktion:** Einbindung externer Regulatory-Berater (Empfehlungen siehe `REGULATORY_STRATEGY.md` §13.4);
4. **Vierte Reaktion (falls Behörde an MDSW-Auffassung festhält):** Sofortige Vertriebsanpassung — entweder Änderung der Zweckbestimmung zurück in unbedenkliche Richtung, oder kontrollierter Übergang in MDR-Klasse-I-Selbstdeklaration (Spur B `REGULATORY_STRATEGY.md` §7).

## 10. Anhang — Volltext Hersteller-Erklärung

Volltext siehe [`REGULATORY_STRATEGY.md`](./REGULATORY_STRATEGY.md) Anhang A. Das unterzeichnete PDF wird unter `docs/legal/Hersteller-Erklaerung_Kein-Medizinprodukt_v1.0.pdf` archiviert.

---

**Sign-off:**

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Geschäftsführung | Dr. Klapproth | __________ | __________ |
| Medical Advisor | Dr. Al-Shdaifat | __________ | __________ |
| Externer Regulatory-Berater (optional) | __________ | __________ | __________ |
