/**
 * @module tenants
 * @description Public tenant lookup routes — no auth required.
 *
 * These endpoints are called BEFORE a tenant context is established
 * (e.g. the BsnrEntryGate on the frontend resolves the BSNR).
 * They must be mounted BEFORE app.use(resolveTenant) OR the tenant
 * middleware must explicitly bypass the path prefix `/api/tenants/by-bsnr/`.
 *
 * @security
 * - Returns ONLY non-sensitive, public-facing tenant config.
 * - Internal IDs (tenantId), billing info, and user data are NEVER exposed.
 * - BSNR format is validated server-side (9-digit regex) before DB lookup.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

const BSNR_REGEX = /^\d{9}$/;

/** Extract route param as a guaranteed string (Express 5 compatibility). */
function param(req: Request, key: string): string {
    const v = req.params[key];
    return Array.isArray(v) ? v[0] : v;
}

// ─── Feature Flag Defaults (mirrored from frontend lib/featureFlags.ts) ───
// Kept as a plain object so the server route has no dependency on the
// frontend source tree.
const DEFAULT_FEATURE_FLAGS = {
    anamnese: true,
    rezepte: true,
    krankschreibung: true,
    unfallmeldung: true,
    videoKonsultation: false,
    gamification: false,
    kioskMode: false,
    nfc: false,
    patientPortal: false,
    multiLanguage: true,
    showWaitingRoom: true,
};

type FeatureFlagKey = keyof typeof DEFAULT_FEATURE_FLAGS;

function resolveFeatureFlags(
    settings: Record<string, unknown> | null | undefined,
    bsnr?: string | null,
): typeof DEFAULT_FEATURE_FLAGS {
    const flags = { ...DEFAULT_FEATURE_FLAGS };
    const raw = settings?.features;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        if (bsnr === '999999999') {
            flags.showWaitingRoom = false;
        }
        return flags;
    }
    const overrides = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]) {
        if (typeof overrides[key] === 'boolean') {
            flags[key] = overrides[key] as boolean;
        }
    }

    if (bsnr === '999999999' && typeof overrides.showWaitingRoom !== 'boolean') {
        flags.showWaitingRoom = false;
    }

    return flags;
}

/**
 * GET /api/tenants/by-bsnr/:bsnr
 *
 * Public endpoint — resolves a tenant by its Betriebsstättennummer.
 * Used by the frontend BsnrEntryGate to:
 *   1. Validate the BSNR exists in the DB.
 *   2. Load public branding config (name, primaryColor, logo).
 *
 * Successful Response (200):
 * ```json
 * {
 *   "bsnr": "999999999",
 *   "name": "Praxis Dr. Klaproth",
 *   "plan": "STARTER",
 *   "primaryColor": "#3b82f6",
 *   "logoUrl": null,
 *   "welcomeMessage": null
 * }
 * ```
 *
 * Error Response (404) when no active tenant with that BSNR exists:
 * ```json
 * { "error": "Praxis nicht gefunden", "code": "TENANT_NOT_FOUND" }
 * ```
 */
router.get('/by-bsnr/:bsnr', async (req: Request, res: Response): Promise<void> => {
    const bsnr = param(req, 'bsnr');

    // Server-side BSNR format validation (9 digits)
    if (!bsnr || !BSNR_REGEX.test(bsnr)) {
        res.status(400).json({
            error: 'Ungültige BSNR',
            code: 'INVALID_BSNR',
            message: 'Eine BSNR muss genau 9 Ziffern enthalten.',
        });
        return;
    }

    try {
        const tenant = await prisma.tenant.findFirst({
            where: {
                bsnr,
                status: 'ACTIVE',
            },
            select: {
                // Only public, non-sensitive fields
                bsnr: true,
                name: true,
                plan: true,
                primaryColor: true,
                logoUrl: true,
                welcomeMessage: true,
                settings: true,  // needed to derive feature flags
            },
        });

        if (!tenant) {
            res.status(404).json({
                error: 'Praxis nicht gefunden',
                code: 'TENANT_NOT_FOUND',
                message: 'Die angegebene Praxis existiert nicht oder ist nicht aktiv.',
            });
            return;
        }

        const features = resolveFeatureFlags(
            (tenant.settings as Record<string, unknown> | null) ?? null,
            tenant.bsnr,
        );

        res.json({
            bsnr: tenant.bsnr ?? bsnr,
            name: tenant.name,
            plan: tenant.plan,
            primaryColor: tenant.primaryColor ?? '#3b82f6',
            logoUrl: tenant.logoUrl ?? null,
            welcomeMessage: tenant.welcomeMessage ?? null,
            features,
        });
    } catch (err) {
        console.error('[Tenants Route] Error during BSNR lookup:', err);
        res.status(500).json({
            error: 'Interner Fehler',
            code: 'INTERNAL_ERROR',
        });
    }
});

export default router;
