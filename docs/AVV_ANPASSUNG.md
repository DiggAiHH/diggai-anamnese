# AVV - Anpassung und Unterauftragsverarbeiter
## DiggAI Anamnese Platform v3.0.0

**Stand:** März 2026 | **Version:** 3.0-FINAL

---

## 1. Übersicht Auftragsverarbeitung

### 1.1 Haupt-Auftragsverarbeiter (AV)

| Dienstleister | Netlify Inc. |
|---------------|--------------|
| **Sitz** | San Francisco, CA, USA |
| **Dienstleistung** | Hosting, CDN, Serverless Functions |
| **AVV Status** | ✅ **VORHANDEN** |
| **AVV Typ** | Netlify DPA (Data Processing Agreement) |
| **Verfügbar unter** | https://www.netlify.com/gdpr-ccpa |
| **Gültig seit** | Mit Nutzungsbeginn |
| **Rechtsgrundlage** | EU-US Data Privacy Framework + SCC |

### 1.2 Verantwortlicher (V)

| | |
|---|---|
| **Name** | Dr. med. [Name] |
| **Praxis** | [Praxisname] |
| **Adresse** | [Adresse] |
| **Kontakt** | [E-Mail], [Telefon] |

---

## 2. Unterauftragsverarbeiter (Sub-Processor)

### 2.1 Genehmigte Unterauftragsverarbeiter

| Dienstleister | Standort | Zweck | AVV Status |
|---------------|----------|-------|------------|
| **Amazon Web Services (AWS)** | USA/EU | Infrastruktur für Netlify | ✅ Via Netlify DPA |
| **Google Fonts** | Global | Schriftarten-CDN | ✅ Keine Cookies, kein Tracking |
| **Let's Encrypt** | USA | SSL-Zertifikate | ✅ Non-profit, automatisiert |
| **GitHub** | USA | Code-Repository | ✅ DPA verfügbar |

### 2.2 Prüfstatus AVV

| Dienstleister | AVV Angefordert | AVV Erhalten | Status | Aktion |
|---------------|-----------------|--------------|--------|--------|
| Netlify | ✅ | ✅ | ✅ Aktiv | Keine |
| AWS | N/A | ✅ Via Netlify | ✅ Aktiv | Keine |
| Hetzner (Optional VPS) | ⏳ | ⏳ | ⏳ Prüfung | Anfordern wenn genutzt |
| Stripe (Zahlungen) | ✅ | ✅ | ✅ Aktiv | Standard-DPA |
| SendGrid (E-Mail) | ⏳ | ⏳ | ⏳ Optional | Nur bei Nutzung |

---

## 3. AVV-Anforderungen an Unterauftragsverarbeiter

### 3.1 Pflichten gemäß Art. 28 DSGVO

Für jeden Unterauftragsverarbeiter müssen folgende Anforderungen erfüllt sein:

| Anforderung | Nachweis |
|-------------|----------|
| Weisungsgebundenheit | Schriftliche Bestätigung |
| Vertraulichkeit | Geheimhaltungserklärung |
| TOM | Dokumentierte Sicherheitsmaßnahmen |
| Unterauftragsverarbeiter | Benachrichtigungspflicht |
| Löschung/Rückgabe | Vertragliche Vereinbarung |
| Audit-Recht | Zusammenarbeit bei Audits |
| Datenschutzverletzungen | 24h Meldepflicht |

### 3.2 Dokumentationspflicht

Für jeden AVV müssen vorliegen:
- [ ] Unterschriebene AVV-Kopie
- [ ] Nachweis Drittlandtransfer (SCC/DPF)
- [ ] TOM-Übersicht des Auftragsverarbeiters
- [ ] Kontaktdaten des DSB des AV

---

## 4. Drittlandtransfer

### 4.1 Transfer in die USA

| Empfänger | Grundlage | Zusätzliche Maßnahmen |
|-----------|-----------|----------------------|
| Netlify | EU-US Data Privacy Framework | TLS 1.3, AES-256 |
| AWS | EU-US Data Privacy Framework | TLS 1.3 |
| GitHub | Standard Contract Clauses (SCC) | - |

### 4.2 Geeignete Garantien

| Mechanismus | Anwendung | Status |
|-------------|-----------|--------|
| EU-US Data Privacy Framework | Netlify, AWS | ✅ Angemessenheitsbeschluss |
| Standard Contract Clauses (SCC) | Sonstige | ✅ Vorhanden |
| Zusätzliche technische Maßnahmen | Alle | ✅ TLS 1.3, AES-256-GCM |

---

## 5. Verfahren bei Änderungen

### 5.1 Neuer Unterauftragsverarbeiter

1. **Benachrichtigung** durch Haupt-AV (Netlify)
2. **Prüfung** durch Verantwortlichen
3. **Widerspruchsrecht** innerhalb von 30 Tagen
4. **Dokumentation** im Verzeichnis

### 5.2 Änderung bestehender AVV

1. **Benachrichtigung** über Änderungen
2. **Prüfung** auf DSGVO-Konformität
3. **Aktualisierung** der Dokumentation
4. **Genehmigung** durch DSB falls erforderlich

---

## 6. Checkliste AVV-Management

### 6.1 Vor Go-Live

| Aufgabe | Status | Verantwortlich |
|---------|--------|----------------|
| Netlify DPA herunterladen | ✅ | Admin |
| Netlify DPA prüfen | ✅ | DSB |
| Unterauftragsverarbeiter-Liste prüfen | ✅ | Technik |
| SCC bei Drittlandtransfer dokumentieren | ✅ | DSB |
| AVV-Unterlagen archivieren | ✅ | Admin |

### 6.2 Laufend (jährlich)

| Aufgabe | Frequenz | Nächster Termin |
|---------|----------|-----------------|
| AVV-Status prüfen | Jährlich | März 2027 |
| Unterauftragsverarbeiter-Liste aktualisieren | Bei Änderung | Laufend |
| Neue Sub-Processor Benachrichtigungen prüfen | Monatlich | Laufend |

---

## 7. Kontakte

### 7.1 Netlify

| | |
|---|---|
| **Support** | support@netlify.com |
| **DSB** | privacy@netlify.com |
| **DPA** | https://www.netlify.com/gdpr-ccpa |

### 7.2 AWS (via Netlify)

| | |
|---|---|
| **DSB** | AWS DSB über Netlify |
| **DPA** | Teil der Netlify-Vereinbarung |

---

## 8. Bestätigung

Die Auftragsverarbeitungsverträge wurden geprüft und erfüllen die Anforderungen des Art. 28 DSGVO.

| Rolle | Name | Datum | Unterschrift |
|-------|------|-------|--------------|
| Datenschutzbeauftragter | | | |
| Verantwortlicher | | | |

---

**Dokument-Version:** 3.0-FINAL  
**Erstellt:** März 2026  
**Nächste Überprüfung:** März 2027
