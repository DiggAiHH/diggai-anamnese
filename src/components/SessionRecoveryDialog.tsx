import { useState, useEffect } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../store/sessionStore';

/**
 * Shows a recovery dialog when the app loads and finds an incomplete session
 * (flowStep is 'questionnaire' and there are answers saved).
 */
export function SessionRecoveryDialog() {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);
    const flowStep = useSessionStore(state => state.flowStep);
    const answers = useSessionStore(state => state.answers);
    const clearSession = useSessionStore(state => state.clearSession);
    const isHydrated = useSessionStore(state => state.isHydrated);

    // 2026-05-09 — UX-Fix B3: Dialog nur bei substantiellem Fortschritt zeigen.
    // Vorher: Dialog erschien bei jedem Klick wenn 1 Antwort gespeichert war — nervig.
    // Jetzt: nur bei >= 3 beantworteten Fragen.
    const shouldRecover = isHydrated
        && flowStep === 'questionnaire'
        && Object.keys(answers).length >= 3;

    useEffect(() => {
        if (shouldRecover) {
            setShow(true);
        }
    }, [shouldRecover]);

    const handleResume = () => {
        setShow(false);
        // State is already restored by Zustand persist — just close the dialog
    };

    const handleDiscard = () => {
        clearSession();
        setShow(false);
    };

    if (!show) return null;

    const answerCount = Object.keys(answers).length;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <RotateCcw className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] text-center mb-2">
                    {t('recoveryTitle', 'Sitzung fortsetzen?')}
                </h3>
                <p className="text-sm text-[var(--text-secondary)] text-center mb-6">
                    {t('recoveryMessage', 'Sie haben eine unvollständige Sitzung mit {{count}} beantworteten Fragen. Möchten Sie diese fortsetzen?', { count: answerCount })}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={handleResume}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        <RotateCcw className="w-4 h-4" />
                        {t('Fortsetzen')}
                    </button>
                    <button
                        onClick={handleDiscard}
                        className="flex items-center justify-center gap-2 px-4 py-3 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-2xl border border-[var(--border-primary)] transition-all"
                        title={t('Verwerfen')}
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
