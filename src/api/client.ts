import axios from 'axios';
import { questions } from '../data/questions';
import { isDemoMode } from '../store/modeStore';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');
// Demo mode is now controlled by modeStore (runtime switchable).
// Legacy env-var support: if VITE_DISABLE_DEMO_MODE=true, force live mode on load.
if (import.meta.env.VITE_DISABLE_DEMO_MODE === 'true') {
    // Force live mode via store
    import('../store/modeStore').then(m => m.useModeStore.getState().setMode('live'));
}

if (!import.meta.env.VITE_API_URL) {
    console.warn('VITE_API_URL is missing. Falling back to /api (same-origin).');
}

if (isDemoMode()) {
    console.warn('Demo API mode is active. Data is stored locally in this browser.');
}

/**
 * Axios-Client mit JWT-Interceptor fÃ¼r die Backend-API
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 Sekunden
});

// JWT Token Management
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
    currentToken = token;
    if (token) {
        localStorage.setItem('anamnese_token', token);
    } else {
        localStorage.removeItem('anamnese_token');
    }
}

export function getAuthToken(): string | null {
    if (!currentToken) {
        currentToken = localStorage.getItem('anamnese_token');
    }
    return currentToken;
}

// Request Interceptor â€“ JWT automatisch anfÃ¼gen
apiClient.interceptors.request.use(
    (config) => {
        const token = getAuthToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor – Fehlerbehandlung mit Token-Refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null = null) {
    failedQueue.forEach(promise => {
        if (token) {
            promise.resolve(token);
        } else {
            promise.reject(error);
        }
    });
    failedQueue = [];
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            // If this is the refresh request itself failing, don't retry
            if (originalRequest.url?.includes('refresh-token')) {
                setAuthToken(null);
                localStorage.removeItem('anamnese_session_id');
                import('../store/sessionStore').then(({ useSessionStore }) => {
                    useSessionStore.getState().clearSession();
                });
                if (window.location.pathname !== '/' && window.location.pathname !== '/arzt' && window.location.pathname !== '/mfa') {
                    window.location.href = '/';
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue this request until refresh completes
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
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
                const newToken = data.token;
                setAuthToken(newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                processQueue(null, newToken);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                setAuthToken(null);
                localStorage.removeItem('anamnese_session_id');
                import('../store/sessionStore').then(({ useSessionStore }) => {
                    useSessionStore.getState().clearSession();
                });
                if (window.location.pathname !== '/' && window.location.pathname !== '/arzt' && window.location.pathname !== '/mfa') {
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

// â”€â”€â”€ API Funktionen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
}

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

const DEMO_DB_KEY = 'anamnese_demo_db_v1';

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

function getDemoSessionOrThrow(sessionId: string): DemoSession {
    const db = readDemoDb();
    const session = db.sessions[sessionId];
    if (!session) {
        throw new Error('Session nicht gefunden');
    }
    return session;
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
            return { sessionId, token, nextAtomIds: ['0000'] };
        }
        const response = await apiClient.post('/sessions', data);
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
            return {
                success: true,
                sessionId,
                completedAt: session.completedAt,
            };
        }
        const response = await apiClient.post(`/sessions/${sessionId}/submit`);
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
        const response = await apiClient.post(`/answers/${sessionId}`, data);
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
                token: demoId('arzt_token'),
                user: { id: 'arzt_demo', role: 'arzt', displayName: 'Demo Arzt' },
            };
        }
        const response = await apiClient.post('/arzt/login', { username, password });
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
                session: {
                    id: session.id,
                    patientName: session.patientName || null,
                    selectedService: session.selectedService,
                    gender: session.gender || null,
                    status: session.status,
                    createdAt: session.createdAt,
                    triageEvents: session.triageEvents || [],
                    answers,
                },
            };
        }
        const response = await apiClient.get(`/arzt/sessions/${sessionId}`);
        return response.data;
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
                    summary: `Demo-Zusammenfassung fÃ¼r ${session.selectedService}.`,
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

    // Chats
    getChatMessages: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { messages: session.chatMessages || [] };
        }
        const response = await apiClient.get(`/chats/${sessionId}`);
        return response.data;
    },

    // Export (entschlÃ¼sselte Daten â€“ nur fÃ¼r Arzt/MFA)
    exportSessionPDF: (sessionId: string) => {
        const token = getAuthToken();
        window.open(`${API_BASE_URL}/export/sessions/${sessionId}/export/pdf?token=${token}`, '_blank');
    },

    exportSessionCSV: (sessionId: string) => {
        const token = getAuthToken();
        window.open(`${API_BASE_URL}/export/sessions/${sessionId}/export/csv?token=${token}`, '_blank');
    },

    exportSessionJSON: async (sessionId: string) => {
        if (isDemoMode()) {
            const session = getDemoSessionOrThrow(sessionId);
            return { session };
        }
        const response = await apiClient.get(`/export/sessions/${sessionId}/export/json`);
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

    // AI stubs
    therapyAiStatus: async () => {
        if (isDemoMode()) return { status: 'not_configured', model: null, available: false };
        const response = await apiClient.get('/therapy/ai/status');
        return response.data;
    },

    // PVS export
    therapyExportPvs: async (planId: string) => {
        if (isDemoMode()) return { success: true, message: 'Demo-Export', planId };
        const response = await apiClient.post(`/therapy/plans/${planId}/export-pvs`);
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
        if (isDemoMode()) return { id: 'demo-fb-1', acknowledged: true, escalated: false };
        const response = await apiClient.post('/feedback/anonymous', data);
        return response.data;
    },
    feedbackList: async (params?: { praxisId?: string; escalated?: boolean; limit?: number }) => {
        if (isDemoMode()) return [
            { id: 'fb1', praxisId: 'demo', rating: 4, text: 'Sehr freundlich', categories: ['Kommunikation'], containsThreats: false, escalationStatus: 'NONE', createdAt: new Date().toISOString() },
        ];
        const response = await apiClient.get('/feedback', { params });
        return response.data;
    },
    feedbackStats: async (praxisId: string) => {
        if (isDemoMode()) return { total: 42, averageRating: 4.2, escalatedCount: 1, categories: [{ name: 'Wartezeit', count: 15, avgRating: 3.5 }, { name: 'Kommunikation', count: 20, avgRating: 4.5 }] };
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
};

export default apiClient;
