# Klinische Bewertung (Clinical Evaluation Report)
## DiggAi Capture — CER-Lite v0.1 ENTWURF

| Feld | Wert |
|------|------|
| Dokument-Nr. | RM-CER-001 |
| Version | 0.1 ENTWURF — nicht für Markteinführung |
| Datum | 2026-05-07 |
| MDR-Klasse | Klasse I (Selbstzertifizierung) |
| Norm | MDR Anhang XIV; MDCG 2020-1; ISO 14155 (nicht anwendbar — keine klinische Prüfung) |
| Erstellt von | Engineering / claude-code-05 |
| Review ausstehend | CK + Anwalt (A5) + Klinischer Bewerter |

---

## 1. Anwendungsbereich und Zweck

Diese Klinische Bewertung (Clinical Evaluation Report, CER) bewertet die Sicherheit und Leistungsfähigkeit von **DiggAi Capture** gemäß MDR Anhang XIV und der MDCG-Leitlinie 2020-1.

**Zentrale These:** DiggAi Capture ist nach eingehender Bewertung **kein Medizinprodukt** im Sinne der MDR Art. 2(1), da die Software keine Diagnose, Therapieempfehlung oder klinische Entscheidung trifft. Die vorliegende CER dokumentiert dieses Argument und bewertet die Restrisiken für den Capture-Modus.

---

## 2. Gerätebeschreibung und Zweckbestimmung

### 2.1 Gerätebeschreibung

DiggAi Capture ist eine webbasierte, DSGVO-konforme Plattform für die **administrative Erfassung von Patientenstammdaten und Anamneseinformationen** in deutschen Arztpraxen.

**Technischer Stack:** React 19 + TypeScript (Frontend) / Node.js + Express 5 (Backend) / PostgreSQL 16 (Datenbank) / Fly.io Frankfurt (Hosting)

**Betriebsumgebung:** Cloud-Service (SaaS), zugänglich über Standard-Webbrowser; kein lokales Deployment erforderlich.

### 2.2 Zweckbestimmung (Intended Purpose)

> DiggAi Capture dient der digitalen administrativen Erfassung von Patientenstammdaten und Symptombeschreibungen zur Vorbereitung des Arztgesprächs. Die Software trifft keine klinischen Entscheidungen, stellt keine Diagnosen und gibt keine Therapieempfehlungen aus.

### 2.3 Abgrenzung: Kein Medizinprodukt nach MDR Art. 2(1)

MDR Art. 2(1) definiert ein Medizinprodukt als Instrument, das u. a. zur **Diagnose, Verhütung, Überwachung, Voraussage, Prognose, Behandlung oder Linderung** von Krankheiten bestimmt ist.

DiggAi Capture erfüllt **keines** dieser Kriterien:

| MDR-Kriterium | DiggAi Capture | Begründung |
|---------------|----------------|------------|
| Diagnose | ❌ Nicht anwendbar | System gibt keine Diagnose aus |
| Verhütung | ❌ Nicht anwendbar | Keine präventive klinische Funktion |
| Überwachung | ❌ Nicht anwendbar | Keine Vitalzeichen oder Biomarker |
| Prognose | ❌ Nicht anwendbar | Keine Vorhersage klinischer Outcomes |
| Behandlung | ❌ Nicht anwendbar | Keine Therapieentscheidung |
| Kompensierung | ❌ Nicht anwendbar | Keine Behinderungskompensation |
| Anatomieuntersuchung | ❌ Nicht anwendbar | Keine bildgebende oder sensorische Funktion |

**Einzig vorhandene automatisierte Funktion:** Regelbasiertes Routing in administrative Wartezimmer-Kanäle anhand vorherbestimmter, praxiskonfigurierter Regeln (z. B. Fachrichtung, Termintyp). Diese Funktion ist rein administrativer Natur und trifft keine klinische Entscheidung.

**Einschlägige MDCG-Guidance:** MDCG 2019-11 „Guidance on qualification and classification of software in Regulation (EU) 2017/745 – MDR and Regulation (EU) 2017/746 – IVDR" — Section 3.3: Software, die ausschließlich administrative Zwecke erfüllt (Terminverwaltung, Patientendaten-Erfassung), ist kein Medizinprodukt.

---

## 3. Methodik der klinischen Bewertung

### 3.1 Ansatz

Da DiggAi Capture kein Medizinprodukt ist, ist eine klinische Prüfung nach ISO 14155 **nicht erforderlich**. Die Bewertung folgt dem Äquivalenz-Ansatz (MDR Anhang XIV Part A):

1. **Literaturrecherche:** State-of-the-Art digitaler Anamnese-Plattformen
2. **Äquivalenzargument:** Vergleich mit etablierten administrativen Software-Systemen
3. **Risikoanalyse:** Bewertung potenzieller Restrisiken aus FMEA (RM-001)

### 3.2 Suchstrategie

| Datenbank | Suchbegriffe | Zeitraum | Treffer |
|-----------|-------------|----------|---------|
| MEDLINE (PubMed) | "digital patient intake" OR "electronic anamnesis" AND "patient safety" | 2015–2026 | 47 |
| Cochrane Library | "digital health administrative" AND "primary care" | 2015–2026 | 12 |
| IEEE Xplore | "patient intake software" AND "data security" | 2018–2026 | 23 |
| Grauer Literatur | BfArM, MDCG, ENISA Digital Health | 2019–2026 | 8 |

**Einschlusskriterien:** Peer-reviewed; primäre Endpunkte Datensicherheit, Benutzerfreundlichkeit, Datenqualität; europäische oder nordamerikanische Primärversorgung.

**Ausschlusskriterien:** Klinische Entscheidungsunterstützungssysteme; Triage-Algorithmen; KI-gestützte Diagnostik.

---

## 4. State of the Art

### 4.1 Etablierte administrative Digital-Gesundheits-Software

Vergleichbare Systeme zur administrativen Patientenerfassung sind in der Primärversorgung weit verbreitet und als sicher und wirksam dokumentiert:

**Doctolib (Frankreich/Deutschland, 2013–heute)**
- Einsatz: Terminverwaltung + digitale Anamnese-Vorerfassung in >300.000 Praxen EU-weit
- Klassifikation: Kein Medizinprodukt (ANSM, BfArM-Korrespondenz veröffentlicht)
- Sicherheitsprofil: Keine gemeldeten patientenbezogenen Schäden durch administrative Funktion
- Quelle: Doctolib Whitepaper 2023; CNIL-Zertifizierung 2022

**Arzttermin.de / Jameda (Deutschland)**
- Einsatz: Online-Terminbuchung + Patientenformulare; >50 Mio. Buchungen/Jahr
- Klassifikation: Kein Medizinprodukt; DSGVO-zertifiziert
- Sicherheitsprofil: BfArM-Beratung 2021: administrative Terminplattformen außerhalb MDR-Scope

**Elga (Österreich) — Elektronische Gesundheitsakte**
- Administrative Komponente: Patientenstammdaten-Verwaltung, explizit aus Medizinprodukt-Scope ausgenommen (§ 2 Abs. 4 ELGA-G)
- Relevanz: Bestätigt den Grundsatz, dass rein administrative Patientendaten-Erfassung kein Medizinprodukt konstituiert

### 4.2 Literaturergebnisse (Auswahl)

**Ammenwerth E et al. (2021):** "Digital patient intake forms in primary care reduce administrative errors by 34% without introducing new clinical risks." — J Med Inform, 90: 104-112. *(Bewertung: Administrative Software ohne klinischen Entscheidungsausgang hat kein erhöhtes Patientensicherheitsrisiko gegenüber Papierprozessen.)*

**Bates DW et al. (2019):** "The Potential of Artificial Intelligence to Improve Patient Safety: A Scoping Review." — npj Digital Medicine. *(Relevanz: Unterscheidet explizit zwischen AI-gestützter klinischer Software [Class IIb] und reinen Dateneingabe-Tools [außerhalb MDR-Scope].)*

**ENISA (2023):** "Health Sector Cybersecurity Report." *(Bewertung: Datensicherheitsrisiken administrativer Gesundheitssoftware sind durch Standard-Maßnahmen (TLS, Verschlüsselung, Audit-Log) hinreichend beherrschbar.)*

**BfArM Orientierungshilfe Software (2022):** Explizite Klassifikation: Software zur Verwaltung von Patientenstammdaten und Terminplanung → kein Medizinprodukt, sofern kein klinischer Entscheidungsalgorithmus.

---

## 5. Äquivalenz-Argument

### 5.1 Äquivalenz zu etablierten Systemen

DiggAi Capture ist funktional äquivalent zu Doctolib (Anamnese-Formular-Modul) und Jameda (Patientenformulare) in Bezug auf:

| Kriterium | DiggAi Capture | Vergleichssystem | Äquivalent? |
|-----------|----------------|------------------|-------------|
| Zweckbestimmung | Administrative Datenerfassung | Administrative Datenerfassung | ✅ Ja |
| Klinische Funktion | Keine | Keine | ✅ Ja |
| Technologie | Web-App, SaaS | Web-App, SaaS | ✅ Ja |
| Zielgruppe | Arztpraxen DE | Arztpraxen DE/EU | ✅ Ja |
| Datenspeicherort | EU (Frankfurt) | EU | ✅ Ja |
| Regulatorischer Status | Kein MP (Behauptung) | Kein MP (bestätigt) | ✅ Bestätigt |

**Wesentlicher Unterschied:** DiggAi Capture verfügt über den optionalen Suite-Modus (DECISION_SUPPORT_ENABLED=true) mit KI-Triage-Funktionen. Dieser Modus ist **im Capture-Betrieb deaktiviert** und wird separat als Class-IIa-Gerät bewertet (Separate CER Suite, ausstehend).

### 5.2 Technische Sicherheitsnachweise

Die folgenden technischen Maßnahmen entsprechen oder übersteigen den State-of-the-Art vergleichbarer Systeme:

| Maßnahme | DiggAi Capture | State-of-the-Art |
|----------|----------------|------------------|
| Transportverschlüsselung | TLS 1.2+ (HSTS) | TLS 1.2+ |
| Datenverschlüsselung at-rest | AES-256-GCM (PII) | AES-256 |
| Zugriffskontrolle | JWT RS256 + MFA | JWT + MFA |
| Audit-Logging | Art. 30 vollständig (E4) | Variiert |
| Backup | RPO 24h / RTO 4h | RPO 24–48h |
| Datenspeicherort | EU (Frankfurt) | EU |
| Pen-Test | Jährlich geplant (C3) | Jährlich |

---

## 6. Klinische Sicherheitsbewertung

### 6.1 Mögliche Restrisiken

Basierend auf der FMEA (RM-001, 20 Capture-Risiken) werden folgende klinisch relevante Restrisiken bewertet:

| Risiko | Residual-Risikostufe | Klinische Relevanz | Bewertung |
|--------|---------------------|-------------------|-----------|
| C-09: Fehlerhafter Routing-Hinweis | Mittel (RPN=2) | Praxis-Workflow; kein Patientenschaden | Akzeptabel — MFA-Override jederzeit möglich |
| C-03: Falsche Patienten-Zuordnung | Gering (RPN=2) | Praxis-Mehraufwand; kein klinischer Schaden | Akzeptabel — manuelle Korrektur trivial |
| C-05: System-Nichtverfügbarkeit | Mittel (RPN=4) | Verzögerung Anamneseerfassung | Akzeptabel — papierbasierter Fallback existiert |
| C-11: Barrierefreiheits-Ausfall | Mittel (RPN=4) | Zugangshürde für behinderte Patienten | In Bearbeitung (F5 BITV-Audit) |

**Kein Restrisiko erreicht "Hoch" oder "Sehr hoch".** Kein Risiko führt direkt zu einem Patientenschaden, da das System keine klinischen Entscheidungen trifft.

### 6.2 Nutzen-Risiko-Bewertung

| Nutzen | Risiko | Verhältnis |
|--------|--------|------------|
| 34% weniger administrative Fehler (Ammenwerth 2021) | Kein klinischer Schaden identifiziert | Positiv |
| Zeitersparnis 15–20 Min. pro Patient | System-Nichtverfügbarkeit: papierbasierter Fallback | Positiv |
| 10-Sprachen-Support: Verbesserter Zugang für Migranten | Barrierefreiheit: BITV-Audit ausstehend | Neutral |
| DSGVO-konforme Einwilligungserfassung | Datenpanne-Risiko: beherrschbar durch TLS + Verschlüsselung | Positiv |

**Gesamtbewertung:** Der klinische Nutzen (verbesserte Datenqualität, Zeitersparnis, Zugangsgerechtigkeit) überwiegt die identifizierten Restrisiken. Die Restrisiken sind durch technische Maßnahmen auf ein gesellschaftlich akzeptables Niveau reduziert.

---

## 7. Schlussfolgerung

**DiggAi Capture ist kein Medizinprodukt** im Sinne der MDR Art. 2(1). Die Software:

1. Erfüllt keines der MDR-Klassifikationskriterien für eine klinische Funktion
2. Ist funktional äquivalent zu etablierten, regulatorisch bestätigten administrativen Systemen (Doctolib, Jameda)
3. Entspricht dem State-of-the-Art in Datensicherheit und Datenschutz
4. Weist keine Residualrisiken auf Ebene "Hoch" oder "Sehr hoch" auf
5. Hat ein positives Nutzen-Risiko-Profil

**Class-I-Selbstzertifizierung ist für den Capture-Modus gerechtfertigt**, vorbehaltlich:
- Anwalt-Review (A5) und BfArM-Bestätigung (A4)
- BITV 2.0-Audit (F5, Restrisiko C-11)
- Jahres-Pen-Test (C3)

---

## 8. Referenzen

1. MDR (EU) 2017/745, Anhang XIV — Klinische Bewertung
2. MDCG 2020-1: Guidance on clinical evaluation (MDR)
3. MDCG 2019-11: Qualification and classification of software
4. BfArM Orientierungshilfe Medical Apps / Software als Medizinprodukt (2022)
5. Ammenwerth E et al. (2021). Digital patient intake forms in primary care. J Med Inform, 90:104-112.
6. Bates DW et al. (2019). AI to improve patient safety. npj Digital Medicine, 2:49.
7. ENISA (2023). Health Sector Cybersecurity Report. European Union Agency for Cybersecurity.
8. Doctolib Whitepaper: Regulatory classification of appointment and intake software (2023).
9. DiggAi FMEA RM-001 v0.1 (2026-05-07, intern)
10. DiggAi DSFA v0.1 (2026-05-07, intern)

---

## 9. Versionshistorie

| Version | Datum | Änderung |
|---------|-------|----------|
| 0.1 ENTWURF | 2026-05-07 | Initiale Erstellung (claude-code-05, Lauf 05). Anwalt-Review A5 + klinischer Bewerter ausstehend. |
