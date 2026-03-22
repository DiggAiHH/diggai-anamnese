---
name: prisma-database
description: "Database operations with Prisma ORM for DiggAI. Use when creating migrations, modifying schema.prisma, seeding data, debugging query performance, adding models/relations, or troubleshooting database issues. Covers PostgreSQL 16, Prisma 6, AES-256-GCM encrypted PII fields, and DSGVO-compliant data modeling."
metadata:
  author: diggai
  version: "1.0"
  domain: backend
---

# Prisma Database Skill

## Kontext

DiggAI Anamnese nutzt **Prisma 6.19** mit **PostgreSQL 16**.
Schema: `prisma/schema.prisma` (80+ Modelle).
Verschlüsselung: Alle PII-Felder werden über `server/services/encryption.ts` (AES-256-GCM) ver-/entschlüsselt.

## Schritt-für-Schritt: Schema-Änderung

1. **Schema lesen**: `prisma/schema.prisma` vollständig verstehen
2. **Modell hinzufügen/ändern**: Typen, Relationen, Defaults, Indizes
3. **Migration erstellen**: `npx prisma migrate dev --name <beschreibender-name>`
4. **Client generieren**: `npx prisma generate`
5. **Seed prüfen**: Falls neue Modelle Seed-Daten brauchen → `prisma/seed.ts` erweitern
6. **Validieren**: `npx prisma validate` + `npm run type-check`

## Harte Regeln

- **NIEMALS** bestehende Migrationsdateien modifizieren — nur neue erstellen
- **NIEMALS** `$queryRaw` verwenden — außer in Health-Checks
- **IMMER** `npx prisma generate` nach Schema-Änderungen ausführen
- **IMMER** PII-Felder (Name, Email, Geburtsdatum, Diagnose) als `String` anlegen und über Encryption-Service verschlüsseln
- **NIEMALS** E-Mail-Adressen im Klartext speichern — SHA-256 Hash verwenden
- **IMMER** Soft-Delete-Pattern bevorzugen (`deletedAt DateTime?`)
- **IMMER** Audit-Felder einplanen (`createdAt`, `updatedAt`, `createdBy`)

## Naming Conventions

- Modelle: PascalCase (`PatientSession`, `AuditLog`)
- Felder: camelCase (`firstName`, `createdAt`)
- Relationen: Singular für 1:1, Plural für 1:N (`patient`, `sessions`)
- Enums: UPPER_SNAKE_CASE Werte (`ACTIVE`, `COMPLETED`)
- Indizes: semantisch benennen (`@@index([patientId, createdAt])`)

## Häufige Patterns

```prisma
// PII-Feld (wird verschlüsselt gespeichert)
model Patient {
  id            String   @id @default(cuid())
  encFirstName  String   // AES-256-GCM encrypted
  encLastName   String   // AES-256-GCM encrypted
  emailHash     String   @unique // SHA-256
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?
}

// Audit Trail
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  resource  String
  details   Json?
  ipAddress String?
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}
```

## Befehle

```bash
npx prisma migrate dev --name <name>   # Migration erstellen
npx prisma generate                     # Client regenerieren
npx prisma db seed                      # Seed-Daten laden
npx prisma studio                       # Visuelle DB-GUI
npx prisma validate                     # Schema validieren
npx prisma migrate status               # Migration-Status prüfen
```

## Troubleshooting

- **Migration-Drift**: `npx prisma migrate resolve --rolled-back <migration-name>`
- **Schema out of sync**: `npx prisma db pull` zum Vergleich, dann `npx prisma migrate dev`
- **Performance**: `@@index` auf häufig gefilterte/sortierte Felder
- **Enum-Änderung**: Neue Migration mit `ALTER TYPE ... ADD VALUE`
