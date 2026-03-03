# Schema-Compliance Gap-Analyse & Reparaturplan

> Vergleich: **formularschema.md** (Soll) vs. **App** (`questions.ts` + `new-questions.ts`) (Ist)  
> Erstellt: Phase 7 – Schema-Audit  
> **Aktualisiert: Phase 8 – Gap-Fix-Implementierung (abgeschlossen)**

---

## Phase 8 – Implementierte Änderungen (Zusammenfassung)

> Datum: Phase 8 | Status: ✅ Abgeschlossen & deployed

### Behobene kritische Lücken

1. **Duplicate ID '2080' → 'BG-BERUF-100'** – Doppelte Fragen-ID in `questions.ts` bereinigt
2. **~15 fehlende Fragen hinzugefügt** (TERM-100, TERM-101, ALT-100, VISIT-100, 5B-100, 5C-100, 5D-100, 5E-100, 5F-100, 5G-100, 5I-100, GYN-100–GYN-115, MED-100, MAMMO-100, DARM-W-100)
3. **~12 bestehende Fragen erweitert** (fehlende Optionen in 7001–7011, 6007, 4130, 4131, 1030, 1050, 8000)
4. **Screening-Schwellenwerte korrigiert** (MAMMO-100: W+50, DARM-W-100: W+50, korrekte showIf-Bedingungen)
5. **Intermediate Routing implementiert** – Bestands-Patienten: `0003→TERM-100→TERM-101→ALT-100→VISIT-100→1000`
6. **No-Complaints Shortcut** – Bestands-Patienten ohne Beschwerden + ALT-100=nein: `1000→Nein→9500→END`

### Accessibility (a11y) – 102 Warnungen behoben

- 15 Komponentendateien aktualisiert (aria-labels, roles, WCAG-Konformität)
- Alle `<button>`, `<select>`, `<input>` Elemente mit korrekten Labels
- Landmark-Rollen für Navigation, Main, und Complementary Bereiche

### i18n – 110 neue Schlüssel × 5 Sprachen

- DE, EN, AR, TR, UK (Ukrainisch) synchronisiert
- Alle neuen Fragen, Optionen, Kapitelüberschriften übersetzt

### E2E-Tests (Playwright)

- 6 Tests, alle bestanden (0 Fehler, 0 flaky)
- Test-Coverage: i18n-Rendering, Console-Errors, Patient-Flow, Headache-Chain, Data-Integrity

### Build

- `npm run build` – ✅ erfolgreich (keine TypeScript-Fehler)

---

## Übersicht: Status pro Schema-Kapitel

| Schema-Kap. | Thema | Status | Phase 8 |
| --- | --- | --- | --- |
| 1 | Basis (Name, Geschlecht, Geb., Adresse, Kontakt) | ✅ Vollständig | – |
| 2 | Versicherung | ✅ Vollständig | – |
| 3 | Anliegen (Terminwunsch, Rezept, ÜW, AU, Absage) | ✅ Behoben | ✅ TERM-100/101, ABS-102 |
| 4 | Status (Neu/Alt) + 4B Medikamentenänderung | ✅ Behoben | ✅ ALT-100 |
| 5 | Besuchsgrund (9 Sub-Pfade) | ✅ Behoben | ✅ VISIT-100, 5B–5I |
| 6 | Sonstiges (Fieber, Gewichtsverlust, Kraft) | ⚠️ Stark vereinfacht | 🟡 offen |
| 7A | Angiologie | ✅ Gut | – |
| 7B | Atembeschwerden | ⚠️ Vereinfacht | 🟡 offen |
| 7C | Augen | ✅ Gut | – |
| 7D | Haut | ✅ Gut | – |
| 7E | Herz-Kreislauf | ✅ Erweitert | ✅ Optionen ergänzt |
| 7F | HNO | ✅ Gut | – |
| 7G | Magen-Darm | ✅ Erweitert | ✅ Optionen ergänzt |
| 7H | Stoffwechsel | ✅ Gut | – |
| 7I | Bewegungsapparat | ⚠️ Detailtiefe fehlt | 🟡 offen |
| 7J | Neurologie | ✅ Gut (Schwindel-Subtree vorhanden) | – |
| 7K | Gemüt/Psyche | ✅ Exzellent (PHQ-Style, 15 Fragen) | – |
| 7L | Urologie | ⚠️ Vereinfacht | 🟡 offen |
| 7M | Gynäkologie | ✅ Behoben | ✅ GYN-100–GYN-115 |
| 10 | Allgemein (Neu-Patienten) | ⚠️ Teilweise | 🟡 offen |
| 11 | Gewohnheiten | ✅ Erweitert | ✅ 4130/4131 ergänzt |
| 12 | Medikamente (strukturiert) | ✅ Behoben | ✅ MED-100 |
| 13 | Gesundheitsstörungen | ✅ Erweitert | ✅ 7001–7011 ergänzt |
| 14 | Erkrankungen/Eingriffe | ✅ Erweitert | ✅ 8000 ergänzt |
| 15 | Kinder Basis (< 6 Jahre) | ⚠️ Vereinfacht | 🟡 offen |
| 16 | Kinder Entwicklung | ⚠️ Vereinfacht | 🟡 offen |
| 17 | Gesundheitscheck (> 35 J.) | ⚠️ Teilweise | 🟡 offen |
| 18 | Frauen-Vorsorge | ✅ Erweitert | ✅ MAMMO-100 |
| 19 | Männer-Vorsorge | ✅ Erweitert | ✅ DARM-W-100 |
| 20 | Bewertung | ✅ Vollständig | – |
| 21 | Kontrolle (Kontaktpräferenz) | ✅ Vorhanden (9010/9011) | – |

---

## KRITISCHE LÜCKEN (Prio 🔴 HOCH)

### 1. Fehlende Besuchsgrund-Auswahl (Schema §5)

**Problem:** Patienten mit Anliegen "Termin/Anamnese" landen direkt bei `1000` ("Haben Sie aktuell Beschwerden?"). Das Schema verlangt zuerst eine Besuchsgrund-Auswahl mit 9 möglichen Pfaden.

**Schema erwartet:**

```text
5 → Besuchsgrund:
  • Beschwerdeabklärung → 5A, 5AA, 5AAA, 5AAAA, 6, 7
  • Kontrolle → 5B, 6, 7
  • Vorsorge → 5C
  • Therapieanpassung → 5D
  • Befunderörterung → 5E
  • Tumorverdacht → 5F, 6
  • Begutachtung → 5G
  • Unfallfolgen → 5H
  • Zweitmeinung → 5I
```

**App aktuell:** Kein Besuchsgrund. Direkt → Beschwerden.

**Lösung:** Neue Frage `VISIT-100` (Besuchsgrund-Multiselect) einfügen, Routing-Logik für alle 9 Pfade implementieren. Zusätzlich neue Fragen für fehlende Sub-Pfade:

- `5B-100` Kontrolle (Blutzucker, Laborwerte, Freitext)
- `5C-100` Vorsorge (8 Screening-Optionen)
- `5D-100` Therapieanpassung (Diabetes, Blutdruck, Medikamente, Freitext)
- `5E-100` Befunderörterung (Bildgebung, Labor, Freitext)
- `5F-100` Tumorverdacht (Knoten, Blut im Stuhl, Gewichtsverlust, Freitext)
- `5G-100` Begutachtung (Gutachtenarten)
- `5H-100` Unfallfolgen (7 Fragen + BG-Auswahl) — partiell mit 2080-2091 vorhanden
- `5I-100` Zweitmeinung (Freitext)

**Geschätzte neue Fragen:** ~15–20

---

### 2. Fehlende Alt-Patient Medikamentenänderung (Schema §4B)

**Problem:** Bestehende Patienten (0000=ja) werden direkt zum Service/Beschwerden geroutet. Schema verlangt die Zwischenfrage: "Medikamentenänderung seit letztem Besuch? Ja → 5,12,20 / Nein → 5,20"

**Schema erwartet:**

```text
4B → Alt: Medikamentenänderung seit letztem Besuch?
  Ja → Besuchsgrund (5), Medikamente (12), Bewertung (20)
  Nein → Besuchsgrund (5), Bewertung (20)
```

**App aktuell:** Bestandspatienten mit "Termin/Anamnese" → direkt 1000 (Beschwerden), kein Check auf Medikamentenänderung.

**Lösung:** Neue Frage `ALT-100` ("Haben sich Ihre Medikamente seit dem letzten Besuch geändert?") einfügen zwischen 0003 (Geburtsdatum) und der Besuchsgrund-Auswahl. Routing anpassen.

**Geschätzte neue Fragen:** 1

---

### 3. Fehlende Terminwunsch-Details (Schema §3A/3AA)

**Problem:** Wenn der Grund "Terminwunsch" (oder Termin/Anamnese) gewählt wird, fehlen die Fragen nach Tag und Uhrzeit.

**Schema erwartet:**

```text
3A → Tag: Mo, Di, Mi, Do, Fr, Egal
3AA → Zeit: Vormittags, Nachmittags, Egal, Freitext
```

**App aktuell:** Kein Terminwunsch-Flow vorhanden.

**Lösung:** Zwei neue Fragen `TERM-100` (Tag) und `TERM-101` (Zeit) einfügen. Entweder am Anfang des "Termin/Anamnese"-Pfads oder am Ende vor Abschluss.

**Geschätzte neue Fragen:** 2

---

### 4. Terminabsage: Fehlender "Neuer Termin?"-Check (Schema §3E)

**Problem:** Die Terminabsage (ABS-100/101) fragt nach Datum und Grund, aber das Schema erwartet zusätzlich "Neuer Termin? Ja → 3A / Nein → Ende"

**App aktuell:** ABS-100 (Datum) → ABS-101 (Grund) → 9100 (Ende)

**Lösung:** Neue Frage `ABS-102` ("Möchten Sie einen neuen Termin?") mit Routing Ja → TERM-100 (Tag) / Nein → 9100

**Geschätzte neue Fragen:** 1

---

### 5. Fehlende strukturierte Medikamenten-Erfassung (Schema §12)

**Problem:** Die App hat nur ein Freitext-Feld (8900) für aktuelle Medikamente. Das Schema erwartet eine strukturierte Multiselect mit 15+ Medikamentengruppen und Sub-Auswahl für Blutverdünner (12A).

**Schema erwartet (§12):**

```text
Multiselect: Antikoagulanzien | Antipsychotika | Blutdrucksenker | Lipidsenker |
Schilddrüsenpräparate | Kortikosteroide | Osteoporosemittel | PPI | Sedativa |
Schmerzmittel/Opiate | Antiepileptika/Prostata | Hormonpräparate |
Immunsuppressiva | Parkinsonmedikamente | Antidepressiva
→ Bei "Antikoagulanzien" → 12A Blutverdünner-Detail
```

**App aktuell:**

- 6004/6005 (Blutverdünner) ✅ vorhanden
- 8900 (Freitext für alle anderen Medikamente) ❌ nicht strukturiert

**Lösung:** Neue Frage `MED-100` (strukturierte Medikamenten-Multiselect) mit allen Schema-§12-Optionen erstellen. Eventuell 6005 (Blutverdünner) als followUpQuestion von `MED-100` verdrahten. Freitext 8900 als Ergänzung beibehalten.

**Geschätzte neue Fragen:** 1–2

---

### 6. Fehlende Gynäkologie-Detailtiefe (Schema §7M)

**Problem:** Die App hat Gyn nur als Teil von 1090 (Uro/Gyn zusammen), das Schema hat einen eigenen 7M-Block mit tiefen Sub-Flows.

**Schema erwartet:**

```text
7M → Gyn: Zyklusstörungen | Schwangerschaft | Ausfluss | Juckreiz |
            Dyspareunie | IUP | PCOS | Endometriose | Klimakterium
7MA → Zyklus: Menarche | Letzte Menses | Länge | Schwankung | Dauer |
               Amenorrhö | Polymenorrhö | Zwischen-/Kontaktblutungen | postkoital
7MAA → Störungen: 7 Unterpunkte
7MB → Schwangerschaften: Geburten | Abort | Sectio | Präklampsie | GDM
7MBB → Probleme: 6 Schwangerschaftskomplikationen
```

**App aktuell:** 1090 enthält "Zyklusstörungen" und "Unregelmäßige Blutungen" als einfache Optionen, aber keine Detailtiefe.

**Lösung:** Neuen Block `GYN-100` bis `GYN-115` mit showIf gender=W. Zyklus-Detail, Schwangerschaftsanamnese, Schwangerschaftskomplikationen.

**Geschätzte neue Fragen:** ~12–15

---

## MITTLERE LÜCKEN (Prio 🟡 MITTEL)

### 7. Fieber/Gewichtsverlust/Kraft Detail (Schema §6)

**Problem:** App hat 1007 mit 6 Checkbox-Optionen. Schema erwartet tiefe Sub-Trees:

- 6A Fieber → Tmax → Messmethode → Art → Begleitsymptome → Auslöser (5 Ebenen!)
- 6B Gewichtsverlust → Appetit-Detail → Symptome-Detail
- 6C Kraft → >60 → Aufstehen/Stürze

**Lösung:** followUpQuestions von 1007 auf neue Detail-Fragen verdrahten:

- `FIE-100` bis `FIE-104` (Fieber Tmax, Art, Symptome, Auslöser)
- `GEW-100` bis `GEW-102` (Gewichtsverlust Appetit/Symptome)
- `KRA-100` (Kraft Detail >60)

**Geschätzte neue Fragen:** ~8–10

---

### 8. Herz-Kreislauf Brustschmerz-Detail (Schema §7EA/7EAA/7EAAA)

**Problem:** App hat 1050 (Herz-Kreislauf Multiselect inkl. "Brustschmerz/Angina Pectoris"), aber der Schema-Brustschmerz-Sub-Tree fehlt komplett:

- 7EA: Druck >20 min, Dauer, Lokalisation (linker Arm, Hals, epigastrisch), Besserung
- 7EAA: Auslöser (Belastung, Stress, Kälte, Mahlzeiten, morgens/nachts in Ruhe)
- 7EAAA: Begleitsymptome (Synkope, Atemnot, Übelkeit, Sodbrennen, etc.)

**Lösung:** Neue Fragen `BRUST-100` bis `BRUST-102` als followUpQuestions von 1050 Option "brustschmerz".

**Geschätzte neue Fragen:** 3

---

### 9. Magen-Darm Detailtiefe (Schema §7GA–7GE)

**Problem:** App hat 1030 mit 8 Optionen und 1131 (Bauchschmerz-Lokalisation). Schema erwartet tiefe Sub-Trees für jede Symptomgruppe:

- 7GA Erbrechen: Anzahl/d, postprandial, nüchtern, blutig, kaffeesatzartig + Schwangerschaftsausschluss
- 7GC Durchfall: Anzahl/d, Konsistenz, blutig, Reise, Fieber→6A
- 7GD/7GDD/7GDDD Koliken: Lokalisation → Begleitsymptome → Vorerkrankungen
- 7GE Verstopfung: 9 Detail-Fragen

**Lösung:** followUpQuestions von 1030 erweitern:

- `ERBRECH-100` (Erbrechen-Detail)
- `DURCHF-100` (Durchfall-Detail)
- `KOLIK-100` bis `KOLIK-102` (Koliken + Begleitsymptome + Vorerkrankungen)
- `VERSTOPF-100` (Verstopfung-Detail)

**Geschätzte neue Fragen:** ~6

---

### 10. Atembeschwerden Detailtiefe (Schema §7BB)

**Problem:** App hat 1020 mit 6 Optionen und 1121 (Atemnot-Zeitpunkt). Schema erwartet mMRC-Skala (7BB) mit 8 Atemnot-Stufen + Asthma/COPD-Management (7BA).

**Lösung:** 1121 (Atemnot) durch mMRC-konforme Optionen ersetzen. Neue Frage `ASTHMA-100` (Asthma/COPD Management) als followUpQuestion.

**Geschätzte neue Fragen:** 1–2

---

### 11. Bewegungsapparat Detailtiefe (Schema §7IA/7IC/7ID)

**Problem:**

- 7IAA Schmerzen-Detail (bohrend, brennend, drückend, Skala 1-10) fehlt
- 7IC Wirbelsäule hat 10 Detailpunkte (inkl. Red Flags!), App hat nur 6
- 7ID Lokalisation (11 Körperregionen) fehlt als eigene Frage

**Lösung:**

- Neue Frage `GELENK-SCHMERZ-100` (Schmerzcharakter + Skala)
- 1175 Wirbelsäule erweitern um Red-Flag-Optionen
- Neue Frage `LOKAL-100` (11 Regionen gem. 7ID)

**Geschätzte neue Fragen:** 2–3

---

### 12. Urologie Detailtiefe (Schema §7L/7LA/7LB)

**Problem:** 1090 hat 7 simple Optionen. Schema erwartet 7LA (7 Miktions-Details) und 7LB (Urin-Auffälligkeiten) als Sub-Flows.

**Lösung:** Neue followUp-Fragen `URO-100` (Miktionsbeschwerden-Detail) und `URO-101` (Urin-Detail).

**Geschätzte neue Fragen:** 2

---

### 13. Allgemein Neu-Patienten: Fehlende Blöcke (Schema §10F–10H)

**Problem:** Folgende Unterpunkte fehlen komplett:

- 10FA Mobilität (5 Stufen: Gehstock → Rollator → Rollstuhl → Stürze)
- 10FB Kognition (Gedächtnis, Orientierung, Konzentration, Demenzdiagnose)
- 10G GdB (Grad + 8 Merkzeichen)
- 10H Pflegegrad (7 Stufen)

**Lösung:** 4 neue Fragen als followUpQuestions von 6001 (Beeinträchtigungen):

- `MOB-100` Mobilität-Detail
- `KOG-100` Kognition-Detail
- `GDB-100` GdB/Merkzeichen
- `PFLEGE-100` Pflegegrad

**Geschätzte neue Fragen:** 4

---

### 14. Gewohnheiten Detailtiefe (Schema §11B–11G)

**Problem:** App hat vereinfachte Versionen:

- 11B Bewegung: ❌ komplett fehlend (Schema: <150min/Wo, 150-300, >300)
- 11E Beruf: App hat Freitext (4120), Schema hat Select (Vollzeit/Teilzeit/Rentner/arbeitslos/Ausbildung)
- 11F Alkohol: App hat 4130 (4 Stufen), Schema hat 5 Stufen
- 11G Drogen: App hat Ja/Nein (4131), Schema hat 4 Stufen

**Lösung:** Bestehende Fragen 4120/4130/4131 anpassen (Optionen erweitern) + neue Frage `BEWEG-100` (Bewegung).

**Geschätzte Änderungen:** 3 Änderungen + 1 neue Frage

---

### 15. Gesundheitsstörungen: Fehlende Detail-Sub-Trees (Schema §13B–13J)

**Problem:** Viele Follow-ups existieren, aber mit reduzierter Optionsliste:

| Schema | App-ID | Fehlende Optionen |
|---|---|---|
| 13B Gerinnungsstörung | 7001 | Antiphospholipid, AT-III-Mangel, HIT, Hyperhomocysteinämie, Protein-C/S-Mangel |
| 13C Lungenerkrankung | 7002 | Bronchiektasen, Chronische Bronchitis, IPF, Pneumokoniosen, Sarkoidose |
| 13CC–13CCCCC Lunge Detail | – | ❌ 5 Detail-Ebenen komplett fehlend |
| 13D Nieren | 7008 | Nierenbeckenentzündung, Glomerulonephritis, Zystennieren |
| 13DA Dialyse | 7003 | Heimdialyse, Über AV-Fistel, Über Dialysekatheter |
| 13E Depression | 7004 | Major Depression, Dysthymie, Schizoaffektiv, Saisonal, Bipolar |
| 13G Verdauung | 7006 | Biliäre Zirrhose, Divertikel, Fettleber, GERD, Gallensteine, Leberzirrhose, Pankreatitis, Pfortaderthrombose |
| 13F Herz | 7005 | Kardiomyopathie, Offenes Foramen ovale |

**Lösung:** Optionslisten der bestehenden Fragen 7001–7011 erweitern + neue Lunge-Detail-Fragen.

**Geschätzte Änderungen:** 8 Optionslisten-Updates + 3–5 neue Fragen

---

### 16. Erkrankungen/Eingriffe: Fehlende Sub-Flows (Schema §14A–14J)

**Problem:** App hat 8000 (Multiselect) und wenige Follow-ups. Schema erwartet:

- 14AA Aneurysma-Therapie → ❌ fehlt
- 14B Arterielle Erkrankung Detail → 8003 zu vereinfacht
- 14BB Therapie-Detail → ❌ fehlt
- 14C Thrombose wann/wo → 8005 vorhanden, aber ohne "wann"
- 14D Herz-OP Detail (Stent, Bypass, etc.) → ❌ fehlt
- 14E Herzinfarkt wann → ❌ fehlt
- 14F Infektionskrankheiten → ❌ fehlt
- 14H Lungenembolie wann → ❌ fehlt
- 14I Transplantation → ❌ fehlt
- 14J Schlaganfall wann + Folgeschäden → ❌ fehlt

**Lösung:** Neue Fragen + Erweiterung von 8000:

- `ANEU-THER-100` (Aneurysma-Therapie)
- `ART-DETAIL-100` (Arterielle Erkrankung Behandlung)
- `HERZOP-100` (Herz-OP Detail multiselect)
- `HI-WANN-100` (Herzinfarkt wann)
- `INFEKT-100` (Infektionskrankheiten multiselect)
- `LE-WANN-100` (Lungenembolie wann)
- `TRANS-100` (Transplantation)
- `STROKE-100` (Schlaganfall wann + Folgeschäden)
- Thrombose 8005 um "wann" erweitern

**Geschätzte neue Fragen:** ~8–10

---

### 17. Kinder Basis Detailtiefe (Schema §15)

**Problem:** App hat 1500-1502 (Frühgeburt, Gewicht, Größe). Schema erwartet zusätzlich:

- 15C SSW (4 Stufen)
- 15D Geburtsmodus (Spontan, Sectio, Saugglocke, Forceps, Startprobleme)
- 15E Ernährung 1. LJ (Stillen, Mischform, Flasche, Beikost)
- 15F/G/H APGAR 1/5/10 min
- 15I NIUS (Dauer Tage)

**Lösung:** 6 neue Fragen im `showIf age < 6` Block.

**Geschätzte neue Fragen:** 6

---

### 18. Kinder Entwicklung Detailtiefe (Schema §16)

**Problem:** App hat 1600-1604. Schema erwartet:

- 16C Wachstum (Unauffällig/Auffällig/Unklar) → ❌ fehlt
- 16D Erkrankungen (11 J/N-Fragen: Infekte, Otitis, Bronchitiden, etc.) → ❌ fehlt
- 16E Impfungen (Masern J/N, Impfbuch vorhanden J/N) → ❌ fehlt

**Lösung:** 3 neue Fragen im Kinder-Block.

**Geschätzte neue Fragen:** 3

---

### 19. Allergie-Optionen unvollständig (Schema §10E)

**Problem:** App 6007 fehlen: Pollen, Milben, Tierhaare, Nahrungsmittel (z.B. Nüsse, Obst, Gluten, Milch)

**Lösung:** 4 Optionen zu 6007 hinzufügen.

**Geschätzte Änderungen:** 1 Optionslisten-Update

---

## NIEDRIGE LÜCKEN (Prio 🟢 NIEDRIG)

### 20. Gesundheitscheck erweitern (Schema §17)

App 1700 fragt nur nach "letzter Check-up". Schema erwartet 3 items:

- Gesundheits-Check-up alle 3 Jahre ab 35 → ✅ 1700
- Hautkrebs-Screening alle 2 Jahre ab 35 → ❌ fehlt
- Hepatitis B/C Screening einmalig ab 35 → ❌ fehlt

**Lösung:** 1700 als multiselect umbauen oder 2 Follow-up-Fragen hinzufügen.

---

### 21. Vorsorge Männer: Aortenscreening (Schema §19)

App 1900/1901 fragt Prostata + Darmkrebs. Schema erwartet zusätzlich:

- Aortenscreening (für Männer ab 65) → ❌ fehlt

**Lösung:** Neue Frage oder Option bei 1901 für Männer >65.

---

### 22. HNO Detail-Optionen erweitern

Schema 7FA–7FG haben jeweils mehr Optionen als die App-Versionen 1B01–1B06. Nicht kritisch, aber für Vollständigkeit:

- 7FA: + Überempfindlichkeit, Tonhöhenverzerrung
- 7FB: + Borkenbildung, Eiterabsonderung, Formveränderung
- 7FC: + Fremdkörper, Ohrenbluten, Ohrmuschelentzündung
- 7FD: + Beläge, Blutung, Geschwollene Rachenmandeln, Mundgeruch
- 7FE: + Regurgitation, Schluckschmerz, Steckenbleiben, Verschlucken, Würgreiz
- 7FF: + Kraftlose Stimme, Abhusten erschwert, Rauhe Stimme

---

### 23. Angiologie Detail-Optionen erweitern

Schema 7AA–7AH haben mehr Detail als App 1010/1110-1117:

- 7AB Arterien (Atherosklerose, pAVK, Raynaud, Vaskulitis, Aneurysma) → als followUp
- 7AF Shunt (Dialysekatheter, AV-Shunt, etc.) → ❌ fehlt komplett

---

## FLOW-REPARATUREN

### F1. Bestands-Patienten Flow reparieren
**Aktuell:**

```text
0000(ja) → 0001 → 0011 → 0002 → 0003 → [Service-Routing] → Service / 1000
```

**Schema-konform:**

```text
0000(ja) → 0001 → 0011 → 0002 → 0003
  → ALT-100 (Medikamentenänderung?)
    → Ja → VISIT-100 (Besuchsgrund) → MED-100 (Medikamente) → 9500 (Bewertung)
    → Nein → VISIT-100 (Besuchsgrund) → 9500 (Bewertung)
```

### F2. Neu-Patienten Flow vervollständigen
**Aktuell:**

```text
0000(nein) → 0001-0003 → 2000-2001 → 3000-3005
  → Services / 1000 (Beschwerden) → 1001-1007-1002-1003
  → 4000-4006 → 4100-4131 → 5000-6007 → 7000-7011
  → 8000-8012 → 1500-1604 → 1700-1901
  → 8800-8951 → 9100 → 9010-9011 → 9500-9501 → 9000
```

**Schema-konform (Ergänzungen):**

```text
… 3005 → VISIT-100 (Besuchsgrund)
  → Beschwerdeabklärung → 1001-1007-1002-1003 → 6-Detail → 7-Detail
  → Kontrolle → 5B-100
  → Vorsorge → 5C-100
  → Therapieanpassung → 5D-100
  → etc.
→ [Block 10-14 mit Erweiterungen]
→ [Block 15-16 mit Erweiterungen]
→ [Block 17-19 mit Erweiterungen]
→ MED-100 (strukturierte Medikamente) → 8800 → 8900 → 8950 → 9100
→ 9500 → 9501 → 9000
```

### F3. showIf Bedingungen für geschlechts-/altersabhängige Blöcke prüfen

**Schema-Bedingungen die überprüft werden müssen:**

- Schwangerschafts-Check (8800): showIf gender=W AND age 14-50 → ✅ bereits korrekt
- Frauen-Vorsorge (1800-1801): showIf gender=W AND age 14-50 → ✅ korrekt
- Männer-Vorsorge (1900-1901): showIf gender=M AND age >44 → ✅ korrekt
- Kinder (1500-1604): showIf age < 6 → ✅ korrekt
- Gesundheitscheck (1700): showIf age > 34 → ✅ korrekt
- **NEU:** Gynäkologie-Block: showIf gender=W → ❌ muss implementiert werden
- **NEU:** Aortenscreening: showIf gender=M AND age > 64 → ❌ muss implementiert werden

---

## ZUSAMMENFASSUNG

### Aufwand-Schätzung

| Kategorie | Neue Fragen | Änderungen |
|---|---|---|
| Kritisch (Prio 🔴) | ~35–40 | ~5 |
| Mittel (Prio 🟡) | ~35–45 | ~15 |
| Niedrig (Prio 🟢) | ~5 | ~10 |
| **Gesamt** | **~75–90** | **~30** |

### Empfohlene Reihenfolge

1. **Phase 7a:** Flow-Reparaturen (F1–F3): Besuchsgrund, Alt-Patient-Check, Routing
2. **Phase 7b:** Kritische Lücken: Terminwunsch, Medikamente strukturiert, Gynäkologie
3. **Phase 7c:** Mittlere Lücken: Detail-Sub-Trees (§6, §7E, §7G, §10, §14)
4. **Phase 7d:** Niedrige Lücken: HNO-Optionen, Angiologie, Vorsorge-Erweiterungen
5. **Phase 7e:** i18n für alle neuen Fragen (5 Sprachen: de/en/ar/tr/uk)
6. **Phase 7f:** E2E-Tests aktualisieren, Production Build, Deploy

### Was funktioniert bereits gut ✅

- Basis-Identifikation (Name, Geschlecht, Geburtsdatum, Adresse, Kontakt)
- Versicherungsstatus
- 13 Service-Pfade (Rezepte, AU, Überweisung, Absage, etc.)
- Beschwerden-Grundflow (1000-1007-1002-1003)
- 13 Body-Region-Module (7A–7K inkl. Schwindel-Subtree)
- Psychische Beschwerden (PHQ-Style, 15 Fragen)
- Gesundheitsstörungen mit Follow-ups (7000–7011)
- Kinder-Basisblock mit showIf
- Vorsorge mit Geschlecht/Alters-Bedingungen
- Bewertung (Sterne + Freitext)
- BG-Unfallmeldung (2080-2091)
- Triage-System für Notfälle (Brustschmerz, Lähmung, Suizid)

### ID-Mapping Referenz (App → Schema)

| App-ID | Schema-Nr. | Thema |
|---|---|---|
| 0000 | 4 | Status Neu/Alt |
| 0001 | 1C | Nachname |
| 0011 | 1B | Vorname |
| 0002 | 1A | Geschlecht |
| 0003 | 1D | Geburtsdatum |
| 2000 | 2 | Versicherung |
| 3000-3005 | 1H-1J,1G,1F | Adresse, E-Mail, Telefon |
| 1000 | 5 (teilw.) | Beschwerden ja/nein |
| 1001 | 5A | Beschwerdedauer |
| 1004 | 5AA | Häufigkeit |
| 1005 | 5AAA | Auslöser |
| 1006 | 5AAAA | Änderung |
| 1007 | 6 | Sonstiges (vereinfacht) |
| 1002 | 7 | Abklärung (Körperregionen) |
| 1010 | 7A | Angiologie |
| 1020 | 7B | Atembeschwerden |
| 1A00 | 7C | Augen |
| 1040 | 7D | Haut |
| 1050 | 7E | Herz-Kreislauf |
| 1B00 | 7F | HNO |
| 1030 | 7G | Magen-Darm |
| 1060 | 7H | Stoffwechsel |
| 1070 | 7I | Bewegungsapparat |
| 1080 | 7J | Neurologie |
| 1C00 | 7K | Gemüt/Psyche |
| 1090 | 7L | Urologie |
| – | 7M | Gynäkologie ❌ |
| 4000 | 10A | Größe |
| 4001 | 10B | Gewicht |
| 5000 | 10C | Diabetes |
| 6000 | 10F | Beeinträchtigung |
| 6002 | 10D | Implantate |
| 6004 | 12A | Blutverdünner |
| 6006 | 10E | Allergien |
| 4002 | 11A | Rauchen |
| 7000 | 13 | Gesundheitsstörungen |
| 8000 | 14 | Erkrankungen/Eingriffe |
| 1500 | 15 | Kinder Basis |
| 1600 | 16 | Kinder Entwicklung |
| 1700 | 17 | Gesundheitscheck |
| 1800 | 18 | Frauen-Vorsorge |
| 1900 | 19 | Männer-Vorsorge |
| 9500 | 20 | Bewertung |
| 9010 | 21 | Kontrolle |
