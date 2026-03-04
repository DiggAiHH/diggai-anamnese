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
};

export default apiClient;
