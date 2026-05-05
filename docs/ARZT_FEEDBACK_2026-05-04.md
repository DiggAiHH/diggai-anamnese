# Arzt-Feedback Dr. Klapproth — 2026-05-04

> **Quelle:** Direktnachricht Dr. Klapproth → Laith
> **Verwertung:** Diese Datei ist die Single-Source-of-Truth für die UX-/Funktions-Items aus dem Feedback. Alle Code-Änderungen, die daraus folgen, referenzieren diese Datei in Commit-Messages.

---

## Allgemeine Lage (Klapproth, eigene Worte)

> „Okay der funktioniert. Werde mich heute dran machen.
>
> Muss in der nächsten Woche Erklärvideos für Programm Prakt-IQ erstellen und vertonen. Das dauert länger als mir lieb ist. Wir haben eine D.U.N.S. Nummer beantragt, damit das Programm auf Apple Geräten läuft ohne dass der Nutzer in den Einstellungen Berechtigungen freischalten muss.
>
> Friedrich hat erste Interessenten die Medatixx nutzen und unser Programm einsetzen möchten. Da müssen wir den Datenexport und Übergabe der personenbezogenen Daten wie mit Tomedo bewerkstelligen, damit wir die Datensätze pseudonymisieren können. Denn sonst wäre die Nutzung für nicht-Tomedo-Nutzer zu umständlich. Das ist eine der nächsten größeren Baustellen."

### Folge-Items (organisatorisch, nicht im Repo)

- **D.U.N.S. Nummer** beantragt für Apple-Distribution → Status nachverfolgen
- **Erklärvideos Prakt-IQ** in Erstellung — produziert Klapproth selbst (1 Woche)
- **Medatixx-Adapter** — neue Roadmap-Baustelle, Skizze siehe [`ROADMAP_MEDATIXX_ADAPTER.md`](./ROADMAP_MEDATIXX_ADAPTER.md)

---

## UX-Feedback (Stand 04.05.2026)

Klapproth hat die Live-App durchgetestet. Das war schon umgesetzt:

- ✅ Tag-/Nacht-Umschaltung

Folgende Items sind noch offen.

### A) Termine & Anamnese

| # | Item | Klapproth-Originaltext | Status |
|---|------|------------------------|--------|
| A1 | `steps_title` entfernen | „steps_title kann entfallen" | offen |
| A2 | Start-Button neben Titel | „die Startschaltfläche ‚(Anamnese) jetzt starten' direkt daneben platzieren" | offen |
| A3 | Wort „Anamnese" aus Button | „Anamnese weglassen" | offen |
| A4 | DSGVO/Encrypted → Mouseover | „Die Hinweise DSGVO und Encrypted könnte man so einsetzen, dass per Mouseover die wichtigen Informationen, die im Quiz vermittelt werden, angezeigt werden. Damit spart man sich später das Quiz." | offen |
| A5 | **Bug** Loading → Netzwerkfehler | „Die Schaltfläche ‚Anamnese jetzt Starten' mündet nur in loading – es passiert nichts außer Meldung Netzwerkfehler" | **kritisch** |

### B) Medikamente & Rezepte / Krankschreibung (AU) / Unfallmeldung (BG)

| # | Item | Klapproth-Originaltext | Status |
|---|------|------------------------|--------|
| B1 | `steps_title` entfernen | „auch dort steps_title kann entfallen" | offen |
| B2 | Start-Button neben Titel | „auch dort die Startschaltfläche ‚jetzt starten' direkt daneben platzieren" | offen |

### C) Überweisung / Terminabsage / Dateien / Telefonanfrage / Dokumente anfordern / Nachricht schreiben

| # | Item | Klapproth-Originaltext | Status |
|---|------|------------------------|--------|
| C1 | Funktioniert nicht | „funktioniert nicht — dort besteht möglicherweise das gleiche Problem" | **kritisch** |

→ Vermutung: gleicher Backend-Down-Bug wie A5. Konsolidierte Diagnose siehe Item A5/C1 in `BUGFIX_ANALYSIS_2026-05-05.md`.

### D) Service-Auswahl-Seite (Kacheln)

| # | Item | Klapproth-Originaltext | Status |
|---|------|------------------------|--------|
| D1 | 4-Felder-Toggle entfernen | „4-Felder-Ansicht öffnen birgt die Gefahr dass wichtige Felder übersehen werden. Eher diese Umschaltoption weglassen" | offen |
| D2 | Auf 8 Kacheln begrenzen | „Stattdessen auf 8 Kacheln begrenzen indem Telefonanfrage und Nachricht schreiben sowie Dateien/Befunde und Dokumente anfordern in jeweils eine Kachel zusammengefasst werden" | offen |

#### Konkrete Kachel-Konsolidierung (D2)

Aktuell vermutlich 10+ Kacheln. Klapproths Wunsch: **genau 8 Kacheln** durch Zusammenfassung:

- **Kachel „Kommunikation":** Telefonanfrage **+** Nachricht schreiben → 1 Kachel mit zwei Buttons innerhalb
- **Kachel „Dokumente":** Dateien/Befunde **+** Dokumente anfordern → 1 Kachel mit zwei Buttons innerhalb

Die übrigen 6 Kacheln einzeln: Termin&Anamnese, Medikamente&Rezepte, Krankschreibung (AU), Unfallmeldung (BG), Überweisung, Terminabsage.

---

## Priorisierung (von uns vorgeschlagen)

| Prio | Item | Begründung |
|------|------|-----------|
| 🔴 P0 | A5/C1 Bug Loading→Netzwerkfehler | Komplette App-Funktion blockiert; Usability-Eindruck katastrophal |
| 🔴 P0 | Backend-Hosting umziehen (Hetzner offline) | Voraussetzung für A5/C1-Fix |
| 🟡 P1 | A1+A2+A3 + B1+B2 (steps_title weg, Button neben Titel) | Schnell umsetzbar (1 Datei pro Service-Flow), entlastet UX sofort |
| 🟡 P1 | D1+D2 (4-Felder-Toggle weg, 8 Kacheln) | Sicherheit (keine übersehenen Felder) |
| 🟢 P2 | A4 DSGVO/Encrypted-Mouseover | UX-Verbesserung mittelfristig, ersetzt Quiz |
| 🟢 P2 | Medatixx-Adapter | Vertriebs-Enabler, eigene Roadmap |
| 🟢 P2 | D.U.N.S./Apple-Distribution | Klapproth selbst |

---

## Verknüpfung mit Spur-A-Reklassifizierung

Keine Konflikte: Alle UX-Änderungen betreffen Layout/Workflow, nicht den Routing-Engine-Output. Die regulatorische Position bleibt unverändert. Item A4 (Quiz-Ersatz durch Mouseover) berührt **keine** Diagnose-Sprache.

---

## Sign-off

| Rolle | Aktion |
|-------|--------|
| Dr. Klapproth | hat das Feedback gegeben — Sign-off implizit erteilt |
| Tech-Lead | sollte vor Code-Änderungen kurz drüberlesen |
