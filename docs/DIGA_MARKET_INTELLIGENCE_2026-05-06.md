# DiggAi · DiGA-Markt-Intelligenz (Apify-Crawl 2026-05-06)

**Quelle:** diga-verzeichnis.de + bfarm.de + kbv.de (via Apify RAG-Web-Browser)
**Stand:** 2026-05-06 · **Verfasser:** Claude (claude-code, opus-4-7) · Lauf 18

---

## 1. Marktgröße und Verteilung

Das BfArM-DiGA-Verzeichnis enthielt am 2026-05-06 insgesamt **59 DiGAs**, davon **50 dauerhaft aufgenommen** und **9 vorläufig zur Erprobung**. Aktualisierungs-Frequenz im offiziellen Dux-Healthcare-Spiegel-Verzeichnis: täglich.

| Indikationsgebiet | Anzahl | Anteil |
|-------------------|--------|--------|
| Psyche | 31 | 53 % |
| Muskeln, Knochen und Gelenke | 7 | 12 % |
| Urogenitalsystem | 6 | 10 % |
| Stoffwechsel | 5 | 9 % |
| Nervensystem | 3 | 5 % |
| Herz und Kreislauf | 2 | 3 % |
| Ohren | 2 | 3 % |
| Krebs | 2 | 3 % |
| Verdauung | 1 | 2 % |

**Implikation für DiggAi:** Der Markt ist Psyche-dominiert (>50 %), die Long-Tail-Kategorien sind dünn besetzt. Eine Anamnese-Vor-App, die quer durch alle Indikationen funktioniert, hätte als DiGA in keiner einzelnen Kategorie ein Konkurrenz-Cluster — sie wäre eine eigene Kategorie „Praxis-Vorbereitung / Versorgungsbrücke". Das ist Chance und Risiko zugleich: BfArM hat keinen direkten Vergleichs-Maßstab.

## 2. Plattform-Coverage

| Plattform | DiGAs verfügbar | Anteil |
|-----------|----------------|--------|
| Apple iOS | 44 | 75 % |
| Google Android | 44 | 75 % |
| Web (Browser-App) | 28 | 47 % |

**Implikation für DiggAi-Capture:** Web-First wie diggai.de ist grundsätzlich kompatibel mit dem DiGA-Mainstream — knapp die Hälfte der zugelassenen DiGAs läuft als Web-App. Eine native iOS-/Android-Schiene würde aber die Reichweite erhöhen, falls DiggAi je den DiGA-Pfad anstrebt.

## 3. Vergütungsfähigkeit — der KBV-Faktor

KBV-Praxisnachricht vom 26.03.2026: Für die DiGA „Kranus Mictera" (Harninkontinenz, Urogenitalsystem, dauerhaft seit Ende 2025) wird zum 1. April 2026 die GOP **01482** in den EBM aufgenommen — Zusatzpauschale 8,15 € (64 Punkte) für die Verlaufskontrolle, abrechenbar 1× im Krankheitsfall, derzeit extrabudgetär. Für die zwei vorläufig aufgenommenen DiGAs „Oviva Direkt Bluthochdruck" und „INKA" gibt es die Pauschale 86700 (BMV-Ä Anlage 34).

**Implikation für DiggAi-Strategie:** Wenn DiggAi später auf den DiGA-Pfad geht, ist nicht nur die BfArM-Aufnahme der Schritt — sondern auch die KBV/GKV-Spitzenverbands-Vereinbarung über ärztliche Begleitleistungen. Das ist ein zweiter Verhandlungsschritt, der bei der Roadmap berücksichtigt werden muss. Der Kostenrahmen 8 € pro Quartal ist ein wichtiger Anker für die DiGA-Preisgestaltung.

## 4. Neueste Aufnahmen (Trend-Indikator)

| App | Indikation | Aufgenommen | iOS-Rating | Android-Rating |
|-----|-----------|-------------|-----------|----------------|
| Axia (axSpA) | MSK | 04.02.2026 | 4.7 | 4.6 |
| INKA | Urogen | 03.02.2026 | 4.0 | 3.3 |
| Vera-App (Wechseljahre) | Urogen | 20.01.2026 | 4.3 | 3.5 |
| memodio | Psyche | 27.12.2025 | 4.4 | 4.6 |
| Kranus Mictera | Urogen | 27.10.2025 | 4.1 | 4.2 |

**Implikation:** Der Markt wächst weiter — 5 Neuzugänge in den letzten 6 Monaten. Urogenitalsystem zieht stark (3 von 5). Wechseljahres- und axSpA-Indikationen zeigen, dass auch spezifische Gender- und Auto-Immun-Kategorien zunehmen.

## 5. Top-Bewertete (Qualitäts-Benchmark)

| App | Indikation | iOS | Android | Bewertungen iOS |
|-----|-----------|-----|---------|-----------------|
| Vivira | MSK | 4.8 | 4.5 | 2027 |
| somnio | Psyche | 4.7 | 4.6 | 2809 |
| NichtraucherHelden | Psyche | 4.6 | 4.6 | 676 |
| Kaia Rückenschmerzen | MSK | 4.6 | 4.5 | 1097 |
| HelloBetter Diabetes | Stoffwechsel | 4.6 | 4.2 | 930 |

**Implikation für DiggAi:** Qualitäts-Benchmark für DiggAi-Capture-UI sollte mindestens iOS 4.5 / Android 4.3 sein, wenn ein DiGA-Pfad ernsthaft betrieben wird. Vivira und somnio sind die Gold-Standard-Beispiele für Patienten-UX.

## 6. Strategische Erkenntnisse für DiggAi

Der Markt zeigt, dass Class-IIa-DiGAs (das ist die typische Klasse) ihren Versorgungseffekt-Nachweis als „verbesserte therapeutische Wirkung" oder „strukturelle Versorgungsverbesserung" konzipieren. Eine Anamnese-Vor-App wie ein hypothetisches **DiggAi-Patient-Modul** würde unter „strukturelle Versorgungsverbesserung" laufen müssen — denn sie behandelt nicht selbst, sondern bereitet den Arztbesuch vor und reduziert Wartezeiten / Fehl-Diagnosen.

Die nächsten Schritte für CK aus dieser Markt-Analyse:
1. **Klären, ob DiggAi-Patient-Modul (langfristig) als reine Versorgungsstruktur-Verbesserung argumentiert werden kann** — das ist juristisch möglich (§139e SGB V), wurde aber bisher überwiegend für therapie-aktive Apps genutzt. Anwalt fragen.
2. **EBM-Vergütungs-Modell früh mitdenken** — der Kranus-Mictera-Präzedenzfall zeigt, dass jede neue DiGA eine eigene EBM-GOP-Verhandlung mit KBV/GKV bekommt. Plan sollte 6-12 Monate nach BfArM-Aufnahme einplanen.
3. **Nicht in Psyche-Konkurrenz gehen** — der Markt ist mit 31 von 59 DiGAs gesättigt. Versorgungs-/Workflow-Brücke ist die freiere Nische.
4. **Pilot-Praxen für Versorgungseffekt-Studie planen** — die Top-DiGAs haben 600-2800 Bewertungen, was auf >5000 aktive Nutzer pro App hindeutet. Studien-Größe muss vergleichbar konzipiert sein.

## 7. Direkte Konkurrenz-Anbieter (Praxis-SaaS-Sektor, nicht DiGA)

Aus dem Crawl nicht direkt sichtbar — aber bekannt aus dem allgemeinen Praxis-SaaS-Markt: **CompuGroup Medical (CGM)**, **Doctolib**, **TI-Plattform der gematik**, **medatixx**, **Tomedo** (DiggAi hat schon einen Tomedo-Bridge-Adapter). Diese sind nicht-DiGA und bedienen das Praxis-Workflow-Segment, in dem DiggAi-Capture direkt antritt. Vertieft analysieren mit gezieltem Apify-Search im nächsten Lauf.

## 8. Quellen

- diga-verzeichnis.de (DUX Healthcare, täglich aktualisiert)
- bfarm.de DiGA-Verzeichnis (offizielle Quelle)
- kbv.de Praxisnachricht vom 26.03.2026 (EBM-Vergütungs-Update Kranus Mictera)
- aok.de Gesundheitspartner-Portal (DiGA-Erklärung für Leistungserbringer)
- Apify-Run-ID: I0dFULGLt8sbEaE5C / Dataset: sME5lNIZM2NUTlMig

## 9. Folge-Aufgaben

| # | Item | Owner |
|---|------|-------|
| K1 | Apify-Scheduled-Task `monitor-diga-verzeichnis` auf RAG-Web-Browser umstellen statt Light-HTML-Crawl | ENG |
| K2 | Konkurrenz-Analyse Praxis-SaaS (CompuGroup, Doctolib, medatixx) als zweiter Apify-Crawl | Claude |
| K3 | Wechseljahres- und axSpA-Indikationen für DiggAi-Suite-Therapieplan-Templates evaluieren | CK + Med |
| K4 | EBM-Vergütungs-Modell für hypothetisches DiggAi-Patient-Modul in Strategie-Dok aufnehmen | CK |
