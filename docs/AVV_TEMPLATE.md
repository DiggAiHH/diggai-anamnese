# Auftragsverarbeitungsvertrag (AVV) — Art. 28 DSGVO
## Muster-Vorlage für DiggAI Anamnese-Anwendung

---

**HINWEIS:** Dies ist eine Vorlage. Der finale AVV muss von beiden Parteien juristisch geprüft und unterzeichnet werden.

---

## §1 Gegenstand und Dauer der Verarbeitung

### 1.1 Gegenstand

Der Auftragsverarbeiter (nachfolgend „AV") verarbeitet personenbezogene Daten im Auftrag und nach Weisung des Verantwortlichen (nachfolgend „V") im Rahmen des folgenden Vertragsgegenstandes:

**Hosting und Bereitstellung der DiggAI Anamnese-Webanwendung** über die Infrastruktur des AV, einschließlich:
- Auslieferung der statischen Web-Assets (HTML, JS, CSS)
- Ausführung serverloser Funktionen (Netlify Functions)
- CDN-basierte Content-Distribution
- SSL/TLS-Terminierung

### 1.2 Dauer

Der Vertrag gilt für die Dauer der Nutzung des Hosting-Dienstes durch den V, mindestens jedoch für die Dauer der Datenaufbewahrungsfristen.

---

## §2 Art und Zweck der Verarbeitung

| Aspekt | Detail |
|--------|--------|
| **Art der Daten** | Gesundheitsdaten (Art. 9 DSGVO), Stammdaten, Kontaktdaten, Versicherungsdaten, Session-/Authentifizierungsdaten |
| **Betroffene** | Patienten, Ärzte, MFA, Administratoren der Praxis des V |
| **Zweck** | Technisches Hosting und Bereitstellung der medizinischen Anamnese-Anwendung |

---

## §3 Weisungsgebundenheit

1. Der AV verarbeitet personenbezogene Daten ausschließlich auf dokumentierte Weisung des V.
2. Der AV informiert den V unverzüglich, falls eine Weisung nach seiner Auffassung gegen Datenschutzrecht verstößt.
3. Die Weisungen können in schriftlicher oder elektronischer Form erteilt werden.

---

## §4 Pflichten des Auftragsverarbeiters

Der AV verpflichtet sich:

1. **Vertraulichkeit:** Alle mit der Datenverarbeitung betrauten Personen sind auf Vertraulichkeit verpflichtet.
2. **TOM:** Sicherzustellen, dass die in §6 genannten technischen und organisatorischen Maßnahmen implementiert sind.
3. **Unterauftragsverarbeiter:** Weitere Auftragsverarbeiter nur mit vorheriger schriftlicher Genehmigung des V einzusetzen.
4. **Mitwirkung:** Den V bei der Erfüllung von Betroffenenrechten (Art. 15–22 DSGVO) zu unterstützen.
5. **Löschung:** Nach Vertragsende alle personenbezogenen Daten zu löschen oder zurückzugeben, sofern keine gesetzliche Aufbewahrungspflicht besteht.
6. **Audits:** Dem V alle erforderlichen Informationen zum Nachweis der Compliance zur Verfügung zu stellen und Überprüfungen/Audits zu ermöglichen.

---

## §5 Meldung von Datenschutzverletzungen

1. Der AV meldet dem V jede Verletzung des Schutzes personenbezogener Daten **unverzüglich**, spätestens innerhalb von **24 Stunden** nach Bekanntwerden.
2. Die Meldung enthält mindestens:
   - Art der Verletzung
   - Betroffene Datenkategorien und Personenzahl (geschätzt)
   - Wahrscheinliche Folgen
   - Ergriffene/vorgeschlagene Abhilfemaßnahmen

---

## §6 Technische und Organisatorische Maßnahmen (TOM)

### 6.1 Maßnahmen des AV (Hosting-Provider)

| TOM-Kategorie | Maßnahme |
|--------------|----------|
| **Zutrittskontrolle** | SOC 2 Type II zertifizierte Rechenzentren |
| **Zugangskontrolle** | MFA für alle Mitarbeiter-Zugänge |
| **Transportverschlüsselung** | TLS 1.3 (automatisches SSL) |
| **Verfügbarkeit** | CDN mit Multi-Region-Failover, SLA 99.99% |
| **Trennungskontrolle** | Mandantentrennung auf Infrastrukturebene |

### 6.2 Maßnahmen des V (Anwendungsebene)

| TOM-Kategorie | Maßnahme |
|--------------|----------|
| **Verschlüsselung** | AES-256-GCM für Gesundheitsdaten |
| **Authentifizierung** | JWT (HS256), bcrypt-Hashing, Rate Limiting |
| **Zugriffskontrolle** | RBAC (Patient, Arzt, MFA, Admin) |
| **Logging** | HIPAA-konformes Audit-Logging mit Sanitisierung |
| **HTTP-Sicherheit** | HSTS, CSP, X-Frame-Options, Permissions-Policy |
| **Datenminimierung** | Automatische Session-Bereinigung (24h TTL) |

---

## §7 Drittlandübermittlung

1. Der AV hat seinen Sitz in den USA.
2. Die Datenübermittlung erfolgt auf Grundlage von:
   - **EU-Standardvertragsklauseln (SCC)** gemäß Art. 46 Abs. 2 lit. c DSGVO
   - **EU-US Data Privacy Framework** (Angemessenheitsbeschluss der Kommission)
3. Ergänzende Schutzmaßnahmen:
   - TLS 1.3 für alle Datenübertragungen
   - AES-256 Verschlüsselung sensibler Datenfelder
   - Kein Klartext-Zugriff durch den AV auf verschlüsselte Gesundheitsdaten

---

## §8 Unterauftragsverarbeiter

Die folgenden Unterauftragsverarbeiter sind genehmigt:

| Name | Standort | Zweck |
|------|----------|-------|
| AWS (Amazon Web Services) | USA/EU | Infrastruktur für Netlify |
| Google Fonts | Global | Schriftarten-CDN (kein Cookie, kein Tracking) |

Der V wird über Änderungen schriftlich informiert und hat ein Widerspruchsrecht.

---

## §9 Laufzeit und Kündigung

1. Dieser Vertrag gilt für die Dauer des Hauptvertrages (Hosting).
2. Bei Beendigung wird der AV alle Daten gemäß §4 Nr. 5 löschen/zurückgeben.
3. Das Recht zur außerordentlichen Kündigung bei schwerwiegenden Datenschutzverstößen bleibt unberührt.

---

**Ort, Datum:** ____________________

**Verantwortlicher (V):**

Name: Dr. med. [Name]  
Unterschrift: ____________________

**Auftragsverarbeiter (AV):**

Name: Netlify Inc.  
Unterschrift: ____________________

---

*Hinweis: Netlify bietet ein eigenes DPA (Data Processing Agreement) unter https://www.netlify.com/gdpr-ccpa an, das als AVV-Äquivalent dienen kann.*
