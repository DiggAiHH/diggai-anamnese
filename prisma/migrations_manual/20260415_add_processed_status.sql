-- Migration: add_processed_status_to_patient_session
-- Date: 2026-04-15
-- Description: Adds processedStatus, processedAt, processedBy fields to PatientSession
--              for Dashboard Sync (Bearbeitet-Status) and 30-day DSGVO retention cleanup.
--
-- Run with: npx prisma migrate dev --name add_processed_status
-- Or apply directly: npx prisma db push

ALTER TABLE "PatientSession" ADD COLUMN "processedStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PatientSession" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "PatientSession" ADD COLUMN "processedBy" TEXT;

-- Index for retention cleanup queries
CREATE INDEX "PatientSession_processedStatus_processedAt_idx" ON "PatientSession"("processedStatus", "processedAt");
