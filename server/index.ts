import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config } from './config';
import { setupSocketIO } from './socket';
import { auditLogger } from './middleware/audit';
import { initRedis, getRedisClient, isRedisReady, closeRedis } from './redis';

// Routes
import stripeWebhookRoutes from './routes/stripe-webhooks';
import sessionRoutes from './routes/sessions';
import answerRoutes from './routes/answers';
import atomRoutes from './routes/atoms';
import arztRoutes from './routes/arzt';
import mfaRoutes from './routes/mfa';
import chatRoutes from './routes/chats';
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
import pwaRoutes from './routes/pwa';
import systemRoutes from './routes/system';
import tiRoutes from './routes/ti';
import nfcRoutes from './routes/nfc';
import flowRoutes from './routes/flows';
import feedbackRoutes from './routes/feedback';
import paymentRoutes from './routes/payment';
import praxisChatRoutes from './routes/praxis-chat';
import avatarRoutes from './routes/avatar';
import telemedizinRoutes from './routes/telemedizin';
import gamificationRoutes from './routes/gamification';
import formsRoutes from './routes/forms';
import epaRoutes from './routes/epa';
import todoRoutes from './routes/todos';
import signatureRoutes from './routes/signatures';
import agentRoutes from './routes/agents';
import subscriptionRoutes from './routes/subscriptions';
import billingRoutes from './routes/billing';
import themeRoutes from './routes/theme.routes';
import { messageBroker } from './services/messagebroker.service';

// Swagger API Docs (dev only — NOT mounted in production)
let swaggerUi: typeof import('swagger-ui-express') | null = null;
let swaggerSpec: object | null = null;
if (process.env.NODE_ENV !== 'production') {
    import('swagger-ui-express').then(m => { swaggerUi = m.default; }).catch(() => {});
    import('./swagger').then(m => { swaggerSpec = m.swaggerSpec; }).catch(() => {});
}

const app = express();
const httpServer = createServer(app);

// Request timeout — prevents slow-client (Slowloris) attacks
httpServer.setTimeout(30000);

// ─── Security Middleware ────────────────────────────────────

// Response compression — reduces bandwidth for large JSON payloads (atoms, content)
app.use(compression());

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
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');
    next();
});

// CORS – Restricted to actual frontend domain (not '*')
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    exposedHeaders: ['X-CSRF-Token'],
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
// Patient portal limiter — protects login/register/password-reset from brute force
const pwaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' } });

// Stripe Webhooks - MÜSSEN vor express.json() kommen für raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// Body Parser
app.use(express.json({ limit: '10mb' }));

// Cookie Parser (for httpOnly JWT cookies)
app.use(cookieParser());

// K-05/K-06 FIX: Globale Input-Sanitization — entfernt HTML-Tags aus allen User-Inputs
import { sanitizeBody } from './services/sanitize';
app.use(sanitizeBody);

// HIPAA Audit Logging
app.use(auditLogger);

// SECURITY: CSRF Protection — Double-Submit Cookie Pattern (HIGH-001 Fix)
import { setCsrfCookie, validateCsrf } from './middleware/csrf';
app.use(setCsrfCookie);  // Set CSRF token cookie on every request
app.use(validateCsrf);   // Validate CSRF token on state-changing requests

// Multi-Tenancy: Resolve tenant from subdomain/custom domain
import { resolveTenant } from './middleware/tenant';
app.use(resolveTenant);

// ─── API Routes ─────────────────────────────────────────────

app.use('/api/sessions', sessionRoutes);
app.use('/api/answers', answerRoutes);
app.use('/api/atoms', atomRoutes);
app.use('/api/arzt', authLimiter, arztRoutes);
app.use('/api/mfa', authLimiter, mfaRoutes); // H-04 FIX: authLimiter hinzugefügt
app.use('/api/chats', chatRoutes);
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
app.use('/api/pwa', pwaLimiter, pwaRoutes);
app.use('/api/system', authLimiter, systemRoutes);
app.use('/api/ti', authLimiter, tiRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/flows', authLimiter, flowRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/payment', authLimiter, paymentRoutes);
app.use('/api/praxis-chat', praxisChatRoutes);
app.use('/api/avatar', authLimiter, avatarRoutes);
app.use('/api/telemedizin', authLimiter, telemedizinRoutes);
app.use('/api/gamification', authLimiter, gamificationRoutes);
app.use('/api/forms', authLimiter, formsRoutes);
app.use('/api/epa', authLimiter, epaRoutes);
app.use('/api/todos', authLimiter, todoRoutes);
app.use('/api/signatures', authLimiter, signatureRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', themeRoutes);

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
    if (redis && isRedisReady()) {
        try {
            await redis.ping();
            redisStatus = 'connected';
        } catch {
            redisStatus = 'error';
        }
    }

    const { agentService } = await import('./services/agent/agent.service');
    const agentList = agentService.listAgents().map(a => ({ name: a.name, online: a.online, busy: a.busy }));

    res.json({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        db: dbStatus,
        redis: redisStatus,
        uptime: Math.floor(process.uptime()),
        agents: agentList,
        reminderWorker: 'running',
    });
});

// ─── Swagger API Docs (dev only) ────────────────────────────

if (process.env.NODE_ENV !== 'production') {
    // Mounted after routes so all @swagger annotations are already registered
    setTimeout(() => {
        if (swaggerUi && swaggerSpec) {
            app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
                customSiteTitle: 'DiggAI Anamnese API',
            }));
            console.log('[Swagger] API docs available at http://localhost:3001/api/docs');
        }
    }, 100);
}

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
import { startROISnapshotJob, stopROISnapshotJob } from './jobs/roiSnapshot';
import { startReminderWorker, stopReminderWorker } from './jobs/reminderWorker';
import { startHardDeleteWorker } from './jobs/hardDeleteWorker';
import { startAgentOrchestrator } from './agents/orchestrator.agent';
import { startBackupScheduler, stopBackupScheduler } from './jobs/backupScheduler';
import { startEscalationWorker, stopEscalationWorker } from './jobs/escalationWorker';
import { startComplianceReporter, stopComplianceReporter } from './jobs/complianceReporter';
import { startQueueAutoDispatch, stopQueueAutoDispatch } from './jobs/queueAutoDispatch';
import { startBillingReconciler, stopBillingReconciler } from './jobs/billingReconciler';
try { startDatabaseCleanupJob(); } catch (err) { console.error('[Server] Failed to start cleanup job:', err); }
try { startROISnapshotJob(); } catch (err) { console.error('[Server] Failed to start ROI snapshot job:', err); }
try { startReminderWorker(); } catch (err) { console.error('[Server] Failed to start reminder worker:', err); }
try { startHardDeleteWorker(); } catch (err) { console.error('[Server] Failed to start hard-delete worker:', err); }
try { startAgentOrchestrator(); } catch (err) { console.error('[Server] Failed to start agent orchestrator:', err); }
try { startBackupScheduler(); } catch (err) { console.error('[Server] Failed to start backup scheduler:', err); }
try { startEscalationWorker(); } catch (err) { console.error('[Server] Failed to start escalation worker:', err); }
try { startComplianceReporter(); } catch (err) { console.error('[Server] Failed to start compliance reporter:', err); }
try { startQueueAutoDispatch(); } catch (err) { console.error('[Server] Failed to start queue auto-dispatch:', err); }
try { startBillingReconciler(); } catch (err) { console.error('[Server] Failed to start billing reconciler:', err); }

// RabbitMQ — verbindet sich mit Agent-Core (non-blocking, graceful degradation)
messageBroker.connect().catch(err =>
    console.warn('[Server] RabbitMQ nicht verfügbar (HTTP-only Modus):', err.message)
);

// Initialize Redis (non-blocking — graceful degradation)
initRedis().catch(err => console.warn('[Server] Redis init skipped:', err.message));

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    try { stopReminderWorker(); } catch (err) { console.error('[Server] Error stopping reminder worker:', err); }
    try { stopROISnapshotJob(); } catch (err) { console.error('[Server] Error stopping ROI snapshot job:', err); }
    try { stopBackupScheduler(); } catch (err) { console.error('[Server] Error stopping backup scheduler:', err); }
    try { stopEscalationWorker(); } catch (err) { console.error('[Server] Error stopping escalation worker:', err); }
    try { stopComplianceReporter(); } catch (err) { console.error('[Server] Error stopping compliance reporter:', err); }
    try { stopQueueAutoDispatch(); } catch (err) { console.error('[Server] Error stopping queue auto-dispatch:', err); }
    try { stopBillingReconciler(); } catch (err) { console.error('[Server] Error stopping billing reconciler:', err); }
    await messageBroker.disconnect().catch(() => {});
    await closeRedis();
    httpServer.close(() => process.exit(0));
});

// Catch unhandled promise rejections — prevents silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Promise Rejection at:', promise, 'reason:', reason);
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
