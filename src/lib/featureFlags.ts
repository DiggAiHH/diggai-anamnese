/**
 * Feature Flags System — BSNR/Tenant-Based Module Activation
 *
 * Flags are sourced from the `Tenant.settings` JSON field in the database.
 * The public BSNR lookup endpoint (`/api/tenants/by-bsnr/:bsnr`) now also
 * returns `features` so the frontend knows which modules are active.
 *
 * Default flags (all tenants unless overridden):
 * - anamnese       ON  — Core anamnese module (Dr. Klaproth default)
 * - rezepte        ON  — Prescription requests
 * - krankschreibung ON — Sick-leave requests
 * - unfallmeldung  ON  — BG / accident reports
 * - videoKonsultation OFF — Telemedicine (requires coturn setup)
 * - gamification   OFF — DSGVO game features
 * - kioskMode      OFF — Kiosk/tablet mode
 * - nfc            OFF — NFC check-in
 * - patientPortal  OFF — PWA patient portal
 *
 * Usage (frontend):
 *   const flags = useTenantStore(s => s.features);
 *   if (flags.anamnese) { ... }
 *
 * Usage (backend — service layer):
 *   import { getTenantFeatures, isFeatureEnabled } from '../services/featureFlags';
 *   const enabled = await isFeatureEnabled(tenantId, 'videoKonsultation');
 */

export interface TenantFeatureFlags {
    /** Core anamnese intake module */
    anamnese: boolean;
    /** Prescription request module */
    rezepte: boolean;
    /** Sick-leave certificate module */
    krankschreibung: boolean;
    /** BG / workplace accident report module */
    unfallmeldung: boolean;
    /** Telemedicine / video consultation (requires coturn) */
    videoKonsultation: boolean;
    /** Gamified DSGVO training module */
    gamification: boolean;
    /** Kiosk / tablet self-check-in mode */
    kioskMode: boolean;
    /** NFC card reader check-in */
    nfc: boolean;
    /** Patient PWA portal */
    patientPortal: boolean;
    /** Multi-language support */
    multiLanguage: boolean;
    /**
     * Online waiting room / queue module.
     * Set to false to hide the Wartezimmer from staff dashboards
     * (e.g. Dr. Klaproth currently does not use this module).
     */
    showWaitingRoom: boolean;
}

export const DEFAULT_FEATURE_FLAGS: TenantFeatureFlags = {
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

/**
 * Merge tenant-specific overrides over the defaults.
 * Unknown keys from the DB are silently ignored (future-proofing).
 */
export function resolveTenantFeatureFlags(
    settingsJson: Record<string, unknown> | null | undefined,
): TenantFeatureFlags {
    const flags: TenantFeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

    const raw = settingsJson?.features;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return flags;
    }

    const overrides = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_FEATURE_FLAGS) as (keyof TenantFeatureFlags)[]) {
        if (typeof overrides[key] === 'boolean') {
            flags[key] = overrides[key] as boolean;
        }
    }

    return flags;
}
