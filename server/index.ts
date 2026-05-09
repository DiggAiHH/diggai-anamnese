import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { config, type BackendDomain } from './config';
import { checkDatabaseHealthByDomain } from './db';
import { setupSocketIO } from './socket';
import { auditLogger } from './middleware/audit';
import { etagMiddleware } from './middleware/etag';
import { setupQueryPerformanceMonitoring } from './middleware/query-performance';
import { initRedis, getRedisClient, isRedisReady, closeRedis } from './redis';
import { initSentry, sentryMiddleware, setupSentryErrorHandler } from './lib/sentry';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';

// Routes
import stripeWebhookRoutes from './routes/stripe-webhooks';
import sessionRoutes from './routes/sessions';
import answerRoutes from './routes/answers';
import atomRoutes from './routes/atoms';
import arztRoutes from './routes/arzt';
import mfaRoutes from './routes/mfa';
import mfaReceptionRoutes from './routes/mfa-reception';
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
import registrationConfirmationRoutes from './routes/registration-confirmation';
import voiceRoutes from './routes/voice';
import agentRoutes from './routes/agents';
import subscriptionRoutes from './routes/subscriptions';
import billingRoutes from './routes/billing';
import checkoutRoutes from './routes/checkout';
import billingAnalyticsRoutes from './routes/billing-analytics';
import { billingJobs } from './jobs/billingJobs';
import themeRoutes from './routes/theme.routes';
import wearablesRoutes from './routes/wearables';
import usageRoutes from './routes/usage';
import healthRoutes from './routes/health';
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
// 2026-05-09 — Tomedo-Bridge entfernt. Tomedo importiert Daten via GDT-Export
// (siehe `/api/sessions/:id/export/gdt`). Kein in-app-Bridge mehr → weniger Memory,
// weniger Fehleranfälligkeit, klare Trennung Anamnese-Erfassung ⇄ Praxis-Software.
// import tomedoBridgeRoutes from './routes/tomedo-bridge.routes';
// import tomedoBatchRoutes from './routes/tomedo-batch.routes';
import fhirWebhookRoutes from './routes/fhir-webhook.routes';
import fhirSubscriptionRoutes from './routes/fhir-subscription.routes';
import episodeRoutes from './routes/episodes';
import { requireAuth, requireAdmin } from './middleware/auth';
import tenantsRoutes from './routes/tenants';
import { messageBroker } from './services/messagebroker.service';

// Swagger API Docs (dev only — NOT mounted in production)
let swaggerUi: typeof import('swagger-ui-express') | null = null;
let swaggerSpec: object | null = null;
if (process.env.NODE_ENV !== 'production') {
    import('swagger-ui-express').then(m => { swaggerUi = m.default; }).catch(() => {});
    import('./swagger').then(m => { swaggerSpec = m.swaggerSpec; }).catch(() => {});
}

const app = express();
initSentry();
const httpServer = createServer(app);

// Request timeout — prevents slow-client (Slowloris) attacks
httpServer.setTimeout(30000);

// ─── Security Middleware ────────────────────────────────────

// Response compression — reduces bandwidth for large JSON payloads (atoms, content)
// Level 6 is the sweet spot between CPU cost and compression ratio
app.use(compression({
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Skip already-compressed binary formats
        const type = res.getHeader('Content-Type');
        if (typeof type === 'string' && /image|video|audio|font/.test(type)) {
            return false;
        }
        return compression.filter(req, res);
    },
}));

// Security Headers with custom CSP — K-07 FIX: unsafe-inline entfernt für scripts
// Stripe Integration: CSP erweitert für Stripe.js und Stripe Elements
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.stripe.com"],
            connectSrc: ["'self'", config.frontendUrl, "https://api.stripe.com", "https://js.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com", "https://*.stripe.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'", "https://*.stripe.com"],
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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Permissions-Policy Header (via custom middleware, Helmet doesn't support it)
app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');
    next();
});

// Additional OWASP Security Headers (explicitly set for compliance)
app.use((_req, res, next) => {
    // X-Content-Type-Options: Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-Frame-Options: Explicit DENY (in addition to CSP frame-ancestors)
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-XSS-Protection: Legacy browser protection (modern browsers use CSP)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict-Transport-Security: Enforce HTTPS (complement to Helmet HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Referrer-Policy: Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Cache-Control for sensitive paths (API responses)
    if (_req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    // Remove X-Powered-By header (express default)
    res.removeHeader('X-Powered-By');
    
    next();
});

// CORS – Restricted to actual frontend domain (plus localhost in dev)
// Dual-Allowlist während diggai.de-Übergang: alte Netlify-Domain temporär erlaubt.
const allowedOrigins = [config.frontendUrl];
if (config.nodeEnv === 'production') {
    allowedOrigins.push('https://diggai-drklaproth.netlify.app');
}
if (config.nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:5173');
    allowedOrigins.push('http://127.0.0.1:5173');
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ['X-CSRF-Token'],
}));

// Global Rate Limiting — Redis-backed when available, in-memory fallback
// Redis store prevents per-server bypass in multi-instance deployments
const buildRateLimitStore = (() => {
    // Lazy-import to avoid breaking startup if rate-limit-redis is not installed
    let store: import('express-rate-limit').Store | undefined;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { RedisStore } = require('rate-limit-redis');
        const redisClient = getRedisClient();
        if (redisClient && isRedisReady()) {
            store = new RedisStore({
                sendCommand: (...args: string[]) => (redisClient as unknown as { sendCommand: (...a: string[]) => Promise<unknown> }).sendCommand(...args),
                prefix: 'rl:',
            });
        }
    } catch {
        // rate-limit-redis not installed or Redis unavailable — fall through to in-memory
    }
    return store;
});

const rateLimitStore = buildRateLimitStore();
const getRequestPath = (req: express.Request) => req.originalUrl.split('?')[0] || req.originalUrl;
const probePaths = new Set(['/api/live', '/api/system/live', '/api/system/metrics']);

// 2026-05-08 — Patient-Anamnese-Pfade vom globalen Limit ausnehmen.
// Bei normaler Beantwortung von 60+ Fragen mit ~3 API-Calls pro Frage hit der globale 200/15min-Limit.
const patientFlowPathPrefixes = ['/api/queue/', '/api/sessions', '/api/answers', '/api/atoms'];

const globalLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    store: rateLimitStore, // undefined → in-memory (express-rate-limit default)
    skip: (req) => {
        const path = getRequestPath(req);
        if (probePaths.has(path)) return true;
        // Patient-Anamnese-Endpoints haben eigene Limits weiter unten — global skippen.
        for (const prefix of patientFlowPathPrefixes) {
            if (path.startsWith(prefix)) return true;
        }
        return false;
    },
    message: { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
});

// Patient-Flow-Limiter — großzügig genug für eine komplette Anamnese-Befragung.
const patientFlowLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000, // 2000 requests per 15 min — reicht für eine vollständige Befragung
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' },
});
app.use(globalLimiter);

// Sentry Request Handler (after rate limiting)
app.use(sentryMiddleware);

// Prometheus Metrics Middleware
app.use(metricsMiddleware);

// Lightweight liveness endpoint for tooling/startup probes.
// Must remain independent from DB/audit middleware to avoid readiness deadlocks.
// Mounted after core security middleware to avoid bypassing global protections.
app.get('/api/live', (_req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Per-endpoint rate limits (stricter for auth endpoints)
const authLimiterExcludedPaths = new Set(['/api/system/live', '/api/system/metrics']);
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skip: (req) => authLimiterExcludedPaths.has(getRequestPath(req)),
    message: { error: 'Zu viele Login-Versuche.' }
});
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Upload-Limit erreicht.' } });
// Patient portal limiter — protects login/register/password-reset from brute force
const pwaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.' } });
// Payment limiter — strict limits for financial operations
const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: { error: 'Zu viele Zahlungsanfragen. Bitte warten Sie einen Moment.' }
});

type RouteDomain = BackendDomain | 'shared';

const shouldMountDomain = (domain: RouteDomain): boolean => {
    if (!config.enforceRouteDomainIsolation || config.backendProfile === 'monolith') {
        return true;
    }

    if (domain === 'shared') {
        return true;
    }

    return domain === config.backendProfile;
};

const mountRoute = (
    domain: RouteDomain,
    path: string,
    ...handlers: express.RequestHandler[]
): void => {
    if (shouldMountDomain(domain)) {
        app.use(path, ...handlers);
        return;
    }

    console.info(`[RouteRegistry] Skipped ${path} for profile ${config.backendProfile} (domain: ${domain})`);
};

// Stripe Webhooks - MÜSSEN vor express.json() kommen für raw body
if (shouldMountDomain('company')) {
    app.use('/api/webhooks', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
    app.use('/api/billing/webhook', express.raw({ type: 'application/json' }), billingRoutes);
}

// Body Parser
app.use(express.json({ limit: '10mb' }));

// Cookie Parser (for httpOnly JWT cookies)
app.use(cookieParser());

// K-05/K-06 FIX: Globale Input-Sanitization — entfernt HTML-Tags aus allen User-Inputs
import { sanitizeBody } from './services/sanitize';
app.use(sanitizeBody);

// HIPAA Audit Logging
const auditExcludedPaths = new Set(['/api/live', '/api/system/live', '/api/system/metrics']);
app.use((req, res, next) => {
    if (auditExcludedPaths.has(getRequestPath(req))) {
        return next();
    }
    return auditLogger(req, res, next);
});

// ETag support for HTTP conditional requests (caching)
app.use(etagMiddleware);

// Query performance monitoring
setupQueryPerformanceMonitoring();

// SECURITY: CSRF Protection — Double-Submit Cookie Pattern (HIGH-001 Fix)
import { setCsrfCookie, validateCsrf, getCsrfToken } from './middleware/csrf';
app.use(setCsrfCookie);  // Set CSRF token cookie on every request
app.get('/api/csrf-token', (req, res) => {
    res.status(200).json({ csrfToken: getCsrfToken(req) ?? null });
});
app.use(validateCsrf);   // Validate CSRF token on state-changing requests

// SECURITY: Additional Security Headers (OWASP hardening)
import { additionalSecurityHeaders, userAgentFilter, apiSecurityHeaders } from './middleware/security-headers';
app.use(userAgentFilter);           // Block known malicious user agents
app.use(additionalSecurityHeaders); // Enhanced security headers
app.use('/api', apiSecurityHeaders); // API-specific headers

// Multi-Tenancy: Resolve tenant from subdomain/custom domain
import { resolveTenant } from './middleware/tenant';
// Public tenant lookup — mounted BEFORE resolveTenant so BSNR can be resolved
// without an existing tenant context. The route also has an explicit bypass
// in resolveTenant for extra safety.
app.use('/api/tenants', tenantsRoutes);
app.use(resolveTenant);

// Health Check — includes DB + Redis connectivity with detailed checks
app.use('/api/health', healthRoutes);

// ─── API Routes ─────────────────────────────────────────────

mountRoute('practice', '/api/sessions', patientFlowLimiter, sessionRoutes);
mountRoute('practice', '/api/answers', patientFlowLimiter, answerRoutes);
mountRoute('practice', '/api/atoms', patientFlowLimiter, atomRoutes);
mountRoute('shared', '/api/arzt', authLimiter, arztRoutes);
mountRoute('shared', '/api/mfa', authLimiter, mfaRoutes); // H-04 FIX: authLimiter hinzugefügt
mountRoute('shared', '/api/mfa/reception', authLimiter, mfaReceptionRoutes);
mountRoute('practice', '/api/chats', chatRoutes);
mountRoute('authority', '/api/export', exportRoutes);
mountRoute('practice', '/api/upload', uploadLimiter, uploadRoutes);
mountRoute('practice', '/api/queue', patientFlowLimiter, queueRoutes);
mountRoute('company', '/api/admin', authLimiter, adminRoutes);
mountRoute('practice', '/api/patients', patientRoutes);
mountRoute('company', '/api/content', contentRoutes);
mountRoute('company', '/api/roi', roiRoutes);
mountRoute('practice', '/api/wunschbox', wunschboxRoutes);
mountRoute('authority', '/api/pvs', authLimiter, pvsRoutes);
mountRoute('practice', '/api/therapy', authLimiter, therapyRoutes);
mountRoute('practice', '/api/episodes', authLimiter, episodeRoutes);
mountRoute('practice', '/api/pwa', pwaLimiter, pwaRoutes);
mountRoute('company', '/api/system', authLimiter, systemRoutes);
mountRoute('authority', '/api/ti', authLimiter, tiRoutes);
mountRoute('practice', '/api/nfc', nfcRoutes);
mountRoute('practice', '/api/flows', authLimiter, flowRoutes);
mountRoute('practice', '/api/feedback', feedbackRoutes);
mountRoute('company', '/api/payment', paymentLimiter, paymentRoutes);
mountRoute('practice', '/api/praxis-chat', praxisChatRoutes);
mountRoute('practice', '/api/avatar', authLimiter, avatarRoutes);
mountRoute('practice', '/api/telemedizin', authLimiter, telemedizinRoutes);
mountRoute('practice', '/api/gamification', authLimiter, gamificationRoutes);
mountRoute('practice', '/api/forms', authLimiter, formsRoutes);
mountRoute('authority', '/api/epa', authLimiter, epaRoutes);
mountRoute('practice', '/api/todos', authLimiter, todoRoutes);
mountRoute('practice', '/api/signatures', authLimiter, signatureRoutes);
mountRoute('practice', '/api/registration/confirmation', authLimiter, registrationConfirmationRoutes);
mountRoute('practice', '/api/voice', authLimiter, voiceRoutes);
mountRoute('company', '/api/agents', agentRoutes);
mountRoute('company', '/api/subscriptions', subscriptionRoutes);
mountRoute('company', '/api/billing', billingRoutes);
mountRoute('company', '/api/checkout', paymentLimiter, checkoutRoutes);
mountRoute('company', '/api/billing-analytics', requireAuth, requireAdmin, billingAnalyticsRoutes);
mountRoute('practice', '/api/wearables', authLimiter, wearablesRoutes);
mountRoute('company', '/api/usage', authLimiter, usageRoutes);
mountRoute('practice', '/api/ai', aiRoutes);
mountRoute('shared', '/api/auth', authLimiter, authRoutes);
// 2026-05-09 — Tomedo-Bridge-Routes entfernt; siehe Kommentar oben.
// mountRoute('authority', '/api/tomedo-bridge', authLimiter, tomedoBridgeRoutes);
// mountRoute('authority', '/api/tomedo-bridge', authLimiter, tomedoBatchRoutes);
mountRoute('authority', '/api/tomedo-bridge', authLimiter, fhirSubscriptionRoutes);
mountRoute('authority', '/api/webhooks/fhir', fhirWebhookRoutes);
mountRoute('company', '/api', themeRoutes);

// Kubernetes/Docker Health Probes
// GET /api/system/ready - Readiness probe
app.get('/api/system/ready', async (_req, res) => {
    try {
        const activeDomains = config.enabledDatabaseDomains;
        const checks = await checkDatabaseHealthByDomain(activeDomains);
        const allDomainsReady = activeDomains.every((domain) => checks[domain]?.status === 'ok');

        res.status(allDomainsReady ? 200 : 503).json({
            status: allDomainsReady ? 'ready' : 'not ready',
            backendProfile: config.backendProfile,
            activeDomains,
            checks,
        });
    } catch {
        res.status(503).json({ status: 'not ready' });
    }
});

// GET /api/system/live - Liveness probe
app.get('/api/system/live', (_req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// GET /api/system/metrics - Prometheus metrics endpoint
app.get('/api/system/metrics', metricsHandler);

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

// 2026-05-09 — JSON-404-Catchall für /api/*. Vorher: Express-Default lieferte HTML
// für unbekannte API-Endpoints, was Axios-Klients in Confusion brachte. Jetzt: JSON.
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next();
    res.status(404).json({
        error: 'Endpoint nicht gefunden',
        code: 'NOT_FOUND',
        path: req.originalUrl,
        method: req.method,
    });
});

// Sentry Error Handler (before our custom error handler)
setupSentryErrorHandler(app);

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
import { startReceptionInboxCleanupJob } from './jobs/receptionInboxCleanup';
import { startAgentOrchestrator } from './agents/orchestrator.agent';
import { startBackupScheduler, stopBackupScheduler } from './jobs/backupScheduler';
import { startBackupMonitor, stopBackupMonitor } from './jobs/backupMonitor';
import { startEscalationWorker, stopEscalationWorker } from './jobs/escalationWorker';
import { startComplianceReporter, stopComplianceReporter } from './jobs/complianceReporter';
import { startQueueAutoDispatch, stopQueueAutoDispatch } from './jobs/queueAutoDispatch';
import { startBillingReconciler, stopBillingReconciler } from './jobs/billingReconciler';
import { startTokenCleanupJob, stopTokenCleanupJob } from './jobs/token-cleanup.job';
import { startRetentionCleanupJob } from './jobs/retentionCleanup';
// LOW_MEM_MODE — 2026-05-08 (CK): Auf 256-512 MB Fly-Maschinen gate non-essential
// background-jobs hinter ein Flag, damit V8 nicht ständig in Old-Space-GC läuft.
// Essentials bleiben aktiv: Cleanup, Hard-Delete, Token-Cleanup, Retention (DSGVO/Security).
// Alles andere kann via LOW_MEM_MODE=1 deaktiviert werden — durch `flyctl deploy` oder per Secret.
const LOW_MEM_MODE = process.env.LOW_MEM_MODE === '1' || process.env.LOW_MEM_MODE === 'true';
if (LOW_MEM_MODE) {
    console.log('[Server] LOW_MEM_MODE active — running essentials only (cleanup/hardDelete/token/retention).');
}

// Essentials — DSGVO/Security, immer aktiv
try { startDatabaseCleanupJob(); } catch (err) { console.error('[Server] Failed to start cleanup job:', err); }
try { startHardDeleteWorker(); } catch (err) { console.error('[Server] Failed to start hard-delete worker:', err); }
try { startTokenCleanupJob(); } catch (err) { console.error('[Server] Failed to start token cleanup job:', err); }
try { startRetentionCleanupJob(); } catch (err) { console.error('[Server] Failed to start retention cleanup job:', err); }

// Non-essential — abschaltbar im LOW_MEM_MODE
if (!LOW_MEM_MODE) {
    try { startROISnapshotJob(); } catch (err) { console.error('[Server] Failed to start ROI snapshot job:', err); }
    try { startReminderWorker(); } catch (err) { console.error('[Server] Failed to start reminder worker:', err); }
    try { startReceptionInboxCleanupJob(); } catch (err) { console.error('[Server] Failed to start reception inbox cleanup job:', err); }
    try { startAgentOrchestrator(); } catch (err) { console.error('[Server] Failed to start agent orchestrator:', err); }
    try { startBackupScheduler(); } catch (err) { console.error('[Server] Failed to start backup scheduler:', err); }
    try { startBackupMonitor(); } catch (err) { console.error('[Server] Failed to start backup monitor:', err); }
    try { startEscalationWorker(); } catch (err) { console.error('[Server] Failed to start escalation worker:', err); }
    try { startComplianceReporter(); } catch (err) { console.error('[Server] Failed to start compliance reporter:', err); }
    try { startQueueAutoDispatch(); } catch (err) { console.error('[Server] Failed to start queue auto-dispatch:', err); }
    try { startBillingReconciler(); } catch (err) { console.error('[Server] Failed to start billing reconciler:', err); }
} else {
    console.log('[Server] Skipped: ROI, reminder, receptionInbox, agentOrchestrator, backup-{scheduler,monitor}, escalation, compliance, queueAutoDispatch, billingReconciler.');
}

// RabbitMQ — verbindet sich mit Agent-Core (non-blocking, graceful degradation)
messageBroker.connect().catch(err =>
    console.warn('[Server] RabbitMQ nicht verfügbar (HTTP-only Modus):', err.message)
);

// Initialize Redis (non-blocking — graceful degradation)
// A1: After Redis is up, hydrate the agent task queue from persisted state.
initRedis()
    .then(async () => {
        try {
            const { taskQueue } = await import('./services/agent/task.queue');
            await taskQueue.hydrateFromRedis();
        } catch (err) {
            console.warn('[Server] Agent task queue hydrate skipped:', (err as Error).message);
        }
    })
    .catch(err => console.warn('[Server] Redis init skipped:', err.message));

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    try { stopReminderWorker(); } catch (err) { console.error('[Server] Error stopping reminder worker:', err); }
    try { stopROISnapshotJob(); } catch (err) { console.error('[Server] Error stopping ROI snapshot job:', err); }
    try { stopBackupScheduler(); } catch (err) { console.error('[Server] Error stopping backup scheduler:', err); }
try { stopBackupMonitor(); } catch (err) { console.error('[Server] Error stopping backup monitor:', err); }
    try { stopEscalationWorker(); } catch (err) { console.error('[Server] Error stopping escalation worker:', err); }
    try { stopComplianceReporter(); } catch (err) { console.error('[Server] Error stopping compliance reporter:', err); }
    try { stopQueueAutoDispatch(); } catch (err) { console.error('[Server] Error stopping queue auto-dispatch:', err); }
    try { stopBillingReconciler(); } catch (err) { console.error('[Server] Error stopping billing reconciler:', err); }
try { stopTokenCleanupJob(); } catch (err) { console.error('[Server] Error stopping token cleanup job:', err); }
    await messageBroker.disconnect().catch(() => {});
    await closeRedis();
    httpServer.close(() => process.exit(0));
});

// Catch unhandled promise rejections — prevents silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

httpServer.listen(config.port, () => {
    const activeDomainsLabel = config.enabledDatabaseDomains.join(',');
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║   🏥  Anamnese Backend v2.0              ║
  ║   Port: ${config.port}                           ║
  ║   Env:  ${config.nodeEnv.padEnd(20)}       ║
    ║   Profile: ${config.backendProfile.padEnd(16)}        ║
    ║   Domains: ${activeDomainsLabel.padEnd(16)}        ║
  ║   CORS: ${config.frontendUrl.padEnd(20)}   ║
  ╚═══════════════════════════════════════════╝
  `);

    // Start Billing Cron Jobs (nur im company domain)
    // 2026-05-08 — LOW_MEM_MODE: BillingMonitor crashed alle 30s mit Stripe 401 wenn keine API-Keys gesetzt sind.
    // Das spawnt Error-Stacks und füllt Memory. In LOW_MEM_MODE deshalb auch billingJobs aus.
    const lowMemMode = process.env.LOW_MEM_MODE === '1' || process.env.LOW_MEM_MODE === 'true';
    if (shouldMountDomain('company') && !lowMemMode) {
        billingJobs.start();
    } else if (lowMemMode) {
        console.log('[Server] Skipped: billingJobs.start() (LOW_MEM_MODE).');
    }
});

export default app;
