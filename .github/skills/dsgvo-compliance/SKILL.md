---
name: dsgvo-compliance
description: "DSGVO/GDPR compliance, data protection, encryption patterns, audit logging, and privacy-by-design for DiggAI medical platform. Use when reviewing data flows, implementing consent management, checking PII handling, hardening auth/audit, or assessing DSGVO Art. 9 health data requirements."
metadata:
  author: diggai
  version: "1.0"
  domain: compliance
---

# DSGVO Compliance Skill

## Rechtsrahmen

- **DSGVO** (Datenschutz-Grundverordnung) — insb. Art. 9 (Gesundheitsdaten)
- **BSI TR-03161** (Sicherheitsanforderungen an digitale Gesundheitsanwendungen)
- **gematik TI/ePA** (Telematikinfrastruktur-Konformität)
- **eIDAS** (elektronische Identifizierung)
- **HIPAA-konformes Audit Logging** (für internationale Compliance)

## Verschlüsselungsarchitektur

```
┌─────────────────────────────────────────┐
│ Datenschicht                            │
├─────────────────────────────────────────┤
│ PII-Felder  → AES-256-GCM (at rest)    │
│ E-Mails     → SHA-256 Hash (lookup)    │
│ Transport   → TLS 1.3 (in transit)     │
│ JWT         → HS256 + HttpOnly Cookie  │
│ Signaturen  → verschlüsselt in DB      │
│ Video-Daten → nur mit Einwilligung     │
└─────────────────────────────────────────┘
```

## Kritische Dateien

| Datei | Funktion |
|-------|----------|
| `server/services/encryption.ts` | AES-256-GCM für alle PII-Felder |
| `server/middleware/auth.ts` | JWT + RBAC + HttpOnly Cookies |
| `server/middleware/audit.ts` | HIPAA-konformes Logging |
| `server/services/sanitize.ts` | Input-Bereinigung vor DB-Writes |

## Checkliste: Neues Feature mit Patientendaten

1. **Datenminimierung**: Nur absolut notwendige Daten erheben
2. **Verschlüsselung**: PII über `encryption.ts` verschlüsseln
3. **Auth-Middleware**: Route mit `auth.ts` schützen
4. **Audit-Logging**: Zugriffe loggen (nur IDs, keine Klartextdaten)
5. **Sanitization**: Eingaben über `sanitize.ts` bereinigen
6. **Consent**: Einwilligung vor Verarbeitung prüfen
7. **Löschkonzept**: Löschbarkeit aller personenbezogenen Daten sicherstellen
8. **Datentrennung**: Mandantenfähigkeit beachten

## VERBOTEN (NON-NEGOTIABLE)

- **NIEMALS** Patientennamen, E-Mails, Geburtsdaten, Diagnosen loggen → nur IDs
- **NIEMALS** JWT-Tokens in localStorage/sessionStorage → nur HttpOnly Cookies
- **NIEMALS** E-Mail-Adressen im Klartext speichern → SHA-256 Hash
- **NIEMALS** PHI an externe APIs ohne Rechtsgrundlage senden
- **NIEMALS** Gesundheitsdaten ohne AES-256-GCM persistieren
- **NIEMALS** Videoaufzeichnung ohne dokumentierte Einwilligung
- **NIEMALS** Auth-Middleware auf sensiblen Routen umgehen

## Audit-Log Pattern

```typescript
// KORREKT — nur IDs loggen
auditLogger.log({
  userId: user.id,
  action: 'VIEW_PATIENT',
  resourceId: patient.id,
  resourceType: 'Patient',
  ip: req.ip,
  timestamp: new Date()
});

// VERBOTEN — keine Klartextdaten!
// auditLogger.log({ patientName: patient.name, email: patient.email });
```

## Rollen-Modell

| Rolle | Zugriff |
|-------|---------|
| `ADMIN` | Systemkonfiguration, Benutzerverwaltung |
| `ARZT` | Patientendaten, Triage, Diagnosen |
| `MFA` | Empfang, Check-in, Queue-Management |
| `PATIENT` | Eigene Anamnese-Daten, Formulare |

## Art. 9 DSGVO — Besondere Kategorien

Gesundheitsdaten sind **besonders schutzwürdige Daten**:
- Verarbeitung nur mit **ausdrücklicher Einwilligung** oder gesetzlicher Grundlage
- **Verschlüsselung at rest** ist Pflicht
- **Zugriffsprotokollierung** ist Pflicht
- **Löschkonzept** muss dokumentiert sein
- **Datenschutz-Folgenabschätzung** kann erforderlich sein
