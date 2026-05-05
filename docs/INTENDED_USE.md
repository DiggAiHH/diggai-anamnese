# DiggAi — Zweckbestimmung (Intended Use)

> **Version:** 1.0 | **Status:** Entwurf — wartet auf Sign-off Geschäftsführung
> **Verbindlichkeit:** Dieses Dokument ist die **maßgebliche Zweckbestimmung des Herstellers** und überschreibt alle widersprüchlichen Aussagen in Marketing, UI, Datenschutz, Verträgen oder Code-Kommentaren.
> **Bezug:** Grundlage der Hersteller-Erklärung „Kein Medizinprodukt" gemäß MDR Verordnung (EU) 2017/745 Art. 2(1) — siehe [`REGULATORY_POSITION.md`](./REGULATORY_POSITION.md).

---

## 1. Produktidentifikation

| Feld | Wert |
|------|------|
| Produktname | **DiggAi Praxis-Anmelde- und Routing-Plattform** |
| Versionierung | semver, aktuell `v3.x` |
| Hersteller | DiggAi GmbH (in Gründung), Hamburg |
| Hersteller-Vertretung | Dr. Klapproth |
| Verantwortliche Person Compliance | Dr. Klapproth (vorläufig, vor Markteintritt durch QM-Beauftragten zu ergänzen) |
| Auslieferungsform | Web-Anwendung (Single Page Application) + Backend-Service; alternativ als On-Premise-Container für die Praxis |

## 2. Zweckbestimmung — Wortlaut

> **DiggAi ist eine administrative Praxis-Anmelde- und Routing-Plattform für deutsche Arztpraxen. Sie strukturiert die vom Patienten selbst eingegebenen Stammdaten, Anliegen-Beschreibungen und Symptom-Stichworte in einem mehrsprachigen, barrierefreien Online-Formular und leitet die strukturierten Eingaben an das medizinische Praxispersonal weiter.**
>
> **Zweck der Software ist ausschließlich die organisatorische Effizienz der Arztpraxis** — die Reduktion papierbasierter Anmeldevorgänge, die Bereitstellung der Anmelde-Maske in zehn Sprachen einschließlich Rechts-zu-links-Sprachen, die automatisierte Weiterleitung der Patienten-Eingaben an den jeweils zuständigen Arbeitsplatz innerhalb der Praxis und die Bereitstellung einer strukturierten Vorbereitungs-Information für die anschließende ärztliche Sprechstunde.
>
> **DiggAi trifft keine medizinischen Entscheidungen. DiggAi stellt keine Diagnosen, keine Verdachtsdiagnosen, keine Differenzialdiagnosen, keine Risiko-Bewertungen und keine Therapieempfehlungen. DiggAi gibt dem Patienten keine medizinischen Hinweise und kein medizinisches Coaching. DiggAi ersetzt nicht die ärztliche Untersuchung, Anamnese, Beurteilung oder Behandlung.**
>
> **Die medizinische Beurteilung — einschließlich der Erkennung von Notfällen, der Triagierung von Dringlichkeitsstufen und jeder Diagnose- oder Therapieentscheidung — verbleibt vollständig und ausschließlich beim ärztlichen und medizinischen Fachpersonal der nutzenden Arztpraxis.**

## 3. Bestimmungsgemäßer Anwender

| Anwender | Rolle in DiggAi |
|----------|-----------------|
| **Patient** | Erfasst Stammdaten, Anliegen und Symptom-Stichworte am eigenen Endgerät, am Praxis-Tablet oder am Praxis-Kiosk. Nutzt DiggAi nicht zur Selbstdiagnose. |
| **Medizinische Fachangestellte (MFA)** | Empfängt strukturierte Anmelde-Information; trifft die organisatorische Triage und Weiterleitung; bleibt fachlich verantwortlich. |
| **Arzt** | Empfängt strukturierte Vorbereitungs-Information; führt Anamnese, Diagnose und Therapie selbst durch. |
| **Praxis-Administrator** | Konfiguriert das System (Fragenkatalog, Praxis-Stammdaten, Berechtigungen). |

DiggAi wird **nicht** an Versicherte direkt verkauft, **nicht** zur Selbstmedikation eingesetzt, **nicht** als Telemedizin-Dienst betrieben und **nicht** in Notaufnahmen, Rettungsleitstellen oder zur akuten Notfallversorgung verwendet.

## 4. Bestimmungsgemäßer Einsatzort

DiggAi ist ausschließlich für den Einsatz in **niedergelassenen Arztpraxen, Medizinischen Versorgungszentren (MVZ) und Facharzt-Zentren in Deutschland** bestimmt. Eine Verwendung in stationären Einrichtungen, Notaufnahmen, Rettungsdiensten, Pflegeeinrichtungen oder im häuslichen Umfeld des Patienten ist nicht vorgesehen.

## 5. Funktionsumfang

### 5.1 Was DiggAi tut (administrativ)

1. Strukturierte Erfassung von **Stammdaten** (Name, Geburtsdatum, Versicherung, Kontakt) durch den Patienten selbst.
2. Strukturierte Erfassung des **Anliegens** des Patienten in eigenen Worten oder per vordefinierter Auswahl-Listen (270+ Frage-Atome aus 13 Fachbereichen).
3. Sprach-Übersetzung der Anmelde-Maske in **zehn Sprachen** einschließlich Arabisch und Farsi (RTL).
4. **Automatisierte Weiterleitung** der strukturierten Eingaben an den jeweils zuständigen Arbeitsplatz in der Praxis (Empfang, MFA, Arzt, Telemedizin-Konsole).
5. **Workflow-Markierung von Anmeldungen mit erhöhter organisatorischer Dringlichkeit** auf Basis vorab konfigurierter Symptom-Stichwort-Cluster — die Markierung ist ein **Hinweis an das Praxispersonal**, dass eine Anmeldung mit Vorrang vom Personal gesichtet werden sollte. Die Markierung ist **keine medizinische Aussage**, **keine Diagnose**, **keine Triage** und **kein Notfall-Erkennungs-Signal**.
6. Bereitstellung einer **strukturierten Zusammenfassung** der Patient-Eingaben als Vorbereitungs-Information für den Arzt.
7. **Mehrsprachige strukturierte Dokumentation** in der elektronischen Patientenakte der Praxis.
8. **Audit-Trail** aller Eingaben und Zugriffe für Datenschutz- und Compliance-Zwecke (DSGVO Art. 30).

### 5.2 Was DiggAi nicht tut (medizinisch)

1. DiggAi **erkennt keine Krankheiten**, **keine Notfälle** und **keine medizinischen Befunde**.
2. DiggAi **stellt keine Diagnose**, **keine Verdachtsdiagnose** und **keine Differenzialdiagnose**.
3. DiggAi **berechnet keine medizinischen Risiko-Scores** und **gibt keine medizinischen Bewertungen aus**.
4. DiggAi **empfiehlt keine Behandlung**, **keine Therapie**, **keine Medikation** und **keine medizinische Maßnahme**.
5. DiggAi **gibt dem Patienten keinen medizinischen Hinweis**, **keine medizinische Information** und **keine medizinische Beratung**.
6. Die in der Software angezeigten **Workflow-Hinweise an den Patienten** (z. B. „Bitte sprechen Sie das Praxispersonal an") sind ausschließlich organisatorische Aufforderungen ohne medizinische Bewertung.
7. Die in der Software angezeigten **fachlichen Hinweise an das Personal** sind keine eigene medizinische Aussage der Software, sondern eine **Strukturierung der vom Patienten erfassten Eingaben** für das fachlich allein verantwortliche Personal.

### 5.3 Abgrenzung zur Triage

Der Begriff **Triage** ist ein medizinisch-fachlicher Begriff für die Sortierung von Patienten nach medizinischer Dringlichkeit. Diese Tätigkeit ist **medizinisches Personal-Handeln** und wird **vom Personal der Arztpraxis ausgeführt — nicht von DiggAi**. DiggAi liefert dem Personal ausschließlich strukturierte Anmelde-Information, auf deren Grundlage das Personal die Triage selbst vornimmt. Die DiggAi-interne technische Komponente, die Symptom-Stichwort-Cluster erkennt und an das Personal markiert, heißt **Routing-Engine** — nicht Triage-Engine.

## 6. Kontraindikationen

DiggAi darf **nicht** verwendet werden:

- als Ersatz für ärztliche Untersuchung, Anamnese, Diagnose oder Therapie;
- zur Selbstdiagnose oder Selbstbehandlung durch den Patienten;
- in akuten Notfallsituationen — in akuten Notfällen ist der europäische Notruf 112 oder das Praxispersonal direkt zu verständigen;
- in stationären, intensivmedizinischen oder rettungsmedizinischen Kontexten;
- zur Übermittlung von Befunden, Laborwerten, Bildgebung oder Therapieentscheidungen.

## 7. Pflichten des Praxisbetreibers

Die Arztpraxis als Betreiber von DiggAi verpflichtet sich:

1. **Personal zu schulen**, dass DiggAi-Hinweise keine ärztlichen Befunde sind und die fachliche Beurteilung beim Personal verbleibt.
2. **Patienten aufzuklären**, dass DiggAi eine Anmelde-Software ist und keine medizinische Beratung anbietet.
3. **Notfall-Erreichbarkeit** sicherzustellen — Patientinnen und Patienten müssen in der Praxis jederzeit menschliches Personal erreichen können.
4. **Datenschutz** gemäß DSGVO und AVV mit dem Hersteller einzuhalten.
5. **Veraltete oder offline befindliche** DiggAi-Instanzen nicht zur Anmelde-Steuerung zu nutzen.

## 8. Pflichten des Herstellers

Die DiggAi GmbH verpflichtet sich:

1. **Die Zweckbestimmung dieses Dokuments dauerhaft einzuhalten** und nicht durch Marketing, UI-Texte oder LLM-Outputs unterlaufen zu lassen.
2. **Die technische Sicherstellung** der Patient-zu-Personal-Trennung (kein diagnostischer Output an Patient) durch automatisierte Tests `e2e/regulatory/no-diagnosis-to-patient.spec.ts` als CI-Pflicht-Gate zu betreiben.
3. **Marketing-Material kontinuierlich zu prüfen**, dass keine medizinische Zweckbestimmung impliziert wird (siehe Verbots-Wortliste in `REGULATORY_STRATEGY.md` §9.1).
4. **Änderungen an der Routing-Engine, an LLM-Prompts oder an Patient-facing-Strings** dem Audit-Trail in [`CHANGE_LOG_REGULATORY.md`](./CHANGE_LOG_REGULATORY.md) zuzuführen.
5. **Beschwerden** in einem definierten Beschwerdemanagement zu erfassen (operativer Prozess folgt mit QMS-Light-Etablierung in Spur B).

## 9. Versionierung & Wirksamkeit

| Datum | Version | Änderung |
|-------|---------|----------|
| 2026-05-05 | 1.0 | Erstfassung, Entwurf — wartet auf Sign-off |

Die Wirksamkeit beginnt mit Unterzeichnung durch die Geschäftsführung. Bis zur Unterzeichnung gilt die heutige (alte) Marketing- und UI-Sprache als provisorisch, **DiggAi sollte in dieser Übergangsphase nicht aktiv akquiriert werden**. Die Sofort-Maßnahmen (TriageEngine-Refactor, Marketing-Sprachreinigung) sind Voraussetzung für eine breite Markteinführung.

---

**Sign-off:**

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Geschäftsführung | Dr. Klapproth | __________ | __________ |
| Medical Advisor | Dr. Al-Shdaifat | __________ | __________ |
| Externer Regulatory-Berater (optional) | __________ | __________ | __________ |
