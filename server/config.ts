import * as dotenv from 'dotenv';
dotenv.config();

export type BackendDomain = 'practice' | 'company' | 'authority';
export type BackendProfile = BackendDomain | 'monolith';

const BACKEND_DOMAINS: BackendDomain[] = ['practice', 'company', 'authority'];

const requireEnv = (key: string, customMessage?: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(customMessage || `FATAL: Die Umgebungsvariable ${key} fehlt. Security by Design Richtlinie verletzt!`);
    }
    return value;
};

const assertMinLength = (value: string, minLength: number, errorMessage: string): string => {
    if (value.length < minLength) {
        throw new Error(errorMessage);
    }
    return value;
};

const assertExactLength = (value: string, exactLength: number, errorMessage: string): string => {
    if (value.length !== exactLength) {
        throw new Error(errorMessage);
    }
    return value;
};

const assertNotDefault = (value: string, forbiddenValues: string[], errorMessage: string): string => {
    const normalized = value.trim().toLowerCase();
    if (forbiddenValues.map(v => v.trim().toLowerCase()).includes(normalized)) {
        throw new Error(errorMessage);
    }
    return value;
};

const normalizeBackendProfile = (value: string | undefined): BackendProfile => {
    const normalized = (value || 'monolith').trim().toLowerCase();
    if (normalized === 'monolith' || normalized === 'practice' || normalized === 'company' || normalized === 'authority') {
        return normalized;
    }

    throw new Error(`Ungültiges BACKEND_PROFILE "${value}". Erlaubte Werte: monolith | practice | company | authority`);
};

const resolveEnabledDomains = (profile: BackendProfile, strictDomainRouting: boolean): BackendDomain[] => {
    if (profile === 'monolith') {
        return strictDomainRouting ? [...BACKEND_DOMAINS] : ['practice'];
    }
    return [profile];
};

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

const jwtSecret = assertMinLength(
    requireEnv('JWT_SECRET', 'Kritisches Security-Risiko: JWT_SECRET fehlt in der .env Konfiguration!'),
    32,
    'Kritisches Security-Risiko: JWT_SECRET muss mindestens 32 Zeichen lang sein.'
);

const encryptionKey = assertExactLength(
    requireEnv('ENCRYPTION_KEY', 'Kritisches Security-Risiko: ENCRYPTION_KEY für Patientendaten fehlt!'),
    32,
    'Kritisches Security-Risiko: ENCRYPTION_KEY muss exakt 32 Zeichen lang sein (AES-256).'
);

const arztDefaultPasswordRaw = requireEnv('ARZT_PASSWORD', 'Fehlendes Standard-Passwort für die Ersteinrichtung (ARZT_PASSWORD)');
const arztDefaultPassword = isProduction
    ? assertNotDefault(
        arztDefaultPasswordRaw,
        ['praxis2026', 'changeme', 'change_me', 'password', 'admin', '12345678'],
        'Kritisches Security-Risiko: ARZT_PASSWORD verwendet einen unsicheren Standardwert in Produktion.'
    )
    : arztDefaultPasswordRaw;

/**
 * Konvertiert JWT-Ablaufzeitangaben ('15m', '1h', '24h', '7d') in Millisekunden.
 * Wird verwendet um Cookie-maxAge synchron mit JWT-Expiry zu halten.
 */
function parseExpiresInToMs(value: string): number {
    const match = value.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 15 * 60 * 1000; // Fallback: 15 Minuten
    const amount = parseInt(match[1], 10);
    switch (match[2]) {
        case 's': return amount * 1000;
        case 'm': return amount * 60 * 1000;
        case 'h': return amount * 60 * 60 * 1000;
        case 'd': return amount * 24 * 60 * 60 * 1000;
        default:  return 15 * 60 * 1000;
    }
}

const backendProfile = normalizeBackendProfile(process.env.BACKEND_PROFILE);
const strictDomainDatabaseRouting = process.env.STRICT_DOMAIN_DB_ROUTING === 'true' || backendProfile !== 'monolith';
const enabledDatabaseDomains = resolveEnabledDomains(backendProfile, strictDomainDatabaseRouting);

const fallbackDatabaseUrl = process.env.DATABASE_URL;
const practiceDatabaseUrl = process.env.DATABASE_URL_PRACTICE || process.env.DATABASE_URL_BACKEND_1 || fallbackDatabaseUrl;

if (!practiceDatabaseUrl) {
    throw new Error('Fehlende Datenbank-Verbindung: Setze DATABASE_URL oder DATABASE_URL_PRACTICE (oder DATABASE_URL_BACKEND_1).');
}

const companyDatabaseUrl =
    process.env.DATABASE_URL_COMPANY ||
    process.env.DATABASE_URL_BACKEND_2 ||
    fallbackDatabaseUrl ||
    practiceDatabaseUrl;

const authorityDatabaseUrl =
    process.env.DATABASE_URL_AUTHORITY ||
    process.env.DATABASE_URL_BACKEND_3 ||
    fallbackDatabaseUrl ||
    practiceDatabaseUrl;

if (strictDomainDatabaseRouting && backendProfile === 'company' && !process.env.DATABASE_URL_COMPANY && !process.env.DATABASE_URL_BACKEND_2) {
    throw new Error('BACKEND_PROFILE=company erfordert DATABASE_URL_COMPANY (oder DATABASE_URL_BACKEND_2).');
}

if (strictDomainDatabaseRouting && backendProfile === 'authority' && !process.env.DATABASE_URL_AUTHORITY && !process.env.DATABASE_URL_BACKEND_3) {
    throw new Error('BACKEND_PROFILE=authority erfordert DATABASE_URL_AUTHORITY (oder DATABASE_URL_BACKEND_3).');
}

if (strictDomainDatabaseRouting && backendProfile === 'monolith') {
    const missingSplitDomains: string[] = [];
    if (!process.env.DATABASE_URL_PRACTICE && !process.env.DATABASE_URL_BACKEND_1) missingSplitDomains.push('DATABASE_URL_PRACTICE');
    if (!process.env.DATABASE_URL_COMPANY && !process.env.DATABASE_URL_BACKEND_2) missingSplitDomains.push('DATABASE_URL_COMPANY');
    if (!process.env.DATABASE_URL_AUTHORITY && !process.env.DATABASE_URL_BACKEND_3) missingSplitDomains.push('DATABASE_URL_AUTHORITY');

    if (missingSplitDomains.length > 0) {
        throw new Error(`STRICT_DOMAIN_DB_ROUTING=true erfordert explizite Domänen-URLs: ${missingSplitDomains.join(', ')}`);
    }
}

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    backendProfile,
    enabledDatabaseDomains,
    strictDomainDatabaseRouting,
    enforceRouteDomainIsolation: process.env.ROUTE_DOMAIN_ISOLATION === 'true',

    // Datenbank
    databaseUrl: practiceDatabaseUrl,
    databaseUrlsByDomain: {
        practice: practiceDatabaseUrl,
        company: companyDatabaseUrl,
        authority: authorityDatabaseUrl,
    } as Record<BackendDomain, string>,

    // JWT
    // SECURITY FIX M2: Default von 24h auf 15m reduziert (OWASP Empfehlung für Gesundheitsdaten).
    // Für Produktion JWT_EXPIRES_IN in Railway/Supabase Env-Vars setzen.
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    // Cookie-Ablaufzeit in ms — MUSS mit jwtExpiresIn synchron sein (SECURITY FIX M1)
    jwtCookieMaxAgeMs: parseExpiresInToMs(process.env.JWT_EXPIRES_IN || '15m'),

    // Account Lockout (SECURITY FIX H1)
    accountLockoutMaxAttempts: parseInt(process.env.LOCKOUT_MAX_ATTEMPTS || '5', 10),
    accountLockoutDurationMs: parseInt(process.env.LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10),

    // Verschlüsselung
    encryptionKey,
    encryptionIvLength: 16,

    // CORS
    frontendUrl: requireEnv('FRONTEND_URL', 'Fehlende Frontend-Verbindung in .env (FRONTEND_URL)'),
    apiPublicUrl: process.env.API_PUBLIC_URL || '',

    // Redis (Token Blacklist + Queue Persistence)
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // Rate Limiting
    rateLimitWindowMs: 15 * 60 * 1000, // 15 Minuten
    rateLimitMax: 200, // H-03 FIX: Von 1000 auf 200 reduziert (Produktions-Limit)

    // Arzt-Dashboard Init
    arztDefaultPassword,

    // Feature Flags (Modul 7/8)
    nfcEnabled: process.env.NFC_ENABLED === 'true',
    paymentEnabled: process.env.PAYMENT_ENABLED === 'true',
    telemedicineEnabled: process.env.TELEMED_ENABLED === 'true',
    tiEnabled: process.env.TI_ENABLED === 'true',
    epaEnabled: process.env.EPA_ENABLED === 'true',
    kimEnabled: process.env.KIM_ENABLED === 'true',

    // Monitoring
    sentryDsn: process.env.SENTRY_DSN,
    appVersion: process.env.APP_VERSION || '3.0.0',

    // SMTP / TutaMail (DiggAI Email Pipeline)
    smtp: {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
        from: process.env.SMTP_FROM || 'noreply@diggai.de',
    },
    /** Email domain for BSNR-based routing (e.g. <BSNR>@diggai.de) */
    emailDomain: process.env.DIGGAI_EMAIL_DOMAIN || 'diggai.de',
};
