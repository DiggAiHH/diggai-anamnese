# Schulungspräsentation DiggAI Anamnese

> **Zielgruppe**: Ärzte und MFA in Arztpraxen  
> **Dauer**: 100 Minuten  
> **Form**: Präsentation + Live-Demo + Übungen  
> **Version**: 3.0.0

---

## Agenda

| Zeit | Thema | Dauer | Methode |
|------|-------|-------|---------|
| 0:00 - 0:10 | Einführung und Überblick | 10 min | Präsentation |
| 0:10 - 0:25 | System-Architektur und Sicherheit | 15 min | Präsentation |
| 0:25 - 0:55 | Live-Demonstration | 30 min | Demo |
| 0:55 - 1:25 | Hands-on Übungen | 30 min | Praxis |
| 1:25 - 1:40 | Q&A und Abschluss | 15 min | Diskussion |

---

## 1. Einführung (10 Minuten)

### 1.1 Begrüßung und Vorstellungsrunde (3 min)

- Trainer stellt sich vor
- Kurze Vorstellungsrunde der Teilnehmer
- Erwartungen und Vorkenntnisse erfassen

### 1.2 Lernziele (2 min)

Nach dieser Schulung können Sie:
- ✅ Patientensessions effizient verwalten
- ✅ Triage-Alarme richtig interpretieren und quittieren
- ✅ Patientendaten exportieren und weiterverarbeiten
- ✅ Das Chat-System für Patientenkommunikation nutzen
- ✅ Die wichtigsten Admin-Funktionen bedienen

### 1.3 Agenda-Überblick (2 min)

Vorstellung der Schulungsstruktur:
1. Theoretische Grundlagen
2. Praxisnahe Demonstration
3. Eigenständiges Üben
4. Fragen und Antworten

### 1.4 Materialien (3 min)

**Ausgabe an Teilnehmer:**
- [ ] Benutzerhandbuch (PDF)
- [ ] Übungsaufgaben
- [ ] Zertifizierungs-Quiz
- [ ] Login-Daten für Testsystem
- [ ] Notizen-Template

---

## 2. System-Überblick (15 Minuten)

### 2.1 Was ist DiggAI? (3 min)

**Folie 1: Produkt-Übersicht**

```
┌─────────────────────────────────────────┐
│        DiggAI Anamnese Platform         │
│                                         │
│  Digitale Patientenaufnahme             │
│  • 10 Sprachen                          │
│  • DSGVO-konform                        │
│  • Echtzeit-Triage                      │
│  • PVS-Integration                      │
└─────────────────────────────────────────┘
```

**Key Selling Points:**
- Zeitersparnis: 10-15 Min. pro Patient
- Bessere Vorbereitung auf Gespräch
- Automatische Erkennung kritischer Symptome
- Papierlose Dokumentation

### 2.2 Architektur-Überblick (4 min)

**Folie 2: System-Architektur**

```
Patient (PWA) ──► Frontend (React) ──► Backend (Express)
                                           │
                    PostgreSQL ◄───────────┘
                    (Encrypted)
```

**Komponenten:**
- Frontend: React 19, TypeScript, Vite
- Backend: Express 5, Prisma ORM
- Datenbank: PostgreSQL 16 (AES-256 verschlüsselt)
- Echtzeit: Socket.IO

### 2.3 Sicherheit & Compliance (4 min)

**Folie 3: Sicherheits-Features**

| Feature | Implementierung |
|---------|-----------------|
| Verschlüsselung | AES-256-GCM |
| Übertragung | TLS 1.3 |
| Authentifizierung | JWT + HttpOnly Cookies |
| Audit Logging | HIPAA-konform |
| Datenstandort | Deutschland |

**DSGVO-Compliance:**
- Art. 5: Grundsätze der Verarbeitung
- Art. 9: Besondere Kategorien
- Art. 32: Sicherheit der Verarbeitung

### 2.4 Rollen und Berechtigungen (4 min)

**Folie 4: RBAC-Übersicht**

| Rolle | Berechtigungen | Typische Benutzer |
|-------|----------------|-------------------|
| **PATIENT** | Eigene Session | Patienten |
| **ARZT** | Alle Sessions, Triage | Ärzte |
| **MFA** | Wartezimmer, Zuweisung | Empfang |
| **ADMIN** | Vollzugriff | IT-Admin |

---

## 3. Live-Demo (30 Minuten)

### 3.1 Dashboard-Überblick (5 min)

**Demo-Szenario:**
1. Einloggen als Arzt
2. Dashboard vorstellen
3. Widgets erklären:
   - Aktive Sessions
   - Heutige Statistik
   - Triage-Alarme

**Sprechen Sie durch:**
> "Hier sehen wir die aktiven Sessions. Die rote Markierung zeigt einen CRITICAL-Alert an."

### 3.2 Patienten-Session (7 min)

**Demo-Schritte:**

1. **Session auswählen**
   - Klick auf Session-Karte
   - Patienteninformationen anzeigen
   - Status: ACTIVE/COMPLETED

2. **Antworten reviewen**
   - Sektion für Sektion durchgehen
   - PII-Daten entschlüsselt anzeigen
   - Zeitstempel beachten

3. **Triage prüfen**
   - WARNINGS: Gelber Banner
   - CRITICAL: Roter Banner + Alert

### 3.3 Triage-Handling (6 min)

**Demo-Szenario: CRITICAL Alert**

```
🔴 ACS (Akutes Koronarsyndrom) erkannt
    • Brustschmerzen + Dyspnoe
    • Sofortige ärztliche Aufmerksamkeit erforderlich
```

**Aktionen:**
1. Alert anzeigen
2. Patientendaten prüfen
3. Sofortmaßnahmen einleiten
4. Alert quittieren
5. Dokumentation

**Wichtig:**
> "Das System unterstützt, ersetzt aber nicht die ärztliche Beurteilung."

### 3.4 Chat-Funktion (4 min)

**Demo:**
1. Chat-Tab öffnen
2. Nachricht an Patient senden
3. Historie anzeigen
4. Automatische Nachrichten erklären

**Use-Cases:**
- "Rezept liegt bereit"
- "Terminbestätigung"
- "Rückfragen"

### 3.5 Export und PVS-Integration (4 min)

**Demo:**
1. Export-Menü öffnen
2. PDF-Export zeigen
3. CSV-Export zeigen
4. PVS-Export (falls konfiguriert)

**Format-Vergleich:**

| Format | Best For | Vorteil |
|--------|----------|---------|
| PDF | Patientenakte | Druckfertig |
| CSV | Statistik | Excel-fähig |
| JSON | Integration | Maschinenlesbar |

### 3.6 MFA-Workflow (4 min)

**Demo als MFA:**
1. Queue-Ansicht zeigen
2. Session Arzt zuweisen
3. Arzt-Übersicht zeigen
4. Einfache Zuweisung demonstrieren

---

## 4. Hands-on Übungen (30 Minuten)

### Übung 1: Erste Anmeldung (5 min)

**Aufgabe:**
1. Mit eigenen Zugangsdaten einloggen
2. Dashboard erkunden
3. Navigation testen
4. Abmelden

**Erfolgskriterien:**
- [ ] Login erfolgreich
- [ ] Dashboard angezeigt
- [ ] Alle Menüpunkte gesehen

---

### Übung 2: Session Review (10 min)

**Aufgabe:**
1. Test-Session öffnen
2. Alle Sektionen durchgehen
3. Fragen notieren
4. Export als PDF testen

**Test-Session-ID:** `demo-session-123`

**Erfolgskriterien:**
- [ ] Session geöffnet
- [ ] Alle Antworten gesehen
- [ ] PDF erfolgreich exportiert

---

### Übung 3: Triage-Handling (10 min)

**Aufgabe:**
1. Session mit CRITICAL-Alert öffnen
2. Triage-Details prüfen
3. Alert quittieren
4. Maßnahmen dokumentieren

**Test-Session:** `demo-critical-456`

**Erfolgskriterien:**
- [ ] Alert erkannt
- [ ] Richtige Maßnahmen eingeleitet
- [ ] Alert quittiert

---

### Übung 4: Chat-Kommunikation (5 min)

**Aufgabe:**
1. Chat-Tab öffnen
2. Test-Nachricht senden
3. Chat-Historie prüfen
4. (Optional) Mit Kollegen chatten

**Erfolgskriterien:**
- [ ] Nachricht gesendet
- [ ] In Historie sichtbar

---

## 5. Q&A und Abschluss (15 Minuten)

### 5.1 Häufige Fragen (10 min)

**Vorbereitete Antworten:**

**Q: Was passiert bei Internet-Ausfall?**
A: Patient kann offline ausfüllen, Absenden erfordert aber Verbindung.

**Q: Können wir eigene Fragen hinzufügen?**
A: Ja, über Admin-Bereich → Fragenkatalog.

**Q: Wie lange dauert die Implementierung?**
A: In der Regel 1-2 Wochen inkl. Schulung.

**Q: Was kostet das System?**
A: Ab 49€/Monat/Arzt, Details beim Vertrieb.

### 5.2 Zertifizierung (3 min)

**Quiz-Information:**
- 20 Fragen
- 80% zum Bestehen
- Zertifikat bei erfolgreichem Abschluss
- Link zum Quiz wird verteilt

### 5.3 Nächste Schritte (2 min)

**Für Teilnehmer:**
- [ ] Quiz absolvieren
- [ ] Produktiv-Login erhalten
- [ ] Support-Kontakt speichern
- [ ] Erste echte Sessions üben

**Support:**
- E-Mail: support@diggai.de
- Hotline: +49 (0) XXX XXX XXX
- Dokumentation: https://docs.diggai.de

---

## Anhang: Sprechernotizen

### Slide 1: Einleitung
"Willkommen zur DiggAI-Schulung. Heute lernen Sie, wie Sie mit unserer digitalen Anamnese Zeit sparen und Ihre Patienten besser betreuen können."

### Slide 2: Architektur
"Das System ist als moderne Web-Anwendung aufgebaut. Alle Daten werden in Deutschland gespeichert und mit militärischer Verschlüsselung geschützt."

### Slide 3: Sicherheit
"Sicherheit hat höchste Priorität. Wir erfüllen nicht nur die DSGVO, sondern auch spezifische medizinische Standards wie die gematik-Vorgaben."

### Slide 4: Rollen
"Jeder Benutzer hat genau die Rechte, die er für seine Aufgabe braucht. Ärzte sehen alles, MFA nur das Wartezimmer, Admins konfigurieren das System."

---

## Checkliste für Trainer

### Vor der Schulung
- [ ] Test-System läuft
- [ ] Demo-Daten vorbereitet
- [ ] Login-Daten generiert
- [ ] Materialien ausgedruckt
- [ ] Technik getestet (Beamer, Mikrofon)
- [ ] Pausen-Getränke bereit

### Während der Schulung
- [ ] Pünktlicher Start
- [ ] Pausen einhalten
- [ ] Fragen ermutigen
- [ ] Alle Teilnehmer einbeziehen
- [ ] Zwischenstände checken

### Nach der Schulung
- [ ] Zertifizierungs-Quiz freigeben
- [ ] Materialien per E-Mail senden
- [ ] Feedback-Bogen auswerten
- [ ] Follow-up Termin vereinbaren

---

## Feedback-Bogen

**Bitte bewerten Sie die Schulung:**

| Aspekt | ⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
|--------|---|---|----|------|--------|
| Inhalt | | | | | |
| Präsentation | | | | | |
| Übungen | | | | | |
| Organisation | | | | | |

**Was hat Ihnen besonders gut gefallen?**

_________________________________

**Was können wir verbessern?**

_________________________________

---

*Schulungsmaterialien © 2026 DiggAI GmbH*
