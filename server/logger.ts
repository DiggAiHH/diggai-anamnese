// ─── Structured Logger ────────────────────────────────────────
// Replaces bare console.* calls with timestamped, leveled output.
// In production emits JSON for log aggregation (e.g. Loki, Datadog).
// PII fields are automatically masked before any output.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ─── PII Masking ─────────────────────────────────────────────
// Fields that must never appear in logs (DSGVO compliance)
const PII_FIELDS = new Set(['email', 'name', 'birthDate', 'phone', 'address', 'patientEmail', 'patientName', 'firstName', 'lastName', 'geburtsdatum']);

function maskPii(value: unknown, depth = 0): unknown {
    if (depth > 5 || value === null || value === undefined) return value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.map(v => maskPii(v, depth + 1));
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) =>
                PII_FIELDS.has(k) ? [k, '[REDACTED]'] : [k, maskPii(v, depth + 1)]
            )
        );
    }
    return value;
}

const IS_PROD = process.env.NODE_ENV === 'production';

function emit(level: LogLevel, context: string, message: string, data?: unknown): void {
    const ts = new Date().toISOString();
    const safeData = data !== undefined ? maskPii(data) : undefined;

    if (IS_PROD) {
        // JSON format for log aggregators — PII already masked
        process.stdout.write(
            JSON.stringify({ ts, level, context, message, ...(safeData !== undefined ? { data: safeData } : {}) }) + '\n'
        );
    } else {
        const COLORS: Record<LogLevel, string> = {
            debug: '\x1b[90m',  // gray
            info:  '\x1b[36m',  // cyan
            warn:  '\x1b[33m',  // yellow
            error: '\x1b[31m',  // red
        };
        const RESET = '\x1b[0m';
        const label = `${COLORS[level]}[${level.toUpperCase()}]${RESET}`;
        const ctx   = `\x1b[35m[${context}]${RESET}`;
        const line  = `${ts} ${label} ${ctx} ${message}`;
        if (safeData !== undefined) {
            (level === 'error' ? console.error : console.log)(line, safeData);
        } else {
            (level === 'error' ? console.error : console.log)(line);
        }
    }
}

export function createLogger(context: string) {
    return {
        debug: (message: string, data?: unknown) => emit('debug', context, message, data),
        info:  (message: string, data?: unknown) => emit('info',  context, message, data),
        warn:  (message: string, data?: unknown) => emit('warn',  context, message, data),
        error: (message: string, data?: unknown) => emit('error', context, message, data),
    };
}

// Default logger for top-level server code
export const logger = createLogger('Server');
