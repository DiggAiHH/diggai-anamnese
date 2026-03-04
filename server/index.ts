import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { setupSocketIO } from './socket';
import { auditLogger } from './middleware/audit';
import { initRedis, getRedisClient, closeRedis } from './redis';

// Routes
import sessionRoutes from './routes/sessions';
import answerRoutes from './routes/answers';
import atomRoutes from './routes/atoms';
import arztRoutes from './routes/arzt';
import mfaRoutes from './routes/mfa';
import chatRoutes from './routes/chats';
import paymentsRoutes from './routes/payments';
import exportRoutes from './routes/export';
import uploadRoutes from './routes/upload';
import queueRoutes from './routes/queue';
import adminRoutes from './routes/admin';
import patientRoutes from './routes/patients';
import contentRoutes from './routes/content';
import roiRoutes from './routes/roi';
import wunschboxRoutes from './routes/wunschbox';
import pvsRoutes from './routes/pvs';
import therapyRoutes from './routes/therapy';

const app = express();
const httpServer = createServer(app);

// ─── Security Middleware ────────────────────────────────────

// Security Headers with custom CSP — K-07 FIX: unsafe-inline entfernt für scripts
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'", config.frontendUrl],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
        },
    },
    // HSTS — BSI TR-02102: 1 Jahr, includeSubDomains, preload
    strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    // Referrer-Policy — verhindert Datenleck über Referer
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // X-Frame-Options: DENY
    frameguard: { action: 'deny' },
    // Cross-Origin-Embedder/Opener/Resource-Policy
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// Permissions-Policy Header (via custom middleware, Helmet doesn't support it)
app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
    next();
});

// CORS – Restricted to actual frontend domain (not '*')
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

// Global Rate Limiting (fallback)
const globalLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
});
app.use(globalLimiter);

// Per-endpoint rate limits (stricter for auth endpoints)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Zu viele Login-Versuche.' } });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Upload-Limit erreicht.' } });

// Body Parser
app.use(express.json({ limit: '10mb' }));

// K-05/K-06 FIX: Globale Input-Sanitization — entfernt HTML-Tags aus allen User-Inputs
import { sanitizeBody } from './services/sanitize';
app.use(sanitizeBody);

// HIPAA Audit Logging
app.use(auditLogger);

// ─── API Routes ─────────────────────────────────────────────

app.use('/api/sessions', sessionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/atoms', atomRoutes);
app.use('/api/arzt', authLimiter, arztRoutes);
app.use('/api/mfa', authLimiter, mfaRoutes); // H-04 FIX: authLimiter hinzugefügt
app.use('/api/chats', chatRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/roi', roiRoutes);
app.use('/api/wunschbox', wunschboxRoutes);
app.use('/api/pvs', authLimiter, pvsRoutes);
app.use('/api/therapy', authLimiter, therapyRoutes);

// Health Check — includes DB + Redis connectivity
app.get('/api/health', async (_req, res) => {
    const redis = getRedisClient();
    let dbStatus = 'unknown';
    let redisStatus = 'disconnected';

    // Check DB connectivity
    try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
        dbStatus = 'connected';
    } catch {
        dbStatus = 'error';
    }

    // Check Redis connectivity
    if (redis?.isReady) {
        try {
            await redis.ping();
            redisStatus = 'connected';
        } catch {
            redisStatus = 'error';
        }
    }

    res.json({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        db: dbStatus,
        redis: redisStatus,
        uptime: Math.floor(process.uptime()),
    });
});

// ─── Socket.io ──────────────────────────────────────────────

setupSocketIO(httpServer);

// ─── Error Handler ──────────────────────────────────────────

import { ZodError } from 'zod';

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Validierungsfehler',
            details: err.issues.map((e: any) => ({ path: e.path, message: e.message }))
        });
        return;
    }

    console.error('[Server] Unbehandelter Fehler:', err);
    res.status(500).json({
        error: config.nodeEnv === 'development' ? err.message : 'Interner Serverfehler',
    });
});

// ─── Start ──────────────────────────────────────────────────

import { startDatabaseCleanupJob } from './jobs/cleanup';
import { startROISnapshotJob } from './jobs/roiSnapshot';
startDatabaseCleanupJob();
startROISnapshotJob();

// Initialize Redis (non-blocking — graceful degradation)
initRedis().catch(err => console.warn('[Server] Redis init skipped:', err.message));

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    await closeRedis();
    httpServer.close(() => process.exit(0));
});

httpServer.listen(config.port, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🏥  Anamnese Backend v2.0              ║
  ║   Port: ${config.port}                           ║
  ║   Env:  ${config.nodeEnv.padEnd(20)}       ║
  ║   CORS: ${config.frontendUrl.padEnd(20)}   ║
  ╚═══════════════════════════════════════════╝
  `);
});

export default app;
