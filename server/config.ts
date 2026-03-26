import * as dotenv from 'dotenv';
dotenv.config();

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

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Datenbank
    databaseUrl: requireEnv('DATABASE_URL', 'Fehlende Datenbank-Verbindung in .env (DATABASE_URL)'),

    // JWT
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // Verschlüsselung
    encryptionKey,
    encryptionIvLength: 16,

    // CORS
    frontendUrl: requireEnv('FRONTEND_URL', 'Fehlende Frontend-Verbindung in .env (FRONTEND_URL)'),

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
};
