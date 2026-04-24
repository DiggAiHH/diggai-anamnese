import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { questions } from '../data/questions';
import { isDemoMode } from '../store/modeStore';
import { useSessionStore } from '../store/sessionStore';
import type { StaffUser } from '../lib/staffSession';
import {
    clearSessionEncryption,
    getActiveSessionKey,
    encryptPayload,
    initSessionEncryption,
    isSessionEncryptionActive,
    type EncryptedPayload,
} from '../utils/clientEncryption';
import {
    isLikelyPlaceholderUrl,
    resolveApiBaseUrl,
    resolveSocketBaseUrl,
} from '../lib/runtimeEndpoints';

// =============================================================================
// REQUEST DEDUPLICATION
// =============================================================================

/**
 * Cache für ausstehende Requests zur Deduplication.
 * Identische parallele Requests (gleiche URL + Methode + Body) teilen sich
 * die gleiche Response, um Netzwerk-Overhead zu reduzieren.
 */
const pendingRequests = new Map<string, Promise<AxiosResponse<unknown>>>();

/**
 * Generiert einen eindeutigen Schlüssel für einen Request basierend auf
 * Methode, URL, Query-Parametern und Body.
 *
 * @param config - Die Axios Request Konfiguration
 * @returns Ein eindeutiger String-Key für den Request
 */
function getRequestKey(config: AxiosRequestConfig | InternalAxiosRequestConfig): string {
    const method = (config.method || 'GET').toUpperCase();
    const url = config.url || '';
    const params = JSON.stringify(config.params || {});
    const data = typeof config.data === 'string' ? config.data : JSON.stringify(config.data || {});
    return `${method}:${url}:${params}:${data}`;
}

/**
 * Entfernt einen Request aus dem Pending-Cache.
 * Wird im Response- und Error-Interceptor aufgerufen.
 *
 * @param config - Die Axios Request Konfiguration
 */
function clearPendingRequest(config: AxiosRequestConfig | InternalAxiosRequestConfig): void {
    const key = getRequestKey(config);
    pendingRequests.delete(key);
}



const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL as string | undefined;

export const API_BASE_URL = resolveApiBaseUrl(configuredApiUrl);
export const SOCKET_BASE_URL = resolveSocketBaseUrl(configuredSocketUrl, configuredApiUrl);
// Demo mode is now controlled by modeStore (runtime switchable).
// Legacy env-var support: if VITE_DISABLE_DEMO_MODE=true, force live mode on load.
if (import.meta.env.VITE_DISABLE_DEMO_MODE === 'true') {
    // Force live mode via store
    import('../store/modeStore').then(m => m.useModeStore.getState().setMode('live'));
}

if (isLikelyPlaceholderUrl(configuredApiUrl)) {
    console.warn(`VITE_API_URL is missing or invalid. Falling back to '${API_BASE_URL}'.`);
}

if (isDemoMode()) {
    console.warn('Demo API mode is active. Data is stored locally in this browser.');
}

/**
 * Axios-Client mit JWT-Interceptor fuer die Backend-API
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 Sekunden
    withCredentials: true, // Send httpOnly cookies with every request
});

// Export the apiClient for use in other modules
export { apiClient };

/**
 * Führt einen deduplizierten Request aus.
 * Identische parallele Requests (gleiche URL + Methode + Body) teilen sich
 * die gleiche Response, um Netzwerk-Overhead zu reduzieren.
 *
 * Der erste Request wird ausgeführt, alle parallelen identischen Requests
 * warten auf das gleiche Promise. Nach Abschluss wird der Cache-Eintrag
 * automatisch gelöscht. Fehler werden an alle wartenden Requests weitergegeben.
 *
 * @template T - Der erwartete Response-Datentyp
 * @param config - Die Axios Request Konfiguration
 * @returns Ein Promise mit der Axios Response
 *
 * @example
 * ```typescript
 * // Diese zwei Requests werden zusammengeführt:
 * const [res1, res2] = await Promise.all([
 *   deduplicatedRequest<User>({ method: 'GET', url: '/users/123' }),
 *   deduplicatedRequest<User>({ method: 'GET', url: '/users/123' })
 * ]);
 * // res1 === res2 (gleiche Response-Referenz)
 * ```
 */
export function deduplicatedRequest<T = unknown>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const key = getRequestKey(config);

    // Prüfen, ob ein identischer Request bereits läuft
    const pending = pendingRequests.get(key) as Promise<AxiosResponse<T>> | undefined;
    if (pending) {
        return pending;
    }

    // Neuen Request erstellen und im Cache speichern
    const promise = apiClient.request<T>(config).finally(() => {
        // Request aus dem Cache entfernen (nach Erfolg oder Fehler)
        clearPendingRequest(config);
    });

    pendingRequests.set(key, promise);
    return promise;
}

// JWT Token Management
let currentToken: string | null = null;
let currentCsrfToken: string | null = null;
let csrfBootstrapPromise: Promise<string | null> | null = null;

export function setAuthToken(token: string | null): void {
    currentToken = token;
}

export function getAuthToken(): string | null {
    return currentToken;
}

export function setCsrfToken(token: string | null): void {
    currentCsrfToken = token;
}

function getCsrfTokenFromCookie(): string | null {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export function getCsrfToken(): string | null {
    return currentCsrfToken || getCsrfTokenFromCookie();
}

function updateCsrfTokenFromHeaders(headers: unknown): void {
    if (!headers || typeof headers !== 'object') {
        return;
    }

    const record = headers as Record<string, unknown>;
    const rawValue = record['x-csrf-token'] ?? record['X-CSRF-Token'];
    if (typeof rawValue === 'string' && rawValue.trim().length > 0) {
        currentCsrfToken = rawValue;
    }
}

export async function ensureCsrfToken(): Promise<string | null> {
    const existingToken = getCsrfToken();
    if (existingToken || typeof window === 'undefined') {
        return existingToken;
    }

    if (csrfBootstrapPromise) {
        return csrfBootstrapPromise;
    }

    csrfBootstrapPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/csrf-token`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                },
            });

            updateCsrfTokenFromHeaders({
                'x-csrf-token': response.headers.get('X-CSRF-Token') ?? undefined,
            });

            if (response.ok) {
                const data = await response.json().catch(() => null) as { csrfToken?: string } | null;
                if (!currentCsrfToken && typeof data?.csrfToken === 'string' && data.csrfToken.length > 0) {
                    currentCsrfToken = data.csrfToken;
                }
            }
        } catch {
            // Leave token empty and let the calling request surface the real network error.
        } finally {
            csrfBootstrapPromise = null;
        }

        return getCsrfToken();
    })();

    return csrfBootstrapPromise;
}

// Request Interceptor – JWT automatisch anfuegen + CSRF Token + Performance Tracking
apiClient.interceptors.request.use(
    async (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // TENANT: Attach BSNR header so backend can resolve the correct practice
        const bsnr = useSessionStore.getState().bsnr;
        if (bsnr) {
            config.headers['x-tenant-bsnr'] = bsnr;
        }

        // SECURITY: Add CSRF token for state-changing requests (HIGH-001 Fix)
        const safeMethods = ['get', 'head', 'options'];
        if (config.method && !safeMethods.includes(config.method.toLowerCase())) {
            let csrfToken = getCsrfToken();
            if (!csrfToken) {
                csrfToken = await ensureCsrfToken();
            }
            if (csrfToken) {
                config.headers['x-xsrf-token'] = csrfToken;
            }
        }

        // PERFORMANCE: Track request start time
        (config as unknown as Record<string, unknown>).metadata = { startTime: Date.now() };

        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor – Fehlerbehandlung mit Token-Refresh + Deduplication Cleanup
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown) {
    failedQueue.forEach(promise => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve();
        }
    });
    failedQueue = [];
}

/**
 * Type Guard für AbortError
 * Prüft ob ein Fehler ein AbortError ist (vom AbortController)
 */
function isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
        return error.name === 'AbortError' || error.name === 'CanceledError';
    }
    // Axios specific check
    if (typeof error === 'object' && error !== null) {
        const err = error as { code?: string; name?: string };
        return err.code === 'ERR_CANCELED' || err.name === 'CanceledError';
    }
    return false;
}

apiClient.interceptors.response.use(
    (response) => {
        updateCsrfTokenFromHeaders(response.headers);

        // PERFORMANCE: Track API response times
        const config = response.config as unknown as { metadata?: { startTime: number } };
        if (config.metadata?.startTime) {
            const duration = Date.now() - config.metadata.startTime;
            
            // Log slow API calls in development
            if (import.meta.env.DEV && duration > 500) {
                console.warn(`[Slow API] ${response.config.url}: ${duration}ms`);
            }
            
            // Add timing header for debugging
            response.headers['x-api-duration'] = String(duration);
        }
        return response;
    },
    async (error) => {
        updateCsrfTokenFromHeaders(error.response?.headers);
        
        // AbortError soll nicht als Fehler angezeigt werden - Silent reject
        if (isAbortError(error)) {
            return Promise.reject(error);
        }
        
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // If this is the refresh request itself failing, don't retry
            if (originalRequest.url?.includes('refresh-token')) {
                setAuthToken(null);
                localStorage.removeItem('anamnese_session_id');
                useSessionStore.getState().clearSession();
                if (window.location.pathname !== '/' && window.location.pathname !== '/arzt' && window.location.pathname !== '/mfa') {
                    window.location.href = '/';
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: () => {
                            if (originalRequest.headers?.Authorization) {
                                delete originalRequest.headers.Authorization;
                            }
                            resolve(apiClient(originalRequest));
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const { data } = await apiClient.post('/sessions/refresh-token');
                const newToken: string | undefined = data?.token;
                if (newToken) {
                    setAuthToken(newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                } else {
                    setAuthToken(null);
                    if (originalRequest.headers?.Authorization) {
                        delete originalRequest.headers.Authorization;
                    }
                }
                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                setAuthToken(null);
                localStorage.removeItem('anamnese_session_id');
                useSessionStore.getState().clearSession();
                if (window.location.pathname !== '/' && window.location.pathname !== '/arzt' && window.location.pathname !== '/mfa') {
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        // Show error toast for non-auth errors (401 is handled above via redirect)
        // ABER: Keine Toast für AbortError (vom AbortController)
        if (error.response?.status !== 401 && !isAbortError(error)) {
            const status = error.response?.status;
            const msg: string = error.response?.data?.error
                ?? error.response?.data?.message
                ?? (error.code === 'ECONNABORTED' ? 'Zeitüberschreitung — bitte erneut versuchen.' : 'Verbindungsfehler. Bitte Internetverbindung prüfen.');

            import('../store/toastStore').then(({ toast }) => {
                if (status && status >= 500) {
                    toast.error(msg, 'Serverfehler');
                } else if (status && status >= 400) {
                    toast.warning(msg);
                } else if (!status) {
                    toast.error(msg, 'Netzwerkfehler');
                }
            });
        }

        return Promise.reject(error);
    }
);

// ─── API Funktionen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface CreateSessionPayload {
    email: string;
    isNewPatient: boolean;
    gender: string;
    birthDate: string;
    selectedService: string;
    insuranceType?: string;
}

export interface SubmitAnswerPayload {
    atomId: string;
    value: unknown;
    timeSpentMs?: number;
    /** Present only when the answer was encrypted client-side (AES-256-GCM). */
    encrypted?: EncryptedPayload;
}

const CLIENT_SIDE_ENCRYPTED_ATOM_IDS = new Set([
    '3000',
    '3001',
    '3002',
    '3004',
    '9011',
]);

type DemoAnswer = {
    atomId: string;
    value: unknown;
    answeredAt: string;
    questionText?: string;
    section?: string;
    answerType?: string;
};

type DemoSession = {
    id: string;
    status: 'ACTIVE' | 'COMPLETED';
    selectedService: string;
    isNewPatient?: boolean;
    gender?: string;
    birthDate?: string;
    insuranceType?: string;
    patientName?: string;
    createdAt: string;
    completedAt?: string;
    answers: Record<string, DemoAnswer>;
    medications: unknown[];
    surgeries: unknown[];
    triageEvents: unknown[];
    chatMessages: unknown[];
    assignedDoctorId?: string;
};

type DemoDb = {
    sessions: Record<string, DemoSession>;
};

type DemoFeedbackEntry = {
    id: string;
    praxisId: string;
    sessionId?: string;
    rating: number;
    text?: string;
    categories: string[];
    containsThreats: boolean;
    escalationStatus: 'NONE' | 'REVIEW' | 'ESCALATED';
    createdAt: string;
};

const DEMO_DB_KEY = 'anamnese_demo_db_v1';
const DEMO_FEEDBACK_KEY = 'anamnese_demo_feedback_v1';
const DEMO_FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
    wartezeit: 'Wartezeit',
    kommunikation: 'Kommunikation',
    freundlichkeit: 'Freundlichkeit',
    organisation: 'Organisation',
    hygiene: 'Hygiene',
    kompetenz: 'Kompetenz',
};
const DEFAULT_DEMO_FEEDBACK: DemoFeedbackEntry[] = [
    {
        id: 'fb_demo_1',
        praxisId: 'default',
        sessionId: 'sess_demo_anna',
        rating: 5,
        text: 'Sehr freundlich, kaum Wartezeit und die Schritte waren sofort verständlich.',
        categories: ['freundlichkeit', 'organisation', 'wartezeit'],
        containsThreats: false,
        escalationStatus: 'NONE',
        createdAt: '2026-03-08T08:25:00.000Z',
    },
    {
        id: 'fb_demo_2',
        praxisId: 'default',
        sessionId: 'sess_demo_emir',
        rating: 4,
        text: 'Die digitale Anmeldung war super einfach, nur im Wartezimmer hätte ich gerne noch etwas mehr Orientierung gehabt.',
        categories: ['organisation', 'kommunikation'],
        containsThreats: false,
        escalationStatus: 'NONE',
        createdAt: '2026-03-08T10:12:00.000Z',
    },
    {
        id: 'fb_demo_3',
        praxisId: 'default',
        sessionId: 'sess_demo_lena',
        rating: 5,
        text: 'Mehrsprachige Hinweise waren hilfreich und das Team war sehr empathisch.',
        categories: ['kommunikation', 'freundlichkeit'],
        containsThreats: false,
        escalationStatus: 'NONE',
        createdAt: '2026-03-07T15:05:00.000Z',
    },
    {
        id: 'fb_demo_4',
        praxisId: 'default',
        sessionId: 'sess_demo_karl',
        rating: 3,
        text: 'Die Behandlung war gut, aber die Wartezeit war heute etwas länger als angekündigt.',
        categories: ['wartezeit', 'kompetenz'],
        containsThreats: false,
        escalationStatus: 'NONE',
        createdAt: '2026-03-07T12:45:00.000Z',
    },
    {
        id: 'fb_demo_5',
        praxisId: 'default',
        sessionId: 'sess_demo_mina',
        rating: 4,
        text: 'Sehr sauber, angenehme Atmosphäre und insgesamt gut organisiert.',
        categories: ['hygiene', 'organisation'],
        containsThreats: false,
        escalationStatus: 'NONE',
        createdAt: '2026-03-06T09:40:00.000Z',
    },
    {
        id: 'fb_demo_6',
        praxisId: 'default',
        sessionId: 'sess_demo_omer',
        rating: 2,
        text: 'Bitte die Wartezeit klarer kommunizieren. Das Arztgespräch selbst war kompetent.',
        categories: ['wartezeit', 'kommunikation', 'kompetenz'],
        containsThreats: false,
        escalationStatus: 'REVIEW',
        createdAt: '2026-03-05T16:20:00.000Z',
    },
];

function demoId(prefix: string): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readDemoDb(): DemoDb {
    try {
        const raw = localStorage.getItem(DEMO_DB_KEY);
        if (!raw) return { sessions: {} };
        const parsed = JSON.parse(raw);
        return {
            sessions: parsed?.sessions || {},
        };
    } catch {
        return { sessions: {} };
    }
}

function writeDemoDb(db: DemoDb): void {
    localStorage.setItem(DEMO_DB_KEY, JSON.stringify(db));
}

function cloneDemoFeedbackEntry(entry: DemoFeedbackEntry): DemoFeedbackEntry {
    return {
        ...entry,
        categories: [...entry.categories],
    };
}

function readDemoFeedback(): DemoFeedbackEntry[] {
    try {
        const raw = localStorage.getItem(DEMO_FEEDBACK_KEY);
        if (!raw) return DEFAULT_DEMO_FEEDBACK.map(cloneDemoFeedbackEntry);
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return DEFAULT_DEMO_FEEDBACK.map(cloneDemoFeedbackEntry);
        }
        return parsed.map((entry) => ({
            id: String(entry?.id || demoId('fb')),
            praxisId: String(entry?.praxisId || 'default'),
            sessionId: entry?.sessionId ? String(entry.sessionId) : undefined,
            rating: Number(entry?.rating || 0),
            text: entry?.text ? String(entry.text) : undefined,
            categories: Array.isArray(entry?.categories) ? entry.categories.map(String) : [],
            containsThreats: Boolean(entry?.containsThreats),
            escalationStatus: entry?.escalationStatus === 'ESCALATED' || entry?.escalationStatus === 'REVIEW' ? entry.escalationStatus : 'NONE',
            createdAt: String(entry?.createdAt || new Date().toISOString()),
        }));
    } catch {
        return DEFAULT_DEMO_FEEDBACK.map(cloneDemoFeedbackEntry);
    }
}

function writeDemoFeedback(entries: DemoFeedbackEntry[]): void {
    localStorage.setItem(DEMO_FEEDBACK_KEY, JSON.stringify(entries));
}

function getDemoFeedbackStats(praxisId: string) {
    const feedback = readDemoFeedback().filter((entry) => !praxisId || entry.praxisId === praxisId);

    if (feedback.length === 0) {
        return {
            total: 0,
            averageRating: 0,
            escalatedCount: 0,
            categories: [] as Array<{ name: string; count: number; avgRating: number }>,
        };
    }

    const categoriesMap = new Map<string, { count: number; totalRating: number }>();
    for (const entry of feedback) {
        for (const category of entry.categories) {
            const current = categoriesMap.get(category) || { count: 0, totalRating: 0 };
            current.count += 1;
            current.totalRating += entry.rating;
            categoriesMap.set(category, current);
        }
    }

    return {
        total: feedback.length,
        averageRating: Math.round((feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length) * 10) / 10,
        escalatedCount: feedback.filter((entry) => entry.escalationStatus !== 'NONE').length,
        categories: Array.from(categoriesMap.entries())
            .map(([category, stats]) => ({
                name: DEMO_FEEDBACK_CATEGORY_LABELS[category] || category,
                count: stats.count,
                avgRating: Math.round((stats.totalRating / stats.count) * 10) / 10,
            }))
            .sort((a, b) => b.count - a.count),
    };
}

function getDemoSessionOrThrow(sessionId: string): DemoSession {
    const db = readDemoDb();
    const session = db.sessions[sessionId];
    if (!session) {
        throw new Error('Session nicht gefunden');
    }
    return session;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
}

type QuestionItem = (typeof questions)[number];

function toMedicalAtom(question: QuestionItem) {
    return {
        id: question.id,
        module: 0,
        category: 0,
        questionText: question.question,
        description: question.description,
        answerType: question.type,
        section: question.section,
        orderIndex: question.order,
        placeholder: question.placeholder,
        options: question.options || null,
        validationRules: question.validation || null,
        branchingLogic: question.logic || null,
        isRedFlag: !!question.logic?.triage,
        isPII: ['0001', '0011', '3003', '9010'].includes(question.id),
    };
}

function demoError(message: string): never {
    const err = new Error(message) as Error & { response?: { data: { error: string } } };
    err.response = { data: { error: message } };
    throw err;
}

export const api = {
    // Sessions
    createSession: async (data: CreateSessionPayload) => {
        if (isDemoMode()) {
            const sessionId = demoId('sess');
            const token = demoId('demo_token');
            const db = readDemoDb();
            db.sessions[sessionId] = {
                id: sessionId,
                status: 'ACTIVE',
                selectedService: data.selectedService,
                isNewPatient: data.isNewPatient,
                gender: data.gender,
                birthDate: data.birthDate,
                insuranceType: data.insuranceType,
                createdAt: new Date().toISOString(),
                answers: {},
                medications: [],
                surgeries: [],
                triageEvents: [],
                chatMessages: [],
            };
            writeDemoDb(db);
            clearSessionEncryption();
            await initSessionEncryption(sessionId);
            return { sessionId, token, nextAtomIds: ['0000'] };
        }
        const response = await apiClient.post('/sessions', data);
        clearSessionEncryption();
        await initSessionEncryption(response.data.sessionId);
        return response.data;
    },

    getSessionState: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return {
                session: {
                    id: session.id,
                    isNewPatient: session.isNewPatient,
                    gender: session.gender,
                    birthDate: session.birthDate,
                    status: session.status,
                    selectedService: session.selectedService,
                    insuranceType: session.insuranceType,
                    createdAt: session.createdAt,
                    completedAt: session.completedAt || null,
                },
                answers: Object.fromEntries(
                    Object.entries(session.answers).map(([atomId, answer]) => [
                        atomId,
                        {
                            value: answer.value,
                            answeredAt: answer.answeredAt,
                            timeSpentMs: 0,
                        },
                    ])
                ),
                triageEvents: session.triageEvents,
                totalAnswers: Object.keys(session.answers).length,
            };
        }
        const response = await apiClient.get(`/sessions/${sessionId}/state`);
        return response.data;
    },

    submitSession: async (sessionId: string) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.status = 'COMPLETED';
            session.completedAt = new Date().toISOString();
            writeDemoDb(db);
            clearSessionEncryption();
            return {
                success: true,
                sessionId,
                completedAt: session.completedAt,
            };
        }
        const response = await apiClient.post(`/sessions/${sessionId}/submit`);
        clearSessionEncryption();
        return response.data;
    },

    // Antworten
    submitAnswer: async (sessionId: string, data: SubmitAnswerPayload) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');

            const question = questions.find((q) => q.id === data.atomId);
            session.answers[data.atomId] = {
                atomId: data.atomId,
                value: data.value,
                answeredAt: new Date().toISOString(),
                questionText: question?.question,
                section: question?.section,
                answerType: question?.type,
            };

            if (data.atomId === '0002' && typeof data.value === 'string') {
                session.gender = data.value;
            }
            if (data.atomId === '0003' && typeof data.value === 'string') {
                session.birthDate = data.value;
            }
            if (data.atomId === '2000' && typeof data.value === 'string') {
                session.insuranceType = data.value;
            }
            if (data.atomId === '0001' || data.atomId === '0011') {
                const lastName = String(session.answers['0001']?.value || '').trim();
                const firstName = String(session.answers['0011']?.value || '').trim();
                session.patientName = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;
            }

            writeDemoDb(db);

            const answerCount = Object.keys(session.answers).length;
            const totalQuestions = session.selectedService === 'Termin / Anamnese' ? 35 : 15;
            const progress = Math.min(100, Math.round((answerCount / totalQuestions) * 100));

            return {
                success: true,
                answerId: demoId('ans'),
                redFlags: null,
                progress,
            };
        }
        // ─── E2EE: encrypt answer value before sending to server ────
        // If a session encryption key is active (initSessionEncryption was called
        // on session start), the plaintext value is AES-256-GCM encrypted here.
        // The server receives only { atomId, encrypted: { iv, ciphertext, alg } }.
        // Plaintext NEVER transits the network — verifiable in the Network tab.
        const key = getActiveSessionKey();
        let payload: SubmitAnswerPayload;

        if (key && isSessionEncryptionActive() && CLIENT_SIDE_ENCRYPTED_ATOM_IDS.has(data.atomId)) {
            const encrypted = await encryptPayload(
                { value: data.value, atomId: data.atomId },
                key,
            );
            payload = {
                atomId: data.atomId,
                // Redact plaintext value — server stores only the encrypted blob
                value: '[E2EE]',
                timeSpentMs: data.timeSpentMs,
                encrypted,
            };
        } else {
            payload = data;
        }

        const response = await apiClient.post(`/answers/${sessionId}`, payload);
        return response.data;
    },

    submitAccidentDetails: async (sessionId: string, data: unknown) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.answers['2080'] = {
                atomId: '2080',
                value: data,
                answeredAt: new Date().toISOString(),
                questionText: 'Unfallmeldung (BG)',
                section: 'bg-unfall',
                answerType: 'bg-form',
            };
            writeDemoDb(db);
            return { success: true, accidentId: demoId('acc') };
        }
        const response = await apiClient.post(`/sessions/${sessionId}/accident`, data);
        return response.data;
    },

    getMedications: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { success: true, medications: session.medications || [] };
        }
        const response = await apiClient.get(`/sessions/${sessionId}/medications`);
        return response.data;
    },

    submitMedications: async (sessionId: string, medications: unknown[]) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.medications = medications;
            writeDemoDb(db);
            return { success: true, count: medications.length };
        }
        const response = await apiClient.post(`/sessions/${sessionId}/medications`, { medications });
        return response.data;
    },

    getSurgeries: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { success: true, surgeries: session.surgeries || [] };
        }
        const response = await apiClient.get(`/sessions/${sessionId}/surgeries`);
        return response.data;
    },

    submitSurgeries: async (sessionId: string, surgeries: unknown[]) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.surgeries = surgeries;
            writeDemoDb(db);
            return { success: true, count: surgeries.length };
        }
        const response = await apiClient.post(`/sessions/${sessionId}/surgeries`, { surgeries });
        return response.data;
    },

    // Fragen
    getAtoms: async (ids?: string[]) => {
        if (isDemoMode()) {
            const filtered = ids?.length
                ? questions.filter((q) => ids.includes(q.id))
                : questions;
            return { atoms: filtered.map(toMedicalAtom) };
        }
        const params = ids ? `?ids=${ids.join(',')}` : '';
        const response = await apiClient.get(`/atoms${params}`);
        return response.data;
    },

    // Arzt
    generateQrToken: async (service?: string) => {
        if (isDemoMode()) {
            return { token: demoId(`qr_${service || 'service'}`) };
        }
        const response = await apiClient.post('/sessions/qr-token', { service });
        return response.data;
    },

    arztLogin: async (username: string, password: string) => {
        if (isDemoMode()) {
            // Demo mode: accept any non-empty credentials for convenience
            if (!username || !password) {
                demoError('Ungültige Anmeldedaten');
            }
            return {
                user: { id: 'arzt_demo', username: username || 'demo.arzt', role: 'arzt', displayName: 'Demo Arzt' },
            };
        }
        const response = await apiClient.post('/arzt/login', { username, password });
        return response.data;
    },

    arztMe: async (): Promise<StaffUser> => {
        if (isDemoMode()) {
            return {
                id: 'arzt_demo',
                username: 'demo.arzt',
                displayName: 'Demo Arzt',
                role: 'arzt',
            };
        }
        const response = await apiClient.get('/arzt/me');
        return response.data.user;
    },

    arztLogout: async () => {
        if (isDemoMode()) {
            return { success: true };
        }
        const response = await apiClient.post('/arzt/logout');
        return response.data;
    },

    arztGetSessions: async () => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const sessions = Object.values(db.sessions)
                .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                .map((s) => ({
                    id: s.id,
                    patientName: s.patientName || null,
                    selectedService: s.selectedService,
                    gender: s.gender || null,
                    status: s.status,
                    createdAt: s.createdAt,
                    totalAnswers: Object.keys(s.answers).length,
                    unresolvedCritical: 0,
                    triageEvents: s.triageEvents || [],
                }));
            return { sessions };
        }
        const response = await apiClient.get('/arzt/sessions');
        return response.data;
    },

    arztGetSession: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            const answers = Object.values(session.answers).map((a) => ({
                id: demoId('a'),
                atomId: a.atomId,
                section: a.section || 'sonstige',
                questionText: a.questionText || `Frage ${a.atomId}`,
                answerType: a.answerType || typeof a.value,
                value: { data: a.value },
            }));
            return {
                id: session.id,
                patientName: session.patientName || null,
                selectedService: session.selectedService,
                gender: session.gender || null,
                status: session.status,
                createdAt: session.createdAt,
                triageEvents: session.triageEvents || [],
                answers,
            };
        }
        const response = await apiClient.get(`/arzt/sessions/${sessionId}`);
        return response.data.session ?? response.data;
    },

    arztAckTriage: async (triageId: string) => {
        if (isDemoMode()) {
            return { success: true, triageId };
        }
        const response = await apiClient.put(`/arzt/triage/${triageId}/ack`);
        return response.data;
    },

    arztGetSessionSummary: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return {
                summary: {
                    summary: `Demo-Zusammenfassung fuer ${session.selectedService}.`,
                    icdCodes: [
                        { code: 'Z00.0', label: 'Allgemeinuntersuchung' },
                    ],
                },
            };
        }
        const response = await apiClient.get(`/arzt/sessions/${sessionId}/summary`);
        return response.data;
    },

    updateSessionStatus: async (sessionId: string, status: string) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.status = status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE';
            if (session.status === 'COMPLETED') {
                session.completedAt = new Date().toISOString();
            }
            writeDemoDb(db);
            return { success: true, sessionId, status: session.status };
        }
        const response = await apiClient.put(`/arzt/sessions/${sessionId}/status`, { status });
        return response.data;
    },

    // MFA
    mfaGetSessions: async () => {
        if (isDemoMode()) {
            return api.arztGetSessions();
        }
        const response = await apiClient.get('/mfa/sessions');
        return response.data;
    },

    mfaGetDoctors: async () => {
        if (isDemoMode()) {
            return {
                doctors: [
                    { id: 'arzt_demo', displayName: 'Dr. Demo' },
                ],
            };
        }
        const response = await apiClient.get('/mfa/doctors');
        return response.data;
    },

    mfaAssignDoctor: async (sessionId: string, arztId: string) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');
            session.assignedDoctorId = arztId;
            writeDemoDb(db);
            return { success: true };
        }
        const response = await apiClient.post(`/mfa/sessions/${sessionId}/assign`, { arztId });
        return response.data;
    },

    mfaReceptionInbox: async () => {
        if (isDemoMode()) {
            const now = Date.now();
            return {
                items: [
                    {
                        sessionId: 'demo-session-1',
                        referenceId: 'REQ-DEMO123',
                        patientName: 'Max Beispiel',
                        service: 'Rezeptanfrage',
                        sessionStatus: 'COMPLETED',
                        patientEmailAvailable: true,
                        unresolvedCritical: 0,
                        triageLevel: 'NORMAL',
                        createdAt: new Date(now - 4 * 3600000).toISOString(),
                        completedAt: new Date(now - 3.5 * 3600000).toISOString(),
                        expiresAt: new Date(now + 26 * 24 * 3600000).toISOString(),
                        assignedArztName: 'Dr. Demo',
                        trackingStatus: 'GELESEN',
                        trackingStatusLabel: 'Gelesen',
                        practiceCopyStatus: { code: 'SENT', label: 'Per Praxis-E-Mail gesendet', at: new Date(now - 3 * 3600000).toISOString(), channel: 'SMTP', templateKey: null },
                        responseStatus: { code: 'PENDING', label: 'Antwort offen', at: null, channel: null, templateKey: null },
                        syncStatus: { code: 'IN_PROGRESS', label: 'In Bearbeitung', at: null, channel: null, templateKey: null },
                        lastActivityAt: new Date(now - 45 * 60000).toISOString(),
                        requiresManualFollowUp: false,
                    },
                    {
                        sessionId: 'demo-session-2',
                        referenceId: 'REQ-DEMO456',
                        patientName: 'Eva Muster',
                        service: 'Telefonanfrage',
                        sessionStatus: 'COMPLETED',
                        patientEmailAvailable: false,
                        unresolvedCritical: 1,
                        triageLevel: 'HIGH',
                        createdAt: new Date(now - 7 * 3600000).toISOString(),
                        completedAt: new Date(now - 6.5 * 3600000).toISOString(),
                        expiresAt: new Date(now + 24 * 24 * 3600000).toISOString(),
                        assignedArztName: null,
                        trackingStatus: 'VERSCHLUESSELT_VERSENDET',
                        trackingStatusLabel: 'Neu',
                        practiceCopyStatus: { code: 'READY', label: 'Apple Mail vorbereiten', at: new Date(now - 6 * 3600000).toISOString(), channel: 'MAILTO_SAFE_SUBJECT', templateKey: null },
                        responseStatus: { code: 'NO_EMAIL', label: 'Keine E-Mail hinterlegt', at: null, channel: 'NONE', templateKey: null },
                        syncStatus: { code: 'PENDING', label: 'Offen', at: null, channel: null, templateKey: null },
                        lastActivityAt: new Date(now - 2 * 3600000).toISOString(),
                        requiresManualFollowUp: true,
                    },
                ],
                stats: {
                    openCount: 2,
                    responsePendingCount: 1,
                    missingEmailCount: 1,
                    practiceCopyPendingCount: 0,
                    syncedCount: 0,
                    averageResponseMinutes: 0,
                },
            };
        }

        const response = await apiClient.get('/mfa/reception/inbox');
        return response.data;
    },

    mfaReceptionStats: async () => {
        if (isDemoMode()) {
            return {
                openCount: 2,
                responsePendingCount: 1,
                missingEmailCount: 1,
                practiceCopyPendingCount: 0,
                syncedCount: 0,
                averageResponseMinutes: 45,
            };
        }

        const response = await apiClient.get('/mfa/reception/stats');
        return response.data;
    },

    mfaReceptionDetail: async (sessionId: string) => {
        if (isDemoMode()) {
            return {
                item: {
                    sessionId,
                    referenceId: 'REQ-DEMO123',
                    patientName: 'Max Beispiel',
                    service: 'Rezeptanfrage',
                    sessionStatus: 'COMPLETED',
                    patientEmailAvailable: true,
                    unresolvedCritical: 0,
                    triageLevel: 'NORMAL',
                    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
                    completedAt: new Date(Date.now() - 3.5 * 3600000).toISOString(),
                    expiresAt: new Date(Date.now() + 26 * 24 * 3600000).toISOString(),
                    assignedArztName: 'Dr. Demo',
                    trackingStatus: 'GELESEN',
                    trackingStatusLabel: 'Gelesen',
                    practiceCopyStatus: { code: 'SENT', label: 'Per Praxis-E-Mail gesendet', at: new Date(Date.now() - 3 * 3600000).toISOString(), channel: 'SMTP', templateKey: null },
                    responseStatus: { code: 'PENDING', label: 'Antwort offen', at: null, channel: null, templateKey: null },
                    syncStatus: { code: 'IN_PROGRESS', label: 'In Bearbeitung', at: null, channel: null, templateKey: null },
                    lastActivityAt: new Date(Date.now() - 45 * 60000).toISOString(),
                    requiresManualFollowUp: false,
                },
                patientEmail: 'max@example.com',
                patientBirthDate: '1987-02-14T00:00:00.000Z',
                insuranceType: 'GKV',
                triageEvents: [],
                answerSections: [
                    {
                        key: 'rezepte',
                        label: 'Rezeptanfrage',
                        answers: [
                            { atomId: 'RX-1', questionText: 'Welches Medikament benötigen Sie?', value: 'Ramipril 5 mg' },
                            { atomId: 'RX-2', questionText: 'Seit wann nehmen Sie das Medikament?', value: 'Seit 2023' },
                        ],
                    },
                ],
                practiceCopyPreview: {
                    to: 'praxis@example.com',
                    subject: '[DiggAI] Praxispostfach REQ-DEMO123',
                    body: 'DIGGAI ONLINE-REZEPTION -> PRAXISPOSTFACH / TOMEDO\n\nReferenz: REQ-DEMO123',
                    mailtoUrl: 'mailto:praxis%40example.com?subject=%5BDiggAI%5D%20Praxispostfach%20REQ-DEMO123',
                    directSendAvailable: false,
                },
                responseTemplates: [
                    {
                        key: 'received',
                        label: 'Eingang bestätigen',
                        subject: '[REQ-DEMO123] Eingang Ihrer Anfrage',
                        body: 'Guten Tag Max Beispiel,\n\nwir bestätigen den Eingang Ihrer Anfrage.',
                        recommended: true,
                    },
                    {
                        key: 'completed',
                        label: 'Bearbeitet',
                        subject: '[REQ-DEMO123] Ihre Anfrage wurde bearbeitet',
                        body: 'Guten Tag Max Beispiel,\n\nIhre Anfrage wurde bearbeitet.',
                        recommended: false,
                    },
                ],
            };
        }

        const response = await apiClient.get(`/mfa/reception/inbox/${sessionId}`);
        return response.data;
    },

    mfaReceptionMarkRead: async (sessionId: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/read`);
        return response.data;
    },

    mfaReceptionMarkProcessed: async (sessionId: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/process`);
        return response.data;
    },

    mfaReceptionMarkCompleted: async (sessionId: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/complete`);
        return response.data;
    },

    mfaReceptionPracticeCopy: async (sessionId: string) => {
        if (isDemoMode()) {
            return {
                sent: false,
                mode: 'manual',
                mailtoUrl: 'mailto:praxis%40example.com?subject=%5BDiggAI%5D%20Praxispostfach%20REQ-DEMO123',
                manualCompose: {
                    to: 'praxis@example.com',
                    subject: '[DiggAI] Praxispostfach REQ-DEMO123',
                    body: 'Praxispostfach-Vorschau',
                },
                recipientAvailable: true,
            };
        }

        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/practice-copy`);
        return response.data;
    },

    mfaReceptionRespond: async (sessionId: string, data: { templateKey: string; customNote?: string | null; mode?: 'auto' | 'smtp' | 'manual' }) => {
        if (isDemoMode()) {
            return {
                sent: false,
                mode: 'manual',
                mailtoUrl: 'mailto:?subject=%5BREQ-DEMO123%5D%20Eingang%20Ihrer%20Anfrage',
                manualCompose: {
                    to: 'max@example.com',
                    subject: '[REQ-DEMO123] Eingang Ihrer Anfrage',
                    body: 'Guten Tag Max Beispiel,\n\nIhre Anfrage ist eingegangen.',
                },
                recipientAvailable: true,
            };
        }

        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/respond`, data);
        return response.data;
    },

    mfaReceptionConfirm: async (sessionId: string, kind: 'practice-copy' | 'response') => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/confirm`, { kind });
        return response.data;
    },

    mfaReceptionSms: async (sessionId: string, data: { to: string; body: string }) => {
        if (isDemoMode()) return { sent: true, mode: 'twilio', messageSid: 'SM_DEMO' };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/sms`, data);
        return response.data;
    },

    mfaReceptionStarface: async (sessionId: string, data: { callee: string; caller?: string }) => {
        if (isDemoMode()) return { initiated: true, mode: 'click2dial', callId: 'CALL_DEMO' };
        const response = await apiClient.post(`/mfa/reception/inbox/${sessionId}/starface-callback`, data);
        return response.data;
    },

    // Chats
    getChatMessages: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { messages: session.chatMessages || [] };
        }
        const response = await apiClient.get(`/chats/${sessionId}`);
        return response.data;
    },
    sendChatMessage: async (sessionId: string, text: string) => {
        if (isDemoMode()) {
            const db = readDemoDb();
            const session = db.sessions[sessionId];
            if (!session) demoError('Session nicht gefunden');

            const message = {
                id: demoId('chat'),
                text,
                from: 'Praxis-Team',
                fromRole: 'arzt',
                timestamp: new Date().toISOString(),
                channel: `patient-${sessionId}`,
            };

            session.chatMessages = [...(session.chatMessages || []), message];
            writeDemoDb(db);

            return { message };
        }

        const response = await apiClient.post(`/chats/${sessionId}`, { text });
        return response.data;
    },

    // Export (entschluesselte Daten â€“ nur fuer Arzt/MFA)
    exportSessionPDF: async (sessionId: string) => {
        const response = await apiClient.get(`/export/sessions/${sessionId}/export/pdf`, {
            responseType: 'blob',
        });
        triggerBlobDownload(response.data as Blob, `Anamnese_${sessionId}.pdf`);
    },

    exportSessionCSV: async (sessionId: string) => {
        const response = await apiClient.get(`/export/sessions/${sessionId}/export/csv`, {
            responseType: 'blob',
        });
        triggerBlobDownload(response.data as Blob, `Anamnese_${sessionId}.csv`);
    },

    exportSessionTXT: async (sessionId: string) => {
        const response = await apiClient.get(`/export/sessions/${sessionId}/export/txt`, {
            responseType: 'blob',
        });
        triggerBlobDownload(response.data as Blob, `Anamnese_${sessionId}.txt`);
    },

    exportSessionJSON: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { session };
        }
        const response = await apiClient.get(`/export/sessions/${sessionId}/export/json`);
        return response.data;
    },

    requestEncryptedPackage: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            const blob = new Blob([JSON.stringify({
                version: 'demo-package-v1',
                sessionId,
                exportedAt: new Date().toISOString(),
                data: session,
            }, null, 2)], { type: 'application/json' });
            triggerBlobDownload(blob, `Anamnese_${sessionId}_secure.json`);
            return { success: true };
        }

        const response = await apiClient.get(`/export/sessions/${sessionId}/package`, {
            responseType: 'blob',
        });
        triggerBlobDownload(response.data as Blob, `Anamnese_${sessionId}_secure.json`);
        return { success: true };
    },

    sendPackageLink: async (sessionId: string, email?: string) => {
        const response = await apiClient.post(`/export/sessions/${sessionId}/package-link`, email ? { email } : {});
        return response.data;
    },

    importEncryptedPackage: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/mfa/imports', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // ─── Queue / Wartezimmer ──────────────────────────────────
    queueJoin: async (data: { sessionId: string; patientName: string; service: string; priority?: string }) => {
        if (isDemoMode()) {
            return { entry: { id: 'q-demo', sessionId: data.sessionId, patientName: data.patientName, service: data.service, priority: data.priority || 'NORMAL', status: 'WAITING', position: 1, joinedAt: new Date().toISOString(), estimatedWaitMinutes: 0 } };
        }
        const response = await apiClient.post('/queue/join', data);
        return response.data;
    },

    queueList: async () => {
        if (isDemoMode()) {
            return { queue: [], stats: { waiting: 0, called: 0, inTreatment: 0, total: 0 } };
        }
        const response = await apiClient.get('/queue');
        return response.data;
    },

    queuePosition: async (sessionId: string) => {
        if (isDemoMode()) {
            return { position: null, status: null };
        }
        const response = await apiClient.get(`/queue/position/${sessionId}`);
        return response.data;
    },

    queueCall: async (id: string) => {
        if (isDemoMode()) return { entry: { id, status: 'CALLED' } };
        const response = await apiClient.put(`/queue/${id}/call`);
        return response.data;
    },

    queueTreat: async (id: string) => {
        if (isDemoMode()) return { entry: { id, status: 'IN_TREATMENT' } };
        const response = await apiClient.put(`/queue/${id}/treat`);
        return response.data;
    },

    queueDone: async (id: string) => {
        if (isDemoMode()) return { entry: { id, status: 'DONE' } };
        const response = await apiClient.put(`/queue/${id}/done`);
        return response.data;
    },

    queueRemove: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/queue/${id}`);
        return response.data;
    },

    queueFeedback: async (id: string, rating: number) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put(`/queue/${id}/feedback`, { rating });
        return response.data;
    },

    queueFlowConfig: async (sessionId: string) => {
        if (isDemoMode()) {
            return { level: 0, breakFrequency: 999, breakDuration: 0, contentTypes: [], extraQuestionsEnabled: false };
        }
        const response = await apiClient.get(`/queue/flow-config/${sessionId}`);
        return response.data;
    },

    // ─── Waiting Content ────────────────────────────────────────
    getWaitingContent: async (params?: { lang?: string; waitMin?: number; exclude?: string; category?: string; limit?: number }) => {
        if (isDemoMode()) {
            return { items: [] };
        }
        const response = await apiClient.get('/content/waiting', { params });
        return response.data;
    },

    trackContentView: async (contentId: string, sessionId: string, durationSec?: number) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/content/waiting/${contentId}/view`, { sessionId, durationSec });
        return response.data;
    },

    likeContent: async (contentId: string, sessionId: string) => {
        if (isDemoMode()) return { success: true, newLikeCount: 1 };
        const response = await apiClient.post(`/content/waiting/${contentId}/like`, { sessionId });
        return response.data;
    },

    trackQuizAnswer: async (contentId: string, sessionId: string, selectedOption: number, correct: boolean) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post(`/content/waiting/quiz/${contentId}/answer`, { sessionId, selectedOption, correct });
        return response.data;
    },

    getContentAnalytics: async (days?: number) => {
        if (isDemoMode()) return { totalViews: 0, totalLikes: 0, quizAccuracy: null, topContent: [] };
        const response = await apiClient.get('/content/waiting/analytics', { params: { days } });
        return response.data;
    },

    // ─── Admin Dashboard ─────────────────────────────────────────

    adminStats: async () => {
        if (isDemoMode()) {
            return { totalPatients: 42, totalSessions: 156, activeSessions: 3, completedSessions: 148, sessionsToday: 8, completionRate: 95, avgCompletionMinutes: 7, unresolvedTriageEvents: 1, totalUsers: 5 };
        }
        const response = await apiClient.get('/admin/stats');
        return response.data;
    },

    adminTimeline: async (days: number = 30) => {
        if (isDemoMode()) {
            return Array.from({ length: days }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (days - 1 - i));
                return { date: d.toISOString().split('T')[0], total: Math.floor(Math.random() * 12) + 2, completed: Math.floor(Math.random() * 10) + 1, active: Math.floor(Math.random() * 3) };
            });
        }
        const response = await apiClient.get('/admin/sessions/timeline', { params: { days } });
        return response.data;
    },

    adminServiceAnalytics: async () => {
        if (isDemoMode()) {
            return [{ service: 'Allgemeinmedizin', count: 45 }, { service: 'Orthopädie', count: 32 }, { service: 'Dermatologie', count: 18 }, { service: 'Kardiologie', count: 15 }];
        }
        const response = await apiClient.get('/admin/analytics/services');
        return response.data;
    },

    adminTriageAnalytics: async (days: number = 30) => {
        if (isDemoMode()) { return []; }
        const response = await apiClient.get('/admin/analytics/triage', { params: { days } });
        return response.data;
    },

    adminAuditLog: async (params?: { page?: number; limit?: number; action?: string; userId?: string; dateFrom?: string; dateTo?: string; search?: string }) => {
        if (isDemoMode()) {
            return { entries: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
        }
        const response = await apiClient.get('/admin/audit-log', { params });
        return response.data;
    },

    // ─── Admin Users ────────────────────────────────────────────

    adminUsers: async () => {
        if (isDemoMode()) {
            return [
                { id: 'u1', username: 'admin', displayName: 'Dr. Admin', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString(), _count: { assignedSessions: 0 } },
                { id: 'u2', username: 'arzt1', displayName: 'Dr. Müller', role: 'ARZT', isActive: true, createdAt: new Date().toISOString(), _count: { assignedSessions: 12 } },
                { id: 'u3', username: 'mfa1', displayName: 'Lisa Schmidt', role: 'MFA', isActive: true, createdAt: new Date().toISOString(), _count: { assignedSessions: 45 } },
            ];
        }
        const response = await apiClient.get('/admin/users');
        return response.data;
    },

    adminCreateUser: async (data: { username: string; password: string; displayName: string; role: string }) => {
        if (isDemoMode()) return { id: 'demo-new', ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/admin/users', data);
        return response.data;
    },

    adminUpdateUser: async (id: string, data: { displayName?: string; role?: string; isActive?: boolean; password?: string; pin?: string }) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/admin/users/${id}`, data);
        return response.data;
    },

    adminDeleteUser: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/admin/users/${id}`);
        return response.data;
    },

    // ─── Admin Permissions ──────────────────────────────────────

    adminPermissions: async () => {
        if (isDemoMode()) { return []; }
        const response = await apiClient.get('/admin/permissions');
        return response.data;
    },

    adminRolePermissions: async (role: string) => {
        if (isDemoMode()) { return []; }
        const response = await apiClient.get(`/admin/roles/${role}/permissions`);
        return response.data;
    },

    adminSetRolePermissions: async (role: string, permissionIds: string[]) => {
        if (isDemoMode()) return { success: true, count: permissionIds.length };
        const response = await apiClient.put(`/admin/roles/${role}/permissions`, { permissionIds });
        return response.data;
    },

    adminSetUserPermissions: async (userId: string, permissionCodes: string[]) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put(`/admin/users/${userId}/permissions`, { permissionCodes });
        return response.data;
    },

    adminCheckPermission: async (code: string) => {
        if (isDemoMode()) return { allowed: true };
        const response = await apiClient.get('/admin/permissions/check', { params: { code } });
        return response.data;
    },

    // ─── Admin Content CRUD ─────────────────────────────────────

    adminContentList: async (params?: { type?: string; category?: string }) => {
        if (isDemoMode()) { return []; }
        const response = await apiClient.get('/admin/content', { params });
        return response.data;
    },

    adminContentCreate: async (data: { type: string; category: string; title: string; body: string; quizData?: unknown; displayDurationSec?: number; priority?: number; isActive?: boolean; seasonal?: string; language?: string }) => {
        if (isDemoMode()) return { id: 'demo-content', ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/admin/content', data);
        return response.data;
    },

    adminContentUpdate: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/admin/content/${id}`, data);
        return response.data;
    },

    adminContentDelete: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/admin/content/${id}`);
        return response.data;
    },

    // ─── ROI ────────────────────────────────────────────────────

    roiToday: async () => {
        if (isDemoMode()) {
            return { date: new Date().toISOString().split('T')[0], patientsServed: 8, sessionsCompleted: 8, avgCompletionMinutes: 7.2, mfaMinutesSaved: 96, costSaving: 36, licenseCostPerDay: 14.24, netROI: 21.76, cumulativeMonthROI: 435.2 };
        }
        const response = await apiClient.get('/roi/today');
        return response.data;
    },

    roiHistory: async (period: 'week' | 'month' | 'year' = 'month') => {
        if (isDemoMode()) { return { snapshots: [], summary: { avgDaily: 0, total: 0, trend: 0 } }; }
        const response = await apiClient.get('/roi/history', { params: { period } });
        return response.data;
    },

    roiConfig: async () => {
        if (isDemoMode()) { return { mfaHourlyCost: 22.5, avgManualIntakeMin: 12, monthlyLicenseCost: 299, workdaysPerMonth: 21 }; }
        const response = await apiClient.get('/roi/config');
        return response.data;
    },

    roiUpdateConfig: async (data: { mfaHourlyCost?: number; avgManualIntakeMin?: number; monthlyLicenseCost?: number; workdaysPerMonth?: number }) => {
        if (isDemoMode()) return data;
        const response = await apiClient.put('/roi/config', data);
        return response.data;
    },

    roiProjection: async (months: number = 12) => {
        if (isDemoMode()) { return { monthly: [] }; }
        const response = await apiClient.get('/roi/projection', { params: { months } });
        return response.data;
    },

    // ─── Wunschbox ──────────────────────────────────────────────

    wunschboxSubmit: async (text: string) => {
        if (isDemoMode()) return { id: 'demo-wish', originalText: text, status: 'PENDING', createdAt: new Date().toISOString() };
        const response = await apiClient.post('/wunschbox', { text });
        return response.data;
    },

    wunschboxList: async (params?: { page?: number; limit?: number; status?: string }) => {
        if (isDemoMode()) { return { entries: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } }; }
        const response = await apiClient.get('/wunschbox', { params });
        return response.data;
    },

    wunschboxMy: async () => {
        if (isDemoMode()) { return []; }
        const response = await apiClient.get('/wunschbox/my');
        return response.data;
    },

    wunschboxProcess: async (id: string) => {
        if (isDemoMode()) return { id, status: 'AI_PROCESSED', aiParsedChanges: [] };
        const response = await apiClient.post(`/wunschbox/${id}/process`);
        return response.data;
    },

    wunschboxReview: async (id: string, data: { status: string; adminNotes?: string }) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/wunschbox/${id}/review`, data);
        return response.data;
    },

    wunschboxExport: async (id: string) => {
        if (isDemoMode()) return { spec: {} };
        const response = await apiClient.post(`/wunschbox/${id}/export`);
        return response.data;
    },

    // ─── Atoms Builder ──────────────────────────────────────────

    atomSingle: async (id: string) => {
        if (isDemoMode()) return { id, questionText: 'Demo Frage', answerType: 'text', isActive: true };
        const response = await apiClient.get(`/atoms/${id}`);
        return response.data;
    },

    atomsReorder: async (orders: Array<{ id: string; orderIndex: number }>) => {
        if (isDemoMode()) return { success: true, updated: orders.length };
        const response = await apiClient.put('/atoms/reorder', { orders });
        return response.data;
    },

    atomToggle: async (id: string, isActive: boolean) => {
        if (isDemoMode()) return { id, isActive };
        const response = await apiClient.put(`/atoms/${id}/toggle`, { isActive });
        return response.data;
    },

    atomDraftCreate: async (data: { atomId?: string; draftData: Record<string, unknown>; changeNote?: string }) => {
        if (isDemoMode()) return { id: 'demo-draft', ...data, status: 'DRAFT', createdAt: new Date().toISOString() };
        const response = await apiClient.post('/atoms/draft', data);
        return response.data;
    },

    atomDraftsList: async (status: string = 'DRAFT') => {
        if (isDemoMode()) { return { drafts: [] }; }
        const response = await apiClient.get('/atoms/drafts', { params: { status } });
        return response.data;
    },

    atomDraftPublish: async (id: string) => {
        if (isDemoMode()) return { atom: {}, draft: { status: 'PUBLISHED' } };
        const response = await apiClient.put(`/atoms/draft/${id}/publish`);
        return response.data;
    },

    atomDraftDelete: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/atoms/draft/${id}`);
        return response.data;
    },

    // ─── Patient Identification (Returning Patient Fast-Track) ──

    identifyPatient: async (data: { birthDate: string; insuranceNumber: string; patientNumber?: string }) => {
        if (isDemoMode()) {
            // Demo: simulate a found patient
            return {
                found: true,
                patient: {
                    id: 'demo-patient-1',
                    patientNumber: 'P-10001',
                    name: 'Max Mustermann',
                    gender: 'M',
                    birthDate: data.birthDate,
                    requiresPattern: false,
                    isVerified: true,
                },
            };
        }
        const response = await apiClient.post('/patients/identify', data);
        return response.data;
    },

    verifyPattern: async (data: { patientId: string; patternHash: string }) => {
        if (isDemoMode()) {
            return { verified: true };
        }
        const response = await apiClient.post('/patients/verify-pattern', data);
        return response.data;
    },

    setPattern: async (patientId: string, patternHash: string) => {
        if (isDemoMode()) {
            return { success: true };
        }
        const response = await apiClient.post(`/patients/${patientId}/pattern`, { patternHash });
        return response.data;
    },

    certifyPatient: async (sessionId: string, data: { insuranceNumber: string; birthDate: string; patientName?: string; gender?: string }) => {
        if (isDemoMode()) {
            return { success: true, patientNumber: 'P-10001', patientId: 'demo-patient-1' };
        }
        const response = await apiClient.post(`/patients/${sessionId}/certify`, data);
        return response.data;
    },

    getPatient: async (id: string) => {
        if (isDemoMode()) {
            return { id, patientNumber: 'P-10001', gender: 'M', birthDate: '1985-03-15', verifiedAt: new Date().toISOString(), _count: { sessions: 3 } };
        }
        const response = await apiClient.get(`/patients/${id}`);
        return response.data;
    },

    // ─── PVS / FHIR Integration ──────────────────────────────────

    pvsConnections: async () => {
        if (isDemoMode()) {
            return [
                { id: 'pvs-demo-1', praxisId: 'praxis-1', pvsType: 'CGM_M1', protocol: 'GDT', name: 'CGM M1 PRO (Demo)', isActive: true, lastSyncAt: new Date().toISOString(), config: { importDir: 'C:\\PVS\\Import', exportDir: 'C:\\PVS\\Export' }, createdAt: new Date().toISOString() },
            ];
        }
        const response = await apiClient.get('/pvs/connection');
        return response.data;
    },

    pvsCreateConnection: async (data: { pvsType: string; protocol: string; name: string; config: Record<string, unknown> }) => {
        if (isDemoMode()) return { id: demoId('pvs'), ...data, isActive: true, createdAt: new Date().toISOString(), testResult: { success: true, message: 'Demo-Verbindung OK' } };
        const response = await apiClient.post('/pvs/connection', data);
        return response.data;
    },

    pvsUpdateConnection: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/pvs/connection/${id}`, data);
        return response.data;
    },

    pvsTestConnection: async (id: string) => {
        if (isDemoMode()) return { success: true, message: 'Demo-Verbindung erfolgreich', latencyMs: 42 };
        const response = await apiClient.post(`/pvs/connection/${id}/test`);
        return response.data;
    },

    pvsDeleteConnection: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/pvs/connection/${id}`);
        return response.data;
    },

    pvsCapabilities: async (id: string) => {
        if (isDemoMode()) return { canImportPatients: true, canExportResults: true, canReceiveOrders: true, canSearchPatients: true, supportedProtocol: 'GDT', pvsType: 'CGM_M1' };
        const response = await apiClient.get(`/pvs/connection/${id}/capabilities`);
        return response.data;
    },

    pvsExportSession: async (sessionId: string, connectionId?: string) => {
        if (isDemoMode()) return { success: true, transferId: demoId('xfer'), direction: 'EXPORT', status: 'SUCCESS', recordCount: 12, message: 'Demo-Export erfolgreich' };
        const response = await apiClient.post(`/pvs/export/session/${sessionId}`, connectionId ? { connectionId } : {});
        return response.data;
    },

    pvsExportBatch: async (sessionIds: string[], connectionId?: string) => {
        if (isDemoMode()) return { results: sessionIds.map(sid => ({ sessionId: sid, success: true, transferId: demoId('xfer') })), totalSuccess: sessionIds.length, totalFailed: 0 };
        const response = await apiClient.post('/pvs/export/batch', { sessionIds, connectionId });
        return response.data;
    },

    pvsImportPatient: async (externalId: string, connectionId?: string) => {
        if (isDemoMode()) return { success: true, patient: { externalId, name: 'Demo Patient', birthDate: '1985-03-15', gender: 'M' } };
        const response = await apiClient.post('/pvs/import/patient', { externalId, connectionId });
        return response.data;
    },

    pvsPatientLinks: async (patientId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/pvs/patient-link/${patientId}`);
        return response.data;
    },

    pvsCreatePatientLink: async (data: { patientId: string; connectionId: string; externalPatientId: string }) => {
        if (isDemoMode()) return { id: demoId('link'), ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/pvs/patient-link', data);
        return response.data;
    },

    pvsDeletePatientLink: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/pvs/patient-link/${id}`);
        return response.data;
    },

    pvsTransfers: async (params?: { page?: number; limit?: number; direction?: string; status?: string; connectionId?: string }) => {
        if (isDemoMode()) return { transfers: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
        const response = await apiClient.get('/pvs/transfers', { params });
        return response.data;
    },

    pvsTransferDetail: async (id: string) => {
        if (isDemoMode()) return { id, direction: 'EXPORT', status: 'SUCCESS', recordCount: 12, createdAt: new Date().toISOString() };
        const response = await apiClient.get(`/pvs/transfers/${id}`);
        return response.data;
    },

    pvsRetryTransfer: async (id: string) => {
        if (isDemoMode()) return { success: true, newTransferId: demoId('xfer') };
        const response = await apiClient.post(`/pvs/transfers/${id}/retry`);
        return response.data;
    },

    pvsTransferStats: async () => {
        if (isDemoMode()) return { today: 0, successRate: 100, byStatus: { SUCCESS: 0, FAILED: 0, PENDING: 0 } };
        const response = await apiClient.get('/pvs/transfers/stats');
        return response.data;
    },

    pvsMappings: async (connectionId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/pvs/mappings/${connectionId}`);
        return response.data;
    },

    pvsSaveMappings: async (connectionId: string, mappings: Array<{ sourceField: string; targetField: string; transform?: string }>) => {
        if (isDemoMode()) return { success: true, count: mappings.length };
        const response = await apiClient.put(`/pvs/mappings/${connectionId}`, { mappings });
        return response.data;
    },

    pvsResetMappings: async (connectionId: string) => {
        if (isDemoMode()) return { success: true, count: 9 };
        const response = await apiClient.post(`/pvs/mappings/${connectionId}/reset`);
        return response.data;
    },

    pvsMappingPreview: async (connectionId: string, sessionId: string) => {
        if (isDemoMode()) return { befundtext: ['Demo-Befundtext Zeile 1', 'Demo-Befundtext Zeile 2'], fieldCount: 12 };
        const response = await apiClient.post('/pvs/mappings/preview', { connectionId, sessionId });
        return response.data;
    },

    // ─── Therapy / Therapieplan ─────────────────────────────────

    therapyCreatePlan: async (data: { sessionId: string; patientId: string; title: string; diagnosis?: string; icdCodes?: string[]; summary?: string; templateId?: string; startDate?: string; targetEndDate?: string }) => {
        if (isDemoMode()) return { id: demoId('tplan'), ...data, status: 'DRAFT', icdCodes: data.icdCodes || [], aiGenerated: false, measures: [], alerts: [], createdAt: new Date().toISOString() };
        const response = await apiClient.post('/therapy/plans', data);
        return response.data;
    },
    therapyGetPlan: async (id: string) => {
        if (isDemoMode()) return { id, title: 'Demo-Therapieplan', status: 'DRAFT', diagnosis: 'J06.9', icdCodes: ['J06.9'], measures: [], alerts: [], patient: { patientNumber: 'P-10001' }, createdAt: new Date().toISOString() };
        const response = await apiClient.get(`/therapy/plans/${id}`);
        return response.data;
    },
    therapyUpdatePlan: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/therapy/plans/${id}`, data);
        return response.data;
    },
    therapyDeletePlan: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/therapy/plans/${id}`);
        return response.data;
    },
    therapyPlansByPatient: async (patientId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/therapy/plans/patient/${patientId}`);
        return response.data;
    },
    therapyPlansBySession: async (sessionId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/therapy/plans/session/${sessionId}`);
        return response.data;
    },
    therapyUpdateStatus: async (id: string, status: string) => {
        if (isDemoMode()) return { id, status };
        const response = await apiClient.put(`/therapy/plans/${id}/status`, { status });
        return response.data;
    },

    // Measures
    therapyAddMeasure: async (planId: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id: demoId('meas'), planId, ...data, status: 'PLANNED', createdAt: new Date().toISOString() };
        const response = await apiClient.post(`/therapy/plans/${planId}/measures`, data);
        return response.data;
    },
    therapyUpdateMeasure: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/therapy/measures/${id}`, data);
        return response.data;
    },
    therapyDeleteMeasure: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/therapy/measures/${id}`);
        return response.data;
    },
    therapyUpdateMeasureStatus: async (id: string, status: string) => {
        if (isDemoMode()) return { id, status };
        const response = await apiClient.put(`/therapy/measures/${id}/status`, { status });
        return response.data;
    },
    therapyReorderMeasures: async (planId: string, measureIds: string[]) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put(`/therapy/plans/${planId}/measures/reorder`, { measureIds });
        return response.data;
    },

    // Templates
    therapyTemplates: async (category?: string) => {
        if (isDemoMode()) return [
            { id: 'tpl-1', name: 'Akuter Infekt', category: 'Allgemeinmedizin', icdCodes: ['J06.9'], measures: [{ type: 'MEDICATION', title: 'Ibuprofen 400mg', priority: 0 }], usageCount: 12, isDefault: true },
            { id: 'tpl-2', name: 'Rückenschmerzen', category: 'Orthopädie', icdCodes: ['M54.5'], measures: [{ type: 'REFERRAL', title: 'Physiotherapie', priority: 0 }], usageCount: 8, isDefault: false },
        ];
        const response = await apiClient.get('/therapy/templates', { params: category ? { category } : {} });
        return response.data;
    },
    therapyGetTemplate: async (id: string) => {
        if (isDemoMode()) return { id, name: 'Demo-Template', measures: [] };
        const response = await apiClient.get(`/therapy/templates/${id}`);
        return response.data;
    },
    therapyCreateTemplate: async (data: Record<string, unknown>) => {
        if (isDemoMode()) return { id: demoId('tpl'), ...data, usageCount: 0, isActive: true };
        const response = await apiClient.post('/therapy/templates', data);
        return response.data;
    },
    therapyApplyTemplate: async (templateId: string, planId: string) => {
        if (isDemoMode()) return { success: true, addedMeasures: 3 };
        const response = await apiClient.post(`/therapy/templates/${templateId}/apply`, { planId });
        return response.data;
    },

    // Alerts
    therapyAlerts: async (params?: { page?: number; severity?: string; unreadOnly?: boolean }) => {
        if (isDemoMode()) return { alerts: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } };
        const response = await apiClient.get('/therapy/alerts', { params });
        return response.data;
    },
    therapyAlertsByPatient: async (patientId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/therapy/alerts/patient/${patientId}`);
        return response.data;
    },
    therapyAlertRead: async (id: string) => {
        if (isDemoMode()) return { id, isRead: true };
        const response = await apiClient.put(`/therapy/alerts/${id}/read`);
        return response.data;
    },
    therapyAlertDismiss: async (id: string, reason?: string) => {
        if (isDemoMode()) return { id, isDismissed: true };
        const response = await apiClient.put(`/therapy/alerts/${id}/dismiss`, { reason });
        return response.data;
    },
    therapyAlertAction: async (id: string, action: string) => {
        if (isDemoMode()) return { id, actionTaken: action };
        const response = await apiClient.put(`/therapy/alerts/${id}/action`, { action });
        return response.data;
    },
    therapyEvaluateAlerts: async (sessionId: string, patientId: string, planId?: string) => {
        if (isDemoMode()) return { evaluated: 0, created: 0, alerts: [] };
        const response = await apiClient.post('/therapy/alerts/evaluate', { sessionId, patientId, planId });
        return response.data;
    },

    // Anonymization
    therapyAnon: async (patientId: string) => {
        if (isDemoMode()) return { id: demoId('anon'), patientId, pseudonym: 'PAT-DEMO-X1Y2' };
        const response = await apiClient.get(`/therapy/anon/${patientId}`);
        return response.data;
    },

    // Analytics
    therapyAnalytics: async (days?: number) => {
        if (isDemoMode()) return { period: '30 Tage', totalPlans: 0, statusDistribution: {}, topDiagnoses: [], measureTypes: {}, avgMeasuresPerPlan: 0, avgPlanDurationDays: 0, aiUsage: { aiGeneratedPlans: 0, avgAiConfidence: 0, arztModificationRate: 0 }, alertStats: { total: 0, bySeverity: {}, avgResponseTimeMinutes: 0, dismissRate: 0 } };
        const response = await apiClient.get('/therapy/analytics', { params: days ? { days } : {} });
        return response.data;
    },

    // AI Engine
    therapyAiStatus: async () => {
        if (isDemoMode()) return { available: false, provider: 'none', model: null, online: false };
        const response = await apiClient.get('/therapy/ai/status');
        return response.data;
    },
    therapyAiSuggest: async (sessionId: string) => {
        if (isDemoMode()) return { available: false, mode: 'lite', suggestion: null };
        const response = await apiClient.post('/therapy/ai/suggest', { sessionId });
        return response.data;
    },
    therapyAiSummarize: async (sessionId: string) => {
        if (isDemoMode()) return { available: false, mode: 'lite', summary: null };
        const response = await apiClient.post(`/therapy/ai/summarize/${sessionId}`);
        return response.data;
    },
    therapyAiIcdSuggest: async (symptoms: string) => {
        if (isDemoMode()) return { available: false, mode: 'lite', suggestions: [] };
        const response = await apiClient.post('/therapy/ai/icd-suggest', { symptoms });
        return response.data;
    },

    // PVS export
    therapyExportPvs: async (planId: string) => {
        if (isDemoMode()) return { success: true, message: 'Demo-Export', planId };
        const response = await apiClient.post(`/therapy/plans/${planId}/export-pvs`);
        return response.data;
    },

    // ─── Episoden (Behandlungsepisoden) ─────────────────────────

    episodeCreate: async (data: { patientId: string; type: string; title: string; description?: string; icdCodes?: string[]; primaryDiagnosis?: string; patientGoals?: string; patientWishes?: string; communicationPref?: string; languagePref?: string; preferredArztId?: string }) => {
        if (isDemoMode()) return { id: demoId('ep'), ...data, status: 'OPEN', icdCodes: data.icdCodes || [], sessions: [], preferences: [], notes: [], openedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), createdAt: new Date().toISOString() };
        const response = await apiClient.post('/episodes', data);
        return response.data;
    },
    episodeGetById: async (id: string) => {
        if (isDemoMode()) return { id, title: 'Demo-Episode', type: 'AKUT', status: 'OPEN', sessions: [], preferences: [], notes: [], icdCodes: [], openedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString() };
        const response = await apiClient.get(`/episodes/${id}`);
        return response.data;
    },
    episodeUpdate: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/episodes/${id}`, data);
        return response.data;
    },
    episodeGetByPatient: async (patientId: string, params?: { status?: string }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/episodes/patient/${patientId}`, { params });
        return response.data;
    },
    episodeGetActiveForPersonalization: async (patientId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/episodes/patient/${patientId}/active`);
        return response.data;
    },
    episodeLinkSession: async (episodeId: string, sessionId: string) => {
        if (isDemoMode()) return { id: sessionId, episodeId };
        const response = await apiClient.post(`/episodes/${episodeId}/sessions/${sessionId}`);
        return response.data;
    },
    episodeUnlinkSession: async (episodeId: string, sessionId: string) => {
        if (isDemoMode()) return { id: sessionId, episodeId: null };
        const response = await apiClient.delete(`/episodes/${episodeId}/sessions/${sessionId}`);
        return response.data;
    },
    episodeSetPreference: async (episodeId: string, data: { category: string; key: string; value: string; isEncrypted?: boolean; setBy: string; setByUserId?: string; validUntil?: string }) => {
        if (isDemoMode()) return { id: demoId('pref'), episodeId, ...data, isActive: true };
        const response = await apiClient.post(`/episodes/${episodeId}/preferences`, data);
        return response.data;
    },
    episodeDeactivatePreference: async (episodeId: string, preferenceId: string) => {
        if (isDemoMode()) return { id: preferenceId, isActive: false };
        const response = await apiClient.delete(`/episodes/${episodeId}/preferences/${preferenceId}`);
        return response.data;
    },
    episodeAddNote: async (episodeId: string, data: { type: string; content: string; authorId?: string; authorName?: string; visibleToPatient?: boolean }) => {
        if (isDemoMode()) return { id: demoId('note'), episodeId, ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post(`/episodes/${episodeId}/notes`, data);
        return response.data;
    },

    // ─── Patient Portal (PWA) ───────────────────────────────────

    pwaRegister: async (data: { patientNumber: string; birthDate: string; password: string; email?: string; phone?: string; pin?: string }) => {
        if (isDemoMode()) return { accountId: demoId('pacc'), patientId: demoId('pat'), token: 'demo-pwa-token' };
        const response = await apiClient.post('/pwa/auth/register', data);
        return response.data;
    },
    pwaLogin: async (identifier: string, password: string) => {
        if (isDemoMode()) return { accountId: 'demo-acc', patientId: 'demo-pat', token: 'demo-pwa-token' };
        const response = await apiClient.post('/pwa/auth/login', { identifier, password });
        return response.data;
    },
    pwaPinLogin: async (patientId: string, pin: string) => {
        if (isDemoMode()) return { accountId: 'demo-acc', patientId: 'demo-pat', token: 'demo-pwa-token' };
        const response = await apiClient.post('/pwa/auth/pin-login', { patientId, pin });
        return response.data;
    },
    pwaRefresh: async () => {
        if (isDemoMode()) return { token: 'demo-pwa-token-refreshed' };
        const response = await apiClient.post('/pwa/auth/refresh');
        return response.data;
    },
    pwaLogout: async () => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post('/pwa/auth/logout');
        return response.data;
    },
    pwaDashboard: async () => {
        if (isDemoMode()) return { activeMeasures: [], unreadMessages: 0, recentDiary: [], alerts: [] };
        const response = await apiClient.get('/pwa/dashboard');
        return response.data;
    },
    pwaDiaryList: async (params?: { page?: number; limit?: number; from?: string; to?: string }) => {
        if (isDemoMode()) return { entries: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        const response = await apiClient.get('/pwa/diary', { params });
        return response.data;
    },
    pwaDiaryGet: async (id: string) => {
        if (isDemoMode()) return { id, mood: 'GOOD', painLevel: 2, date: new Date().toISOString() };
        const response = await apiClient.get(`/pwa/diary/${id}`);
        return response.data;
    },
    pwaDiaryCreate: async (data: Record<string, unknown>) => {
        if (isDemoMode()) return { id: demoId('diary'), ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/pwa/diary', data);
        return response.data;
    },
    pwaDiaryUpdate: async (id: string, data: Record<string, unknown>) => {
        if (isDemoMode()) return { id, ...data };
        const response = await apiClient.put(`/pwa/diary/${id}`, data);
        return response.data;
    },
    pwaDiaryDelete: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/pwa/diary/${id}`);
        return response.data;
    },
    pwaMeasures: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/measures');
        return response.data;
    },
    pwaMeasureTrackings: async (params?: { measureId?: string; page?: number; limit?: number }) => {
        if (isDemoMode()) return { trackings: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        const response = await apiClient.get('/pwa/measures/tracking', { params });
        return response.data;
    },
    pwaMeasureTrackingCreate: async (data: Record<string, unknown>) => {
        if (isDemoMode()) return { id: demoId('track'), ...data };
        const response = await apiClient.post('/pwa/measures/tracking', data);
        return response.data;
    },
    pwaMeasureComplete: async (measureId: string) => {
        if (isDemoMode()) return { id: demoId('track'), completedDate: new Date().toISOString() };
        const response = await apiClient.post(`/pwa/measures/${measureId}/complete`);
        return response.data;
    },
    pwaMeasureSkip: async (measureId: string, reason?: string) => {
        if (isDemoMode()) return { id: demoId('track'), skippedDate: new Date().toISOString() };
        const response = await apiClient.post(`/pwa/measures/${measureId}/skip`, { reason });
        return response.data;
    },
    pwaMessages: async (params?: { page?: number; limit?: number }) => {
        if (isDemoMode()) return { messages: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
        const response = await apiClient.get('/pwa/messages', { params });
        return response.data;
    },
    pwaUnreadCount: async () => {
        if (isDemoMode()) return { count: 0 };
        const response = await apiClient.get('/pwa/messages/unread-count');
        return response.data;
    },
    pwaMessageGet: async (id: string) => {
        if (isDemoMode()) return { id, body: 'Demo-Nachricht', direction: 'SYSTEM', isRead: true };
        const response = await apiClient.get(`/pwa/messages/${id}`);
        return response.data;
    },
    pwaMessageSend: async (data: { subject?: string; body: string }) => {
        if (isDemoMode()) return { id: demoId('msg'), ...data, direction: 'PATIENT_TO_PROVIDER', createdAt: new Date().toISOString() };
        const response = await apiClient.post('/pwa/messages', data);
        return response.data;
    },
    pwaMessageRead: async (id: string) => {
        if (isDemoMode()) return { id, isRead: true };
        const response = await apiClient.put(`/pwa/messages/${id}/read`);
        return response.data;
    },
    pwaConsents: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/consents');
        return response.data;
    },
    pwaUpdateConsents: async (consents: Array<{ type: string; granted: boolean }>) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put('/pwa/consents', { consents });
        return response.data;
    },
    pwaDevices: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/devices');
        return response.data;
    },
    pwaRegisterDevice: async (data: { deviceName: string; deviceType: string; pushToken?: string }) => {
        if (isDemoMode()) return { id: demoId('dev'), ...data };
        const response = await apiClient.post('/pwa/devices', data);
        return response.data;
    },
    pwaRemoveDevice: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/pwa/devices/${id}`);
        return response.data;
    },
    pwaSettings: async () => {
        if (isDemoMode()) return { locale: 'de', notifyEmail: true, notifyPush: false, notifySms: false };
        const response = await apiClient.get('/pwa/settings');
        return response.data;
    },
    pwaUpdateSettings: async (data: Record<string, unknown>) => {
        if (isDemoMode()) return { ...data };
        const response = await apiClient.put('/pwa/settings', data);
        return response.data;
    },
    pwaChangePassword: async (oldPassword: string, newPassword: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put('/pwa/settings/password', { oldPassword, newPassword });
        return response.data;
    },
    pwaSetPin: async (pin: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put('/pwa/settings/pin', { pin });
        return response.data;
    },
    pwaSync: async (payload: { diaryEntries?: any[]; measureTrackings?: any[]; lastSyncAt?: string }) => {
        if (isDemoMode()) return { synced: 0, conflicts: 0, serverTimestamp: new Date().toISOString() };
        const response = await apiClient.post('/pwa/sync', payload);
        return response.data;
    },
    pwaSyncChanges: async (since: string) => {
        if (isDemoMode()) return { diary: [], trackings: [], messages: [], consents: [], serverTimestamp: new Date().toISOString() };
        const response = await apiClient.get('/pwa/sync/changes', { params: { since } });
        return response.data;
    },
    pwaProfile: async () => {
        if (isDemoMode()) return { accountId: 'demo', patientNumber: 'P-10001', email: 'demo@example.com', isVerified: true };
        const response = await apiClient.get('/pwa/profile');
        return response.data;
    },
    pwaVerifyEmail: async (token: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post('/pwa/auth/verify-email', { token });
        return response.data;
    },
    pwaDiaryTrends: async (metric: string, period: string) => {
        if (isDemoMode()) return { metric, period, dataPoints: [], average: 0, min: 0, max: 0, trend: 'stable', unit: '' };
        const response = await apiClient.get('/pwa/diary/trends', { params: { metric, period } });
        return response.data;
    },
    pwaDiaryExport: async (format: string) => {
        if (isDemoMode()) return new Blob(['demo'], { type: 'text/csv' });
        const response = await apiClient.get('/pwa/diary/export', { params: { format }, responseType: 'blob' });
        return response.data;
    },
    pwaAppointments: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/appointments');
        return response.data;
    },
    pwaAppointmentSlots: async (date: string, service: string) => {
        if (isDemoMode()) return ['09:00', '10:00', '11:00', '14:00', '15:00'];
        const response = await apiClient.get('/pwa/appointments/available-slots', { params: { date, service } });
        return response.data;
    },
    pwaAppointmentCreate: async (data: { service: string; date: string; requestNotes?: string }) => {
        if (isDemoMode()) return { id: 'demo-apt', ...data, status: 'REQUESTED' };
        const response = await apiClient.post('/pwa/appointments', data);
        return response.data;
    },
    pwaAppointmentCancel: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.put(`/pwa/appointments/${id}/cancel`);
        return response.data;
    },
    pwaReminders: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/reminders');
        return response.data;
    },
    pwaReminderAdherence: async () => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/pwa/reminders/adherence');
        return response.data;
    },
    pwaReminderCreate: async (data: { medicationId: string; scheduleCron: string; scheduleLabel: string; pushEnabled: boolean; pushTitle?: string; pushBody?: string }) => {
        if (isDemoMode()) return { id: 'demo-rem', ...data };
        const response = await apiClient.post('/pwa/reminders', data);
        return response.data;
    },
    pwaReminderToggle: async (id: string, active: boolean) => {
        if (isDemoMode()) return { id, active };
        const response = await apiClient.put(`/pwa/reminders/${id}`, { active });
        return response.data;
    },
    pwaReminderDelete: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/pwa/reminders/${id}`);
        return response.data;
    },

    // ─── Modul 6: System Management ─────────────────────────

    systemDeployment: async () => {
        if (isDemoMode()) return { mode: 'CLOUD', version: '3.0.0', features: { tiEnabled: false, epaEnabled: false, kimEnabled: false, localLlmEnabled: false, backupEnabled: false, pushEnabled: true, offlineModeEnabled: true }, environment: 'demo' };
        const response = await apiClient.get('/system/deployment');
        return response.data;
    },
    systemFeatures: async () => {
        if (isDemoMode()) return { tiEnabled: false, epaEnabled: false, kimEnabled: false, localLlmEnabled: false, backupEnabled: false, pushEnabled: true, offlineModeEnabled: true };
        const response = await apiClient.get('/system/features');
        return response.data;
    },
    systemConfigs: async (category?: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/system/config', { params: category ? { category } : {} });
        return response.data;
    },
    systemUpdateConfig: async (key: string, value: string) => {
        if (isDemoMode()) return { key, value };
        const response = await apiClient.put('/system/config', { key, value });
        return response.data;
    },
    systemInitConfigs: async () => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post('/system/config/initialize');
        return response.data;
    },
    systemBackups: async (params?: { status?: string; limit?: number }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/system/backups', { params });
        return response.data;
    },
    systemCreateBackup: async (data?: { type?: string; tables?: string[] }) => {
        if (isDemoMode()) return { id: 'demo-backup', filename: 'demo.sql', status: 'COMPLETED', fileSize: 1024 };
        const response = await apiClient.post('/system/backups', data || {});
        return response.data;
    },
    systemRestoreBackup: async (id: string, options?: { verifyChecksum?: boolean }) => {
        if (isDemoMode()) return { success: true, message: 'Demo restore' };
        const response = await apiClient.post(`/system/backups/${id}/restore`, options || {});
        return response.data;
    },
    systemDeleteBackup: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/system/backups/${id}`);
        return response.data;
    },
    systemBackupSchedule: async () => {
        if (isDemoMode()) return { enabled: false, cronExpression: '0 2 * * *', type: 'full', retentionDays: 30, maxBackups: 10 };
        const response = await apiClient.get('/system/backups/schedule');
        return response.data;
    },
    systemNetwork: async () => {
        if (isDemoMode()) return { database: { status: 'connected', latencyMs: 2 }, redis: { status: 'connected', latencyMs: 1 }, tiKonnektor: { status: 'disconnected' }, internet: { status: 'connected', latencyMs: 20 }, dns: { status: 'connected', latencyMs: 5 }, uptime: 86400, lastCheck: new Date().toISOString() };
        const response = await apiClient.get('/system/network');
        return response.data;
    },
    systemNetworkCached: async () => {
        if (isDemoMode()) return null;
        const response = await apiClient.get('/system/network/cached');
        return response.data;
    },
    systemStartMonitor: async (intervalSec?: number) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.post('/system/network/monitor/start', { intervalSec });
        return response.data;
    },
    systemLogs: async (params?: { limit?: number; level?: string; service?: string }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/system/logs', { params });
        return response.data;
    },
    systemInfo: async () => {
        if (isDemoMode()) return { uptime: 86400, nodeVersion: 'v20.0.0', platform: 'linux', arch: 'x64', hostname: 'demo', totalMemory: 8589934592, freeMemory: 4294967296, cpuCount: 4 };
        const response = await apiClient.get('/system/info');
        return response.data;
    },

    // ─── Modul 6: TI (Telematik-Infrastruktur) ─────────────

    tiStatus: async () => {
        if (isDemoMode()) return { configured: false, message: 'TI nicht konfiguriert (Demo-Modus)' };
        const response = await apiClient.get('/ti/status');
        return response.data;
    },
    tiPing: async () => {
        if (isDemoMode()) return { reachable: false, latencyMs: 0, errorMessage: 'Demo-Modus' };
        const response = await apiClient.post('/ti/ping');
        return response.data;
    },
    tiRefresh: async () => {
        if (isDemoMode()) return { status: 'DISCONNECTED', cards: [], features: {} };
        const response = await apiClient.post('/ti/refresh');
        return response.data;
    },
    tiCards: async () => {
        if (isDemoMode()) return { cards: [] };
        const response = await apiClient.get('/ti/cards');
        return response.data;
    },
    tiReadEGK: async () => {
        if (isDemoMode()) return { success: false, errorCode: 'DEMO', errorMessage: 'eGK-Lesung im Demo-Modus nicht verfügbar' };
        const response = await apiClient.post('/ti/egk/read');
        return response.data;
    },
    tiConfig: async () => {
        if (isDemoMode()) return { configured: false };
        const response = await apiClient.get('/ti/config');
        return response.data;
    },
    tiEpaStatus: async () => {
        if (isDemoMode()) return { enabled: false, message: 'Demo-Modus' };
        const response = await apiClient.get('/ti/epa/status');
        return response.data;
    },
    tiEpaDocuments: async (kvnr: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/ti/epa/documents', { params: { kvnr } });
        return response.data;
    },
    tiKimStatus: async () => {
        if (isDemoMode()) return { enabled: false, message: 'Demo-Modus' };
        const response = await apiClient.get('/ti/kim/status');
        return response.data;
    },
    tiKimMessages: async (params?: { status?: string; limit?: number }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/ti/kim/messages', { params });
        return response.data;
    },

    // ─── DSGVO Signature Persistence ───────────────────────────

    submitDsgvoSignature: async (data: {
        signatureData: string;
        documentHash: string;
        sessionId?: string;
        patientId?: string;
        formType?: string;
        documentVersion?: string;
    }) => {
        if (isDemoMode()) return { id: 'demo-sig-1', createdAt: new Date().toISOString() };
        const response = await apiClient.post('/signatures', {
            signatureData: data.signatureData,
            documentHash: data.documentHash,
            sessionId: data.sessionId || null,
            patientId: data.patientId || null,
            formType: data.formType || 'DSGVO',
            documentVersion: data.documentVersion || '1.0',
        });
        return response.data;
    },

    // ─── Modul 7: NFC Checkpoints ──────────────────────────────

    nfcScan: async (data: { locationId: string; praxisId: string; timestamp: number; signature: string; sessionHint?: string; deviceInfo?: string }) => {
        if (isDemoMode()) return { accepted: true, scanId: 'demo-scan-1', checkpointType: 'ENTRANCE', roomName: 'Eingang' };
        const response = await apiClient.post('/nfc/scan', data);
        return response.data;
    },
    nfcListCheckpoints: async (praxisId?: string) => {
        if (isDemoMode()) return [
            { id: '1', locationId: 'eingang', praxisId: 'demo', type: 'ENTRANCE', roomName: 'Eingang', isActive: true, nfcUid: 'NFC-001' },
            { id: '2', locationId: 'wartezimmer', praxisId: 'demo', type: 'WAITING', roomName: 'Wartezimmer 1', isActive: true, nfcUid: 'NFC-002' },
            { id: '3', locationId: 'labor-1', praxisId: 'demo', type: 'LAB', roomName: 'Labor 1', isActive: true, nfcUid: 'NFC-003' },
            { id: '4', locationId: 'ausgang', praxisId: 'demo', type: 'CHECKOUT', roomName: 'Ausgang', isActive: true, nfcUid: 'NFC-004' },
        ];
        const response = await apiClient.get('/nfc/checkpoints', { params: praxisId ? { praxisId } : {} });
        return response.data;
    },
    nfcCreateCheckpoint: async (data: { locationId: string; praxisId: string; type: string; roomName?: string; nfcUid: string; coordinates?: any; secretRef?: string }) => {
        if (isDemoMode()) return { id: 'demo-cp-new', ...data, isActive: true, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/nfc/checkpoints', data);
        return response.data;
    },
    nfcUpdateCheckpoint: async (id: string, data: any) => {
        if (isDemoMode()) return { id, ...data, updatedAt: new Date().toISOString() };
        const response = await apiClient.put(`/nfc/checkpoints/${id}`, data);
        return response.data;
    },
    nfcDeleteCheckpoint: async (id: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/nfc/checkpoints/${id}`);
        return response.data;
    },
    nfcCheckpointScans: async (checkpointId: string, limit?: number) => {
        if (isDemoMode()) return [
            { id: 's1', checkpointId, scanStatus: 'ACCEPTED', scannedAt: new Date().toISOString(), deviceInfo: 'iPhone 15' },
        ];
        const response = await apiClient.get(`/nfc/checkpoints/${checkpointId}/scans`, { params: limit ? { limit } : {} });
        return response.data;
    },

    // ─── Modul 7: TreatmentFlows ───────────────────────────────

    flowList: async (praxisId?: string, activeOnly?: boolean) => {
        if (isDemoMode()) return [
            { id: 'f1', praxisId: 'demo', name: 'Allgemeinuntersuchung', description: 'Standard-Flow', isActive: true, steps: [
                { id: 's1', order: 0, type: 'WAITING', estimatedMinutes: 10, instructions: { de: 'Bitte nehmen Sie Platz' } },
                { id: 's2', order: 1, type: 'LAB', estimatedMinutes: 15, instructions: { de: 'Blutabnahme' } },
                { id: 's3', order: 2, type: 'CONSULTATION', estimatedMinutes: 20, instructions: { de: 'Arztgespräch' } },
                { id: 's4', order: 3, type: 'CHECKOUT', estimatedMinutes: 5, instructions: { de: 'Auschecken' } },
            ]},
        ];
        const params: any = {};
        if (praxisId) params.praxisId = praxisId;
        if (activeOnly !== undefined) params.active = activeOnly;
        const response = await apiClient.get('/flows', { params });
        return response.data;
    },
    flowGet: async (id: string) => {
        if (isDemoMode()) return { id, name: 'Demo-Flow', steps: [], isActive: true };
        const response = await apiClient.get(`/flows/${id}`);
        return response.data;
    },
    flowCreate: async (data: { praxisId: string; name: string; description?: string; serviceType?: string; steps: any[] }) => {
        if (isDemoMode()) return { id: 'demo-flow-new', ...data, isActive: true, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/flows', data);
        return response.data;
    },
    flowUpdate: async (id: string, data: any) => {
        if (isDemoMode()) return { id, ...data, updatedAt: new Date().toISOString() };
        const response = await apiClient.put(`/flows/${id}`, data);
        return response.data;
    },
    flowGetProgress: async (flowId: string, sessionId: string) => {
        if (isDemoMode()) return { sessionId, flowId, currentStep: 1, status: 'ACTIVE', stepHistory: [], delayMinutes: 0 };
        const response = await apiClient.get(`/flows/${flowId}/progress/${sessionId}`);
        return response.data;
    },
    flowStart: async (sessionId: string, flowId: string) => {
        if (isDemoMode()) return { sessionId, flowId, currentStep: 0, status: 'ACTIVE', stepHistory: [] };
        const response = await apiClient.post('/flows/start', { sessionId, flowId });
        return response.data;
    },
    flowAdvance: async (data: { sessionId: string; fromStep: number; toStep: number; reason?: string; triggeredBy?: string }) => {
        if (isDemoMode()) return { sessionId: data.sessionId, currentStep: data.toStep, status: 'ACTIVE' };
        const response = await apiClient.post('/flows/advance', data);
        return response.data;
    },
    flowDelay: async (data: { sessionId: string; delayMinutes: number; reason: string }) => {
        if (isDemoMode()) return { sessionId: data.sessionId, delayMinutes: data.delayMinutes };
        const response = await apiClient.post('/flows/delay', data);
        return response.data;
    },

    // ─── Modul 7: Feedback & Checkout ───────────────────────────

    feedbackSubmit: async (data: { praxisId: string; sessionId?: string; rating: number; text?: string; categories?: string[] }) => {
        if (isDemoMode()) {
            const containsThreats = /(anzeige|beschwerde|droh|anwalt|gefährlich|katastroph|nie wieder)/i.test(data.text || '');
            const entry: DemoFeedbackEntry = {
                id: demoId('fb'),
                praxisId: data.praxisId,
                sessionId: data.sessionId,
                rating: data.rating,
                text: data.text?.trim() || undefined,
                categories: (data.categories || []).filter(Boolean),
                containsThreats,
                escalationStatus: containsThreats || data.rating <= 2 ? 'REVIEW' : 'NONE',
                createdAt: new Date().toISOString(),
            };
            writeDemoFeedback([entry, ...readDemoFeedback()]);
            return { id: entry.id, acknowledged: true, escalated: entry.escalationStatus !== 'NONE' };
        }
        const response = await apiClient.post('/feedback/anonymous', data);
        return response.data;
    },
    feedbackList: async (params?: { praxisId?: string; escalated?: boolean; limit?: number }) => {
        if (isDemoMode()) {
            let feedback = readDemoFeedback();
            if (params?.praxisId) {
                feedback = feedback.filter((entry) => entry.praxisId === params.praxisId);
            }
            if (params?.escalated !== undefined) {
                feedback = feedback.filter((entry) => params.escalated ? entry.escalationStatus !== 'NONE' : entry.escalationStatus === 'NONE');
            }
            feedback = feedback.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
            if (params?.limit) {
                feedback = feedback.slice(0, params.limit);
            }
            return feedback;
        }
        const response = await apiClient.get('/feedback', { params });
        return response.data;
    },
    feedbackStats: async (praxisId: string) => {
        if (isDemoMode()) return getDemoFeedbackStats(praxisId);
        const response = await apiClient.get('/feedback/stats', { params: { praxisId } });
        return response.data;
    },
    feedbackEscalate: async (id: string, escalationStatus: string) => {
        if (isDemoMode()) return { id, escalationStatus };
        const response = await apiClient.post(`/feedback/${id}/escalate`, { escalationStatus });
        return response.data;
    },
    checkoutSession: async (sessionId: string, action: 'keep' | 'export' | 'delete') => {
        if (isDemoMode()) return { sessionId, action, message: `Demo: ${action}` };
        const response = await apiClient.post(`/feedback/checkout/${sessionId}`, { action });
        return response.data;
    },

    // ─── Modul 7/8: Payment ─────────────────────────────────────

    paymentCreateIntent: async (data: { sessionId: string; patientId: string; amount: number; currency?: string; type: string; description?: string }) => {
        if (isDemoMode()) return { id: 'demo-pi-1', sessionId: data.sessionId, amount: data.amount, status: 'PENDING', providerIntentId: 'pi_demo', clientSecret: 'cs_demo' };
        const response = await apiClient.post('/payment/intent', data);
        return response.data;
    },
    paymentNfcCharge: async (data: { sessionId: string; patientId: string; amount: number; type: string; nfcCardToken: string; description?: string }) => {
        if (isDemoMode()) return { id: 'demo-nfc-1', status: 'COMPLETED', amount: data.amount, receiptUrl: '/demo-receipt' };
        const response = await apiClient.post('/payment/nfc-charge', data);
        return response.data;
    },
    paymentReceipt: async (id: string) => {
        if (isDemoMode()) return { id, transactionId: id, amount: 25.00, currency: 'EUR', type: 'SELBSTZAHLER', status: 'COMPLETED', createdAt: new Date().toISOString() };
        const response = await apiClient.get(`/payment/receipt/${id}`);
        return response.data;
    },
    paymentStats: async (praxisId?: string) => {
        if (isDemoMode()) return { totalRevenue: 1250.00, transactionCount: 48, averageAmount: 26.04, byType: [{ type: 'SELBSTZAHLER', count: 30, total: 780 }], byStatus: [{ status: 'COMPLETED', count: 45 }], recentTransactions: [] };
        const response = await apiClient.get('/payment/stats', { params: { praxisId } });
        return response.data;
    },
    paymentRefund: async (id: string, reason?: string) => {
        if (isDemoMode()) return { id, status: 'REFUNDED', amount: 25.00 };
        const response = await apiClient.post(`/payment/refund/${id}`, { reason });
        return response.data;
    },
    paymentSessionList: async (sessionId: string) => {
        if (isDemoMode()) return [{ id: 'tx-1', sessionId, amount: 25.00, currency: 'EUR', type: 'SELBSTZAHLER', status: 'COMPLETED', createdAt: new Date().toISOString() }];
        const response = await apiClient.get(`/payment/session/${sessionId}`);
        return response.data;
    },

    // ─── Modul 7/8: Praxis Chat ─────────────────────────────────

    praxisChatMessages: async (sessionId: string, limit?: number, before?: string) => {
        if (isDemoMode()) return [
            { id: 'msg-1', sessionId, senderType: 'MFA', content: 'Willkommen! Bitte nehmen Sie Platz.', contentType: 'TEXT', isTemplate: false, createdAt: new Date(Date.now() - 300000).toISOString() },
            { id: 'msg-2', sessionId, senderType: 'PATIENT', content: 'Danke!', contentType: 'TEXT', isTemplate: false, createdAt: new Date(Date.now() - 240000).toISOString() },
        ];
        const response = await apiClient.get(`/praxis-chat/${sessionId}`, { params: { limit, before } });
        return response.data;
    },
    praxisChatSend: async (data: { sessionId: string; senderType: string; senderId?: string; contentType?: string; content: string; isTemplate?: boolean; templateId?: string }) => {
        if (isDemoMode()) return { id: `msg-${Date.now()}`, ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/praxis-chat/send', data);
        return response.data;
    },
    praxisChatBroadcast: async (data: { praxisId: string; senderId: string; senderType: string; content: string; target: 'waiting' | 'all' | 'room'; roomFilter?: string }) => {
        if (isDemoMode()) return { sentTo: 5, messageIds: ['msg-b1', 'msg-b2'] };
        const response = await apiClient.post('/praxis-chat/broadcast', data);
        return response.data;
    },
    praxisChatMarkRead: async (sessionId: string, readerId: string, readerType: string) => {
        if (isDemoMode()) return { markedAsRead: 3 };
        const response = await apiClient.post(`/praxis-chat/${sessionId}/read`, { readerId, readerType });
        return response.data;
    },
    praxisChatUnread: async (sessionId: string, viewerType?: string) => {
        if (isDemoMode()) return { unreadCount: 2 };
        const response = await apiClient.get(`/praxis-chat/${sessionId}/unread`, { params: { viewerType } });
        return response.data;
    },
    praxisChatTemplates: async () => {
        if (isDemoMode()) return [
            { id: 'tpl-1', name: 'Wartezeit-Info', content: 'Geschätzte Wartezeit: {{minutes}} Minuten.', category: 'info', language: 'de', variables: ['minutes'] },
            { id: 'tpl-2', name: 'Aufruf ins Zimmer', content: 'Bitte begeben Sie sich zu {{room}}.', category: 'call', language: 'de', variables: ['room'] },
        ];
        const response = await apiClient.get('/praxis-chat/templates/list');
        return response.data;
    },
    praxisChatStats: async (praxisId?: string) => {
        if (isDemoMode()) return { totalMessages: 150, unreadCount: 8, avgResponseTime: 45, messagesByType: [{ type: 'TEXT', count: 130 }] };
        const response = await apiClient.get('/praxis-chat/stats/overview', { params: { praxisId } });
        return response.data;
    },
    praxisChatDelete: async (sessionId: string) => {
        if (isDemoMode()) return { deleted: 12 };
        const response = await apiClient.delete(`/praxis-chat/${sessionId}`);
        return response.data;
    },

    // ─── Modul 8: Avatar + Voice ────────────────────────────────

    avatarGet: async (staffId: string) => {
        if (isDemoMode()) return { id: 'av-1', staffId, avatarType: '2D', avatarUrl: null, voiceSettings: { pitch: 0, speed: 1, volume: 0.8, style: 'professional', provider: 'azure' }, supportedLanguages: ['de-DE'], isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        const response = await apiClient.get(`/avatar/${staffId}`);
        return response.data;
    },
    avatarUpdate: async (staffId: string, data: any) => {
        if (isDemoMode()) return { id: 'av-1', staffId, ...data, updatedAt: new Date().toISOString() };
        const response = await apiClient.put(`/avatar/${staffId}`, data);
        return response.data;
    },
    avatarList: async (activeOnly?: boolean) => {
        if (isDemoMode()) return [{ id: 'av-1', staffId: 'staff-1', avatarType: '2D', supportedLanguages: ['de-DE'], isActive: true }];
        const response = await apiClient.get('/avatar/list', { params: { activeOnly } });
        return response.data;
    },
    avatarSpeak: async (data: { staffId: string; text: string; language?: string; ssml?: boolean; format?: string }) => {
        if (isDemoMode()) return { audioUrl: '/demo-audio.mp3', duration: 5, language: data.language || 'de-DE', cached: false };
        const response = await apiClient.post('/avatar/speak', data);
        return response.data;
    },
    avatarConsent: async (staffId: string) => {
        if (isDemoMode()) return { consentSignedAt: new Date().toISOString() };
        const response = await apiClient.post(`/avatar/${staffId}/consent`);
        return response.data;
    },
    avatarRevokeConsent: async (staffId: string) => {
        if (isDemoMode()) return { revoked: true };
        const response = await apiClient.delete(`/avatar/${staffId}/consent`);
        return response.data;
    },
    avatarCloneStart: async (data: { staffId: string; audioSamples: string[]; consentToken: string; language?: string }) => {
        if (isDemoMode()) return { voiceCloneId: 'vc_demo', status: 'PROCESSING', estimatedReadyAt: new Date(Date.now() + 1800000).toISOString() };
        const response = await apiClient.post('/avatar/clone/start', data);
        return response.data;
    },
    avatarCloneStatus: async (staffId: string) => {
        if (isDemoMode()) return { voiceCloneId: null, status: 'NONE' };
        const response = await apiClient.get(`/avatar/clone/${staffId}`);
        return response.data;
    },
    avatarDelete: async (staffId: string) => {
        if (isDemoMode()) return { deleted: true };
        const response = await apiClient.delete(`/avatar/${staffId}`);
        return response.data;
    },
    avatarLanguages: async () => {
        if (isDemoMode()) return [{ code: 'de-DE', label: 'Deutsch' }, { code: 'en-US', label: 'English' }, { code: 'tr-TR', label: 'Türkçe' }];
        const response = await apiClient.get('/avatar/languages');
        return response.data;
    },

    // ─── Telemedizin ────────────────────────────────────────
    telemedizinCreate: async (data: { patientId: string; doctorId: string; type?: string; scheduledAt: string; notes?: string }) => {
        if (isDemoMode()) return { id: 'tele-' + Date.now(), ...data, status: 'SCHEDULED', roomToken: 'demo-room-token', createdAt: new Date().toISOString() };
        const response = await apiClient.post('/telemedizin/session', data);
        return response.data;
    },
    telemedizinGet: async (id: string) => {
        if (isDemoMode()) return { id, patientId: 'p1', doctorId: 'd1', type: 'VIDEO', status: 'SCHEDULED', scheduledAt: new Date().toISOString(), roomToken: 'demo-room' };
        const response = await apiClient.get(`/telemedizin/session/${id}`);
        return response.data;
    },
    telemedizinList: async (params?: { status?: string; from?: string; to?: string }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/telemedizin/sessions', { params });
        return response.data;
    },
    telemedizinJoin: async (id: string, data: { participantId: string; role: string }) => {
        if (isDemoMode()) return { roomToken: 'demo-room-token', iceServers: [] };
        const response = await apiClient.post(`/telemedizin/session/${id}/join`, data);
        return response.data;
    },
    telemedizinEnd: async (id: string, data?: { notes?: string; diagnosis?: string }) => {
        if (isDemoMode()) return { id, status: 'COMPLETED' };
        const response = await apiClient.post(`/telemedizin/session/${id}/end`, data);
        return response.data;
    },
    telemedizinCancel: async (id: string) => {
        if (isDemoMode()) return { id, status: 'CANCELLED' };
        const response = await apiClient.post(`/telemedizin/session/${id}/cancel`);
        return response.data;
    },
    telemedizinNoShow: async (id: string) => {
        if (isDemoMode()) return { id, status: 'NO_SHOW' };
        const response = await apiClient.post(`/telemedizin/session/${id}/no-show`);
        return response.data;
    },
    telemedizinPrescription: async (id: string, data: { medication: string; dosage: string; instructions?: string }) => {
        if (isDemoMode()) return { id, prescription: data };
        const response = await apiClient.post(`/telemedizin/session/${id}/prescription`, data);
        return response.data;
    },
    telemedizinFollowUp: async (id: string, data: { followUpDate: string; notes?: string }) => {
        if (isDemoMode()) return { id, followUpDate: data.followUpDate };
        const response = await apiClient.post(`/telemedizin/session/${id}/follow-up`, data);
        return response.data;
    },
    telemedizinStats: async () => {
        if (isDemoMode()) return { total: 42, completed: 38, cancelled: 3, noShow: 1, avgDuration: 920 };
        const response = await apiClient.get('/telemedizin/stats');
        return response.data;
    },

    // ─── Gamification ──────────────────────────────────────────
    gamificationAward: async (data: { staffId: string; type: string; points?: number; description: string }) => {
        if (isDemoMode()) return { id: 'ach-' + Date.now(), ...data, points: data.points || 10, earnedAt: new Date().toISOString() };
        const response = await apiClient.post('/gamification/achievement', data);
        return response.data;
    },
    gamificationStaffAchievements: async (staffId: string) => {
        if (isDemoMode()) return [{ id: 'ach-1', staffId, type: 'TASK_COMPLETED', points: 10, description: 'Aufgabe erledigt', earnedAt: new Date().toISOString() }];
        const response = await apiClient.get(`/gamification/staff/${staffId}`);
        return response.data;
    },
    gamificationLeaderboard: async (params: { praxisId: string; period?: string; limit?: number }) => {
        if (isDemoMode()) return [{ staffId: 's1', totalPoints: 150, rank: 1 }, { staffId: 's2', totalPoints: 120, rank: 2 }];
        const response = await apiClient.get('/gamification/leaderboard', { params });
        return response.data;
    },
    gamificationRecalculate: async (data: { praxisId: string; period: string }) => {
        if (isDemoMode()) return { recalculated: true };
        const response = await apiClient.post('/gamification/leaderboard/recalculate', data);
        return response.data;
    },
    gamificationStaffPoints: async (staffId: string) => {
        if (isDemoMode()) return { staffId, totalPoints: 250 };
        const response = await apiClient.get(`/gamification/staff/${staffId}/points`);
        return response.data;
    },
    gamificationStats: async (praxisId: string) => {
        if (isDemoMode()) return { totalAchievements: 128, topAchiever: 's1', averagePoints: 45 };
        const response = await apiClient.get('/gamification/stats', { params: { praxisId } });
        return response.data;
    },

    // ─── Forms ─────────────────────────────────────────────────
    formCreate: async (data: { praxisId: string; createdBy: string; name: string; description?: string; questions: any[]; logic?: any; tags?: string[]; ageRange?: any }) => {
        if (isDemoMode()) return { id: 'form-' + Date.now(), ...data, version: 1, isActive: false, usageCount: 0, createdAt: new Date().toISOString() };
        const response = await apiClient.post('/forms', data);
        return response.data;
    },
    formGet: async (id: string) => {
        if (isDemoMode()) return { id, name: 'Demo-Formular', questions: [], version: 1, isActive: true };
        const response = await apiClient.get(`/forms/${id}`);
        return response.data;
    },
    formList: async (params: { praxisId: string; isActive?: boolean; tag?: string }) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get('/forms', { params });
        return response.data;
    },
    formUpdate: async (id: string, data: any) => {
        if (isDemoMode()) return { id, ...data, version: 2 };
        const response = await apiClient.patch(`/forms/${id}`, data);
        return response.data;
    },
    formDelete: async (id: string) => {
        if (isDemoMode()) return { id, isActive: false };
        const response = await apiClient.delete(`/forms/${id}`);
        return response.data;
    },
    formAiGenerate: async (data: { praxisId: string; createdBy: string; prompt: string; language?: string }) => {
        if (isDemoMode()) return { id: 'form-ai-' + Date.now(), name: 'KI-Formular', aiGenerated: true, questions: [{ id: 'q1', type: 'TEXT', label: 'Beschreiben Sie Ihre Beschwerden', required: true }] };
        const response = await apiClient.post('/forms/ai-generate', data);
        return response.data;
    },
    formPublish: async (id: string) => {
        if (isDemoMode()) return { id, isActive: true };
        const response = await apiClient.post(`/forms/${id}/publish`);
        return response.data;
    },
    formUsage: async (id: string) => {
        if (isDemoMode()) return { id, usageCount: 1 };
        const response = await apiClient.post(`/forms/${id}/usage`);
        return response.data;
    },
    formSubmit: async (id: string, data: { sessionId: string; answers: Record<string, unknown>; submittedAt?: string }) => {
        if (isDemoMode()) return { formId: id, sessionId: data.sessionId, answersCount: Object.keys(data.answers).length, submittedAt: data.submittedAt ?? new Date().toISOString() };
        const response = await apiClient.post(`/forms/${id}/submit`, data);
        return response.data;
    },
    formStats: async (praxisId: string) => {
        if (isDemoMode()) return { totalForms: 12, activeForms: 8, aiGenerated: 3, totalUsage: 456 };
        const response = await apiClient.get('/forms/stats', { params: { praxisId } });
        return response.data;
    },

    // ─── Private ePA ─────────────────────────────────────────
    epaGet: async (patientId: string) => {
        if (isDemoMode()) return { id: 'epa-1', patientId, consentVersion: '1.0', consentSignedAt: new Date().toISOString(), documents: [], shares: [] };
        const response = await apiClient.get(`/epa/${patientId}`);
        return response.data;
    },
    epaAddDocument: async (patientId: string, data: { type: string; title: string; content?: string; fileUrl?: string; createdBy: string }) => {
        if (isDemoMode()) return { id: 'doc-' + Date.now(), epaId: 'epa-1', ...data, createdAt: new Date().toISOString() };
        const response = await apiClient.post(`/epa/${patientId}/documents`, data);
        return response.data;
    },
    epaGetDocuments: async (patientId: string, type?: string) => {
        if (isDemoMode()) return [{ id: 'doc-1', type: 'ANAMNESE', title: 'Erstanamnese', createdAt: new Date().toISOString() }];
        const response = await apiClient.get(`/epa/${patientId}/documents`, { params: type ? { type } : {} });
        return response.data;
    },
    epaDeleteDocument: async (docId: string) => {
        if (isDemoMode()) return { success: true };
        const response = await apiClient.delete(`/epa/document/${docId}`);
        return response.data;
    },
    epaCreateShare: async (patientId: string, data: { sharedWith: string; accessScope: string[]; expiresInHours?: number }) => {
        if (isDemoMode()) return { id: 'share-' + Date.now(), accessToken: 'demo-token-' + Date.now(), expiresAt: new Date(Date.now() + 72 * 3600000).toISOString() };
        const response = await apiClient.post(`/epa/${patientId}/shares`, data);
        return response.data;
    },
    epaGetShares: async (patientId: string) => {
        if (isDemoMode()) return [];
        const response = await apiClient.get(`/epa/${patientId}/shares`);
        return response.data;
    },
    epaRevokeShare: async (shareId: string) => {
        if (isDemoMode()) return { revokedAt: new Date().toISOString() };
        const response = await apiClient.post(`/epa/share/${shareId}/revoke`);
        return response.data;
    },
    epaAccessByToken: async (token: string) => {
        if (isDemoMode()) return { epa: { id: 'epa-1' }, documents: [{ id: 'doc-1', type: 'ANAMNESE', title: 'Erstanamnese', content: 'Demo Inhalt' }], expiresAt: new Date(Date.now() + 48 * 3600000).toISOString() };
        const response = await apiClient.get(`/epa/access/${token}`);
        return response.data;
    },
    epaCreateExport: async (data: { patientId: string; exportType: string; format?: string }) => {
        if (isDemoMode()) return { id: 'exp-' + Date.now(), content: '# Anonymisierter Export\n\nPatient: [anonymisiert]', hash: 'demo-hash', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
        const response = await apiClient.post('/epa/export/anonymized', data);
        return response.data;
    },
    epaGetExport: async (exportId: string) => {
        if (isDemoMode()) return { id: exportId, content: '# Export', hash: 'demo', exportType: 'FULL_HISTORY' };
        const response = await apiClient.get(`/epa/export/${exportId}`);
        return response.data;
    },

    // ─── Agent API ─────────────────────────────────────────
    agentStatus: async () => {
        const response = await apiClient.get('/agents');
        return response.data;
    },
    agentTasks: async (params?: { status?: string; agentName?: string; limit?: number }) => {
        const response = await apiClient.get('/agents/tasks', { params });
        return response.data;
    },
    agentTaskDetail: async (id: string) => {
        const response = await apiClient.get(`/agents/tasks/${id}`);
        return response.data;
    },
    agentCreateTask: async (data: { taskType?: string; description?: string; agentName?: string; priority?: string; payload?: Record<string, unknown> }) => {
        const response = await apiClient.post('/agents/task', data);
        return response.data;
    },
    agentMetrics: async () => {
        const response = await apiClient.get('/agents/metrics');
        return response.data;
    },
};

export default apiClient;
