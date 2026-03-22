import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});

export interface PlanConfig {
  price: number;
  name: string;
  quota: number;
  maxDoctors: number;
  features: string[];
  setupFee: number;  // NEU: Einmalige Setup-Gebühr
  aiQuota: number;   // NEU: Separate KI-Quota
}

// KORRIGIERTE PREISGESTALTUNG (Meta-Synthese Fix #1)
// Alte Preise: 49€/99€/199€ -> LTV/CAC = 0,67 (UNTER CRITICAL)
// Neue Preise: 79€/179€/349€ -> LTV/CAC = 2,8+ (VIABLE)
// + Setup-Fee: 299€ (deckt CAC)
export const PLANS: Record<string, PlanConfig> = {
  ESSENTIAL: {
    price: 7900,        // €79.00 in cents
    name: 'Essential',  // Umbenannt von "Starter"
    quota: 200,         // Erhöht von 100
    maxDoctors: 1,
    setupFee: 29900,    // €299.00 einmalig
    aiQuota: 0,         // KEINE KI-Auswertung (Compliance-Risiko)
    features: [
      '1 Arzt',
      '200 Anamnesen/Monat',
      '3 Sprachen (DE/EN/TR)',  // Erhöht von 2
      'PDF-Export',
      'PVS-Integration',        // NEU: Critical Feature
      'E-Mail Support'
    ]
  },
  PROFESSIONAL: {
    price: 17900,       // €179.00 in cents (+81%)
    name: 'Professional',
    quota: Infinity,
    maxDoctors: 5,      // Erhöht von 3
    setupFee: 29900,
    aiQuota: Infinity,  // Unlimitierte KI-Auswertungen
    features: [
      '5 Ärzte',
      'Unlimitierte Anamnesen',
      '8 Sprachen',             // Erhöht von 5
      'KI-Auswertung inklusive', // Flatrate statt 500 Limit
      'API-Zugang',             // NEU
      'Priority Support',
      'PVS-Integration'
    ]
  },
  ENTERPRISE: {
    price: 34900,       // €349.00 in cents (+75%)
    name: 'Enterprise',
    quota: Infinity,
    maxDoctors: Infinity,
    setupFee: 0,        // Keine Setup-Fee für Enterprise
    aiQuota: Infinity,
    features: [
      'Unlimitierte Ärzte',
      'Alle 10 Sprachen',
      'White-Label Option',     // NEU
      'Custom PVS-Integration', // NEU
      'SLA 99.9%',              // NEU
      'Dedizierter Account Manager',
      'Prioritäres Feature-Development'
    ]
  }
};

// LEGACY MAPPING für alte Tarife (Migration)
export const LEGACY_TIER_MAP: Record<string, string> = {
  'STARTER': 'ESSENTIAL',
  'PROFESSIONAL': 'PROFESSIONAL',
  'ENTERPRISE': 'ENTERPRISE'
};

export function getPlanByTier(tier: string): PlanConfig | undefined {
  // Support für alte Tarif-Namen
  const normalizedTier = LEGACY_TIER_MAP[tier.toUpperCase()] || tier.toUpperCase();
  return PLANS[normalizedTier];
}

export function getQuotaForTier(tier: string): number {
  const plan = getPlanByTier(tier);
  return plan?.quota || 0;
}

export function getAiQuotaForTier(tier: string): number {
  const plan = getPlanByTier(tier);
  return plan?.aiQuota || 0;
}

export function canUpgrade(fromTier: string, toTier: string): boolean {
  const tiers = ['ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE'];
  const fromIndex = tiers.indexOf(fromTier.toUpperCase());
  const toIndex = tiers.indexOf(toTier.toUpperCase());
  return toIndex > fromIndex;
}

// NEU: Berechnet effektiven MRR (Monthly Recurring Revenue)
export function calculateEffectiveMrr(basePrice: number, setupFee: number, contractMonths: number = 12): number {
  const setupFeeMonthly = setupFee / contractMonths;
  return basePrice + setupFeeMonthly;
}

// NEU: LTV/CAC Ratio Berechnung
export function calculateUnitEconomics(monthlyPrice: number, setupFee: number, cac: number, churnRate: number): {
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
} {
  const monthlyRevenue = monthlyPrice + (setupFee / 12);
  const ltv = monthlyRevenue / churnRate;
  const ltvCacRatio = ltv / cac;
  const paybackMonths = cac / monthlyRevenue;
  
  return { ltv, ltvCacRatio, paybackMonths };
}

// Beispiel-Berechnungen für neue Preise:
// Essential: LTV = (79€ + 25€) / 0,05 = 2.080€, CAC = 500€, Ratio = 4,16 ✅
// Professional: LTV = (179€ + 25€) / 0,04 = 5.100€, CAC = 800€, Ratio = 6,38 ✅
// Enterprise: LTV = (349€ + 0€) / 0,03 = 11.633€, CAC = 1.500€, Ratio = 7,76 ✅
