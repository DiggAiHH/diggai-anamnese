# ✅ DSGVO/HIPAA Compliance Checklist

## DSGVO Art. 32 — Technische & Organisatorische Maßnahmen

| Nr. | Maßnahme | Status | Nachweis | Verantwortlich |
|-----|----------|--------|----------|----------------|
| 1 | **Pseudonymisierung** | ✅ | `hashEmail()` mit Salt | Implementiert |
| 2 | **Verschlüsselung** | ✅ | AES-256-GCM | `encryption.ts` |
| 3 | **Vertraulichkeit** | ✅ | RBAC, JWT | `auth.ts` |
| 4 | **Integrität** | ✅ | GCM Auth-Tag, Zod | `encryption.ts`, Routes |
| 5 | **Verfügbarkeit** | ✅ | Retry-Logik | `audit.ts` |
| 6 | **Verfahren zur Wiederherstellung** | ⚠️ | Backup-System nötig | Offen |
| 7 | **Testen, Bewerten, Evaluieren** | ⚠️ | Regelmäßige Audits | Quartalsweise |

## HIPAA §164.312 — Technical Safeguards

| Standard | Implementation | Status | Evidence |
|----------|---------------|--------|----------|
| **Access Control** |  |  |  |
| 164.312(a)(1) | Unique user identification | ✅ | JWT mit userId |
| 164.312(a)(2)(i) | Emergency access procedure | ⚠️ | Break-glass account nötig |
| 164.312(a)(2)(ii) | Automatic logoff | ✅ | JWT expiry (24h) |
| 164.312(a)(2)(iii) | Encryption & decryption | ✅ | AES-256-GCM |
| **Audit Controls** |  |  |  |
| 164.312(b) | Audit logs | ✅ | AuditLog-Modell |
| **Integrity** |  |  |  |
| 164.312(c)(1) | Mechanism to authenticate | ✅ | GCM auth tag |
| **Person Authentication** |  |  |  |
| 164.312(d) | Person/entity authentication | ✅ | JWT + Blacklist |
| **Transmission Security** |  |  |  |
| 164.312(e)(1) | Integrity controls | ✅ | HTTPS, HSTS |
| 164.312(e)(2)(ii) | Encryption | ✅ | TLS 1.2+ |

## BSI TR-02102-1 / TR-03161

| Anforderung | Status | Implementierung |
|-------------|--------|-----------------|
| TLS 1.2+ | ✅ | Production Setup |
| AES-256 | ✅ | GCM Mode |
| Schlüssellänge | ✅ | 256-bit |
| HSTS | ✅ | 1 Jahr, preload |
| Zufallszahlen | ✅ | crypto.randomBytes |

## Offene Punkte

- [ ] Backup & Disaster Recovery Dokumentation
- [ ] Break-glass Verfahren für Notfallzugriff
- [ ] Quartalsweise Sicherheits-Audits
- [ ] Mitarbeiter-Schulungen (DSGVO, HIPAA)
- [ ] Incident Response Plan Testing

## Agent Society Governance (Phase 0)

| Kontrollpunkt | Status | Nachweis |
|---|---|---|
| Governance-Verfassung (Hybrid-Modell) dokumentiert | ✅ | `docs/AGENT_SOCIETY_GOVERNANCE_BLUEPRINT.md` |
| Entscheidungsarten + Review-Pfade definiert | ✅ | Abschnitt "Entscheidungsarten und Governance-Pfade" |
| Hard-Stop/Eskalationsregeln fuer kritische Faelle | ✅ | Abschnitt "Eskalationsmodell" |
| PII-safe Governance-Evidence Prinzip festgelegt | ✅ | Blueprint + Security Rules (keine PHI in Governance-Artefakten) |
| ESG-KPI Rahmen (E/S/G) definiert | ✅ | Abschnitt "ESG-Kennzahlenkatalog" |
| Human-Override als Verfassungsprinzip verankert | ✅ | Abschnitt "Verfassungsprinzipien" |
| Workflow fuer Governance-Review operationalisiert | ✅ | `docs/AGENT_WORKFLOWS.md` Workflow G |
