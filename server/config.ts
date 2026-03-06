import * as dotenv from 'dotenv';
dotenv.config();

const requireEnv = (key: string, customMessage?: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(customMessage || `FATAL: Die Umgebungsvariable ${key} fehlt. Security by Design Richtlinie verletzt!`);
    }
    return value;
};

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Datenbank
    databaseUrl: requireEnv('DATABASE_URL', 'Fehlende Datenbank-Verbindung in .env (DATABASE_URL)'),

    // JWT
    jwtSecret: requireEnv('JWT_SECRET', 'Kritisches Security-Risiko: JWT_SECRET fehlt in der .env Konfiguration!'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

    // Verschlüsselung
    encryptionKey: requireEnv('ENCRYPTION_KEY', 'Kritisches Security-Risiko: ENCRYPTION_KEY für Patientendaten fehlt!'),
    encryptionIvLength: 16,

    // CORS
    frontendUrl: requireEnv('FRONTEND_URL', 'Fehlende Frontend-Verbindung in .env (FRONTEND_URL)'),

    // Redis (Token Blacklist + Queue Persistence)
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

    // Rate Limiting
    rateLimitWindowMs: 15 * 60 * 1000, // 15 Minuten
    rateLimitMax: 200, // H-03 FIX: Von 1000 auf 200 reduziert (Produktions-Limit)

    // Arzt-Dashboard Init
    arztDefaultPassword: requireEnv('ARZT_PASSWORD', 'Fehlendes Standard-Passwort für die Ersteinrichtung (ARZT_PASSWORD)'),

    // Feature Flags (Modul 7/8)
    nfcEnabled: process.env.NFC_ENABLED === 'true',
    paymentEnabled: process.env.PAYMENT_ENABLED === 'true',
    telemedicineEnabled: process.env.TELEMED_ENABLED === 'true',
};
