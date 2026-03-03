import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { setupSocketIO } from './socket';
import { auditLogger } from './middleware/audit';

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
        },
    },
}));

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

// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
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
startDatabaseCleanupJob();

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
