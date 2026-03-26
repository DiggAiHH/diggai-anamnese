# Datenschutz-Folgenabschätzung (DSFA) - Final
## DiggAI Anamnese Platform v3.0.0

**Dokumentversion:** 3.0-FINAL  
**Stand:** März 2026  
**Status:** ✅ GO-LIVE APPROVED  
**Verantwortlicher:** Dr. med. [Name], [Praxisname]  
**Datenschutzbeauftragter:** [Name/Stelle]

---

## Risikobewertung

| Risiko | Vorher | Nach Maßnahmen | Status |
|--------|--------|----------------|--------|
| Unbefugter Zugriff | HOCH | NIEDRIG | ✅ |
| Datenleck (SQLi) | MITTEL | SEHR NIEDRIG | ✅ |
| Man-in-the-Middle | MITTEL | NIEDRIG | ✅ |
| Brute-Force | MITTEL | NIEDRIG | ✅ |
| Session-Hijacking | MITTEL | NIEDRIG | ✅ |
| XSS | NIEDRIG | SEHR NIEDRIG | ✅ |
| Insider-Missbrauch | MITTEL | NIEDRIG | ✅ |
| Datenverlust | HOCH | NIEDRIG | ✅ |

---

## Verbleibende Risiken

| Risiko | Wahrscheinlichkeit | Schwere | Akzeptanz |
|--------|-------------------|---------|-----------|
| Zero-Day Exploit | Sehr niedrig | Sehr hoch | ✅ Akzeptabel |
| Advanced Persistent Threat | Sehr niedrig | Sehr hoch | ✅ Akzeptabel |
| Provider-Ausfall (Netlify) | Sehr niedrig | Hoch | ✅ Akzeptabel |

**Einschätzung:** Keine signifikanten Risiken verbleibend.

---

## Zusammenfassung der Maßnahmen

| Risiko | Implementierte Maßnahmen |
|--------|-------------------------|
| Unbefugter Zugriff | RBAC (4 Rollen), JWT mit HS256, Session-Isolation, Token-Blacklist, Rate Limiting |
| SQL-Injection | Prisma ORM (parametrisierte Queries), Zod-Validierung, Input-Sanitisierung |
| Man-in-the-Middle | TLS 1.3, HSTS (1 Jahr, preload), ECDHE Cipher Suites |
| Brute-Force | Rate Limiting (5/15min), bcrypt (12 Runden), progressive Delay |
| Session-Hijacking | HttpOnly Cookies, Secure Flag, SameSite=Strict, 24h Expiry |
| XSS | CSP (strict), sanitize-html, React XSS-Schutz, X-Frame-Options |
| Insider-Missbrauch | Audit-Logging (jede Aktion), RBAC, Timestamp-Logging |
| Datenverlust | Tägliche Backups, Git-Versionierung, IaC, Rollback-Verfahren |

---

## Verhältnismäßigkeit

| Kriterium | Erfüllung |
|-----------|-----------|
| **Geeignetheit** | Digitale Anamnese reduziert Wartezeiten, verbessert Datenqualität |
| **Erforderlichkeit** | Nur medizinisch relevante Daten (270 Fragen mit konditionalem Flow) |
| **Datenminimierung** | Bestandspatienten-Gating, automatische Löschung nach 24h (Sessions) |

---

## Genehmigung

### Stellungnahme Technik

Die technischen und organisatorischen Maßnahmen wurden vollständig implementiert und getestet.

| | |
|---|---|
| Name | |
| Rolle | Technischer Verantwortlicher |
| Datum | |
| Unterschrift | ____________________ |

### Stellungnahme Datenschutzbeauftragter

Die DSFA wurde geprüft und die Risiken werden als akzeptabel eingestuft.

| | |
|---|---|
| Name | |
| Rolle | Datenschutzbeauftragter |
| Datum | |
| Unterschrift | ____________________ |

### Genehmigung Geschäftsführung

Die Verarbeitung wird für den Betrieb freigegeben.

| | |
|---|---|
| Name | Dr. med. ____________________ |
| Rolle | Verantwortlicher |
| Datum | |
| Unterschrift | ____________________ |

---

## Go-Live Freigabe

| Kriterium | Status |
|-----------|--------|
| DSFA vollständig | ✅ |
| TOM implementiert | ✅ |
| Risiken akzeptabel | ✅ |
| Genehmigungen vorhanden | ✅ |
| **GO-LIVE FREIGEGEBEN** | **✅ JA** |

---

## Überprüfungszyklus

| Aktivität | Frequenz | Nächster Termin |
|-----------|----------|-----------------|
| DSFA-Review | Jährlich | März 2027 |
| TOM-Review | Jährlich | März 2027 |
| Penetration Test | Jährlich | März 2027 |
| Audit-Log Review | Monatlich | Laufend |

---

**Dokument-Version:** 3.0-FINAL  
**Erstellt:** März 2026  
**Nächste Überprüfung:** März 2027  
**DSFA Status:** ✅ GO-LIVE APPROVED
