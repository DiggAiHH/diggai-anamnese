/**
 * TenantStore — Global store for the active practice (Praxis) context.
 *
 * Populated at the BSNR entry gate (/:bsnr) from the public backend endpoint
 * GET /api/tenants/by-bsnr/:bsnr.
 *
 * Only public, non-sensitive fields are stored here. Internal tenant IDs and
 * PII are never persisted in the frontend store.
 *
 * Usage:
 *   const { bsnr, name } = useTenantStore();
 *   const setPraxis = useTenantStore(state => state.setPraxis);
 */

import { create } from 'zustand';
import { type TenantFeatureFlags, DEFAULT_FEATURE_FLAGS, resolveTenantFeatureFlags } from '../lib/featureFlags';

export interface TenantConfig {
    /** 9-digit Betriebsstättennummer */
    bsnr: string;
    /** Practice display name */
    name: string;
    /** Subscription plan */
    plan: string;
    /** Primary brand colour (CSS hex) */
    primaryColor: string;
    /** Optional logo URL */
    logoUrl: string | null;
    /** Optional welcome message shown to patients */
    welcomeMessage: string | null;
    /** Resolved feature flags for this tenant */
    features: TenantFeatureFlags;
}

export { DEFAULT_FEATURE_FLAGS, resolveTenantFeatureFlags };
export type { TenantFeatureFlags };

interface TenantState {
    /** Currently active tenant config, null if not yet resolved */
    tenant: TenantConfig | null;
    /** Shortcut: resolved feature flags (never null) */
    features: TenantFeatureFlags;
    /** Whether the tenant lookup is in flight */
    loading: boolean;
    /** Error message from the last lookup attempt */
    error: string | null;

    /** Store the resolved tenant config */
    setPraxis: (config: TenantConfig) => void;
    /** Set loading state during API call */
    setLoading: (loading: boolean) => void;
    /** Store an error from the lookup */
    setError: (error: string | null) => void;
    /** Reset tenant context (e.g. on navigation to a different BSNR) */
    clearPraxis: () => void;
}

export const useTenantStore = create<TenantState>((set) => ({
    tenant: null,
    features: { ...DEFAULT_FEATURE_FLAGS },
    loading: false,
    error: null,

    setPraxis: (config: TenantConfig) =>
        set({ tenant: config, features: config.features, loading: false, error: null }),

    setLoading: (loading: boolean) => set({ loading }),

    setError: (error: string | null) =>
        set({ error, loading: false }),

    clearPraxis: () =>
        set({ tenant: null, features: { ...DEFAULT_FEATURE_FLAGS }, loading: false, error: null }),
}));
