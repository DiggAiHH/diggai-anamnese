// ─── Structured Logger ────────────────────────────────────────
// Replaces bare console.* calls with timestamped, leveled output.
// In production emits JSON for log aggregation (e.g. Loki, Datadog).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PROD = process.env.NODE_ENV === 'production';

function emit(level: LogLevel, context: string, message: string, data?: unknown): void {
    const ts = new Date().toISOString();

    if (IS_PROD) {
        // JSON format for log aggregators
        process.stdout.write(
            JSON.stringify({ ts, level, context, message, ...(data !== undefined ? { data } : {}) }) + '\n'
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
        if (data !== undefined) {
            (level === 'error' ? console.error : console.log)(line, data);
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
