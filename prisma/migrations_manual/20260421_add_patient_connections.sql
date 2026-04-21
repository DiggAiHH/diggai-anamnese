-- Migration: add_patient_connections
-- Date: 2026-04-21
-- Description: Adds the PatientConnection table for consent-based links
--              between PatientAccount holders (caregiver / spouse / legal
--              guardian flows).
--
-- Run with: npx prisma db push  (no data loss — additive only)

CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED');
CREATE TYPE "ConnectionScope" AS ENUM ('DIARY_READ', 'APPOINTMENTS_READ', 'EPA_READ', 'FULL_PORTAL_READ');

CREATE TABLE "PatientConnection" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "scope" "ConnectionScope" NOT NULL DEFAULT 'DIARY_READ',
    "relationship" TEXT,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PatientConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientConnection_requesterId_targetId_key"
    ON "PatientConnection"("requesterId", "targetId");

CREATE INDEX "PatientConnection_requesterId_status_idx"
    ON "PatientConnection"("requesterId", "status");

CREATE INDEX "PatientConnection_targetId_status_idx"
    ON "PatientConnection"("targetId", "status");

ALTER TABLE "PatientConnection"
    ADD CONSTRAINT "PatientConnection_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "PatientAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientConnection"
    ADD CONSTRAINT "PatientConnection_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "PatientAccount"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
