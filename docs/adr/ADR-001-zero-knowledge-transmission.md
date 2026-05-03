# ADR-001: DiggAI als Zero-Knowledge Transmission Service

## Status
Proposed — 2026-05-03

## Context

Die heutige Architektur speichert verschlüsselte Patientendaten zentral auf dem Server,
wobei der Server die Schlüssel besitzt (server-side AES-256-GCM in `server/services/encryption.ts`).
Christian Klaproth (klinischer Lead) hat die Anforderung formuliert, DiggAI zu einem reinen
Transit-Dienst umzubauen, in dem der Server die Daten **nicht** lesen kann — vergleichbar zu
einem Briefumschlag-Dienst, der nur Adressen sieht, niemals Inhalte.

Treiber:
- DSGVO Art. 25 (Privacy by Design / by Default)
- BSI TR-03161 / C5 Roadmap
- USP gegenüber ePA — Patient hält Hoheit, nicht der Anbieter
- Reduktion des Auftragsverarbeitungs-Risikos auf "Inhalts-Blindheit"

## Decision

Migration zu einem Zero-Knowledge-Transmission-Modell mit folgenden Bausteinen:

- **Hybrid-Verschlüsselung clientseitig:** AES-256-GCM Session-Key, gewrappt per RSA-OAEP-4096 (oder ECC P-256, je nach Performance-Messung)
- **BSNR-basierte Adressierung:** Praxis identifiziert sich über 9-stellige Betriebsstättennummer; Server hält ein Doctor-Public-Key-Registry
- **Doctor-Keypair pro Praxis:** Public-Key liegt im Server-Registry, Private-Key auf dem Praxis-Endgerät / SMC-B / eHBA
- **Auto-Delete:** Server löscht Encrypted-Blob nach Empfangs-Acknowledgement durch Praxis, spätestens nach 30 Tagen
- **Patient-Master-Schlüssel:** Patient generiert ein Keypair beim Onboarding, Recovery via 12-Wort BIP-39-Mnemonic
- **Server-Inhalte:** ausschließlich Encrypted-Blobs + Routing-Metadaten (BSNR, Sender-Pubkey-Fingerprint, Timestamps) — niemals Klartext-PII

## Alternatives Considered

1. **Status quo (server-side encryption)** — verworfen.
   Server kann Klartext rekonstruieren; bei Kompromittierung des Servers oder unter Druck
   eines staatlichen Akteurs sind alle Patientendaten exponiert.

2. **Volle TI/ePA-Integration über gematik** — verworfen.
   Gematik-Workflow ist nach klinischer Einschätzung (Klaproth) zu langsam und zu starr,
   bindet Patienten an einen Container, den sie nicht kontrollieren.

3. **Signal-Protocol-Style Double-Ratchet** — verworfen.
   Über-engineered für den Use Case (kein Realtime-Chat, sondern asynchrone Single-Shot-Übertragung).
   Komplexität rechtfertigt nicht den Mehrwert gegenüber Hybrid-Encryption mit kurzlebigen Session-Keys.

4. **Ende-zu-Ende mit Server-Key-Escrow** — verworfen.
   Würde "Zero-Knowledge" untergraben, da Server im Notfall entschlüsseln könnte.

## Consequences

### Positive
- Echte E2E-Verschlüsselung — Server ist Auftragsverarbeiter mit "Inhalts-Blindheit"
- DSGVO-stark, BSI-TR-03161-orientiert
- USP gegenüber ePA: Patient hält Hoheit
- Reduziertes Compliance-Risiko bei Sicherheitsvorfällen

### Negative / Risks
- **Geräte-Verlust = Daten-Verlust** — Recovery-Mechanismus ist kritisch (Mnemonic, optional Cloud-Backup verschlüsselt mit Mnemonic-derivedKey)
- **Triage-Engine muss client-seitig portiert werden** (Server kann auf Klartext nicht mehr triagen)
- **PVS-Integration komplexer** — Decryption muss am Praxis-PC passieren, nicht im Backend
- **Migration aller bestehenden Patienten-Daten erforderlich** — Maintenance-Window, einmalige Re-Encryption
- **Performance-Kosten** clientseitig (RSA-OAEP-4096 wrap auf Mobile ~50-200ms)
- **Audit / Forensik** schwieriger — Server kann nicht in Daten reinschauen, auch nicht für legitime Zwecke

### Open Questions (zu klären in P0 — siehe `_planung/2026-05-03-arzt-feedback/04_NEUE_VISION_VS_CODE.md`)
- **F1:** Doctor-Onboarding-Flow — manuelle Verifikation, KV-API, oder eHBA?
- **F2:** BSNR-Verifizierungspfad — Schritt-für-Schritt-Definition
- **F3:** PDF-Print-Fallback — verschlüsselt mit QR-Code, oder unverschlüsselt für Praxis-Direktscan?
- **F4:** Doctor-Key-Typ — Software-Keypair, SMC-B, eHBA, oder Hybrid?
- **F5:** Recovery-Strategie für Patient — nur Mnemonic, oder optional Cloud-Backup?
- **F6:** PVS-Integrationsweg — GDT, HL7-FHIR, oder Tomedo proprietary REST?
- **F7:** Migrationsstrategie für Bestandsdaten
- **F8:** Triage-Position — clientseitig vor Versand, doctor-seitig nach Decryption, oder beide?

## Implementation Phases

| Phase | Scope | Prompts |
|-------|-------|---------|
| **P6** Crypto Foundation | WebCrypto Keypair-Gen, IndexedDB-Storage, BIP-39-Recovery, Hybrid-Encryption | PB-1, PB-2 |
| **P7** BSNR Routing | Doctor-Registry, Transmission-Endpoints, WebSocket-Push, 30d-Cleanup-Cron | PB-3 |
| **P8** Transit-Only Refactor | Triage client-port, Schema-Cleanup, Routes-Pruning, Audit-Reduction, DSE-Update | PB-4, PB-5 |
| **P9** PVS Bridge | Tomedo-Adapter (GDT / FHIR / proprietary), PDF-Print-Fallback, optional eHBA | PB-6, PB-7, PB-8 |

## References

- Christian's Workflow-Beschreibung 2026-05-03 — `_planung/2026-05-03-arzt-feedback/04_NEUE_VISION_VS_CODE.md`
- BSI TR-03161 (Hochverfügbarkeit Gesundheitsdienste)
- RFC 5083 (Cryptographic Message Syntax — CMS Encrypted Data)
- W3C WebCrypto API Specification
- BIP-39 (Mnemonic Code for Deterministic Keys)

## Sign-Off

**Vor Beginn der Implementierung (PB-1) muss diese ADR von folgenden Personen abgenickt sein:**

- [ ] Dr. med. Christian Klaproth (Clinical Lead) — Reviewer für klinische Auswirkungen
- [ ] Lou (Engineering Lead) — Reviewer für technische Umsetzbarkeit
- [ ] Optional: externer DSGVO-Datenschutzbeauftragter

Erst nach diesen Sign-Offs werden die F1–F8 in einem Folge-PR (P0) beantwortet und in
diese ADR als Sektion "Resolved Questions" eingearbeitet.
