# Verzeichnis von Verarbeitungstätigkeiten — Art. 30 DSGVO
## DiggAI Anamnese-Anwendung

---

**Stand:** Juli 2025 | **Version:** 2.0  
**Verantwortlicher:** Dr. med. [Name], [Praxisname], [Adresse]  
**Datenschutzbeauftragter:** [Name], erreichbar unter dsb@praxis.de

---

## VVT-001: Digitale Anamnese-Erfassung

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Digitale Erfassung medizinischer Anamnese-Fragebögen |
| **Zweck** | Voraberfassung von Gesundheitsdaten für die ärztliche Behandlung |
| **Verantwortlicher** | Dr. med. [Name] |
| **Betroffene** | Patienten der Praxis |
| **Datenkategorien** | Stammdaten, Kontaktdaten, Versicherungsdaten, **Gesundheitsdaten (Art. 9)**, Medikation, Allergien, Familienhistorie |
| **Rechtsgrundlage** | Art. 9 Abs. 2 lit. h DSGVO, §22 Abs. 1 Nr. 1 lit. b BDSG, Art. 6 Abs. 1 lit. a DSGVO |
| **Empfänger** | Behandelnde Ärzte, MFA (innerhalb der Praxis) |
| **Drittlandtransfer** | Netlify Inc. (USA) — SCC + EU-US DPF, AVV |
| **Speicherdauer** | 10 Jahre nach letzter Behandlung (§630f Abs. 3 BGB) |
| **TOM** | TLS 1.3, AES-256-GCM, RBAC, Audit-Logging, HSTS |
| **DSFA erforderlich** | Ja — Art. 35 Abs. 3 lit. b (umfangreiche Verarbeitung besonderer Kategorien) |

---

## VVT-002: Authentifizierung und Zugangskontrolle

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Authentifizierung von Personal und Sitzungsverwaltung |
| **Zweck** | Sichere Zuordnung von Fragebögen, Rollenbasierte Zugriffskontrolle |
| **Betroffene** | Ärzte, MFA, Administratoren, Patienten (Session-ID) |
| **Datenkategorien** | Benutzername, Passwort-Hash, JWT-Token, IP-Adresse, Role |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an IT-Sicherheit) |
| **Empfänger** | Nur intern (kein Drittlandtransfer für Auth-Daten) |
| **Speicherdauer** | Token: 24h; Benutzerkonten: Dauer der Beschäftigung |
| **TOM** | bcrypt (12 Runden), HS256 JWT, Rate Limiting, Token-Blacklist |

---

## VVT-003: Echtzeit-Kommunikation (Chat)

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Chat zwischen Patient und Praxispersonal |
| **Zweck** | Echtzeit-Kommunikation während der Wartezeit |
| **Betroffene** | Patienten, Ärzte, MFA |
| **Datenkategorien** | Nachrichteninhalt, Absendername, Zeitstempel |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) |
| **Empfänger** | Nur Praxisteam und betroffener Patient |
| **Speicherdauer** | Mit Session gelöscht (CASCADE) |
| **TOM** | WebSocket (WSS), Authentifizierung, Session-Bindung |

---

## VVT-004: Audit-Logging

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Protokollierung aller Datenzugriffe |
| **Zweck** | Nachvollziehbarkeit, Rechenschaftspflicht, Anomalie-Erkennung |
| **Betroffene** | Alle Nutzer (Patienten, Personal) |
| **Datenkategorien** | User-ID, Aktion, Ressource, IP, User-Agent, Zeitstempel, Status-Code |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO i.V.m. Art. 5 Abs. 2 DSGVO |
| **Empfänger** | Nur Administratoren |
| **Speicherdauer** | 3 Jahre |
| **TOM** | Sanitisierung sensitiver Parameter, Retry-Logik, Indizierung |

---

## VVT-005: Cookie-/Consent-Verwaltung

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | DSGVO-Einwilligung und Cookie-Consent |
| **Zweck** | Nachweis der Einwilligung per Art. 7 Abs. 1 DSGVO, TTDSG §25 |
| **Betroffene** | Alle Website-Besucher |
| **Datenkategorien** | Consent-Zeitstempel, gewählte Cookie-Kategorien, Consent-Version |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c DSGVO (Nachweispflicht), TTDSG §25 |
| **Empfänger** | Nur lokal (localStorage), kein Drittlandtransfer |
| **Speicherdauer** | 1 Jahr |
| **TOM** | Versionierung, Re-Consent bei Änderungen |

---

## VVT-006: Online-Wartezimmer und Warteschlange

| Feld | Inhalt |
|------|--------|
| **Bezeichnung** | Digitales Wartezimmer mit Echtzeit-Warteschlange |
| **Zweck** | Transparente Wartezeit, Triage-Priorisierung |
| **Betroffene** | Patienten (wartend) |
| **Datenkategorien** | Session-ID, Position, Triage-Level, Wartezeit |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b DSGVO |
| **Empfänger** | Patient (eigene Position), Personal (vollständige Liste) |
| **Speicherdauer** | Nur während aktiver Sitzung |
| **TOM** | WebSocket, Session-Authentifizierung |

---

**Erstellt:** Juli 2025  
**Nächste Überprüfung:** Juli 2026  
**Genehmigt von:** [Unterschrift Verantwortlicher]
