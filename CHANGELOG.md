# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [3.2.0] - 2026-04-19

### Fixed (Critical)
- **Network Error Root Cause**: `seed-demo-complete.ts` fehlte der `default`-Tenant → alle API-Calls schlugen auf localhost fehl (Tenant-Middleware 404)
- **Cross-Origin Cookies**: `sameSite: 'strict'` auf Auth- und CSRF-Cookies → blockierte Netlify↔Railway in Production. Jetzt `sameSite: 'none'` + `secure: true` in Production, `'lax'` in Development
- **DSGVO-Signatur nicht persistiert**: Frontend `handleSignatureComplete()` speicherte nur in localStorage, nie an `POST /api/signatures`. Jetzt fire-and-forget Backend-Call mit localStorage-Fallback

### Fixed (i18n / DSGVO-Compliance)
- **Französisch (fr)**: 4 DSGVO-Consent-Beschreibungen waren englischer Fallback-Text → korrekte französische Übersetzungen
- **Polnisch (pl)**: 6 Keys (dsgvoConsent1-3Desc, dsgvoFullPolicy, dsgvoIntroBody, pdfFooter + PDF-Felder) waren englisch → polnisch übersetzt
- **Ukrainisch (uk)**: 10 Signature-Keys in lateinischer Umschrift statt kyrillisch → korrektes Ukrainisch (Підписати згоду etc.)
- **Türkisch (tr)**: 11 Signature-Keys fehlten türkische Sonderzeichen (ı, ğ, ü, ş, ç) → korrekte Diakritika

### Added
- **`api.submitDsgvoSignature()`**: Neuer API-Client-Method für DSGVO-Signatur-Persistierung an Backend
- **Default-Tenant im Seed**: `subdomain: 'default'` mit Admin/Arzt/MFA-Accounts für localhost-Entwicklung
- **DSGVO-Signatur-Seeds**: 6 verschlüsselte Signature-Records für Demo-Sessions
- **PatientConsent-Seeds**: Einwilligungen (DATA_PROCESSING, EMERGENCY_CONTACT, MEDICATION_REMINDER, PUSH_NOTIFICATIONS) für alle 5 PWA-Accounts
- **ConsentType-Seed-Abdeckung**: 20 PatientConsent-Einträge über alle PWA-Patienten

### Security
- Cookie `sameSite`-Policy dynamisch je nach `NODE_ENV` (production → 'none'+secure, dev → 'lax')
- DSGVO-Signaturen werden via AES-256-GCM verschlüsselt gespeichert (signatureService)
- Zero-Knowledge E2E-Verschlüsselung für PII-Atome (3000-3004, 9011) verifiziert und dokumentiert

### Verified
- End-to-End Encryption Flow: Patient→PBKDF2→AES-256-GCM→Backend (ciphertext only)→MFA Dashboard (browser-side decryption)
- Multi-Tenant-System: Row-level Isolation via tenantId, Subdomain/BSNR/Custom-Domain Resolution, 5-Min-Cache
- TypeScript type-check: Frontend + Server clean (0 errors)

## [3.1.0] - 2026-04-01

### Added
- **Refresh Token Rotation** mit Theft Detection
- **Session Management** - Aktive Sessions anzeigen/beenden
- **Device Fingerprinting** - Geräte-Erkennung und Trust-Scoring
- **Security Event Monitoring** - Erweiterte Audit-Logs
- **TOTPInput Component** - Wiederverwendbarer 6-Digit Input
- **SecuritySettingsPage** - UI für alle Sicherheitseinstellungen
- **React Query Hooks** - useSessions, useTerminateSession, useTerminateAllSessions
- **i18n Support** - 10 Sprachen für Security-Features

### Security
- Token Family Tracking für Rotation-Attack Detection
- SHA-256 Hashing für alle Tokens
- Redis-Backed Token Blacklist
- Automatic Session Cleanup

### Technical
- 99+ Unit Tests für Auth-Services
- 26 Integration Tests für API-Routes
- TypeScript strict mode compliance
- Prisma Schema Erweiterungen

## [3.0.0] - 2026-03-XX

### Added
- Erste stabile Version der DiggAI Anamnese Platform
- 270+ medizinische Fragen in 13 Fachgebieten
- Echtzeit-Triage-Engine mit 10 Regeln
- KI-gestützte Auswertung mit ICD-10-GM Codes
- PWA-Offline-Unterstützung via Dexie/IndexedDB
- Multi-Tenancy mit White-Labeling
- PVS-Integration (Tomedo, medistar, T2Med, etc.)
- 10 Sprachen (DE, EN, TR, AR/RTL, UK, ES, FA/RTL, IT, FR, PL)
