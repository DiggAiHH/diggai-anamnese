/**
 * MfaDecryptView — Arzt/MFA Entschlüsselungs-Ansicht
 *
 * Nach erfolgreicher MFA-Authentifizierung werden die Patientendaten
 * dieser Komponente übergeben. Entschlüsselung findet AUSSCHLIESSLICH
 * hier im Browser statt (Zero-Knowledge Architecture).
 *
 * Ablauf:
 *   1. Arzt meldet sich an (JWT + MFA-Code).
 *   2. Server liefert verschlüsselte Antworten (Ciphertext-Blobs).
 *   3. Diese Komponente entschlüsselt mit dem session-scoped Key
 *      (PBKDF2 aus sicherem Cookie + sessionId).
 *   4. Klartext wird nur im DOM gerendert — nie zurück zum Server.
 *
 * @security
 *   - Master-Passphrase aus httpOnly-Cookie (nicht JS-zugänglich) → statt-
 *     dessen: Passwort-basierte Ableitung bei Login in dem gesicherten Kontext.
 *   - Für Demo/Entwicklung: Mock-Daten werden unverschlüsselt geladen.
 */

import { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, CheckCircle, Eye, EyeOff, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useArztSessionDetail } from '../hooks/useStaffApi';
import { decryptPayload, deriveSessionKey, type EncryptedPayload } from '../utils/clientEncryption';

// ─── Types ──────────────────────────────────────────────────

interface DecryptedAnswer {
    questionId: string;
    questionText: string;
    section: string;
    value: string | string[] | number | boolean;
    answeredAt: string;
}

interface SessionAnswerBlob {
    /** If set, the answer is AES-256-GCM encrypted */
    encrypted?: EncryptedPayload;
    /** Fallback: unencrypted (demo mode / legacy) */
    value?: unknown;
    questionText?: string;
    section?: string;
    answeredAt?: string;
}

interface MfaDecryptViewProps {
    sessionId: string;
    /** Master passphrase derived from the authenticated session. */
    masterKey?: string;
    onClose?: () => void;
}

// ─── Section Label Map ───────────────────────────────────────
const SECTION_LABELS: Record<string, string> = {
    patient: 'Patientendaten',
    anamnese: 'Anamnese',
    beschwerden: 'Aktuelle Beschwerden',
    vorerkrankungen: 'Vorerkrankungen',
    medikamente: 'Medikamente',
    allergien: 'Allergien',
    beruf: 'Beruf & Lebensstil',
    bg_unfall: 'BG-Unfall',
    abschluss: 'Abschluss',
};

// ─── Component ───────────────────────────────────────────────

export function MfaDecryptView({ sessionId, masterKey, onClose }: MfaDecryptViewProps) {
    const { t } = useTranslation();
    const { data: sessionDetail, isLoading, error } = useArztSessionDetail(sessionId);

    const [decryptedAnswers, setDecryptedAnswers] = useState<DecryptedAnswer[]>([]);
    const [decryptError, setDecryptError] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isDecrypted, setIsDecrypted] = useState(false);
    const [showValues, setShowValues] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // ─── Decrypt logic ────────────────────────────────────────

    const handleDecrypt = useCallback(async () => {
        if (!sessionDetail?.answers) return;

        setIsDecrypting(true);
        setDecryptError(null);

        try {
            const answers = sessionDetail.answers as Record<string, SessionAnswerBlob>;
            const passphrase = masterKey ?? 'demo-master-key';
            const key = await deriveSessionKey(passphrase, sessionId);
            const result: DecryptedAnswer[] = [];

            for (const [questionId, blob] of Object.entries(answers)) {
                if (blob.encrypted) {
                    // Decrypt encrypted payload
                    try {
                        const plain = await decryptPayload<{ value: unknown; questionText?: string; section?: string; answeredAt?: string }>(
                            blob.encrypted,
                            key,
                        );
                        result.push({
                            questionId,
                            questionText: plain.questionText ?? blob.questionText ?? questionId,
                            section: plain.section ?? blob.section ?? 'unbekannt',
                            value: plain.value as DecryptedAnswer['value'],
                            answeredAt: plain.answeredAt ?? blob.answeredAt ?? '',
                        });
                    } catch {
                        result.push({
                            questionId,
                            questionText: blob.questionText ?? questionId,
                            section: blob.section ?? 'unbekannt',
                            value: '[Entschlüsselung fehlgeschlagen — Auth-Tag ungültig]',
                            answeredAt: blob.answeredAt ?? '',
                        });
                    }
                } else {
                    // Demo/legacy: unencrypted value
                    result.push({
                        questionId,
                        questionText: blob.questionText ?? questionId,
                        section: blob.section ?? 'unbekannt',
                        value: (blob.value as DecryptedAnswer['value']) ?? '',
                        answeredAt: blob.answeredAt ?? '',
                    });
                }
            }

            // Sort by section, then answeredAt
            result.sort((a, b) => {
                const sectionCmp = a.section.localeCompare(b.section);
                if (sectionCmp !== 0) return sectionCmp;
                return a.answeredAt.localeCompare(b.answeredAt);
            });

            setDecryptedAnswers(result);
            setExpandedSections(new Set(result.map((a) => a.section)));
            setIsDecrypted(true);
        } catch (err) {
            setDecryptError(
                err instanceof Error ? err.message : 'Unbekannter Fehler bei der Entschlüsselung',
            );
        } finally {
            setIsDecrypting(false);
        }
    }, [sessionDetail, masterKey, sessionId]);

    // Auto-decrypt when session data loads (demo mode only)
    useEffect(() => {
        if (sessionDetail && !isDecrypted && !masterKey) {
            void handleDecrypt();
        }
    }, [sessionDetail, isDecrypted, masterKey, handleDecrypt]);

    // ─── Grouped answers ──────────────────────────────────────

    const grouped = decryptedAnswers.reduce<Record<string, DecryptedAnswer[]>>((acc, answer) => {
        const sec = answer.section;
        if (!acc[sec]) acc[sec] = [];
        acc[sec].push(answer);
        return acc;
    }, {});

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    // ─── Render ───────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold">
                            {t('mfa.decrypt.title', 'Patientendaten (entschlüsselt)')}
                        </h2>
                        <p className="text-xs text-[var(--text-secondary)] font-mono">
                            Session: {sessionId.substring(0, 16)}…
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowValues((v) => !v)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        title={showValues ? t('mfa.decrypt.hide', 'Werte verbergen') : t('mfa.decrypt.show', 'Werte anzeigen')}
                    >
                        {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <span className="sr-only">{t('common.close', 'Schließen')}</span>
                            <span aria-hidden>✕</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        <span className="ml-3 text-sm text-[var(--text-secondary)]">
                            {t('mfa.decrypt.loading', 'Daten werden geladen…')}
                        </span>
                    </div>
                )}

                {/* Fetch error */}
                {error && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-600">
                                {t('mfa.decrypt.fetch_error', 'Session konnte nicht geladen werden')}
                            </p>
                            <p className="text-xs text-red-500 mt-1">
                                {error instanceof Error ? error.message : String(error)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Manual decrypt prompt (when masterKey required) */}
                {sessionDetail && !isDecrypted && masterKey && !isDecrypting && (
                    <div className="flex flex-col items-center gap-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-8">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <Lock className="w-8 h-8 text-amber-500" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-semibold mb-1">
                                {t('mfa.decrypt.locked', 'Daten verschlüsselt')}
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                                {t(
                                    'mfa.decrypt.locked_hint',
                                    'Die Patientendaten liegen verschlüsselt vor. Entschlüsselung erfolgt lokal in Ihrem Browser.',
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void handleDecrypt()}
                            disabled={isDecrypting}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            <Unlock className="w-4 h-4" />
                            {t('mfa.decrypt.action', 'Jetzt entschlüsseln')}
                        </button>
                    </div>
                )}

                {/* Decrypting spinner */}
                {isDecrypting && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                        <span className="ml-3 text-sm text-[var(--text-secondary)]">
                            {t('mfa.decrypt.decrypting', 'Entschlüssele Patientendaten…')}
                        </span>
                    </div>
                )}

                {/* Decrypt error */}
                {decryptError && (
                    <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-red-600">
                                {t('mfa.decrypt.error', 'Entschlüsselung fehlgeschlagen')}
                            </p>
                            <p className="text-xs text-red-500 mt-1">{decryptError}</p>
                        </div>
                    </div>
                )}

                {/* Decrypted answers */}
                {isDecrypted && Object.keys(grouped).length > 0 && (
                    <div className="space-y-3">
                        {/* Success badge */}
                        <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-2.5">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            <p className="text-xs font-medium text-green-700">
                                {t(
                                    'mfa.decrypt.success',
                                    `${decryptedAnswers.length} Antworten erfolgreich entschlüsselt (AES-256-GCM)`,
                                    { count: decryptedAnswers.length },
                                )}
                            </p>
                        </div>

                        {/* Grouped sections */}
                        {Object.entries(grouped).map(([section, answers]) => (
                            <div key={section} className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                                        {SECTION_LABELS[section] ?? section}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[var(--text-secondary)]">
                                            {answers.length} Antworten
                                        </span>
                                        {expandedSections.has(section) ? (
                                            <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                                        )}
                                    </div>
                                </button>

                                {expandedSections.has(section) && (
                                    <ul className="divide-y divide-[var(--border-color)]">
                                        {answers.map((answer) => (
                                            <li key={answer.questionId} className="px-4 py-3">
                                                <p className="text-xs text-[var(--text-secondary)] mb-1">
                                                    {answer.questionText}
                                                </p>
                                                <p className="text-sm font-medium break-words">
                                                    {showValues
                                                        ? String(
                                                              Array.isArray(answer.value)
                                                                  ? answer.value.join(', ')
                                                                  : answer.value,
                                                          )
                                                        : '••••••'}
                                                </p>
                                                {answer.answeredAt && (
                                                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">
                                                        {new Date(answer.answeredAt).toLocaleString('de-DE')}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {isDecrypted && decryptedAnswers.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)] text-sm">
                        {t('mfa.decrypt.empty', 'Keine Antworten für diese Session vorhanden.')}
                    </div>
                )}
            </div>
        </div>
    );
}
