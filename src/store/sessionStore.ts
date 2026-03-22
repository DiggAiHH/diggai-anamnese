import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encryptedStorage } from '../utils/secureStorage';

/**
 * Zustand Store – Ersetzt QuestionnaireContext.tsx
 *
 * Verwaltet den gesamten UI-State der Anamnese.
 * Server-State (Antworten, Triage) wird über React Query gemanagt.
 */

// ─── Typen ──────────────────────────────────────────────────

export interface TriageAlert {
    level: 'WARNING' | 'CRITICAL';
    atomId: string;
    message: string;
    triggerValues: Record<string, unknown> | null;
}

export interface MedicalAtom {
    id: string;
    module: number;
    category: number;
    questionText: string;
    description?: string;
    answerType: string;
    section: string;
    orderIndex: number;
    placeholder?: string;
    options?: { value: string; label: string; followUpQuestions?: string[] }[];
    validationRules?: Record<string, unknown>;
    branchingLogic?: Record<string, unknown>;
    isRedFlag: boolean;
    isPII: boolean;
}

export interface SessionAnswer {
    atomId: string;
    value: string | string[] | boolean | number | Record<string, unknown> | null;
    answeredAt: Date;
    timeSpentMs?: number;
}

export type FlowStep = 'landing' | 'questionnaire' | 'summary' | 'submitted';

export interface SessionState {
    // Session
    sessionId: string | null;
    token: string | null;
    isNewPatient: boolean;
    gender: string;
    birthDate: string;
    selectedService: string;
    insuranceType: string;

    // Navigation
    flowStep: FlowStep;
    currentAtomId: string | null;
    atomHistory: string[];       // Stack für Zurück
    pendingAtoms: string[];      // Queue für Multiselect-Follow-ups

    // Lokaler Cache (wird auch vom Server gehalten)
    answers: Record<string, SessionAnswer>;
    atoms: Record<string, MedicalAtom>;

    // Triage
    activeAlerts: TriageAlert[];

    // UI
    isLoading: boolean;
    error: string | null;
    progress: number;
    isHydrated: boolean;

    // Wartezeit-Management (Modul 1)
    infoBreakHistory: string[];       // IDs der bereits gesehenen InfoBreak-Contents
    entertainmentMode: 'AUTO' | 'GAMES' | 'READING' | 'QUIET';
}

export interface SessionActions {
    // Session
    setSession: (sessionId: string, token?: string | null) => void;
    setPatientData: (data: { isNewPatient?: boolean; gender?: string; birthDate?: string; selectedService?: string; insuranceType?: string }) => void;
    clearSession: () => void;

    // Navigation
    setFlowStep: (step: FlowStep) => void;
    navigateToAtom: (atomId: string) => void;
    goBack: () => void;
    setPendingAtoms: (atomIds: string[]) => void;
    popPendingAtom: () => string | null;

    // Daten
    setAnswer: (atomId: string, value: string | string[] | boolean | number | Record<string, unknown> | null) => void;
    loadAtoms: (atoms: MedicalAtom[]) => void;

    // Triage
    addAlert: (alert: TriageAlert) => void;
    clearAlerts: () => void;

    // UI
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setProgress: (progress: number) => void;
    setHydrated: () => void;

    // Wartezeit-Management (Modul 1)
    addInfoBreakSeen: (contentId: string) => void;
    setEntertainmentMode: (mode: 'AUTO' | 'GAMES' | 'READING' | 'QUIET') => void;
}

const initialState: SessionState = {
    sessionId: null,
    token: null,
    isNewPatient: true,
    gender: '',
    birthDate: '',
    selectedService: '',
    insuranceType: '',
    flowStep: 'landing',
    currentAtomId: null,
    atomHistory: [],
    pendingAtoms: [],
    answers: {},
    atoms: {},
    activeAlerts: [],
    isLoading: false,
    error: null,
    progress: 0,
    isHydrated: false,
    infoBreakHistory: [],
    entertainmentMode: 'AUTO',
};

// ─── Store ──────────────────────────────────────────────────

export const useSessionStore = create<SessionState & SessionActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // Session
            setSession: (sessionId, token) => set({ sessionId, token: token ?? null }),

            setPatientData: (data) => set((state) => ({
                ...state,
                ...data,
            })),

            clearSession: () => {
                set(initialState);
            },

            // Navigation
            setFlowStep: (step) => set({ flowStep: step }),

            navigateToAtom: (atomId) => {
                set((state) => ({
                    currentAtomId: atomId,
                    atomHistory: state.currentAtomId
                        ? [...state.atomHistory, state.currentAtomId]
                        : state.atomHistory,
                }));
            },

            goBack: () => {
                const { atomHistory } = get();
                if (atomHistory.length === 0) return;

                const newHistory = [...atomHistory];
                const previousAtom = newHistory.pop()!;

                set({
                    currentAtomId: previousAtom,
                    atomHistory: newHistory,
                    pendingAtoms: [],
                });
            },

            setPendingAtoms: (atomIds) => set({ pendingAtoms: atomIds }),

            popPendingAtom: () => {
                const { pendingAtoms } = get();
                if (pendingAtoms.length === 0) return null;

                const [next, ...rest] = pendingAtoms;
                set({ pendingAtoms: rest });
                return next;
            },

            // Daten
            setAnswer: (atomId, value) => set((state) => ({
                answers: {
                    ...state.answers,
                    [atomId]: {
                        atomId,
                        value,
                        answeredAt: new Date(),
                    },
                },
            })),

            loadAtoms: (atoms) => set((state) => {
                const atomMap = { ...state.atoms };
                for (const atom of atoms) {
                    atomMap[atom.id] = atom;
                }
                return { atoms: atomMap };
            }),

            // Triage
            addAlert: (alert) => set((state) => ({
                activeAlerts: [...state.activeAlerts, alert],
            })),

            clearAlerts: () => set({ activeAlerts: [] }),

            // UI
            setLoading: (loading) => set({ isLoading: loading }),
            setError: (error) => set({ error }),
            setProgress: (progress) => set({ progress }),
            setHydrated: () => set({ isHydrated: true }),

            // Wartezeit-Management (Modul 1)
            addInfoBreakSeen: (contentId) => set((state) => ({
                infoBreakHistory: [...state.infoBreakHistory, contentId],
            })),
            setEntertainmentMode: (mode) => set({ entertainmentMode: mode }),
        }),
        {
            name: 'anamnese-session',
            storage: createJSONStorage(() => encryptedStorage),
            partialize: (state) => ({
                // Nur diese Felder persistieren (kein sensitive data!)
                sessionId: state.sessionId,
                flowStep: state.flowStep,
                currentAtomId: state.currentAtomId,
                atomHistory: state.atomHistory,
                pendingAtoms: state.pendingAtoms,
                isNewPatient: state.isNewPatient,
                gender: state.gender,
                selectedService: state.selectedService,
                progress: state.progress,
                answers: state.answers,
            }),
            onRehydrateStorage: () => (rehydratedState) => {
                if (rehydratedState) {
                    rehydratedState.setHydrated();
                }
            }
        }
    )
);
