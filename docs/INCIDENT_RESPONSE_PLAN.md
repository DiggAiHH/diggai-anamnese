# Incident Response Plan — Datenschutzverletzungen
## DiggAI Anamnese-Anwendung

---

**Version:** 2.0 | **Stand:** Juli 2025  
**Verantwortlicher:** Dr. med. [Name]  
**Datenschutzbeauftragter:** [Name]

---

## 1. Zweck und Geltungsbereich

Dieser Plan definiert die Vorgehensweise bei Verletzungen des Schutzes personenbezogener Daten gemäß Art. 33/34 DSGVO. Er gilt für alle Mitarbeiter der Praxis und externe Dienstleister.

---

## 2. Meldepflichten — Fristen

| Frist | Empfänger | Grundlage |
|-------|-----------|-----------|
| **Unverzüglich, max. 72 Stunden** | Zuständige Aufsichtsbehörde | Art. 33 Abs. 1 DSGVO |
| **Unverzüglich** | Betroffene Personen (bei hohem Risiko) | Art. 34 Abs. 1 DSGVO |
| **24 Stunden** | AV an V (laut AVV) | AVV §5 |

---

## 3. Incident-Klassifikation

### Stufe 1: KRITISCH (Sofortmaßnahmen erforderlich)

- Unbefugter Zugriff auf Gesundheitsdaten
- Datenleck mit personenbezogenen Daten nach extern
- Ransomware / Verschlüsselungstrojaner auf Server
- Kompromittierung von Admin-/Arzt-Zugangsdaten

### Stufe 2: HOCH (Reaktion innerhalb 4 Stunden)

- Brute-Force-Angriff auf Login-Endpunkte (erkannt durch Rate-Limiter)
- Ungewöhnliche Zugriffsmuster im Audit-Log
- CSP-Verletzungen (möglicher XSS-Versuch)
- Ausfall der Audit-Logging-Funktion

### Stufe 3: MITTEL (Reaktion innerhalb 24 Stunden)

- Fehlkonfiguration von Berechtigungen
- Nicht autorisierter API-Zugriff (401/403 Häufung)
- Session-Anomalien

### Stufe 4: NIEDRIG (Dokumentation und Review)

- Einzelne fehlerhafte Login-Versuche
- Technische Fehler ohne Datenbezug
- Performance-Anomalien

---

## 4. Sofortmaßnahmen

### 4.1 Schritt 1: Eindämmung (CONTAIN)

| Maßnahme | Zuständig | Max. Dauer |
|----------|-----------|-----------|
| Token-Blacklist: Kompromittierte Tokens invalidieren | Admin | 5 min |
| Rate-Limiter verschärfen (z.B. auf 1 req/min) | Admin/Technik | 15 min |
| Betroffene Benutzerkonten sperren | Admin | 10 min |
| Netlify: Deploy sperren / Site offline nehmen (bei Stufe 1) | Admin | 30 min |
| Passwort-Reset für alle Arzt/MFA-Konten erzwingen | Admin | 1 Stunde |

### 4.2 Schritt 2: Bewertung (ASSESS)

1. **Audit-Log-Analyse:**
   - Zeitraum des Vorfalls eingrenzen
   - Betroffene User-IDs und Sessions identifizieren
   - Zugriffsmuster analysieren (IP, User-Agent, Zeitstempel)

2. **Umfang feststellen:**
   - Welche Datenkategorien betroffen (Art. 9 Gesundheitsdaten?)
   - Anzahl betroffener Personen
   - Wurde Verschlüsselung durchbrochen?

3. **Risikobewertung:**
   - Schwere: Gesundheitsdaten = hohes Risiko per se
   - Eintrittswahrscheinlichkeit von Folgeschäden
   - Vorhandene Schutzmaßnahmen (AES-256, RBAC)

### 4.3 Schritt 3: Meldung (NOTIFY)

**An Aufsichtsbehörde (Art. 33 DSGVO):**

```
Meldung Datenschutzverletzung
Datum: [Datum]
Verantwortlicher: Dr. med. [Name], [Praxis]
Art der Verletzung: [Beschreibung]
Betroffene Kategorien: [Gesundheitsdaten / Stammdaten / ...]
Anzahl Betroffene: [ca. Zahl]
Wahrscheinliche Folgen: [Beschreibung]
Ergriffene Maßnahmen: [Auflistung]
Kontakt DSB: [E-Mail, Telefon]
```

**An Betroffene (Art. 34 DSGVO) — nur bei hohem Risiko:**

```
Betreff: Wichtige Mitteilung zum Schutz Ihrer Daten

Sehr geehrte(r) [Name],

wir informieren Sie, dass am [Datum] ein Sicherheitsvorfall 
festgestellt wurde. [Beschreibung in klarer Sprache]

Betroffene Daten: [Kategorien]
Ergriffene Maßnahmen: [Auflistung]
Empfohlene Schutzmaßnahmen: [Handlungsempfehlungen]

Bei Fragen: datenschutz@praxis.de / [Telefon]
```

### 4.4 Schritt 4: Behebung (REMEDIATE)

1. Ursache identifizieren und beseitigen
2. Sicherheitslücke schließen (Patch/Update)
3. Betroffene Daten wiederherstellen (falls erforderlich)
4. Monitoring verstärken

### 4.5 Schritt 5: Dokumentation und Lessons Learned

1. **Vorfallsbericht erstellen** (für Nachweispflicht Art. 33 Abs. 5 DSGVO):
   - Zeitlicher Ablauf
   - Betroffene Systeme und Daten
   - Ergriffene Maßnahmen und deren Wirksamkeit
   - Erkenntnisse und Verbesserungsvorschläge

2. **Post-Incident Review:**
   - Was hat funktioniert?
   - Was muss verbessert werden?
   - DSFA aktualisieren wenn nötig
   - Maßnahmenplan anpassen

---

## 5. Verantwortlichkeiten

| Rolle | Aufgaben |
|-------|----------|
| **Praxisinhaber (V)** | Entscheidung über Meldung, Kommunikation mit Betroffenen |
| **DSB** | Beratung, Aufsichtsbehörde-Koordination |
| **Admin** | Technische Eindämmung, Audit-Log-Analyse |
| **Technik (DiggAI)** | Patch/Bugfix, Code-Review, Monitoring |

---

## 6. Regelmäßige Tests

| Aktivität | Frequenz |
|-----------|----------|
| Incident Response Übung (Tabletop) | Jährlich |
| Audit-Log Review | Monatlich |
| Penetration Test | Jährlich |
| Backup-Wiederherstellungstest | Halbjährlich |
| Überprüfung dieses Plans | Jährlich |

---

## 7. Kontaktliste Notfall

| Rolle | Name | Telefon | E-Mail |
|-------|------|---------|--------|
| Verantwortlicher | Dr. med. [Name] | [Nr.] | [E-Mail] |
| DSB | [Name] | [Nr.] | dsb@praxis.de |
| IT-Admin | [Name] | [Nr.] | admin@praxis.de |
| Aufsichtsbehörde | [Landesbehörde] | [Nr.] | [E-Mail] |
| Netlify Support | — | — | support@netlify.com |

---

**Erstellt:** Juli 2025  
**Nächste Überprüfung:** Juli 2026  
**Genehmigt von:** [Unterschrift Verantwortlicher]
