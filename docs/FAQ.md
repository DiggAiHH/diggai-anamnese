# DiggAI - Frequently Asked Questions (FAQ)

> **Version**: 3.0.0  
> **Last Updated**: 2026-03-23  
> **Languages**: DE | EN | TR | AR | UK | ES | FA | IT | FR | PL

---

## Table of Contents

1. [General](#general)
2. [Security & Privacy](#security--privacy)
3. [Technical](#technical)
4. [For Patients](#for-patients)
5. [For Medical Staff](#for-medical-staff)
6. [Billing & Pricing](#billing--pricing)

---

## General

### Q: Was ist DiggAI?

**A:** DiggAI ist eine DSGVO-konforme digitale Patientenaufnahme-Plattform für deutsche Arztpraxen. Patienten können ihre Anamnese bequem vor dem Praxisbesuch online ausfüllen, was Zeit spart und die Qualität der Vorbereitung verbessert.

### Q: Für wen ist DiggAI geeignet?

**A:** DiggAI ist optimiert für:
- Hausarztpraxen
- Facharztpraxen
- Medizinische Versorgungszentren (MVZ)
- Praxiskliniken

### Q: In welchen Sprachen ist DiggAI verfügbar?

**A:** Die Plattform unterstützt 10 Sprachen:
- 🇩🇪 Deutsch
- 🇬🇧 English
- 🇹🇷 Türkçe
- 🇸🇦 العربية (Arabic)
- 🇺🇦 Українська
- 🇪🇸 Español
- 🇮🇷 فارسی (Farsi)
- 🇮🇹 Italiano
- 🇫🇷 Français
- 🇵🇱 Polski

### Q: Ist DiggAI zertifiziert?

**A:** Ja, DiggAI erfüllt:
- ✅ DSGVO (EU-Datenschutz-Grundverordnung)
- ✅ BSI TR-03161 (Kryptographische Vorgaben)
- ✅ Gematik TI-Vorgaben (optional)
- ✅ HIPAA-konform (für internationale Nutzung)

---

## Security & Privacy

### Q: Ist die Datenübertragung sicher?

**A:** Ja, absolut:
- **TLS 1.3** für alle Datenübertragungen
- **AES-256-GCM** Verschlüsselung für gespeicherte Daten
- **HttpOnly Cookies** für Authentifizierung
- **SHA-256** Hashing für pseudonymisierte Daten

### Q: Wer hat Zugriff auf meine Gesundheitsdaten?

**A:** Nur autorisiertes Praxispersonal:
- Ihr behandelnder Arzt: Vollzugriff
- MFA (Empfangspersonal): Eingeschränkter Zugriff
- Administratoren: Kein Zugriff auf Inhalte, nur Systemverwaltung
- Externe Dritte: Kein Zugriff

### Q: Wie lange werden meine Daten gespeichert?

**A:** 
- **Gesundheitsdaten**: 10 Jahre (gesetzlich vorgeschrieben, § 630f BGB)
- **Audit-Logs**: 7 Jahre
- **System-Logs**: 1-3 Jahre
- Nach Ablauf: Automatische Anonymisierung oder Löschung

### Q: Kann ich meine Daten löschen lassen?

**A:** Nach DSGVO haben Sie ein Recht auf Löschung. Beachten Sie jedoch:
- Während laufender Behandlung: Nur eingeschränkt möglich
- Nach Behandlungsende: Löschung nach gesetzlicher Aufbewahrungsfrist
- Kontaktieren Sie die Praxis für Löschanfragen

### Q: Was passiert bei einem Datenleck?

**A:** Im unwahrscheinlichen Fall eines Vorfalls:
1. Sofortige Benachrichtigung der Aufsichtsbehörde (innerhalb 72h)
2. Benachrichtigung betroffener Patienten (bei hohem Risiko)
3. Sofortige Sicherheitsmaßnahmen
4. Transparente Kommunikation

---

## Technical

### Q: Welche Browser werden unterstützt?

**A:** Aktuelle Versionen von:
- Google Chrome ✅
- Mozilla Firefox ✅
- Apple Safari ✅
- Microsoft Edge ✅

**Minimum Requirements:**
- TLS 1.2+ Unterstützung
- JavaScript aktiviert
- Cookies aktiviert
- LocalStorage Unterstützung

### Q: Funktioniert DiggAI auf Smartphones?

**A:** Ja, vollständig responsiv:
- iOS (iPhone/iPad)
- Android (Smartphones/Tablets)
- Progressive Web App (PWA) verfügbar
- Touch-optimierte Bedienung

### Q: Ist eine Offline-Nutzung möglich?

**A:** Teilweise:
- **Patientenformular**: Kann offline ausgefüllt werden
- **Datenspeicherung**: Lokal im Browser (IndexedDB)
- **Absenden**: Erfordert Internetverbindung
- **Arzt-Dashboard**: Online erforderlich

### Q: Wie oft werden Backups erstellt?

**A:** 
- **Automatisch**: Täglich um 02:00 UTC
- **Incremental**: Stündlich
- **Aufbewahrung**: 30 Tage
- **Verschlüsselung**: Ja, alle Backups

### Q: Was ist die Recovery Time Objective (RTO)?

**A:** 
- **Geplante Wartung**: < 4 Stunden
- **Ungeplanter Ausfall**: < 4 Stunden
- **Katastrophenfall**: < 24 Stunden

### Q: Welche Schnittstellen sind verfügbar?

**A:**
- **PVS-Integration**: Export zu gängigen Praxisverwaltungssystemen
- **TI/ePA**: Gematik Telematikinfrastruktur (optional)
- **Labor**: GDT-Schnittstelle (in Entwicklung)
- **API**: RESTful API für individuelle Integrationen

---

## For Patients

### Q: Muss ich alle Fragen beantworten?

**A:**
- **Pflichtfelder**: Mit * markiert, müssen ausgefüllt werden
- **Optionale Fragen**: Können übersprungen werden
- **Empfehlung**: Je vollständiger, desto besser die Vorbereitung

### Q: Was ist, wenn ich eine Frage nicht verstehe?

**A:**
- **Hilfe-Icon**: Klicken Sie auf das ?-Symbol bei jeder Frage
- **Erklärungstext**: Oft gibt es zusätzliche Informationen
- **Praxispersonal**: Fragen Sie im Zweifel nach
- "Weiß nicht" Option: Bei vielen Fragen verfügbar

### Q: Kann ich meine Angaben nachträglich ändern?

**A:**
- **Vor Absenden**: Alle Angaben änderbar
- **Nach Absenden**: Kontaktieren Sie die Praxis
- **Korrektur**: Neues Formular möglich

### Q: Wie lange dauert das Ausfüllen?

**A:**
- **Neue Patienten**: ~10-15 Minuten
- **Bestehende Patienten**: ~5-10 Minuten
- **Rezeptanfrage**: ~2-3 Minuten
- **Unterbrechbar**: Speichern und später fortsetzen

### Q: Was passiert nach dem Absenden?

**A:**
1. Daten werden sicher übertragen
2. Praxis wird benachrichtigt
3. Arzt bereitet sich vor
4. Sie werden aufgerufen oder erhalten Rückmeldung

---

## For Medical Staff

### Q: Werden triage-relevante Symptome automatisch erkannt?

**A:** Ja, das System erkennt automatisch:
- **CRITICAL**: Akutes Koronarsyndrom, Suizidalität, Hirnblutung, etc.
- **WARNING**: Polypharmazie, Schwangerschaft + Antikoagulation, etc.
- **Echtzeit-Benachrichtigung**: Sofortige Alert an Ärzte

### Q: Kann ich das Formular für meine Praxis anpassen?

**A:** Ja, über den Admin-Bereich:
- Fragen hinzufügen/entfernen
- Reihenfolge ändern
- Sektionen anpassen
- Praxis-Logo und Farben einstellen

### Q: Wie exportiere ich Patientendaten?

**A:** Drei Formate verfügbar:
- **PDF**: Für Patientenakte, Druck
- **CSV**: Für Statistik, Excel
- **JSON**: Für Systemintegration

### Q: Ist eine Schulung erforderlich?

**A:** Empfohlen, aber nicht zwingend:
- **Online-Tutorials**: Verfügbar
- **Webinare**: Monatlich
- **Dokumentation**: Umfassend
- **Support**: Bei Fragen

### Q: Was ist bei der AU-Bescheinigung zu beachten?

**A:**
- Patient beschreibt Symptome digital
- Arzt bewertet Angaben
- AU wird bei Vorliegen ausgestellt
- Patient wird benachrichtigt

---

## Billing & Pricing

### Q: Wie wird abgerechnet?

**A:** Pro aktiver Arzt, monatlich:
- **Basis**: 49€/Monat/Arzt
- **Professional**: 79€/Monat/Arzt (inkl. PVS-Integration)
- **Enterprise**: Individuell (mehrere Standorte)

### Q: Gibt es eine Mindestvertragslaufzeit?

**A:**
- **Monatlich**: Kündbar mit 30 Tagen Frist
- **Jährlich**: 10% Rabatt, kündbar zum Jahresende

### Q: Welche Zahlungsmethoden werden akzeptiert?

**A:**
- SEPA-Lastschrift
- Überweisung
- Kreditkarte
- PayPal

### Q: Ist ein Rabatt für mehrere Ärzte möglich?

**A:** Ja:
- 2-3 Ärzte: 5% Rabatt
- 4-5 Ärzte: 10% Rabatt
- 6+ Ärzte: Individuelle Vereinbarung

### Q: Was ist im Preis enthalten?

**A:**
- ✅ Software-Lizenz
- ✅ Updates und Wartung
- ✅ Support (Mo-Fr, 8-18 Uhr)
- ✅ DSGVO-konforme Infrastruktur
- ✅ Regelmäßige Backups
- ✅ E-Mail-Benachrichtigungen

**Nicht enthalten:**
- ❌ PVS-Integration (Professional+)
- ❌ TI/ePA-Anbindung (optional)
- ❌ Custom Development
- ❌ On-site Schulung

### Q: Gibt es eine Testphase?

**A:** Ja:
- **30 Tage kostenlos testen**
- Alle Features verfügbar
- Keine Kreditkarte erforderlich
- Einfache Umstellung auf Produktiv

---

## Contact & Support

### Technischer Support

- **E-Mail**: support@diggai.de
- **Telefon**: +49 (0) XXX XXX XXX
- **Zeiten**: Mo-Fr, 08:00-18:00 Uhr
- **Notfall**: 24/7 für kritische Probleme

### Vertrieb

- **E-Mail**: vertrieb@diggai.de
- **Telefon**: +49 (0) XXX XXX XXX
- **Demo**: https://diggai.de/demo

### Feedback

- **Feature Requests**: feedback@diggai.de
- **Bug Reports**: bugs@diggai.de
- **Allgemein**: hallo@diggai.de

---

## Quick Links

| Resource | URL |
|----------|-----|
| Website | https://diggai.de |
| Dokumentation | https://docs.diggai.de |
| Status-Seite | https://status.diggai.de |
| Training | https://diggai.de/training |
| API Docs | https://api.diggai.de/docs |

---

## Didn't find your question?

Contact us:
- 📧 Email: support@diggai.de
- 📞 Phone: +49 (0) XXX XXX XXX
- 💬 Live Chat: Available on website

---

*This FAQ is regularly updated. Last check: March 2026*
