# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

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
