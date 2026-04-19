# Tomedo Klaerungspaket fuer Zollsoft

Stand: 2026-04-16
Basis: TOMEDO_GAPS.md
Ziel: Externe Klaerung der blockierenden Integrationsfragen fuer direkten Dokumentimport (PDF/Bild) in Tomedo.

## A. Top-12 blockierende Fragen (priorisiert)

| Nr | Frage | Warum blockierend | Erwartete Antwortform |
|---|---|---|---|
| 1 | Welcher produktive Dokumentkanal ist fuer Fremdsysteme in unserer Zielumgebung offiziell freigegeben: FHIR Binary+DocumentReference, Media, proprietaerer Endpoint oder Hotfolder? | Ohne Kanalentscheidung kann kein belastbarer Implementierungspfad gestartet werden. | Eindeutige Entscheidung mit offizieller Referenz/Dokumentation |
| 2 | Falls FHIR: Sind Binary und DocumentReference in der Zielinstanz schreibend freigeschaltet (Create/Update)? | Kernfrage fuer direkten PDF/Bild-Upload ueber bestehenden FHIR-Stack. | CapabilityStatement-Auszug oder Endpoint-Liste mit Operationen |
| 3 | Falls nicht FHIR: Welcher proprietaere Upload-Endpoint ist zu nutzen (URL, Methode, Payload, Auth)? | Verhindert Fehlentwicklung auf falschem Transportkanal. | API-Spezifikation/OpenAPI oder Herstellerdokument |
| 4 | Welche Authentifizierung ist fuer Server-zu-Server-Schreibzugriffe verpflichtend (OAuth2 Flow, Scopes, mTLS, Client-Typ)? | Ohne korrekten Auth-Flow sind alle Write-Calls blockiert. | Verbindliche Auth-Matrix mit Beispielkonfiguration |
| 5 | Welche Ressource erzeugt in Tomedo den fachlich korrekten sichtbaren Karteikarteneintrag: Composition oder proprietaerer Dokumentations-Endpunkt? | Aktuell wird Composition geschrieben, Sichtbarkeit und fachliche Zuordnung sind unbestaetigt. | Herstellerempfehlung inkl. Pflichtfelder |
| 6 | Wie muss ein Dokument technisch an Patient und Fallakte gebunden werden (Referenzen, Pflichtfelder, Reihenfolge der Anlage)? | Entscheidet u.a. Idempotenz, Dublettenvermeidung und korrekte UI-Ablage. | Konkretes Mapping-Schema oder Referenzpayload |
| 7 | Welche Pflichtmetadaten sind fuer Dokumentimporte erforderlich (Kategorie, Titel, Autor, Datum, Codesysteme)? | Ohne Pflichtmetadaten drohen 4xx-Fehler oder unsichtbare Dokumente. | Feldliste mit Required/Optional und zul. ValueSets |
| 8 | Welche technischen Limits gelten fuer Dateianhaenge (MIME-Typen, Dateigroesse, Aufloesung, PDF/A-Pflicht)? | Upload-Service und Validierung muessen auf reale Limits angepasst werden. | Grenzwerttabelle mit Beispielen |
| 9 | Werden Dokumente nach erfolgreichem Import sofort in der Tomedo-Oberflaeche sichtbar; falls nein, welcher Folgejob ist noetig? | Kritisch fuer E2E-Definition, Monitoring und Supportprozesse. | Prozessbeschreibung inkl. erwarteter Latenz |
| 10 | Welche Referenz ist fuer Statusabfrage, Retry und Idempotenz verbindlich zu persistieren (ID/URL/OperationOutcome-Ref)? | Grundlage fuer robustes Retry- und DLQ-Handling im produktiven Betrieb. | Antwortschema inkl. Fehlerobjekt-Beispielen |
| 11 | Wie ist das Praxisrouting korrekt abzubilden: BSNR, Mandant-ID, Standort-ID oder Benutzerkontext; ist tenant.subdomain fachlich korrekt? | Verhindert Fehlrouting zwischen Praxen/Mandanten. | Verbindliche Routingregel mit Beispiel |
| 12 | Welche Base-URL und API-Version gilt fuer die Zielumgebung konkret; ist https://api.tomedo.de/fhir/R4 fuer unseren Pilot verbindlich? | Aktuelle URL ist im Code als Annahme vorhanden, nicht verifiziert. | Verbindliche Endpoint-Basis inkl. Umgebungsunterscheidung |

## B. Termin-Anfrage an Zollsoft (versandfertig)

Betreff: Technische Klaerung Tomedo-Dokumentimport fuer DiggAI Pilotintegration

Hallo [Name],

wir bereiten aktuell die produktive Anbindung der DiggAI Anamnese-Plattform an Tomedo vor und koennen Patient/Fallakte/Karteieintrag bereits strukturiert uebergeben. Fuer den naechsten Schritt (direkter Import von PDF/Bild-Anhaengen in die Tomedo-Karteikarte ohne E-Mail-Workaround) benoetigen wir eine kurze technische Klaerung zu freigegebenem Dokumentkanal, Authentifizierung und Pflichtmetadaten.

Wir schlagen dazu einen 60-90-minuetigen Termin vor und bringen eine priorisierte Top-12-Fragenliste mit, damit wir effizient zu einer umsetzbaren Spezifikation kommen. Zeitlich waeren bei uns [Option 1] oder [Option 2] moeglich.

Vielen Dank vorab und viele Gruesse
[Name]
DiggAI Projektteam
[Kontakt]

## C. Selbst-Vorbereitungscheckliste vor dem Termin

### C1. Technische Nachweise vorbereiten

- TOMEDO_GAPS.md in aktueller Version beilegen.
- Bestehende Tomedo-Write-Pfade dokumentieren: Patient, Encounter, Composition (Codebelege vorbereiten).
- Aktuellen Upload-Pfad (lokal) und die Trennung zum Tomedo-Pfad kurz visualisieren.
- Alle offenen Punkte als Top-12-Fragenliste in finaler Reihenfolge ausdrucken/exportieren.

### C2. API/Auth Vorab-Klaerungen intern

- Aktuelle Umgebungswerte fuer Tomedo-Basis-URL und OAuth-Konfiguration zusammentragen.
- Vorhandene Fehler- und Statusbehandlung dokumentieren (DLQ/Retry/Statuswatcher).
- Interne Entscheidung treffen, welche Datenfelder im Dokument-Mapping zwingend benoetigt werden.

### C3. Operative Vorbereitung

- Ansprechpartnerliste finalisieren (technisch, fachlich, Datenschutz).
- Terminagenda mit Timeboxing erstellen:
  - 10 Min Zielbild und Ist-Stand
  - 45 Min Top-12 Fragen
  - 20 Min API/Auth/Mapping-Entscheidungen
  - 15 Min Next Steps und Verantwortlichkeiten
- Protokolltemplate fuer Entscheidungen vorbereiten (Frage, Entscheidung, Quelle, Owner, Deadline).

## D. Kalender-Blockplan (Outlook-Template)

### D1. Vorbereitung (2 Tage vor Termin)

Titel: Tomedo-Zollsoft Meeting Vorbereitung
Dauer: 60 Minuten
Ziel: Fragen priorisieren, Nachweise finalisieren, Rollen klaeren
Teilnehmer: DiggAI intern

### D2. Haupttermin

Titel: DiggAI x Zollsoft - Technische Klaerung Dokumentimport
Dauer: 90 Minuten
Ziel: Verbindliche Entscheidung fuer Dokumentkanal, Auth und Routing erhalten
Teilnehmer: Zollsoft + DiggAI

### D3. Nachbereitung (Folgetag)

Titel: Tomedo Klaerung - Entscheidungen in Implementierungsplan ueberfuehren
Dauer: 30 Minuten
Ziel: Entscheidungen in technische Tasks und Spezifikation uebersetzen
Teilnehmer: DiggAI intern

## E. Definition of Done fuer die Klaerungsphase

Die Klaerungsphase gilt erst als abgeschlossen, wenn alle folgenden Punkte als schriftliche Herstellerauskunft vorliegen:

- Verbindlicher Dokumentkanal (FHIR/proprietaer/Hotfolder) benannt.
- Verbindlicher Auth-Flow inkl. Scopes benannt.
- Pflichtmetadaten und Limits fuer PDF/Bild benannt.
- Bindung an Patient/Fallakte fachlich bestaetigt.
- Status-/Fehlerantworten und Idempotenzreferenz spezifiziert.
- Praxisrouting-Logik inkl. BSNR/Mandant-ID verbindlich dokumentiert.

## F. Bereits vorbereitete Testartefakte

Die folgenden Artefakte sind bereits vorbereitet und koennen sofort fuer interne Reproduktionstests genutzt werden:

- TOMEDO_TESTING_PLAYBOOK.md
- testing/tomedo/payloads/create-connection-tomedo-fhir.json
- testing/tomedo/payloads/export-session-body.json
- testing/tomedo/payloads/import-patient-body.json

Hinweis: Diese Tests validieren den aktuellen Ist-Stand (Upload, Export, PVS-Verbindung, Session-Export) und trennen bewusst von den extern abhaengigen Dokumentimport-Tests gegen Tomedo.
