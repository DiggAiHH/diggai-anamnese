# Verfahrensverzeichnis gemäß Art. 30 DSGVO
## DiggAI Anamnese Platform v3.0.0

**Stand:** März 2026 | **Version:** 3.0-FINAL  
**Verantwortlicher:** Dr. med. [Name], [Praxisname], [Adresse]  
**Datenschutzbeauftragter:** [Name], erreichbar unter dsb@praxis.de

---

## Verarbeitungstätigkeit 1: Digitale Anamnese

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Digitale Erfassung medizinischer Anamnese-Fragebögen |
| **Verantwortlicher** | Dr. med. [Name], [Praxisname] |
| **Zweck** | Voraberfassung medizinischer Daten für die ärztliche Behandlung |
| **Rechtsgrundlage** | Art. 9 Abs. 2 lit. h DSGVO (Gesundheitsversorgung) |
| **Betroffene** | Patienten der Praxis, deren gesetzliche Vertreter |
| **Kategorien** | Gesundheitsdaten, Stammdaten (Name, Geburtsdatum), Kontaktdaten |
| **Empfänger** | Behandelnde Ärzte, MFA, Administratoren (intern) |
| **Drittstaat** | Nein (Hosting: Netlify mit EU-US DPF + SCC) |
| **Löschfristen** | 24h (nicht zugeordnete Sessions), 10 Jahre (zugeordnet) |
| **Technische Maßnahmen** | AES-256-GCM Verschlüsselung, RBAC, Audit-Logs, SHA-256 Pseudonymisierung |

---

## Verarbeitungstätigkeit 2: Triage-System

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Automatische Triage-Klassifizierung von Patienten |
| **Zweck** | Priorisierung nach Dringlichkeit (Rot/Gelb/Grün), Patientensicherheit |
| **Rechtsgrundlage** | Art. 9 Abs. 2 lit. h DSGVO |
| **Betroffene** | Alle Patienten |
| **Kategorien** | Gesundheitsdaten, Triage-Level, Schmerzlevel, Notfall-Indikatoren |
| **Empfänger** | Praxispersonal |
| **Drittstaat** | Nein |
| **Löschfristen** | Mit Patientenakten (10 Jahre) |
| **Technische Maßnahmen** | Regelbasiert (keine KI), Audit-Trail, klinisch validiert |

---

## Verarbeitungstätigkeit 3: Audit-Logging

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Protokollierung aller Datenzugriffe |
| **Zweck** | Sicherheit und Nachweis, Rechenschaftspflicht, Anomalie-Erkennung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung) |
| **Betroffene** | Alle Nutzer (Patienten, Personal) |
| **Kategorien** | Zugriffslogs (User-ID, Session-ID pseudonymisiert), IP-Adresse, User-Agent, Zeitstempel |
| **Empfänger** | Nur Administratoren |
| **Drittstaat** | Nein |
| **Löschfristen** | 3 Jahre (technisch), 10 Jahre (medizinisch) |
| **Technische Maßnahmen** | Sanitisierung, Retry-Logik, Immutability |

---

## Verarbeitungstätigkeit 4: Backup

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Datensicherung und Wiederherstellung |
| **Zweck** | Datenwiederherstellung bei Ausfall oder Datenverlust |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung) |
| **Betroffene** | Alle Patienten |
| **Kategorien** | Alle Patientendaten (verschlüsselt) |
| **Empfänger** | Keine (nur Wiederherstellung) |
| **Drittstaat** | Nein |
| **Löschfristen** | 30 Tage (aktuell), 7 Jahre (Archiv) |
| **Technische Maßnahmen** | Verschlüsselte Backups, tägliche Snapshots, DR-Plan |

---

## Übersicht aller Verarbeitungstätigkeiten

| ID | Bezeichnung | Rechtsgrundlage | DSFA |
|----|-------------|-----------------|------|
| VT-001 | Digitale Anamnese | Art. 9 Abs. 2 lit. h | ✅ Ja |
| VT-002 | Triage-System | Art. 9 Abs. 2 lit. h | Nein (Teil VT-001) |
| VT-003 | Audit-Logging | Art. 6 Abs. 1 lit. c | Nein (Teil VT-001) |
| VT-004 | Backup | Art. 6 Abs. 1 lit. c | Nein (Teil VT-001) |

---

## Technische und Organisatorische Maßnahmen (TOM)

| Maßnahme | Implementierung |
|----------|-----------------|
| **Verschlüsselung** | AES-256-GCM (Daten), TLS 1.3 (Transport) |
| **Pseudonymisierung** | SHA-256 Hash für E-Mail-Lookup |
| **Zugriffskontrolle** | RBAC (4 Rollen), JWT mit HttpOnly Cookies |
| **Integrität** | GCM Auth-Tag, Zod-Validierung aller Inputs |
| **Verfügbarkeit** | CDN, Retry-Logik, automatische Backups |
| **Wiederherstellung** | DR-Plan mit RTO 4h / RPO 1h |

---

## Bestätigung

Dieses Verfahrensverzeichnis wurde nach bestem Wissen und Gewissen erstellt und enthält alle gemäß Art. 30 DSGVO erforderlichen Informationen.

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Verantwortlicher | Dr. med. | | |
| Datenschutzbeauftragter | | | |

---

**Dokument-Version:** 3.0-FINAL  
**Erstellt:** März 2026  
**Nächste Überprüfung:** März 2027
