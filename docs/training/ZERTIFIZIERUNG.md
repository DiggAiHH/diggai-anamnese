# DiggAI Zertifizierungs-Quiz

> **Zertifizierung für DiggAI Anamnese Platform**  
> **Bestehensgrenze**: 80% (16 von 20 Punkten)  
> **Zeitlimit**: 30 Minuten  
> **Version**: 3.0.0

---

## Quiz-Informationen

### Allgemeine Regeln

- **Teilnehmer**: Ärzte und MFA
- **Versuche**: Maximal 3 Versuche
- **Bestehen**: 80% richtige Antworten
- **Zertifikat**: Bei Bestehen digital ausgestellt
- **Gültigkeit**: 2 Jahre

### Themenverteilung

| Bereich | Fragen | Gewichtung |
|---------|--------|------------|
| Login & Sicherheit | 4 | 20% |
| Session-Management | 5 | 25% |
| Triage-Handling | 5 | 25% |
| Chat & Kommunikation | 3 | 15% |
| Datenschutz | 3 | 15% |
| **Gesamt** | **20** | **100%** |

---

## Fragen

### Bereich 1: Login & Sicherheit (4 Fragen)

#### Frage 1
**Wie oft kann man sich maximal falsch einloggen, bevor das Konto gesperrt wird?**

- [ ] a) 3 Versuche
- [ ] b) 5 Versuche
- [ ] c) 10 Versuche
- [ ] d) Keine Begrenzung

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) 5 Versuche**

Nach 5 fehlgeschlagenen Login-Versuchen wird das Konto für 15 Minuten gesperrt.
</details>

---

#### Frage 2
**Welche Authentifizierungsmethode wird von DiggAI empfohlen?**

- [ ] a) JWT in localStorage
- [ ] b) JWT in HttpOnly Cookie
- [ ] c) API-Key im Header
- [ ] d) Basic Auth

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) JWT in HttpOnly Cookie**

HttpOnly Cookies sind gegen XSS-Angriffe geschützt und können nicht von JavaScript gelesen werden.
</details>

---

#### Frage 3
**Wie lange ist ein JWT-Token gültig?**

- [ ] a) 1 Stunde
- [ ] b) 4 Stunden
- [ ] c) 24 Stunden
- [ ] d) 7 Tage

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) 24 Stunden**

Tokens laufen nach 24 Stunden ab oder bei 4 Stunden Inaktivität.
</details>

---

#### Frage 4
**Was passiert beim Logout?**

- [ ] a) Nur der Browser-Cache wird geleert
- [ ] b) Das Token wird auf eine Blacklist gesetzt
- [ ] c) Der Benutzer wird gelöscht
- [ ] d) Nichts, man muss warten bis es abläuft

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Das Token wird auf eine Blacklist gesetzt**

Beim Logout wird das Token für 24 Stunden auf eine Blacklist gesetzt, um Wiederverwendung zu verhindern.
</details>

---

### Bereich 2: Session-Management (5 Fragen)

#### Frage 5
**Wie lange ist eine Patienten-Session gültig?**

- [ ] a) 1 Stunde
- [ ] b) 4 Stunden
- [ ] c) 24 Stunden
- [ ] d) Unbegrenzt

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) 24 Stunden**

Patienten-Sessions verfallen automatisch nach 24 Stunden (Sicherheitsmaßnahme).
</details>

---

#### Frage 6
**Welche Rolle kann Sessions anderen Ärzten zuweisen?**

- [ ] a) Nur ADMIN
- [ ] b) ARZT und ADMIN
- [ ] c) MFA und ADMIN
- [ ] d) Alle Rollen

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) MFA und ADMIN**

Medizinische Fachangestellte (MFA) können Sessions Ärzten zuweisen.
</details>

---

#### Frage 7
**Was bedeutet der Status "SUBMITTED"?**

- [ ] a) Der Patient füllt gerade aus
- [ ] b) Der Patient hat abgeschickt, Arzt hat noch nicht gesehen
- [ ] c) Der Arzt hat bearbeitet
- [ ] d) Die Session ist abgelaufen

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Der Patient hat abgeschickt, Arzt hat noch nicht gesehen**

"SUBMITTED" = Patient hat abgeschickt, wartet auf ärztliche Bearbeitung.
</details>

---

#### Frage 8
**Welche Exportformate sind verfügbar?**

- [ ] a) Nur PDF
- [ ] b) PDF und CSV
- [ ] c) PDF, CSV und JSON
- [ ] d) Alle gängigen Office-Formate

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) PDF, CSV und JSON**

PDF für Akten, CSV für Statistik, JSON für Systemintegration.
</details>

---

#### Frage 9
**Was passiert mit Patientendaten nach der gesetzlichen Aufbewahrungsfrist?**

- [ ] a) Sie werden sofort gelöscht
- [ ] b) Sie werden anonymisiert
- [ ] c) Sie werden auf externe Server verschoben
- [ ] d) Nichts, sie bleiben unverändert

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Sie werden anonymisiert**

Nach 10 Jahren werden Daten anonymisiert oder gelöscht (§ 630f BGB).
</details>

---

### Bereich 3: Triage-Handling (5 Fragen)

#### Frage 10
**Was ist ein CRITICAL-Triage-Alert?**

- [ ] a) Ein Routine-Hinweis
- [ ] b) Ein Warnhinweis für den Arzt
- [ ] c) Eine potenziell lebensbedrohliche Situation
- [ ] d) Ein technischer Fehler

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) Eine potenziell lebensbedrohliche Situation**

CRITICAL = Sofortige ärztliche Aufmerksamkeit erforderlich.
</details>

---

#### Frage 11
**Welche Symptome lösen einen ACS-Alarm aus?**

- [ ] a) Nur Brustschmerzen
- [ ] b) Brustschmerzen UND (Atemnot ODER Lähmung)
- [ ] c) Kopfschmerzen
- [ ] d) Jede Art von Schmerzen

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Brustschmerzen UND (Atemnot ODER Lähmung)**

ACS (Akutes Koronarsyndrom) erfordert die Kombination aus Brustschmerzen plus Atemnot oder Lähmungserscheinungen.
</details>

---

#### Frage 12
**Was sollten Sie bei einem CRITICAL-Alert tun?**

- [ ] a) Ignorieren, da das System manchmal falsch liegt
- [ ] b) Den Patienten sofort sprechen/untersuchen
- [ ] c) Warten bis der Kollege Zeit hat
- [ ] d) Den Alarm quittieren ohne Maßnahmen

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Den Patienten sofort sprechen/untersuchen**

CRITICAL-Alarme erfordern sofortige ärztliche Aufmerksamkeit.
</details>

---

#### Frage 13
**Wann sollten Sie einen Triage-Alert quittieren?**

- [ ] a) Sofort, damit er verschwindet
- [ ] b) Nachdem Sie Maßnahmen eingeleitet haben
- [ ] c) Nie, das macht der Admin
- [ ] d) Erst am Ende des Tages

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Nachdem Sie Maßnahmen eingeleitet haben**

Quittieren dokumentiert, dass Sie den Alarm gesehen und bearbeitet haben.
</details>

---

#### Frage 14
**Was bedeutet "Polypharmazie" im Triage-Kontext?**

- [ ] a) Patient hat keine Medikamente
- [ ] b) Patient nimmt mehr als 5 Medikamente gleichzeitig
- [ ] c) Patient hat Medikamenten-Allergie
- [ ] d) Patient nimmt nur pflanzliche Medikamente

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Patient nimmt mehr als 5 Medikamente gleichzeitig**

Polypharmazie = Einnahme von 5 oder mehr Medikamenten gleichzeitig.
</details>

---

### Bereich 4: Chat & Kommunikation (3 Fragen)

#### Frage 15
**Wer sieht Chat-Nachrichten?**

- [ ] a) Alle Mitarbeiter der Praxis
- [ ] b) Nur der zugewiesene Arzt und der Patient
- [ ] c) Alle Ärzte im Land
- [ ] d) Niemand, Chat ist nur symbolisch

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Nur der zugewiesene Arzt und der Patient**

Chat-Nachrichten sind privat zwischen Arzt und Patient.
</details>

---

#### Frage 16
**Welche Nachricht wird automatisch gesendet?**

- [ ] a) Willkommensnachricht
- [ ] b) "Rezept liegt bereit" bei Status COMPLETED
- [ ] c) Werbe-Nachrichten
- [ ] d) Keine, alles ist manuell

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) "Rezept liegt bereit" bei Status COMPLETED**

Bei Rezeptanfragen, AU und Überweisungen wird automatisch eine Fertig-Benachrichtigung gesendet.
</details>

---

#### Frage 17
**Wie lange werden Chat-Nachrichten gespeichert?**

- [ ] a) 24 Stunden
- [ ] b) 30 Tage
- [ ] c) Mit der Session (10 Jahre)
- [ ] d) Sie werden sofort gelöscht

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) Mit der Session (10 Jahre)**

Chat-Nachrichten sind Teil der Patientenakte und werden 10 Jahre aufbewahrt.
</details>

---

### Bereich 5: Datenschutz (3 Fragen)

#### Frage 18
**Wie werden Patientendaten verschlüsselt?**

- [ ] a) Gar nicht, nur HTTPS
- [ ] b) AES-128
- [ ] c) AES-256-GCM
- [ ] d) Base64-Encoding

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: c) AES-256-GCM**

Alle PII-Daten werden mit AES-256-GCM verschlüsselt gespeichert.
</details>

---

#### Frage 19
**Wer hat Zugriff auf die Audit-Logs?**

- [ ] a) Alle Benutzer
- [ ] b) Nur ADMIN-Rolle
- [ ] c) Jeder Arzt
- [ ] d) Externe Dienstleister

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Nur ADMIN-Rolle**

Audit-Logs sind nur für Administratoren zugänglich.
</details>

---

#### Frage 20
**Was müssen Sie bei einem verdachtigen Datenleck tun?**

- [ ] a) Nichts, das ist Sache der IT
- [ ] b) Sofort den Praxisinhaber informieren
- [ ] c) Warten bis jemand anderes es bemerkt
- [ ] d) Die Daten selbst löschen

<details>
<summary>Antwort anzeigen</summary>

**Richtige Antwort: b) Sofort den Praxisinhaber informieren**

Datenschutzvorfälle müssen innerhalb von 72 Stunden gemeldet werden.
</details>

---

## Antwort-Schlüssel

| Frage | Antwort | Bereich |
|-------|---------|---------|
| 1 | b | Login & Sicherheit |
| 2 | b | Login & Sicherheit |
| 3 | c | Login & Sicherheit |
| 4 | b | Login & Sicherheit |
| 5 | c | Session-Management |
| 6 | c | Session-Management |
| 7 | b | Session-Management |
| 8 | c | Session-Management |
| 9 | b | Session-Management |
| 10 | c | Triage-Handling |
| 11 | b | Triage-Handling |
| 12 | b | Triage-Handling |
| 13 | b | Triage-Handling |
| 14 | b | Triage-Handling |
| 15 | b | Chat & Kommunikation |
| 16 | b | Chat & Kommunikation |
| 17 | c | Chat & Kommunikation |
| 18 | c | Datenschutz |
| 19 | b | Datenschutz |
| 20 | b | Datenschutz |

---

## Bewertung

### Punkteverteilung

| Bereich | Fragen | Max. Punkte | Ihre Punkte |
|---------|--------|-------------|-------------|
| Login & Sicherheit | 4 | 4 | |
| Session-Management | 5 | 5 | |
| Triage-Handling | 5 | 5 | |
| Chat & Kommunikation | 3 | 3 | |
| Datenschutz | 3 | 3 | |
| **Gesamt** | **20** | **20** | |

### Bestehen

- **80%+ (16+ Punkte)**: ✅ BESTANDEN
- **70-79% (14-15 Punkte)**: ⚠️ NACHBESSERUNG EMPFOHLEN
- **<70% (<14 Punkte)**: ❌ NICHT BESTANDEN - Schulung wiederholen

---

## Zertifikats-Template

```
┌─────────────────────────────────────────┐
│                                         │
│      ★ DIGGAI ZERTIFIKAT ★              │
│                                         │
│  Hiermit wird bestätigt, dass           │
│                                         │
│      [NAME]                             │
│                                         │
│  erfolgreich die Schulung und           │
│  Zertifizierung für die                 │
│                                         │
│  DiggAI Anamnese Platform v3.0.0        │
│                                         │
│  abgeschlossen hat.                     │
│                                         │
│  Ergebnis: XX/20 Punkte (XX%)           │
│                                         │
│  Datum: TT.MM.JJJJ                      │
│  Gültig bis: TT.MM.JJJJ (+2 Jahre)      │
│                                         │
│  [Unterschrift] [Stempel]               │
│                                         │
└─────────────────────────────────────────┘
```

---

## Nach dem Quiz

### Bei Bestehen

- [ ] Zertifikat ausstellen
- [ ] Produktiv-Zugang freischalten
- [ ] In interner Liste verzeichnen
- [ ] Willkommens-E-Mail senden

### Bei Nicht-Bestehen

- [ ] Schwache Bereiche identifizieren
- [ ] Zusatzschulung anbieten
- [ ] Wiederholungs-Quiz nach 1 Woche
- [ ] Maximal 3 Versuche

---

## Kontakt

Bei Fragen zum Quiz:
- E-Mail: training@diggai.de
- Telefon: +49 (0) XXX XXX XXX

---

*Zertifizierung © 2026 DiggAI GmbH*
