# DiggAI Übungen

> **Praktische Übungen für Ärzte und MFA**  
> **Dauer**: 30 Minuten  
> **Level**: Anfänger bis Fortgeschritten  
> **Version**: 3.0.0

---

## Übersicht

| Übung | Thema | Dauer | Level |
|-------|-------|-------|-------|
| 1 | Test-Patienten-Session erstellen | 8 min | Anfänger |
| 2 | Triage-Alarm quittieren | 7 min | Anfänger |
| 3 | Chat-Funktion nutzen | 7 min | Mittel |
| 4 | Berichte generieren | 8 min | Fortgeschritten |

---

## Übung 1: Test-Patienten-Session erstellen

### Szenario

Sie sind MFA in einer Arztpraxis. Ein neuer Patient, Herr Müller, möchte einen Termin für seine jährliche Vorsorgeuntersuchung vereinbaren. Sie sollen eine Session für ihn erstellen und die Anmeldung begleiten.

### Voraussetzungen

- [ ] Zugangsdaten für Testsystem vorhanden
- [ ] Rolle: MFA oder ADMIN
- [ ] QR-Code-Scanner oder Kamera verfügbar

### Schritt-für-Schritt Anleitung

#### Teil A: Session vorbereiten (3 min)

1. **Einloggen**
   - Öffnen Sie: `https://diggai-drklaproth.netlify.app/mfa`
   - Geben Sie Ihre Zugangsdaten ein
   - Klicken Sie "Anmelden"

2. **Dashboard anzeigen**
   - Überprüfen Sie, ob die MFA-Übersicht lädt
   - Notieren Sie die Anzahl aktiver Sessions

3. **QR-Token generieren**
   - Gehen Sie zu "Neue Session"
   - Wählen Sie Service: "Termin / Anamnese"
   - Klicken Sie "QR-Code generieren"
   - Speichern oder drucken Sie den Code

#### Teil B: Patienten-Workflow simulieren (5 min)

1. **Neues Browser-Fenster/Privater Modus öffnen**
   - Damit simulieren Sie den Patienten

2. **QR-Code scannen oder Link öffnen**
   - Alternativ: Gehen Sie direkt zu `/start`

3. **Patienteninformationen eingeben:**
   ```
   Name: Max Müller
   Geburtsdatum: 15.06.1985
   Geschlecht: Männlich
   Versicherung: Gesetzlich
   E-Mail: max.mueller@beispiel.de
   ```

4. **Fragebogen ausfüllen:**
   - Wählen Sie "Ich bin zum ersten Mal hier"
   - Geben Sie Adresse ein
   - Beschwerden: "Keine aktuellen Beschwerden"
   - Vorerkrankungen: "Bluthochdruck"
   - Medikamente: "Metformin 500mg"

5. **Session absenden**
   - Überprüfen Sie die Angaben
   - Klicken Sie "Absenden"

#### Validierung

Prüfen Sie im MFA-Dashboard:
- [ ] Neue Session erscheint in der Liste
- [ ] Status ist "SUBMITTED"
- [ ] Patientenname korrekt angezeigt
- [ ] Service-Typ korrekt

**Erwartetes Ergebnis:**
Session "Max Müller" erscheint mit Status "SUBMITTED" und kann einem Arzt zugewiesen werden.

---

## Übung 2: Triage-Alarm quittieren

### Szenario

Ein Patient hat im Fragebogen angegeben, dass er starke Brustschmerzen und Atemnot hat. Das System hat einen CRITICAL-Alarm ausgelöst (ACS - Akutes Koronarsyndrom). Als Arzt müssen Sie diesen Alarm bearbeiten und quittieren.

### Voraussetzungen

- [ ] Rolle: ARZT
- [ ] Test-Session mit Triage-Alarm vorhanden
- [ ] Alternativ: Übung 1 mit modifizierten Antworten

### Schritt-für-Schritt Anleitung

#### Teil A: Triage-Szenario erstellen (2 min)

Falls keine Session mit Triage vorhanden:

1. Neue Session als Patient starten
2. Bei Beschwerden angeben:
   - "Brustschmerzen / Herzensenge" ✅
   - "Atemnot / Kurzatmigkeit" ✅
3. Session absenden

#### Teil B: Triage bearbeiten (5 min)

1. **Dashboard öffnen**
   - Loggen Sie sich als Arzt ein
   - Beachten Sie die rote Markierung bei der Session

2. **Session öffnen**
   - Klicken Sie auf die markierte Session
   - Lesen Sie den Triage-Alarm:
     ```
     🔴 CRITICAL: ACS (Akutes Koronarsyndrom)
     Auslösende Antworten:
     - Brustschmerzen: Ja
     - Atemnot: Ja
     ```

3. **Patientendaten prüfen**
   - Öffnen Sie den vollständigen Fragebogen
   - Prüfen Sie:
     - Alter des Patienten
     - Vorerkrankungen
     - Aktuelle Medikamente
     - Risikofaktoren (Raucher, Diabetes, etc.)

4. **Maßnahmen einleiten**
   - Simulieren Sie: Was würden Sie tun?
   - Notieren Sie Ihre Maßnahmen:
     ```
     □ Patient sofort sprechen
     □ EKG anfertigen
     □ Labor (Troponin)
     □ Notarzt bei Bedarf
     ```

5. **Triage quittieren**
   - Klicken Sie "Quittieren"
   - Geben Sie optional Notizen ein:
     ```
     "Patient untersucht, EKG ohne Pathologie, 
     Troponin angefordert. Verdacht auf ACS 
     gering, stationäre Überwachung."
     ```
   - Bestätigen Sie

#### Validierung

Prüfen Sie:
- [ ] Alert wird nicht mehr als "offen" angezeigt
- [ ] Quittierung ist mit Zeitstempel und Ihrem Namen versehen
- [ ] Notizen wurden gespeichert
- [ ] Session-Status wurde aktualisiert

**Erwartetes Ergebnis:**
Triage-Alarm als "quittiert" markiert, mit Ihrem Benutzernamen und Zeitstempel.

---

## Übung 3: Chat-Funktion nutzen

### Szenario

Eine Patientin hat eine Rezeptanfrage gestellt. Das Rezept ist nun in der Praxis zur Abholung bereit. Sie sollen ihr über das Chat-System eine Benachrichtigung senden.

### Voraussetzungen

- [ ] Rolle: ARZT oder MFA
- [ ] Abgeschlossene Session mit Rezeptanfrage

### Schritt-für-Schritt Anleitung

#### Teil A: Session vorbereiten (3 min)

1. Erstellen Sie als Patient eine Session:
   ```
   Service: Rezeptanfrage
   Medikament: Metformin 500mg
   Wirkstoff: Metformin
   Packungsgröße: 100 Stück
   ```

2. Markieren Sie die Session als Arzt als "COMPLETED"

#### Teil B: Chat verwenden (4 min)

1. **Chat öffnen**
   - Öffnen Sie die Session
   - Wechseln Sie zum Tab "Chat"

2. **Nachricht verfassen**
   - Klicken Sie in das Textfeld
   - Schreiben Sie:
     ```
     Guten Tag Frau [Name],
     
     Ihr Rezept für Metformin liegt zur 
     Abholung in der Praxis bereit.
     
     Öffnungszeiten:
     Mo-Fr: 8:00-12:00 und 14:00-18:00
     
     Bitte denken Sie an Ihre Versichertenkarte.
     
     Mit freundlichen Grüßen
     Ihr Praxisteam
     ```

3. **Nachricht senden**
   - Klicken Sie "Senden"
   - Warten Sie auf Bestätigung

4. **Verlauf prüfen**
   - Scrollen Sie durch Chat-Historie
   - Prüfen Sie Zeitstempel
   - Beachten Sie Absender-Informationen

#### Teil C: Automatische Nachrichten (optional)

1. Markieren Sie eine weitere Session als COMPLETED
2. Beobachten Sie die automatische Benachrichtigung
3. Vergleichen Sie mit manueller Nachricht

#### Validierung

Prüfen Sie:
- [ ] Nachricht wurde gesendet
- [ ] Zeitstempel korrekt
- [ ] Absender korrekt angezeigt
- [ ] Nachricht in Historie sichtbar

**Erwartetes Ergebnis:**
Nachricht erfolgreich an Patienten-Chat gesendet, in der Historie mit Zeitstempel sichtbar.

---

## Übung 4: Berichte generieren

### Szenario

Als Praxis-Administrator müssen Sie einen Monatsbericht erstellen. Sie sollen Statistiken über Sessions, Triage-Ereignisse und Service-Verteilung exportieren.

### Voraussetzungen

- [ ] Rolle: ADMIN
- [ ] Mindestens 10 Test-Sessions vorhanden
- [ ] Verschiedene Services und Triage-Level

### Schritt-für-Schritt Anleitung

#### Teil A: Dashboard-Statistiken (3 min)

1. **Einloggen als Admin**
   - URL: `/admin`
   - ADMIN-Zugangsdaten verwenden

2. **Statistiken prüfen**
   - Gesamt-Patienten: Notieren
   - Gesamt-Sessions: Notieren
   - Abschlussrate: Notieren
   - Durchschnittliche Dauer: Notieren

3. **Triage-Statistiken**
   - Anzahl CRITICAL: ______
   - Anzahl WARNING: ______
   - Quittierungsrate: ______%

#### Teil B: Zeitreihen exportieren (3 min)

1. **Timeline öffnen**
   - Menü: "Reports" → "Timeline"
   - Zeitraum: "Letzte 30 Tage"

2. **Daten analysieren**
   - Höchster Tag: ______
   - Durchschnitt pro Tag: ______
   - Trend: Steigend/Stationär/Fallend

3. **Exportieren**
   - Klicken Sie "Als CSV exportieren"
   - Speichern Sie die Datei

#### Teil C: Service-Verteilung (2 min)

1. **Service-Analytics öffnen**
   - Menü: "Reports" → "Services"

2. **Überprüfen Sie:**
   - Häufigster Service: ______
   - Prozentualer Anteil: ______%
   - Anzahl verschiedener Services: ______

#### Validierung

Prüfen Sie die exportierten Daten:
- [ ] CSV-Datei lesbar in Excel
- [ ] Alle Tage im Zeitraum vorhanden
- [ ] Zahlen plausibel
- [ ] Daten konsistent mit Dashboard

**Erwartetes Ergebnis:**
CSV-Export mit vollständiger Zeitreihe, importierbar in Excel für weitere Analyse.

---

## Zusatzübungen für Fortgeschrittene

### Übung 5: Benutzer verwalten (ADMIN)

**Aufgabe:**
1. Neuen MFA-Benutzer anlegen
2. Berechtigungen anpassen
3. Passwort zurücksetzen
4. Benutzer deaktivieren

**Zeit:** 10 Minuten

---

### Übung 6: Fragenkatalog anpassen (ADMIN)

**Aufgabe:**
1. Frage finden und bearbeiten
2. Reihenfolge ändern
3. Frage deaktivieren
4. Änderungen testen

**Zeit:** 10 Minuten

---

### Übung 7: Backup und Restore (ADMIN)

**Aufgabe:**
1. Manuelles Backup erstellen
2. Backup-Status prüfen
3. Wiederherstellung simulieren (nur lesen)
4. Backup löschen

**Zeit:** 8 Minuten

---

## Bewertungskriterien

| Kriterium | Punkte | Anforderung |
|-----------|--------|-------------|
| Vollständigkeit | 25% | Alle Schritte ausgeführt |
| Richtigkeit | 40% | Korrekte Handhabung |
| Effizienz | 20% | Zeitlich im Rahmen |
| Dokumentation | 15% | Notizen vollständig |

**Gesamtpunktzahl:** 100 Punkte

**Bewertung:**
- 90-100: Sehr gut
- 80-89: Gut
- 70-79: Befriedigend
- 60-69: Ausreichend
- < 60: Nicht bestanden

---

## Lösungen und Hinweise

### Häufige Fehler

**Fehler: "Session nicht gefunden"**
- Ursache: Falsche Session-ID oder Session abgelaufen
- Lösung: Neue Session erstellen

**Fehler: "Keine Berechtigung"**
- Ursache: Falsche Rolle für Aktion
- Lösung: Mit korrektem Account einloggen

**Fehler: "Triage nicht sichtbar"**
- Ursache: Keine Trigger-Antworten im Fragebogen
- Lösung: Fragebogen mit kritischen Symptomen neu ausfüllen

### Tipps für Trainer

- Teilen Sie die Teilnehmer in Paare auf (Arzt + MFA)
- Lassen Sie Teilnehmer gegenseitig Sessions erstellen
- Verwenden Sie verschiedene Szenarien für Abwechslung
- Geben Sie konstruktives Feedback

---

## Materialien

### Benötigte Dokumente
- [ ] Benutzerhandbuch
- [ ] Login-Daten (Testsystem)
- [ ] Übungs-Szenarien (dieses Dokument)
- [ ] Notizen-Template

### Technische Voraussetzungen
- [ ] Internetzugang
- [ ] Moderner Browser
- [ ] Zugang zum Testsystem
- [ ] (Optional) QR-Code-Scanner

---

*Übungen © 2026 DiggAI GmbH*
