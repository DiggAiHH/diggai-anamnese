# Tomedo Interface Audit: Status Quo und GAP-Analyse

Stand: 2026-04-16

## Update nach Implementierung (2026-04-16)

Seit dieser Analyse wurde ein erster direkter Dokumentpfad im Code umgesetzt:

- Neuer Endpunkt `POST /api/pvs/documents/attach` in `server/routes/pvs.ts`
- Neue Tomedo-Client-Methode `uploadDocument(...)` in `server/services/pvs/tomedo-api.client.ts`
- Upload ueber FHIR `Binary` plus Verknuepfung ueber `DocumentReference`
- Reuse bestehender Upload-Dateien aus `uploads/` (PDF/JPG/PNG)
- Tenant-/Session-Scope-Checks und Audit-Logging fuer den Attach-Vorgang

Wichtige Einschraenkung:

- Damit ist ein technischer Write-Pfad implementiert, aber die fachliche End-to-End-Validierung in einer realen Tomedo-Zielumgebung (sichtbar an der gewuenschten Stelle der Karteikarte) bleibt weiterhin offen und muss mit echter Instanz getestet werden.

## Ziel dieses Dokuments

Dieses Dokument beantwortet drei Fragen auf Basis des aktuell vorhandenen Codes:

1. Was ist in der DiggAI-Codebasis fuer die Tomedo-Bruecke bereits real implementiert?
2. Was fehlt konkret, um strukturierte Daten und Dateien direkt in die Tomedo-Akte bzw. Karteikarte zu schreiben, ohne manuelles E-Mail-Kopieren?
3. Welche hochspezifischen technischen Informationen muessen wir jetzt beschaffen, damit die naechste Implementierungsstufe belastbar geplant werden kann?

Wichtig: Diese Analyse trennt strikt zwischen dokumentierten Behauptungen und im Code nachweisbarer Implementierung.

## Kurzfazit

Der aktuelle Codebestand enthaelt nicht eine Tomedo-Integration, sondern drei unterschiedliche Uebergabepfade:

- Eine produktionsnahe E-Mail-Bruecke fuer Tomedo-parsebare Anamnese-Inhalte.
- Einen direkten Tomedo-FHIR/REST-Pfad fuer strukturierte Daten wie Patient, Encounter/Fallakte und Composition/Karteieintrag.
- Einen echten GDT-Dateipfad fuer strukturierte GDT-Exporte und GDT-Watching.

Der entscheidende harte Befund lautet:

- Strukturierte Daten koennen bereits in Richtung Tomedo geschrieben werden.
- Ein direkter, im Code nachweisbarer Pfad fuer PDF- und Bilddateien in die Tomedo-Karteikarte existiert derzeit nicht.
- Die Upload- und Export-Funktionen sind aktuell nicht an den Tomedo-Pfad angebunden.
- Mehrere Dokumente im Repository beschreiben einen weiter fortgeschrittenen Integrationsgrad, als der Code fuer Dateiuploads in die Tomedo-Akte derzeit belegt.

## Scope der geprueften Quellen

Schwerpunkte dieser Analyse:

- `server/services/emailFormatter.ts`
- `server/services/tutamail.ts`
- `server/routes/sessions.ts`
- `server/routes/export.ts`
- `server/routes/upload.ts`
- `server/routes/pvs.ts`
- `server/services/pvs/adapters/tomedo.adapter.ts`
- `server/services/pvs/tomedo-api.client.ts`
- `server/services/pvs/tomedo-lauscher.service.ts`
- `server/services/pvs/gdt/gdt-writer.ts`
- `server/services/pvs/gdt/gdt-parser.ts`
- `server/services/pvs/fhir/kbv-profiles.ts`
- `server/services/pvs/auto-config/pvs-detection.service.ts`
- `server/agents/tomedo-bridge/team-bravo/epa-mapper.agent.ts`
- `server/agents/tomedo-bridge/team-bravo/documentation.agent.ts`
- `server/agents/tomedo-bridge/team-delta/cross-validator.agent.ts`
- `SYSTEM_CONTEXT.md`
- `docs/TOMEDO_BRIDGE.md`
- `docs/SECURE_TRANSPORT_TOMEDO_2026-03-31.md`

## 1. Was wir heute nachweislich haben

### 1.1 Mail-basierte Tomedo-Bruecke ist real vorhanden

In `server/routes/sessions.ts` wird nach dem Session-Submit asynchron ein Tomedo-Mailing-Pfad gestartet:

- `formatSessionForTomedo(...)` aus `server/services/emailFormatter.ts`
- `sendAnamneseEmail(...)` aus `server/services/tutamail.ts`

Der Formatter erzeugt einen Tomedo-lesbaren Plaintext-Block mit festen Feldlabels wie:

- `Nachname`
- `Vorname`
- `Geb. datum`
- `Grund der Inanspruchnahme`

Zusatzbefund:

- Der Betreff wird nach dem Muster `[DiggAI] Anamnese - Nachname, Vorname - DD.MM.YYYY` gebaut.
- Der Versand geht an eine BSNR-abgeleitete Adresse ueber den TutaMail-Pfad.
- Die BSNR wird aktuell aus `tenant.subdomain` abgeleitet, nicht explizit aus einem Feld wie `tenant.bsnr`.

Bewertung:

- Das ist eine funktionierende Integrationsstrategie fuer textuelle Uebergabe.
- Das ist keine direkte Dateieinlage in die Tomedo-Akte.
- Das ist auch keine garantierte strukturierte API-Schreiboperation in eine Karteikarte.

### 1.2 Direkter Tomedo-Pfad fuer strukturierte Daten ist real vorhanden

Es gibt zwei echte direkte Tomedo-Pfade im Code.

#### A. Adapter-/PVS-Pfad

`server/routes/pvs.ts` erlaubt Verbindungen mit:

- `pvsType = TOMEDO`
- `protocol = FHIR`

`server/services/pvs/adapters/tomedo.adapter.ts` exportiert Anamnese-Ergebnisse ueber einen FHIR-Bundle-Submit.

Der Adapter kann nachweislich:

- Patienten suchen
- Status per FHIR-Referenz aufloesen
- `exportAnamneseResult(session)` via Bundle ausfuehren

`docs/SECURE_TRANSPORT_TOMEDO_2026-03-31.md` beschreibt dazu einen strukturierten Zielzustand mit Ressourcen wie Patient, Encounter, QuestionnaireResponse, Flag, RiskAssessment, MedicationStatement, Procedure und Observation. Das passt zur Architektur. Entscheidend ist aber: Diese Doku beweist nicht, dass Dokumente oder Bilder bereits geschrieben werden.

#### B. Direkter Tomedo-API-Client

`server/services/pvs/tomedo-api.client.ts` implementiert konkrete Schreiboperationen:

- `createPatient(...)` per `POST /Patient`
- `createFallakte(...)` per `POST /Encounter`
- `addKarteieintrag(...)` per `POST /Composition`

Zusatzbefund:

- `addKarteieintrag(...)` liest zuerst den Encounter, zieht daraus die Patient-Referenz und legt danach eine `Composition` an.
- Inhalt der Karteikarte wird als XHTML-Text in `section.text.div` erzeugt.
- ICD-10-Codes werden als Referenzen im Composition-Body untergebracht.

Bewertung:

- Der direkte strukturierte Schreibpfad fuer Patient, Fallakte und textbasierte Dokumentation ist real.
- Damit ist der Status quo weiter als nur E-Mail oder Placeholder.
- Gleichzeitig ist damit noch nicht bewiesen, dass Tomedo PDFs oder Bilder ueber denselben Pfad akzeptiert oder in der UI an der gewuenschten Stelle anzeigt.

### 1.3 Team-Bravo-Bridge ist fuer Patient/Fallakte/Karteieintrag real, aber nicht vollstaendig verifiziert

Die Multi-Agent-Bridge in `server/agents/tomedo-bridge/` ist nicht rein aspirativ.

Nachweislich implementiert:

- `epa-mapper.agent.ts` sucht oder erzeugt Patienten und legt danach eine Fallakte an.
- `documentation.agent.ts` erzeugt danach einen Karteieintrag ueber `addKarteieintrag(...)`.
- Der Orchestrator referenziert `Composition/...` explizit als Ergebnis der Dokumentationsstufe.

Aber:

- `team-delta/cross-validator.agent.ts` enthaelt selbst deklarierte Platzhalter.
- Dort steht explizit, dass fuer reale Implementierung Tomedo-seitige Daten eigentlich gelesen bzw. verifiziert werden muessten.
- `connectionStatus = 'ONLINE'` ist dort hart als Placeholder gesetzt.

Bewertung:

- Die Bridge ist teilweise real und teilweise noch simulativ.
- Fuer ein Audit darf man sie nicht als voll verifizierten End-to-End-Nachweis behandeln.

### 1.4 GDT-Dateipfad ist echt, aber auf GDT begrenzt

`server/services/pvs/gdt/gdt-writer.ts` generiert reale GDT-Dateien:

- `buildAnamneseResult(...)` fuer Satzart 6301
- `buildStammdatenAnfordern(...)` fuer Satzart 6310
- `writeGdtFile(...)` schreibt atomar nach `DIGGAI_<PatNr>_<Timestamp>.gdt`

Die Watcher-Infrastruktur beobachtet nachweislich `.gdt`-Dateien. Die vorhandenen Watcher sind damit ein echter Dateibruecken-Pfad, aber eben fuer GDT-Dateien, nicht fuer PDF/Bild-Attachments.

Bewertung:

- GDT ist kein Placeholder.
- GDT beantwortet jedoch nicht die Frage, wie PDFs oder Bilder direkt in eine Tomedo-Karteikarte gelangen.

### 1.5 Upload- und Export-System sind nicht an Tomedo-Dokumentablage gekoppelt

`server/routes/upload.ts` kann:

- JPG
- PNG
- PDF

lokal speichern und wieder ausliefern.

Es gibt dort:

- keine Tomedo-Referenz
- keine PVS-Referenz
- keinen Call zu `tomedo-api.client.ts`
- keine `DocumentReference`-/`Binary`-/`Media`-Erzeugung
- keine Weiterleitung in einen Tomedo-Importordner

`server/routes/export.ts` kann:

- CSV
- TXT
- PDF
- JSON
- CCD
- FHIR

exportieren. In der FHIR-Ausgabe ist `QuestionnaireResponse` belegt. Ein direkter Dokument-Upload nach Tomedo wird dort aber nicht implementiert.

Bewertung:

- Upload und Export sind aktuell allgemeine Plattformfunktionen.
- Sie sind keine Tomedo-Dokumentbruecke.

### 1.6 Dokument-Profile sind nur als Konstanten vorhanden

In `server/services/pvs/fhir/kbv-profiles.ts` existieren Konstanten fuer:

- `KBV_PR_Base_DocumentReference`
- `KBV_PR_Base_Binary`

Im geprueften Tomedo-Pfad wurde jedoch kein Builder und keine POST-Logik fuer:

- `Binary`
- `DocumentReference`
- `Media`

gefunden.

Bewertung:

- Dokumentprofile sind vorbereitet oder vorgedacht.
- Ein implementierter Dokument-Write-Path ist damit nicht belegt.

### 1.7 Status-Sync existiert, aber nicht fuer Dateien

`server/services/pvs/tomedo-lauscher.service.ts` kann:

- exportierte Referenzen beobachten
- Status ueber `fetchStatusByReference(...)` abrufen
- bei erfolgreichem Status Folgeaktionen ausloesen
- Patientenlinks importseitig hochziehen

Nicht gefunden wurde ein Pfad fuer:

- Dateiupload-Status
- Dokumentimport-Status
- Binary/DocumentReference-Status
- Bild-/PDF-Verarbeitung in Tomedo

Bewertung:

- Statusbeobachtung ist da.
- Sie schliesst die Dateigap nicht.

## 2. Was genau bisher fuer die Tomedo-Bruecke gebaut wurde

In komprimierter Form ist der aktuelle Ist-Stand:

### Bereits gebaut

- Textuelle Tomedo-Uebergabe per TutaMail mit parsebarem Plaintext-Format.
- PVS-Verbindungsmodell fuer Tomedo mit FHIR-Protokoll.
- Tomedo-Adapter fuer FHIR-Bundle-Export und Statusabfrage.
- Direkter Tomedo-Client fuer Patient, Fallakte und Composition/Karteieintrag.
- Multi-Agent-Bruecke, die Patient/Fallakte/Karteieintrag orchestriert.
- DLQ-/Retry-Strukturen und Status-Watching fuer den direkten Tomedo-Pfad.
- GDT-Dateigenerierung und GDT-Dateiwatching.

### Nicht gebaut oder nicht nachweisbar gebaut

- Direkter Upload von PDF/Bilddateien in die Tomedo-Akte/Karteikarte.
- FHIR- oder REST-Schreibpfad fuer `Binary`, `DocumentReference` oder `Media` zu Tomedo.
- Verkabelung von `server/routes/upload.ts` in die Tomedo-Bridge.
- Nachweisbarer Importpfad von Plattform-PDF-Exporten direkt nach Tomedo.
- Dokument-Hotfolder fuer Tomedo-PDF/Bildimporte.
- Tomedo-spezifische Action-Chain, AppleScript-, Makro- oder Importautomationsanbindung.
- Endgueltiger Nachweis, dass `Composition` in der realen Tomedo-Zielumgebung exakt als gewuenschter Karteikarteneintrag erscheint.

## 3. Die eigentliche GAP: Was fehlt fuer direkte Tomedo-Akte/Karteikarte ohne E-Mail-Kopieren

Die fehlenden Informationen liegen nicht nur in fehlendem Code, sondern vor allem in fehlender Zielsystem-Spezifikation. Aktuell fehlt uns die verbindliche Antwort auf die Frage, ueber welchen technischen Kanal Tomedo fuer Dokumente und strukturierte Inhalte in dieser konkreten Zielumgebung wirklich beschreibbar ist.

### 3.1 Ungeklaert ist der echte Dokument-Kanal in Tomedo

Das ist die groesste Luecke.

Wir wissen aktuell nicht belastbar:

- ob Tomedo in der Zielumgebung `Binary` + `DocumentReference` schreibend akzeptiert
- ob Tomedo stattdessen `Media` erwartet
- ob Dokumente nur ueber einen proprietaeren Endpoint angenommen werden
- ob Dokumente ueber einen Hotfolder importiert werden muessen
- ob zusaetzliche Metadateien oder Dateinamenskonventionen noetig sind
- ob ein Aktionketten-/Makro-/Automation-Pfad die eigentliche produktive Strategie sein muss

Ohne diese Antwort koennen wir keinen sauberen PDF/Bild-Import bauen.

### 3.2 Ungeklaert ist die semantische Zielabbildung in Tomedo

Fuer strukturierte Daten schreiben wir aktuell Patient, Encounter und Composition. Aber es fehlen verbindliche Aussagen dazu, ob genau diese FHIR-Ressourcen in der realen Tomedo-Instanz so verarbeitet werden, wie das Fachziel es verlangt.

Ungeklaert:

- Ist `Composition` wirklich der richtige technische Traeger fuer einen sichtbaren Karteikarteneintrag in Tomedo?
- Muss ein Karteikarteneintrag stattdessen ueber einen proprietaeren Dokumentations-Endpoint erzeugt werden?
- Muss die Zuordnung an Patient allein erfolgen oder zwingend an Fallakte plus Patient?
- Welche Pflichtfelder, Codes, Kategorien oder Profile erwartet Tomedo tatsaechlich?

### 3.3 Ungeklaert ist die Mandanten- und Routing-Logik

Der Mail-Pfad benutzt aktuell `tenant.subdomain` als BSNR-Ableitung. Das kann korrekt sein, muss es aber nicht.

Es fehlt die belastbare Klaerung:

- ob `tenant.subdomain` fachlich die BSNR repraesentiert
- ob stattdessen ein explizites `tenant.bsnr` benoetigt wird
- ob die Tomedo-Zielinstanz mandanten-, praxis- oder arztbezogen anders geroutet wird

### 3.4 Ungeklaert ist das Authentifizierungs- und Capability-Profil der realen Tomedo-Instanz

Der Code geht von OAuth2/FHIR aus. Die Auto-Detection legt sogar pauschal `https://api.tomedo.de/fhir/R4` als `fhirBaseUrl` nahe.

Was fehlt:

- echter CapabilityStatement- oder OpenAPI-Nachweis der Zielinstanz
- echte Liste der writefaehigen Ressourcen
- echte OAuth-Scopes bzw. Client-Credentials-Anforderungen
- Antwort auf die Frage, ob Tomedo in der Pilotumgebung ueberhaupt schreibende Dokument-Endpunkte freischaltet

### 3.5 Ungeklaert sind Idempotenz, Sichtbarkeit und UI-Verhalten

Selbst wenn ein POST technisch akzeptiert wird, ist noch offen:

- ob der Eintrag sofort in der Karteikarte sichtbar ist
- in welchem Reiter, Dokumenttyp oder Ordner er erscheint
- wie Dubletten erkannt werden
- welche Rueckgabereferenz spaeter fuer Status- oder Sync-Pruefung benutzt werden muss

## 4. Exakter Missing Information Report

Die folgenden Fragen sind die konkret fehlenden Informationen, die fuer den naechsten Implementierungsschritt zwingend beschafft werden muessen.

### 4.1 API und Ressourcenmodell

1. Welche schreibenden Endpunkte stellt die reale Tomedo-Zielumgebung fuer externe Integrationen zur Verfuegung?
2. Ist der produktive Pfad wirklich HL7 FHIR R4, oder existiert parallel bzw. stattdessen ein proprietaerer REST-Endpunkt?
3. Welche Ressourcen duerfen schreibend angelegt werden: `Patient`, `Encounter`, `Composition`, `QuestionnaireResponse`, `Binary`, `DocumentReference`, `Media`, `Observation`, `Condition`, `Procedure`?
4. Ist `Composition` in Tomedo der korrekte und von Zollsoft empfohlene Weg fuer einen echten Karteikarteneintrag?
5. Falls `Composition` nicht ausreichend ist: Welcher Endpunkt oder welches Ressourcenmodell erzeugt den fachlich richtigen Karteikarteneintrag?
6. Welcher `CapabilityStatement` bzw. welche offizielle API-Dokumentation gilt fuer genau diese Tomedo-Instanz?

### 4.2 Authentifizierung und Mandantenfaehigkeit

1. Welcher Auth-Flow wird fuer Server-zu-Server-Schreibzugriffe benutzt?
2. Welche OAuth-Scopes oder Rollen sind fuer Schreibzugriffe auf Patient, Fallakte, Dokumentation und Dokumente erforderlich?
3. Ist die Autorisierung mandantenbezogen, praxisbezogen, benutzerbezogen oder fallbezogen?
4. Gibt es pro Praxis eine eigene Base-URL oder nur globale Tomedo-Endpunkte?
5. Ist die Annahme `https://api.tomedo.de/fhir/R4` fuer die Zielumgebung korrekt oder nur eine generische Vermutung?

### 4.3 Patienten- und Fallakten-Zuordnung

1. Welche Identifikatoren sind fuer sicheres Patient Matching in Tomedo zugelassen oder empfohlen?
2. Ist KVNR ausreichend, oder werden weitere Identifikatoren benoetigt?
3. Darf per Name + Geburtsdatum gematcht werden, oder ist das nur Fallback fuer Demo/Pilot?
4. Muss fuer jeden Karteikarteneintrag zuerst eine Fallakte erzeugt werden?
5. Welche Encounter-/Fallakte-Typen, Klassen oder Codes erwartet Tomedo?
6. Wie sieht die fachlich korrekte Verknuepfung von Dokument, Patient und Fallakte aus?

### 4.4 Strukturierte Anamnese- und Dokumentationsdaten

1. Welche Pflichtfelder braucht ein Tomedo-konformer Anamnese-Karteieintrag?
2. Soll die Anamnese primaer als `QuestionnaireResponse`, als `Composition`, oder in einer Kombination aus beidem gespeichert werden?
3. Wie sollen Triage-Hinweise in Tomedo abgebildet werden: `Flag`, `Observation`, `RiskAssessment` oder proprietaer?
4. Welche Codesysteme sind fuer ICD-10, Dokumenttyp und Besuchsanlass in Tomedo verpflichtend?
5. Welche Profilversionen akzeptiert die Zielumgebung tatsaechlich?

### 4.5 Dateianhaenge: PDF, Bild, Scan, Befund

1. Wie werden PDFs und Bilder technisch in Tomedo importiert?
2. Ist der korrekte Pfad `POST Binary` plus `POST DocumentReference`?
3. Wird statt `DocumentReference` eine `Media`-Ressource erwartet?
4. Muss der Binärinhalt inline Base64 im FHIR-Body stehen oder ueber Multipart-/Attachment-Upload gesendet werden?
5. Welche MIME-Types sind erlaubt?
6. Welche Dateigroessenlimits gelten?
7. Welche Pflicht-Metadaten braucht Tomedo fuer importierte Dokumente?
8. Wie wird ein Dokument an Patient und Fallakte gebunden?
9. Welche Kategorien, Titel, Dokumenttypen, Autoren oder Zeitstempel muessen gesetzt werden?
10. Werden PDFs/Bilder nach erfolgreichem Import sofort in der Tomedo-Oberflaeche sichtbar?
11. Falls nein: Welcher Nachbearbeitungs- oder Importjob ist erforderlich?
12. Gibt es spezielle Anforderungen an PDF/A, Bildformate, Aufloesung oder Dateinamen?

### 4.6 Datei- oder Automationsbasierte Alternativpfade

1. Gibt es fuer Tomedo einen offiziell unterstuetzten Dokument-Hotfolder?
2. Falls ja: Welche Dateinamenskonvention, Verzeichnisstruktur oder Sidecar-Dateien sind erforderlich?
3. Gibt es in Tomedo Aktionketten, Skripting, AppleScript oder andere Automationshaken fuer Dokumentimporte?
4. Falls Dokumente nicht ueber FHIR importierbar sind: Was ist der offiziell empfohlene produktive Weg fuer Fremdsysteme?
5. Kann DiggAI einen PDF-Export plus Metadatei in einen Tomedo-Importordner schreiben, ohne unzulaessige manuelle Zwischenarbeit?

### 4.7 Rueckmeldungen, Status und Fehlerverhalten

1. Welche Rueckgabe liefert Tomedo nach erfolgreichem Dokument- oder Karteikartenimport?
2. Wie wird der spaetere Status eines Imports abgefragt?
3. Gibt es `OperationOutcome` oder ein proprietaeres Fehlerobjekt?
4. Welche Fehler sind transient und retrybar, welche fachlich blockierend?
5. Welche Referenz muessen wir fuer sauberes Idempotenz- und Retry-Handling persistieren?

### 4.8 Praxisrouting und BSNR

1. Ist die BSNR fuer den Mail- und API-Pfad dieselbe Kennung?
2. Ist `tenant.subdomain` fachlich identisch mit der BSNR oder nur ein technisches Routing-Label?
3. Muss die Zielpraxis ueber andere Kennungen angesprochen werden, etwa Mandant-ID, Praxis-ID, Standort-ID oder Benutzerkontext?
4. Welche Kennung ist fuer Dokumentimport und Karteikartenzuordnung in Tomedo massgeblich?

## 5. Harte Architektur- und Implementierungsgaps im Code

Zusammengefasst fehlen im aktuellen Code folgende konkrete Bausteine:

### Fehlende Implementierung A: Dokument-Upload nach Tomedo

Nicht vorhanden ist ein Service aehnlich zu:

- `uploadDocumentToTomedo(...)`
- `createDocumentReferenceForSession(...)`
- `attachBinaryToFallakte(...)`

Es gibt keinen nachweisbaren Code, der eine in `server/routes/upload.ts` gespeicherte Datei in Tomedo weiterschreibt.

### Fehlende Implementierung B: Dokument-Mapping Layer

Nicht vorhanden ist ein Mapper, der aus lokaler Plattformdatei folgende Tomedo-relevante Struktur erzeugt:

- Binärinhalt
- MIME-Type
- Titel
- Dokumentkategorie
- Patientenreferenz
- Fallaktenreferenz
- Erstellungszeitpunkt
- Importquelle DiggAI

### Fehlende Implementierung C: Dokument-Status und Retry

Vorhanden ist Status-Handling fuer referenzierte strukturierte Ressourcen. Nicht vorhanden ist ein robuster Statuspfad fuer Dateiimporte.

### Fehlende Implementierung D: sichere Routing-Quelle fuer BSNR/Praxiskennung

Die heutige Ableitung ueber `tenant.subdomain` ist im Audit nicht als fachlich korrekt verifiziert.

### Fehlende Implementierung E: verifizierte Tomedo-Sichtbarkeitspruefung

Es gibt keinen im Code nachgewiesenen End-to-End-Test, der beweist, dass ein extern erzeugter `Composition`- oder spaeterer Dokumentimport in der realen Tomedo-Karteikarte fachlich korrekt auftaucht.

## 6. Bewertung der vorhandenen Dokumentation gegen den Code

### `SYSTEM_CONTEXT.md`

Die Aussagen dort sind als grobe Architekturorientierung brauchbar, aber nicht ausreichend fuer die Frage nach echter Dokumenteinlage in Tomedo.

Konkret:

- Die Existenz von Adapter, Bridge und DLQ ist im Kern richtig.
- Daraus folgt aber nicht automatisch, dass Dateiuploads in die Tomedo-Akte schon geloest sind.

### `docs/TOMEDO_BRIDGE.md`

Dieses Dokument beschreibt die Multi-Agent-Bridge als umfassende Tomedo-Integration. Der Code belegt Teile davon. Der Dateipfad wird dadurch aber nicht bewiesen.

### `docs/SECURE_TRANSPORT_TOMEDO_2026-03-31.md`

Dieses Dokument ist eher Architektur- und Zielbildpapier als Implementierungsnachweis. Besonders wichtig ist dort der Satz, dass `DocumentReference` plus `Binary` ein Fallback-Ziel waere. Genau dieser Pfad ist im Code derzeit noch nicht umgesetzt.

## 7. Priorisierte naechste Schritte

### Prioritaet 1: Tomedo-Dokumentkanal verifizieren

Vor jeder Implementierung muessen wir fuer eine echte Tomedo-Zielumgebung verbindlich klaeren, ob Dokumente ueber FHIR, proprietaeren REST, Hotfolder oder Automation importiert werden.

### Prioritaet 2: Capability und Auth real erfassen

Es braucht die reale API-Dokumentation oder einen CapabilityStatement-Dump der Zielinstanz inklusive freigeschalteter Write-Ressourcen und Auth-Scopes.

### Prioritaet 3: Patient/Fallakte/Dokument-Zuordnung fachlich freigeben

Wir muessen wissen, welches Datenmodell Tomedo fachlich als korrekten Karteikarten- bzw. Dokumenteintrag ansieht.

### Prioritaet 4: Danach erst Implementierung

Erst nach Klaerung der obigen Punkte sollte die technische Umsetzung entschieden werden:

- FHIR-Dokumentpfad mit `Binary` und `DocumentReference`
- proprietaerer Tomedo-Dokumentendpoint
- Hotfolder-/Dateiimport
- Action-Chain-/Automationspfad

## 8. Endbewertung in einem Satz

Die DiggAI-Codebasis hat bereits eine reale Tomedo-Textbruecke, einen realen strukturierten Tomedo-Schreibpfad und einen realen GDT-Dateipfad, aber noch keinen nachweisbaren direkten Importpfad fuer PDFs oder Bilder in die Tomedo-Akte bzw. Karteikarte; die zentrale Restaufgabe ist deshalb nicht allgemeine Weiterentwicklung, sondern die praezise Klaerung des echten Tomedo-Dokumentkanals und seiner Pflichtmetadaten.

## Anhang: Hinweis zum Once-Guard-Precheck

Ein Once-Guard-Precheck fuer dieses Artefakt wurde versucht, konnte in dieser Windows-Umgebung aber nicht erfolgreich ausgefuehrt werden, weil die lokale PowerShell-Ausfuehrungsrichtlinie `AllSigned` das unsignierte Repository-Skript `scripts/once-guard.ps1` blockiert hat. Zur Redundanzpruefung wurde daher zusaetzlich im Repository nach einem bereits existierenden `TOMEDO_GAPS.md` gesucht; ein solches Artefakt wurde nicht gefunden.