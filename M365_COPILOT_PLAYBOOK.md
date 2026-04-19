# M365 Copilot Strategie-Playbook: DiggAI Projektmanagement
## Chief AI Operations — Zero-Waste Credit-Protokoll

Stand: 2026-04-16 | Budget: 60 Credits/Monat | Scope: DiggAI Anamnese-Plattform

---

## Executive Summary

Der Research Report belegt drei harte Realitaeten fuer den M365 Family-Einsatz in diesem Projekt:

1. **Cowork (Claude-Architektur)** ist der einzige wirklich agentic Stack im Consumer-Tier. Jeder Dialog kostet Credits — ein schlecht formulierter Prompt der in 5 Rueckfragen endet verbrennt 5 Credits statt 1.
2. **Stride** ist ein Einweg-Synthesizer. Optimal fuer einmalige Artefakt-Generierung, nicht fuer iterative Arbeit.
3. **60 Credits/Monat** reichen fuer ca. 8–10 hochwertige Agentenaufgaben. Alles darunter muss manuell oder mit kostenlosen Tools erledigt werden.

Kernprinzip dieses Playbooks: **Ein Prompt. Ein Durchlauf. Ein Artefakt.**

---

## 1. Die Copilot Cowork Management-Pipeline

### 1.1 Architektur-Grundsatz: Der Single-Shot Directive

Cowork verbrennt Credits pro Aktion, nicht pro Session. Ein Dialog mit 5 Nachrichten kostet bis zu 5 Credits. Die Loesung ist ein vorab strukturierter **Meta-Prompt** der alle Kontextinformationen, alle Teilaufgaben und das exakte Ausgabeformat in einem einzigen Request buendelt. Cowork darf keine Rueckfragen stellen muessen.

**Vorlage-Struktur fuer alle Cowork-Prompts:**

```
ROLLE: [Spezifische Funktion des Agenten]
KONTEXT: [Alle relevanten Informationen — kein Nachfragen noetig]
AUFGABEN: [Nummerierte Liste aller Teilaufgaben in einer Session]
AUSGABEFORMAT: [Exaktes Format mit Abschnittstiteln und Reihenfolge]
VERBOTE: [Was der Agent NICHT tun soll — verhindert Halluzinationen]
FREIGABE: [Welche Aktionen automatisch ausfuehren vs. pausieren fuer Approval]
```

---

### 1.2 Meta-Prompt 1: Sprint-Planung aus GitHub Issues (1 Credit)

**Anwendungsfall:** Wochentlich montags. Verwandelt offene GitHub Issues in einen priorisierten Sprint-Plan und blockiert Kalenderzeit.

**Wann benutzen:** Vor Beginn jedes 2-Wochen-Sprints.

```
ROLLE: Senior Projektleiter fuer ein MedTech-Softwareprojekt.

KONTEXT:
Projekt: DiggAI Anamnese-Plattform (React 19 + Express 5 + Prisma + Tomedo PVS-Integration)
Aktueller Engpass: Tomedo-Dokumentkanal ungeklaert (siehe angehaengtes TOMEDO_GAPS.md, Abschnitte 3 und 4).
Wichtigste offene technische Blocker (aus GitHub Issues — liste ich unten auf):
[HIER: Deine 5-10 aktuellen GitHub Issue-Titel per Copy-Paste einfuegen]
Team-Kapazitaet diese Woche: [z.B. 3 Entwickler-Tage verfuegbar]
Einschraenkung: Keine medizinisch-klinischen Aenderungen am TriageEngine ohne klinischen Sign-off.

AUFGABEN (alle in einem Durchlauf):
1. Priorisiere die Issues nach Blocker > Feature > Tech-Debt. Markiere alle mit Tomedo-Abhaengigkeit gesondert.
2. Erstelle einen Sprint-Plan fuer 10 Werktage mit konkreten tagesbasierten Meilensteinen.
3. Identifiziere die 2 Issues, die ohne externe Tomedo-API-Klaerung jetzt sofort erledigt werden koennen.
4. Schreibe 3 Outlook-Kalendereintraege als Textbeschreibungen: Sprint-Kick-off (Mo 9h, 30 Min), Mid-Sprint-Review (Mi 15h, 45 Min), Sprint-Demo (Fr 14h, 60 Min). Blockiere diese automatisch in meinem Outlook-Kalender.
5. Schreibe eine 3-Satz-Zusammenfassung fuer den Stakeholder Dr. Klaproth per E-Mail (Ton: sachlich, nicht technisch).

AUSGABEFORMAT:
- Abschnitt A: Priorisierte Issue-Liste (Tabelle: Rang | Issue | Kategorie | Tomedo-Abhaengig J/N | Schaetzung in Stunden)
- Abschnitt B: 10-Tage-Sprint-Plan (Tagesliste)
- Abschnitt C: Sofort-umsetzbare Issues (Freitext, max 100 Woerter)
- Abschnitt D: Kalendereintraege (direkt als Outlook-Aktionen ausfuehren)
- Abschnitt E: Stakeholder-E-Mail-Entwurf

VERBOTE: Keine neuen Features vorschlagen. Keine Fragen stellen. Keine Warnung-Disclaimers.
FREIGABE: Kalendereintraege und E-Mail-Versand pausieren und auf mein Okay warten.
```

**ROI: 1 Credit = Sprint-Plan + Kalender-Setup + Stakeholder-Komm. (ca. 2h manuelle Arbeit)**

---

### 1.3 Meta-Prompt 2: Tomedo-Klaerungsphase Koordinieren (1 Credit)

**Anwendungsfall:** Einmalig nach Beschaffung der Tomedo-API-Dokumentation. Verwandelt die TOMEDO_GAPS.md Fragen in eine orchestrierte Klaerungsaktion.

```
ROLLE: Technischer Projektkoordinator fuer eine externe API-Integration.

KONTEXT:
Wir integrieren die DiggAI Anamnese-Plattform mit Tomedo (Zollsoft PVS) ueber deren FHIR R4-API.
Der aktuelle Blockerstand ist in TOMEDO_GAPS.md dokumentiert (angehaengt). Die kritischsten Blocker sind:
- Unbekannter Dokumentkanal fuer PDF/Bild-Upload (TOMEDO_GAPS.md Abschnitt 3.1 und 4.5)
- Unbestaetiger Auth-Flow und OAuth-Scopes (Abschnitt 4.2)
- Unklare BSNR-Routing-Logik (Abschnitt 4.8)
Kontakt beim Hersteller: [Name und E-Mail des Zollsoft-Ansprechpartners einfuegen]
Technisches Meeting geplant: [Datum einfuegen oder "noch nicht terminiert"]

AUFGABEN (alle in einem Durchlauf):
1. Erstelle eine priorisierte Fragenliste fuer den Zollsoft-Termin. Fasse die 48 Fragen aus TOMEDO_GAPS.md Abschnitt 4 auf die 12 absolut blockierenden Fragen zusammen. Priorisierung: API-Pfad vor Auth vor Routing.
2. Schreibe eine professionelle Termin-Anfrage-E-Mail an den Zollsoft-Kontakt (Sprache: Deutsch, Ton: partnerschaftlich-technisch, Laenge: max 200 Woerter). Betreff-Vorschlag inklusive.
3. Erstelle eine Checkliste der Dokumente/Zugangsdaten, die wir VOR dem Meeting selbst beschaffen koennen (z.B. CapabilityStatement-Dump per curl, Sandbox-Zugang beantragen).
4. Blockiere in meinem Outlook-Kalender: 1h Vorbereitungszeit 2 Tage vor dem Meeting, 90 Min fuer das Meeting selbst, 30 Min Nachbereitung am Folgetag.

AUSGABEFORMAT:
- Abschnitt A: Top-12-Fragen (Tabelle: Nr | Frage | Warum blockierend | Erwartete Antwortform)
- Abschnitt B: Termin-Anfrage-E-Mail (versandfertig)
- Abschnitt C: Selbst-Vorbereitungs-Checkliste
- Abschnitt D: Kalendereintraege (pausieren fuer Freigabe)

VERBOTE: Keine Fragen an mich. Keine technische Tiefe jenseits der Frageformulierung.
FREIGABE: E-Mail-Versand und Kalendereintraege warten auf mein Okay.
```

**ROI: 1 Credit = Meeting-Vorbereitung + E-Mail + Kalender (ca. 1.5h manuelle Arbeit)**

---

### 1.4 Meta-Prompt 3: Monats-Retrospektive und naechste-Periode-Planung (1 Credit)

**Anwendungsfall:** Letzter Freitag jedes Monats.

```
ROLLE: Agiler Projektleiter fuer ein MedTech-Startup.

KONTEXT:
Projekt: DiggAI Anamnese-Plattform, aktueller Monat [Monat/Jahr]
Abgeschlossene Aufgaben diesen Monat: [Copy-Paste aus GitHub Closed Issues oder Notizen]
Aufgetretene Blocker: [Stichpunkte]
Naechste Prioritaeten (bekannt): [Stichpunkte — z.B. "Tomedo Pilottest", "KBV-Profil-Update"]
Budget-Verbrauch M365 Credits diesen Monat: [Zahl] von 60
Stakeholder-Erwartungen naechsten Monat: [z.B. "Erster Pilottest mit Praxis Klaproth"]

AUFGABEN (alle in einem Durchlauf):
1. Erstelle eine Retrospektive-Zusammenfassung (Was lief gut, Was lief schlecht, 3 Verbesserungsmassnahmen).
2. Erstelle einen Grob-Plan fuer die naechsten 4 Wochen mit Meilensteinen pro Woche.
3. Identifiziere welche Aufgaben im naechsten Monat Cowork/Stride-Einsatz rechtfertigen (ROI > 2h manuelle Arbeit) und welche ich manuell oder kostenlos erledige.
4. Schreibe einen 1-seitigen Monats-Update-Text fuer Stakeholder Dr. Klaproth (nicht technisch, ergebnisorientiert).

AUSGABEFORMAT:
- Abschnitt A: Retrospektive (3 Abschnitte: Gut/Schlecht/Massnahmen, je max 5 Bullets)
- Abschnitt B: 4-Wochen-Plan (Tabelle: Woche | Meilenstein | Abhaengigkeit | Risiko)
- Abschnitt C: Credit-Allokation naechster Monat (Tabelle gemaess Budget-Protokoll Abschnitt 3 dieses Playbooks)
- Abschnitt D: Stakeholder-Update (Freitext, max 300 Woerter)

VERBOTE: Keine Fragen. Keine vagen Aussagen wie "es haengt davon ab". Entscheidungen treffen, nicht auflisten.
```

**ROI: 1 Credit = Retrospektive + Monatsplan + Stakeholder-Report (ca. 3h manuelle Arbeit)**

---

## 2. Die Stride Dokumentations-Pipeline

### 2.1 Kernprinzip: Stride als Einweg-Synthesizer

Stride (Office Agent) ist optimal fuer **einmalige Transformationen** von existierendem Inhalt in formatierte Artefakte. Es ist ineffizient fuer iterative Arbeit. Die Regel lautet: Stride einmal aufrufen, Ergebnis manuell nachpflegen — nicht Stride mehrfach aufrufen.

**Stride benutzen fuer:**
- Markdown → PowerPoint Pitch-Deck (1 Credit)
- Sprint-Notizen → Word-Spezifikation (1 Credit)
- Gap-Report → Stakeholder-Praesentation (1 Credit)

**Stride NICHT benutzen fuer:**
- Textkorrekturen (manuell)
- Kleinteilige Umformulierungen (manuell)
- Datenbankschemas erstellen (Prisma-CLI, kostenlos)

---

### 2.2 Stride-Prompt 1: TOMEDO_GAPS.md → Stakeholder-Pitch-Deck (1 Credit)

**Anwendungsfall:** Fuer Meeting mit Dr. Klaproth, Zollsoft oder Investoren.

**Input vorbereiten (kostenlos, manuell vor dem Stride-Aufruf):**

1. TOMEDO_GAPS.md als Datei hochladen
2. Folgende Zusatzinformation als Text vorbereiten:
   - Projektname, Ziel in einem Satz
   - 3 konkrete Nutzungsvorteile fuer die Praxis
   - Zeitplan (Pilot, Go-Live)
   - Logo-Datei falls vorhanden

**Stride-Prompt (einmal abschicken, keine Iteration):**

```
Erstelle eine professionelle PowerPoint-Praesentation mit 12 Folien auf Basis der hochgeladenen TOMEDO_GAPS.md Datei.

Folientitel und Inhalte wie folgt:

1. Titelfolie: "DiggAI × Tomedo: Direktintegration ohne E-Mail-Kopieren" — Untertitel: Aktueller Entwicklungsstand und Klaerungsbedarf, [Datum]
2. Executive Summary: Die 4 wichtigsten Befunde aus dem Audit in je einem Satz (Abschnitt "Kurzfazit" der Datei)
3. Was bereits funktioniert: 3-Spalten-Layout mit Mail-Bruecke, FHIR-Direktpfad, GDT-Pfad — je Icon + 2 Bulletpoints
4. Was noch fehlt: Hervorgehobene "Luecken-Folie" — 5 fehlende Implementierungen als klare Blocker-Liste (roter Akzent)
5. Die groesste technische Luecke: Nur Abschnitt 3.1 aus der Datei — Dokument-Kanal ungeklaert — 1 grosse Aussage als Full-Bleed-Text
6. Unsere 48 Fragen, kondensiert: Top 8 Fragen aus Abschnitt 4 in 2 Spalten (je 4 Fragen)
7. Authentifizierung und Routing: Inhalte aus Abschnitten 4.2 und 4.8
8. Datei-Attachment-Gap: Nur Abschnitt 4.5 — 12 Fragen als nummerierte Liste
9. Was wir als naechstes brauchen: Abschnitt 7 "Priorisierte naechste Schritte" als 4-Schritt-Roadmap-Grafik
10. Architektur-Uebersicht: Einfaches Diagramm der 3 aktuellen Pfade (Mail, FHIR, GDT) und dem fehlenden 4. Pfad (Dokument)
11. Zeitplan Pilot: 4-Phasen-Timeline-Folie gemaess Abschnitt 7 des Reports
12. Call to Action: "Naechster Schritt: Zollsoft-Klaerungsgespraech" — Kontaktinfo-Platzhalter

Design: Professionelles medizinisches Corporate-Design, Blau-Weiss-Palette, keine verspielten Elemente.
Sprache: Deutsch, Ton: technisch-sachlich aber fuer Nicht-Entwickler lesbar.
Halluziniere keine Daten. Verwende ausschliesslich Inhalte aus der hochgeladenen Datei.
```

**ROI: 1 Credit = Fertige 12-Folien-Praesentation (ca. 4h manuelle PowerPoint-Arbeit)**

---

### 2.3 Stride-Prompt 2: Entwickler-Notizen → Word-Technisches Spezifikationsdokument (1 Credit)

**Anwendungsfall:** Nach dem Zollsoft-Klaerungsgespraech. Verwandelt rohe Gespraechsnotizen in ein formales Spec-Dokument fuer die Implementierung.

**Input vorbereiten (kostenlos, manuell):**
- Stichwort-Notizen aus dem Zollsoft-Meeting (muss nicht formatiert sein)
- TOMEDO_GAPS.md als Datei (Kontext)
- Optional: CapabilityStatement-JSON der Tomedo-API

**Stride-Prompt:**

```
Erstelle ein technisches Word-Spezifikationsdokument fuer die Implementierung des Tomedo-Dokumentimport-Pfads im DiggAI-System.

Basis-Materialien: [Notizen aus Meeting], [TOMEDO_GAPS.md], [CapabilityStatement falls vorhanden]

Dokumentstruktur (pflichtgemaess):

1. Deckblatt: Titel "Tomedo Dokument-Integration: Technische Spezifikation v1.0", Datum, Autor DiggAI Team
2. Zusammenfassung (max 1 Seite): Problem, Loesung, Implementierungsstrategie in je einem Absatz
3. Ist-Stand (aus TOMEDO_GAPS.md): Welche Pfade existieren bereits — 3 Unterabschnitte fuer Mail, FHIR, GDT
4. Ziel-Architektur: Beschreibung des neuen Dokument-Upload-Pfads mit konkreten Code-Stubs als Pseudocode
5. API-Spezifikation: Tabelle aller benoetigen Tomedo-Endpoints (aus Gespraechsnotizen), Format: Endpoint | Methode | Pflichtfelder | Erwartete Rueckgabe
6. Datenmodell-Delta: Welche neuen Felder braucht das Prisma-Schema (server/prisma/schema.prisma) fuer Dokument-Tracking
7. Sicherheit und DSGVO: Pflicht-Checkliste gemaess AGENTS.md-Vorgaben (AES-256-GCM, Audit-Logging, keine PII-Logs)
8. Implementierungsreihenfolge: Nummerierte Task-Liste fuer Entwickler (jede Task max 1 Tag Aufwand)
9. Testplan: Mindest-Testszenarien fuer Unit, Integration und E2E
10. Offene Punkte: Was nach diesem Meeting noch ungeklaert bleibt

Format: Professionelles Word-Dokument mit Kopfzeile, Seitenzahlen, Inhaltsverzeichnis.
Sprache: Deutsch-Englisch-Mix (Ueberschriften Deutsch, Code-Bezeichner Englisch).
Halluziniere keine API-Details. Markiere unbestaetigte Informationen mit [KLAERUNG NOETIG].
```

**ROI: 1 Credit = Fertige Implementierungsspezifikation (ca. 5h manuelle Schreibarbeit)**

---

### 2.4 Stride-Prompt 3: Sprint-Ergebnis → Changelog-Eintrag + README-Update (1 Credit)

**Anwendungsfall:** Am Ende jedes Sprints. Bestehende CHANGELOG.md und README.md werden aktualisiert.

```
Aktualisiere zwei bestehende Markdown-Dokumente auf Basis meiner Sprint-Notizen.

Sprint-Notizen: [Stichpunkte der abgeschlossenen Tasks einfuegen]
Zeitraum: [Sprint-Datum]
Bestehende Dateien: [CHANGELOG.md und README.md hochladen]

Aufgaben:
1. Fuege einen neuen Changelog-Eintrag im Keep-a-Changelog-Format hinzu (Version, Datum, Added/Changed/Fixed-Abschnitte)
2. Aktualisiere in README.md nur den Abschnitt "Demo System" falls neue Features oder Credentials hinzugekommen sind
3. Schreibe eine 2-Satz-Git-Commit-Message fuer diesen Changelog-Commit

Ausgabe: Die beiden vollstaendigen aktualisierten Dokumente plus Commit-Message.
Verbote: Den Rest der README.md nicht veraendern. Keine neuen Abschnitte hinzufuegen.
```

---

## 3. Das Credit-Rationierungs-Protokoll (Zero-Waste Strategy)

### 3.1 Monatliches Budget-Tableau

| Kategorie | Credits/Monat | Beschreibung | Trigger |
|---|---|---|---|
| **Sprint-Planung (Cowork)** | 4 | 2 Sprints × 1 Credit je Prompt 1.2 | Montag Sprint-Start |
| **Tomedo-Klaerung (Cowork)** | 2 | Einmalig intensiv, dann Wartephase | Bei neuen Zollsoft-Infos |
| **Retrospektive (Cowork)** | 1 | 1× pro Monat, Prompt 1.4 | Letzter Freitag |
| **Stakeholder-Deck (Stride)** | 2 | 1× pro Quartal oder bei Meilensteinen | Vor wichtigen Meetings |
| **Technische Spezifikation (Stride)** | 2 | 1× nach Tomedo-Klaerung | Nach Zollsoft-Meeting |
| **Deep Research** | 4 | Max 4× — fuer Tomedo-API, KBV-Profile, Datenschutz | Wenn externe Recherche noetig |
| **Reserve/Notfall** | 5 | Unvorhergesehene dringende Aufgaben | — |
| **Nie benutzen fuer** | 0 | Textkorrekturen, Commit-Messages, Schema-Fragen, Code-Snippets | — |
| **SUMME** | **20** | **Konservative Basis-Auslastung** | — |

**Verbleibende 40 Credits: Nur einsetzen wenn ROI nachweisbar > 3h manuelle Arbeit.**

---

### 3.2 Aufgaben die NIEMALS Credits kosten duerfen

Diese Aufgaben erledigen sich kostenlos und duerfen den Credit-Pool nicht beruehren:

| Aufgabe | Kostenloses Tool |
|---|---|
| GitHub Issues anlegen und labeln | GitHub Web-UI direkt |
| Code reviewen und kommentieren | VS Code + GitHub Copilot Chat (kostenlos im VS Code-Abonnement) |
| Prisma Migrations schreiben | `npx prisma migrate dev` CLI |
| TypeScript-Fehler beheben | VS Code TypeScript LSP |
| Unit-Tests schreiben | Vitest direkt, kein KI-Prompt noetig |
| i18n-Schluessel pruefen | `node scripts/generate-i18n.ts` (bereits vorhanden) |
| Commit-Messages formulieren | Manuell, max 30 Sekunden |
| README kleine Korrekturen | Manuell direkt im Editor |
| Dependency-Updates pruefen | `npm audit` + `npm outdated` CLI |
| Backup-Status pruefen | `npm run backup:status` (bereits vorhanden) |
| Triage-Engine-Aenderungen | Kein KI-Einsatz — klinischer Sign-off Pflicht (AGENTS.md) |

---

### 3.3 Die "1-Credit-Wuerdigkeitspruefung"

Vor jedem Cowork- oder Stride-Einsatz muss diese Frage positiv beantwortet werden:

> **Ersetzt diese Aufgabe mehr als 90 Minuten manuelle Arbeit die ich nicht delegieren kann?**

Wenn nein → manuell erledigen oder auf den naechsten Sprint-Planungs-Batch schieben.

Zusaetzlich: Nie Cowork oder Stride in einem reaktiven Stimmungsmoment benutzen (z.B. "ich will schnell wissen ob..."). Immer zuerst die Anfrage auf Papier oder in einem Texteditor ausformulieren. Wenn die Formulierung laenger als 5 Minuten dauert und klar ist, dann erst abschicken.

---

### 3.4 Deep Research: Die 15 erlaubten Einsaetze im Jahresplan

Deep Research ist das maechtigste Tool im Stack (Critique-Architektur, 13.88% Genauigkeitsgewinn). Fuer DiggAI gilt folgende Jahresallokation:

| # | Thema | Timing | Grund |
|---|---|---|---|
| 1 | Tomedo FHIR R4 API Vollanalyse: Binary/DocumentReference/Composition-Semantik | Nach Zollsoft-Meeting | Kritischste technische Luecke |
| 2 | KBV Basisprofile v1.8.0 — Aenderungen vs. aktueller Repo-Stand | Vor erstem Piloten | Profilversions-Abgleich |
| 3 | DSGVO-Konformitaetspruefung: Audit-Logging-Anforderungen 2026 fuer Klinische Software | Q3 | Regulatorik |
| 4 | OAuth2 mTLS / private_key_jwt fuer Tomedo Server-zu-Server-Auth | Nach Zollsoft-Meeting | Auth-Architektur |
| 5–8 | Reserve fuer unvorhergesehene Compliance/Technik-Fragen | Bedarfsgesteuert | — |
| 9–15 | Gesperrt — nicht verbrauchen ausser mit expliziter Entscheidung | — | Jahresreserve |

---

### 3.5 Was dieser Plan bewusst NICHT mit M365 AI erledigt

Diese Aufgaben sind strukturell ungeeignet fuer den 60-Credit-Pool und werden extern oder manuell behandelt:

| Aufgabe | Warum nicht M365 AI | Alternative |
|---|---|---|
| Iterativer Code-Debugging-Dialog | Jede Antwort kostet Credit | GitHub Copilot Chat in VS Code (separates Kontingent) |
| Tomedo Live-API-Tests | Kein Tool-Zugriff auf externe APIs | `curl` + Postman direkt |
| Datenbankabfragen und Schema-Analyse | Prisma Studio ist kostenlos und praeziser | `npx prisma studio` |
| Grosse Refactorings planen | Claude 4.6 Opus direkt ueber API effizienter | Claude Pro separat, wenn noetig |
| Playwright E2E-Tests schreiben | Code-Generierung schnell iterativ | Copilot Chat in VS Code |
| Projektdoku pflegen (CHANGELOG, AGENTS.md) | Zu haeufig, zu kleinteilig | Manuell + Git-Workflow |

---

## 4. Schnellreferenz: Welches Tool fuer welche Aufgabe

```
Neue Aufgabe kommt rein
        │
        ▼
Ist es eine einmalige Transformation von
existierendem Inhalt in ein formatiertes Artefakt?
(z.B. MD → PPT, Notizen → Word-Spec)
        │
   JA ──┼── Stride benutzen (Prompt aus Abschnitt 2)
        │
       NEIN
        │
        ▼
Erfordert es cross-app Orchestrierung
(Kalender + E-Mail + Priorisierung in einem Durchlauf)?
        │
   JA ──┼── Cowork benutzen (Single-Shot Meta-Prompt aus Abschnitt 1)
        │
       NEIN
        │
        ▼
Erfordert es externe Recherche mit verifizierten Quellen
(API-Doku, Normen, Compliance)?
        │
   JA ──┼── Deep Research benutzen (max 4 pro Monat)
        │
       NEIN
        │
        ▼
Manuell erledigen oder kostenloses Tool benutzen.
Kein Credit verbrauchen.
```

---

## Anhang: Kontext-Dateien fuer Cowork vorbereiten (einmalig, kostenlos)

Cowork funktioniert besser wenn er bereits projektspezifischen Kontext kennt. Diese Dateien einmalig als OneDrive-Referenz hochladen und in jedem Prompt per Dateiname referenzieren (kein Credit-Verbrauch fuer den Upload):

- `TOMEDO_GAPS.md` — Aktueller Integrationsstatus und offene Fragen
- `AGENTS.md` — Projektvorgaben, Sicherheitsregeln, verbotene Operationen
- `docs/TOMEDO_BRIDGE.md` — Bridge-Architektur

Diese drei Dateien decken 90% des Projektkontexts ab den Cowork benoetigt. Damit entfaellt jedes Mal das manuelle Kontext-Briefing.
