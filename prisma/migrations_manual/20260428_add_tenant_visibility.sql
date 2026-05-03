-- Migration: Add tenant visibility for public / internal / demo separation
-- Created: 2026-04-28
-- Description: Enables gating of tenant discovery and API resolution by visibility level.

-- 1. Create enum type (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TenantVisibility') THEN
        CREATE TYPE "TenantVisibility" AS ENUM ('PUBLIC', 'INTERNAL', 'DEMO');
    END IF;
END $$;

-- 2. Add visibility column with default PUBLIC for backwards compatibility
ALTER TABLE "Tenant"
    ADD COLUMN IF NOT EXISTS "visibility" "TenantVisibility" NOT NULL DEFAULT 'PUBLIC';

-- 3. Index for fast filtering in public lookups and middleware
CREATE INDEX IF NOT EXISTS "Tenant_visibility_idx" ON "Tenant"("visibility");

-- 4. Index for combined public + active lookups (BSNR entry gate)
CREATE INDEX IF NOT EXISTS "Tenant_visibility_status_idx" ON "Tenant"("visibility", "status");
