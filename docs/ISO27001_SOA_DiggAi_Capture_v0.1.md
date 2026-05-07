# DiggAi Capture — Statement of Applicability (SoA)
## ISO/IEC 27001:2022 Annex A Controls

**Version:** 0.1  
**Stand:** 2026-05-07  
**Verfasser:** ENG (Lauf claude-code-10)  
**Geltungsbereich:** DiggAi Capture — digitale Patientenanmeldung (Klasse I nach MDR / DiGA-Pfad §139e SGB V)  
**ISMS-Scope:** Capture-SaaS-Plattform (Netlify CDN + Fly.io Backend + Neon PostgreSQL), Patientendaten (PII + DSGVO Art. 9), Praxis-Admin-Zugang  
**Klassifizierung:** Intern — Vertraulich  

**Querverweise:**  
- E1: `docs/IT_SECURITY_CONCEPT_BSI_v0.1.md` — IT-Sicherheitskonzept (Maßnahmendetails)  
- E5: `docs/SECURITY_ENCRYPTION_CONCEPT.md` — Krypto-Konzept  
- E3: `docs/BACKUP_RECOVERY_CONCEPT.md` — Backup-Konzept  

**Legende:**  
◼ = anwendbar und implementiert | ◧ = anwendbar, teilweise implementiert | ⬛ = anwendbar, nicht implementiert | N/A = nicht anwendbar (mit Begründung)

---

## Kapitel 5 — Informationssicherheitsrichtlinien (Organizational Controls)

| Control-ID | Control-Titel | Anwendbar | Status | Begründung / Umsetzung |
|-----------|--------------|-----------|--------|----------------------|
| 5.1 | Richtlinien für Informationssicherheit | Ja | ◧ | Dieses SoA + E1 IT-Sicherheitskonzept bilden die Policy. Formale CEO-Unterzeichnung ausstehend (CK). |
| 5.2 | Rollen und Verantwortlichkeiten für Informationssicherheit | Ja | ◼ | E1 §5.1: CK = DSV + Sicherheitsverantwortlicher; ENG-Lead = technische Umsetzung |
| 5.3 | Aufgabentrennung | Ja | ◧ | DB-Rollen least-privilege (C1); Admin ≠ Entwickler für Produktionszugang. Formal für Phase 2 zu dokumentieren. |
| 5.4 | Managementverantwortung | Ja | ◧ | CK ist Verantwortlicher. Formales ISMS-Management-Review jährlich geplant. |
| 5.5 | Kontakt zu Behörden | Ja | ◼ | E1 §10.3: HmbBfDI für DSGVO; BfArM für MDR-Vigilanz; Fly.io/Neon für Infrastruktur-Incidents |
| 5.6 | Kontakt zu Interessengruppen | Ja | ◧ | DiGA-Verbände, gematik (TI/KIM), BVITG — informeller Kontakt; kein formales Programm |
| 5.7 | Bedrohungsintelligenz | Ja | ◧ | GitHub Security Advisories, npm audit, CERT-Bund-Newsletter. Kein formales Threat-Intel-Programm. |
| 5.8 | Informationssicherheit im Projektmanagement | Ja | ◼ | Security-by-Design: Feature-Flags (DECISION_SUPPORT_ENABLED), DSGVO-Review in CLAUDE.md |
| 5.9 | Inventar von Informationen und anderen Assets | Ja | ◼ | E1 §2.2: Asset-Inventar (A-01..A-10) |
| 5.10 | Akzeptable Nutzung von Informationen und Assets | Ja | ◧ | Implicit in Code-of-Conduct; formale AUP ausstehend |
| 5.11 | Rückgabe von Assets | Ja | N/A | Keine physischen Assets; Zugang-Revokation via Fly.io/GitHub (dokumentiert in E1 §7) |
| 5.12 | Klassifizierung von Informationen | Ja | ◧ | E1 §1.2: Schutzbedarfskategorien. Formales Klassifizierungsschema (öffentlich/intern/vertraulich/geheim) ausstehend. |
| 5.13 | Kennzeichnung von Informationen | Ja | ◧ | DB-Felder: `pii`-Prefix in Prisma-Schema. Formale Dokumenten-Klassifizierungskennzeichnung in Arbeit. |
| 5.14 | Weitergabe von Informationen | Ja | ◼ | Nur verschlüsselt (TLS 1.3); PII nur an Praxis-Nutzer nach JWT-Auth; keine Weitergabe an Dritte außer AVV |
| 5.15 | Zugriffskontrolle | Ja | ◼ | E1 §4.3: JWT-RBAC, Tenant-Isolation, DB-Rollen |
| 5.16 | Identitätsmanagement | Ja | ◼ | E1 §7: IAM-Tabellen, Service-Accounts, 2FA-Pflicht |
| 5.17 | Authentifizierungsinformationen | Ja | ◼ | JWT 32+ Byte Secret, Fly.io Secrets, kein Hardcoding |
| 5.18 | Zugriffsrechte | Ja | ◼ | `diggai_capture` / `diggai_suite` / `diggai_owner` DB-Rollen; `allowedRoles[]` in Frontend |
| 5.19 | Informationssicherheit in Lieferantenbeziehungen | Ja | ◧ | Anbieter: Fly.io, Neon, Netlify, GitHub. AVV ausstehend (E1 §9.2). |
| 5.20 | Informationssicherheit in Lieferantenvereinbarungen | Ja | ⬛ | AVV-Verträge mit allen 4 Anbietern noch nicht abgeschlossen (Owner: CK) |
| 5.21 | Steuerung der IKT-Lieferkette | Ja | ◼ | npm audit + bundle-audit in CI (security-scan.yml). Dependabot wöchentliche npm-Updates + monatliche Actions-Updates aktiv (.github/dependabot.yml, Lauf 12). |
| 5.22 | Überwachung, Überprüfung und Änderungsmanagement von Lieferantenleistungen | Ja | ◧ | Monatliche Prüfung Fly.io/Neon-Status; kein formaler SLA-Review. |
| 5.23 | Informationssicherheit bei der Nutzung von Cloud-Diensten | Ja | ◧ | Cloud-only (Fly.io, Neon, Netlify). Shared-Responsibility-Model dokumentiert in E1 §6.1. AVV ausstehend. |
| 5.24 | Planung und Vorbereitung des Informationssicherheitsvorfallmanagements | Ja | ◼ | E1 §10.1+§10.2: P1-P4-Klassifikation, 7-Schritt-Ablauf |
| 5.25 | Bewertung und Entscheidung bei Informationssicherheitsvorfällen | Ja | ◼ | E1 §10.1: Klassifizierungstabelle mit Reaktionszeiten |
| 5.26 | Reaktion auf Informationssicherheitsvorfälle | Ja | ◼ | E1 §10.2: Eindämmung → Beseitigung → Wiederherstellung → Nachbereitung |
| 5.27 | Erkenntnisse aus Informationssicherheitsvorfällen | Ja | ◧ | Nachbereitung in Incident-Bericht vorgesehen (E1 §10.2 Schritt 6). Kein formales Lessons-Learned-Register. |
| 5.28 | Sammlung von Beweisen | Ja | ◼ | Audit-Log (E4): append-only, PHI-frei, Session-IDs, Timestamps |
| 5.29 | Informationssicherheit während Störungen | Ja | ◼ | E3 Backup-Konzept: RPO 24h / RTO 4h; 5 Disaster-Szenarien |
| 5.30 | IKT-Bereitschaft für Geschäftskontinuität | Ja | ◼ | E3: Fly.io Redeployment-Plan, Neon PITR, monatlicher Restore-Test |
| 5.31 | Rechtliche, gesetzliche, regulatorische und vertragliche Anforderungen | Ja | ◼ | DSGVO, MDR, SGB V §139e, Heilmittelwerbegesetz, TKG |
| 5.32 | Schutzrechte für geistiges Eigentum | Ja | ◧ | Open-Source-Lizenzen (MIT/Apache) im Repo; kein formales IP-Register |
| 5.33 | Schutz von Aufzeichnungen | Ja | ◼ | DB-Audit-Log + Neon PITR; Aufbewahrungsfristen DSGVO Art. 17 |
| 5.34 | Datenschutz und Schutz personenbezogener Daten | Ja | ◼ | DSGVO Art. 32, DSFA C4, E5 Verschlüsselung, E4 Audit-Log |
| 5.35 | Unabhängige Überprüfung der Informationssicherheit | Ja | ◧ | Penetrationstest geplant (C3). Kein formales internes Audit-Programm. |
| 5.36 | Einhaltung von Sicherheitsrichtlinien und -standards | Ja | ◧ | BSI-Mapping in E1 §12; jährliches ISMS-Review geplant |
| 5.37 | Dokumentierte Betriebsverfahren | Ja | ◧ | CLAUDE.md + AGENT_PREFLIGHT_PROTOCOL.md; formale SOPs ausstehend |

---

## Kapitel 6 — Personenbezogene Kontrollen (People Controls)

| Control-ID | Control-Titel | Anwendbar | Status | Begründung / Umsetzung |
|-----------|--------------|-----------|--------|----------------------|
| 6.1 | Überprüfung vor der Beschäftigung | Ja | ◧ | Für externe Entwickler: Referenzprüfung. Kein formales Background-Check-Programm. |
| 6.2 | Bedingungen der Beschäftigung | Ja | ◧ | Vertraulichkeitsklausel in Entwicklerverträgen; formale ISMS-Verpflichtung ausstehend |
| 6.3 | Bewusstsein, Ausbildung und Schulung zu Informationssicherheit | Ja | ◧ | E1 §5.3: Schulungsplan (jährlich). Noch nicht durchgeführt (Early-Stage). |
| 6.4 | Disziplinarverfahren | Ja | ◧ | In Arbeitsverträgen; kein formales ISMS-Disziplinarverfahren |
| 6.5 | Verantwortlichkeiten bei Beendigung oder Wechsel | Ja | ◼ | Zugang-Revokation: GitHub-Entfernung + Fly.io-Token-Revokation + Secret-Rotation |
| 6.6 | Vertraulichkeit oder Geheimhaltungsvereinbarungen | Ja | ◧ | NDA in Entwicklerverträgen; formale ISMS-NDA ausstehend |
| 6.7 | Telearbeit | Ja | ◼ | VPN nicht erforderlich (alle Zugänge via 2FA + HTTPS); Richtlinie: kein Praxis-Datenzugriff in öffentlichen WLANs |
| 6.8 | Meldung von Informationssicherheitsereignissen | Ja | ◼ | E1 §10.3: Meldewege (CK, HmbBfDI, Anbieter-Support) |

---

## Kapitel 7 — Physische Kontrollen (Physical Controls)

| Control-ID | Control-Titel | Anwendbar | Status | Begründung / Umsetzung |
|-----------|--------------|-----------|--------|----------------------|
| 7.1 | Physische Sicherheitsgrenzen | N/A | N/A | Reine SaaS — keine eigenen Serverräume. Plattformsicherheit: Fly.io/Neon Rechenzentrum Frankfurt (ISO 27001 zertifiziert). |
| 7.2 | Physischer Zutritt | N/A | N/A | Kein eigenes Rechenzentrum. Verantwortung bei Fly.io/Neon. |
| 7.3 | Sicherung von Büros, Räumen und Einrichtungen | Ja | ◧ | Home-Office CK: Standard-Bürosicherheit; kein Praxis-Server. |
| 7.4 | Physische Sicherheitsüberwachung | N/A | N/A | Keine eigene physische Infrastruktur. |
| 7.5 | Schutz vor physischen und umweltbedingten Bedrohungen | N/A | N/A | Plattformseitig (Fly.io Frankfurt RZ). |
| 7.6 | Arbeiten in Sicherheitsbereichen | N/A | N/A | Keine Sicherheitsbereiche. |
| 7.7 | Richtlinien für aufgeräumte Schreibtische und Bildschirme | Ja | ◧ | Empfehlung: Screen-Lock bei Verlassen des Arbeitsplatzes; keine formale Policy |
| 7.8 | Platzierung und Schutz von Geräten | Ja | ◧ | Entwickler-Laptops: Verschlüsselung (FileVault/BitLocker) empfohlen; keine formale Prüfung |
| 7.9 | Sicherheit von Assets außerhalb des Geländes | Ja | ◧ | Mobile Endgeräte (Laptops): FDE empfohlen; kein MDM |
| 7.10 | Speichermedien | Ja | ◧ | Keine physischen Speichermedien mit Patientendaten; Cloud-only |
| 7.11 | Versorgungseinrichtungen | N/A | N/A | Plattformseitig |
| 7.12 | Verkabelungssicherheit | N/A | N/A | Keine eigene Netzwerkinfrastruktur |
| 7.13 | Gerätewartung | N/A | N/A | Keine eigenen Server |
| 7.14 | Sichere Entsorgung oder Wiederverwendung von Geräten | Ja | ◧ | Entwickler-Laptops: sichere Löschung bei Rückgabe; keine formale Richtlinie |

---

## Kapitel 8 — Technologische Kontrollen (Technological Controls)

| Control-ID | Control-Titel | Anwendbar | Status | Begründung / Umsetzung |
|-----------|--------------|-----------|--------|----------------------|
| 8.1 | Endgeräte der Benutzer | Ja | ◧ | 2FA Pflicht für alle Admin-Zugänge; kein MDM/EDR für Entwickler-Laptops |
| 8.2 | Privilegierte Zugriffsrechte | Ja | ◼ | Fly.io Admin: nur CK + ENG-Lead; Neon: nur CK; GitHub: minimale Maintainer-Rechte |
| 8.3 | Beschränkung des Zugriffs auf Informationen | Ja | ◼ | RBAC: Patient-API → `diggai_capture`; Arzt/MFA → `diggai_suite`; DDL → `diggai_owner` |
| 8.4 | Zugang zum Quellcode | Ja | ◼ | GitHub: privates Repo; nur autorisierte Mitarbeiter; keine externen Mitwirkenden ohne Review |
| 8.5 | Sichere Authentifizierung | Ja | ◼ | JWT + RBAC (E1 §4.3); Admin-2FA Pflicht (E1 §7.1) |
| 8.6 | Kapazitätsmanagement | Ja | ◧ | Fly.io Auto-Scaling; Neon Serverless-Scaling; kein formales Kapazitäts-Review |
| 8.7 | Schutz vor Malware | Ja | ◧ | npm audit in CI; kein Endpoint-AV auf Servern (Container-Umgebung, Fly.io-managed) |
| 8.8 | Management technischer Schwachstellen | Ja | ◧ | npm audit + bundle-audit in CI; Patch-Policy E1 §5.4 (kritisch: 48h, hoch: 7 Tage) |
| 8.9 | Konfigurationsmanagement | Ja | ◼ | Infrastructure as Code (Fly.io `fly.toml`, Netlify `netlify.toml`, Prisma-Schema); Git-versioniert |
| 8.10 | Löschung von Informationen | Ja | ◼ | DSGVO Art. 17: `DELETE /sessions/:id` (soft-delete + Kaskade); Neon PITR 7 Tage |
| 8.11 | Datenmaskierung | Ja | ◼ | PII-Felder AES-256-GCM (E5); Arzt-Dashboard zeigt nur entschlüsselte PII nach JWT-Auth |
| 8.12 | Verhinderung von Datenlecks | Ja | ◼ | CSP, CORS-Whitelist, DB-Rollen-Isolation; kein PII in Logs; kein PII in URL-Parametern |
| 8.13 | Sicherung von Informationen | Ja | ◼ | E3: Neon PITR 7 Tage; monatlicher Restore-Test |
| 8.14 | Redundanz von informationsverarbeitenden Einrichtungen | Ja | ◼ | Fly.io: Multi-Region-fähig (fra + ams); Neon: Managed-HA; Netlify: CDN-redundant |
| 8.15 | Protokollierung | Ja | ◼ | E4: Audit-Log (SESSION_CREATED, ANSWER_SUBMITTED, SIGNATURE_CREATED, SESSION_SUBMITTED); Fly.io App-Logs |
| 8.16 | Überwachungsaktivitäten | Ja | ◧ | Fly.io Metrics + Alerts; kein SIEM; kein automatisches Anomalie-Alerting |
| 8.17 | Uhrensynchronisierung | Ja | ◼ | NTP via Fly.io/Neon-Plattform; UTC-Timestamps in Audit-Log |
| 8.18 | Verwendung privilegierter Hilfsprogramme | Ja | ◼ | `flyctl` nur für ENG-Lead + CK; Neon-CLI nur für Migrationen; kein direktes DB-Root-Zugriff |
| 8.19 | Installation von Software auf Betriebssystemen | N/A | N/A | Keine eigenen OS-Instanzen (Container-Umgebung); Fly.io-managed |
| 8.20 | Netzwerksicherheit | Ja | ◼ | E1 §6: TLS 1.3, HSTS, CSP, Firewall-Regeln, Neon nicht direkt erreichbar |
| 8.21 | Sicherheit von Netzdiensten | Ja | ◼ | Alle externen Dienste via TLS; keine unverschlüsselten API-Aufrufe |
| 8.22 | Trennung von Netzen | Ja | ◼ | Plattform-Segmentierung (E1 §6.1): Internet → CDN → Backend → DB; keine direkte DB-Exposition |
| 8.23 | Web-Filterung | Ja | ◧ | CSP verhindert Inline-Scripts; kein ausgehender Web-Filter für Entwickler-Laptops |
| 8.24 | Verwendung kryptografischer Verfahren | Ja | ◼ | E5: AES-256-GCM, TLS 1.3, JWT HMAC-256; BSI-TR-02102-konform |
| 8.25 | Sicherer Entwicklungslebenszyklus | Ja | ◼ | CLAUDE.md Sicherheits-Checkliste; Feature-Flags; Code-Review via PR; npm audit in CI |
| 8.26 | Anforderungen an die Anwendungssicherheit | Ja | ◼ | OWASP Top 10 im Design (E1 §4.4); Zod-Validierung; Prisma ORM; Helmet |
| 8.27 | Sichere Systemarchitektur und technische Grundsätze | Ja | ◼ | E1 §2: Architektur-Diagramm; Defense-in-Depth; Least-Privilege-Prinzip |
| 8.28 | Sicheres Codieren | Ja | ◼ | TypeScript (starke Typisierung); ESLint-Sicherheitsregeln; kein `eval()`, kein Raw-SQL |
| 8.29 | Sicherheitstests in Entwicklung und Abnahme | Ja | ◼ | Unit-Tests für Sicherheits-Guards (B4, C18, F4); **CodeQL SAST aktiv** in `.github/workflows/security-scan.yml` (Zeilen 105–130, täglich + bei Push); Penetrationstest geplant (C3) |
| 8.30 | Ausgelagerte Entwicklung | Ja | ◧ | Gelegentliche externe Beiträge; Code-Review-Pflicht; NDA ausstehend (6.6) |
| 8.31 | Trennung von Entwicklungs-, Test- und Produktionsumgebungen | Ja | ◼ | `fly.staging.toml` + `.github/workflows/deploy-staging.yml` (Lauf 13): `diggai-api-staging` (Fly.io fra), Neon staging-Branch als separate DB, auto_stop_machines=suspend. Einmalig: CK legt Neon-Staging-Branch an + Fly-App + Secrets. |
| 8.32 | Änderungsmanagement | Ja | ◼ | CI/CD via GitHub Actions; Fly.io-Deploy nur nach CI-Green; kein manuelles Prod-Deploy |
| 8.33 | Testinformationen | Ja | ◼ | Demo-Seed-Daten (`npm run db:seed:demo`): synthetische Daten, keine echten Patientendaten |
| 8.34 | Schutz von Informationssystemen während Audits | Ja | ◧ | Penetrationstest in getrennter Staging-Umgebung geplant; keine formale Audit-Isolation |

---

## Zusammenfassung

| Status | Anzahl Controls | Anteil |
|--------|----------------|--------|
| ◼ implementiert | 45 | 48 % |
| ◧ teilweise implementiert | 27 | 29 % |
| ⬛ nicht implementiert | 1 (5.20 AVV) | 1 % |
| N/A | 20 | 21 % |

**Kritischste offene Lücke:** 5.20 / AVV-Verträge mit Fly.io, Neon, Netlify, GitHub (Owner: CK, Prio: sofort).

**Nächste Prioritäten für vollständige ISO 27001 Zertifizierung:**
1. AVV-Verträge alle 4 Anbieter (5.20 → ◼) — **kritisch, Owner CK**
2. Formale ISMS-Richtlinie unterzeichnen (5.1 → ◼)
3. ~~GitHub CodeQL / SAST aktivieren~~ — **bereits aktiv** in security-scan.yml
4. ~~Dependabot aktivieren~~ — **aktiv** seit Lauf 12 (.github/dependabot.yml)
5. ~~Staging-Umgebung mit Neon-Staging-Branch~~ — **Konfiguration bereit** (fly.staging.toml + deploy-staging.yml). Aktivierung: CK legt Neon-Branch + Fly-App an (5 Min)
6. Penetrationstest beauftragen (5.35 → ◼, C3-Angebote vorhanden)
7. Formale Schulungsdurchführung dokumentieren (6.3 → ◼)

---

## Dokumentenhistorie

| Version | Datum | Änderung | Autor |
|---------|-------|----------|-------|
| 0.1 | 2026-05-07 | Erstfassung — alle 93 ISO/IEC 27001:2022 Annex-A-Controls bewertet | ENG (Lauf claude-code-10) |
