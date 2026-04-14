/**
 * MfaDecryptView — Decrypted Session Display for Arzt/MFA after Authentication
 *
 * Renders the full patient session with decrypted PII fields.
 * Only accessible after successful MFA authentication (role: arzt | mfa | admin).
 *
 * Architecture (Zero-Knowledge):
 *   - Legacy AES-256-GCM PII fields remain server-entschlüsselt für Bestanddaten.
 *   - Neue client-seitig verschlüsselte Antworten werden als Ciphertext-Blob geliefert.
 *   - Browser-Entschlüsselung findet nur hier nach MFA mit lokalem Schlüssel statt.
 *
 * Usage:
 *   <MfaDecryptView sessionId={sessionId} onClose={() => navigate(-1)} />
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useArztSessionDetail } from '../../hooks/useStaffApi';
import { decryptPayload, deriveSessionKey, type EncryptedPayload } from '../../utils/clientEncryption';
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    Clock,
    FileText,
    Lock,
    Loader2,
    Shield,
    Unlock,
    User,
    X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────

interface TriageEvent {
    id: string;
    level: 'CRITICAL' | 'WARNING' | 'INFO';
    rule: string;
    details: string;
    createdAt: string;
    acknowledgedBy: string | null;
}

interface EnrichedAnswer {
    atomId: string;
    questionText: string;
    section: string;
    displayValue: { data: unknown };
    answeredAt: string;
    isPII: boolean;
}

interface SessionDetail {
    id: string;
    patientName: string;
    isNewPatient: boolean;
    gender: string | null;
    selectedService: string | null;
    status: string;
    createdAt: string;
    completedAt: string | null;
    answers: EnrichedAnswer[];
    triageEvents: TriageEvent[];
}

interface MfaDecryptViewProps {
    sessionId: string;
    masterKey?: string;
    onClose?: () => void;
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const payload = value as Record<string, unknown>;
    return typeof payload.iv === 'string'
        && typeof payload.ciphertext === 'string'
        && payload.alg === 'AES-256-GCM'
        && typeof payload.encryptedAt === 'string';
}

function getClientEncryptedPayload(answer: EnrichedAnswer): EncryptedPayload | null {
    const rawData = answer.displayValue?.data;
    if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return null;
    }

    const record = rawData as Record<string, unknown>;
    return isEncryptedPayload(record.encrypted) ? record.encrypted : null;
}

// ─── Sub-Components ─────────────────────────────────────────

function TriageEventBadge({ level }: { level: TriageEvent['level'] }) {
    const styles: Record<TriageEvent['level'], string> = {
        CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
        WARNING: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
        INFO: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[level]}`}>
            {level === 'CRITICAL' && <AlertTriangle className="w-3 h-3" />}
            {level === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
            {level === 'INFO' && <Shield className="w-3 h-3" />}
            {level}
        </span>
    );
}

function AnswerSection({
    section,
    answers,
}: {
    section: string;
    answers: EnrichedAnswer[];
}) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border border-[var(--border-primary)] rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-card)] transition-colors text-left"
                aria-expanded={open}
            >
                <span className="text-sm font-semibold text-[var(--text-primary)]">{section}</span>
                {open
                    ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                    : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                }
            </button>

            {open && (
                <ul className="divide-y divide-[var(--border-primary)]">
                    {answers.map((a) => (
                        <li key={a.atomId} className="px-4 py-3 flex items-start gap-3">
                            {a.isPII && (
                                <Lock
                                    className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500"
                                    aria-label="PII — verschlüsselt gespeichert"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-[var(--text-secondary)] mb-0.5">{a.questionText}</p>
                                <p className="text-sm font-medium text-[var(--text-primary)] break-words">
                                    {typeof a.displayValue?.data === 'string'
                                        ? a.displayValue.data
                                        : JSON.stringify(a.displayValue?.data ?? '')}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────

export function MfaDecryptView({ sessionId, masterKey, onClose }: MfaDecryptViewProps) {
    const { t } = useTranslation();
    const { data: sessionData, isLoading: loading, error } = useArztSessionDetail(sessionId);
    const session = sessionData as SessionDetail | null | undefined;
    const [clientDecryptedValues, setClientDecryptedValues] = useState<Record<string, unknown>>({});
    const [decryptError, setDecryptError] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    const availableMasterKey = useMemo(() => {
        if (masterKey?.trim()) {
            return masterKey.trim();
        }

        if (typeof sessionStorage === 'undefined') {
            return null;
        }

        const storedSessionId = sessionStorage.getItem('diggai:e2ee:sessionId');
        const storedPassphrase = sessionStorage.getItem('diggai:e2ee:passphrase');
        return storedSessionId === sessionId ? storedPassphrase : null;
    }, [masterKey, sessionId]);

    const hasClientEncryptedAnswers = useMemo(
        () => (session?.answers ?? []).some((answer: EnrichedAnswer) => getClientEncryptedPayload(answer) !== null),
        [session],
    );

    useEffect(() => {
        setClientDecryptedValues({});
        setDecryptError(null);
    }, [sessionId]);

    useEffect(() => {
        if (!session?.answers?.length || !availableMasterKey || !hasClientEncryptedAnswers) {
            return;
        }

        let isCancelled = false;

        const decryptAnswers = async () => {
            setIsDecrypting(true);
            setDecryptError(null);

            try {
                const key = await deriveSessionKey(availableMasterKey, sessionId);
                const decryptedEntries = await Promise.all(
                    session.answers.map(async (answer: EnrichedAnswer) => {
                        const encrypted = getClientEncryptedPayload(answer);
                        if (!encrypted) {
                            return [answer.atomId, answer.displayValue?.data] as const;
                        }

                        const decrypted = await decryptPayload<{ value?: unknown }>(encrypted, key);
                        return [answer.atomId, decrypted.value ?? '[leer]'] as const;
                    }),
                );

                if (!isCancelled) {
                    setClientDecryptedValues(Object.fromEntries(decryptedEntries));
                }
            } catch (decryptErr) {
                if (!isCancelled) {
                    setDecryptError(
                        decryptErr instanceof Error
                            ? decryptErr.message
                            : t('mfa_decrypt.error_decrypt', 'Entschlüsselung fehlgeschlagen.'),
                    );
                }
            } finally {
                if (!isCancelled) {
                    setIsDecrypting(false);
                }
            }
        };

        void decryptAnswers();

        return () => {
            isCancelled = true;
        };
    }, [availableMasterKey, hasClientEncryptedAnswers, session, sessionId, t]);

    const resolvedAnswers = useMemo<EnrichedAnswer[]>(() => {
        if (!session?.answers) {
            return [];
        }

        return session.answers.map((answer: EnrichedAnswer) => {
            const encrypted = getClientEncryptedPayload(answer);
            if (!encrypted) {
                return answer;
            }

            return {
                ...answer,
                isPII: true,
                displayValue: {
                    data: Object.prototype.hasOwnProperty.call(clientDecryptedValues, answer.atomId)
                        ? clientDecryptedValues[answer.atomId]
                        : availableMasterKey
                        ? '[Entschlüsselung läuft …]'
                        : '[Browser-Entschlüsselung erforderlich]',
                },
            };
        });
    }, [availableMasterKey, clientDecryptedValues, session]);

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-48 gap-3 text-[var(--text-secondary)]">
                <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-sm">{t('mfa_decrypt.loading', 'Lade Patientendaten…')}</span>
            </div>
        );
    }

    // ── Error ──
    if (error || !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-48 gap-3 text-center px-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <p className="text-sm text-[var(--text-secondary)]">
                    {error instanceof Error ? error.message : error ?? t('mfa_decrypt.not_found', 'Session nicht gefunden.')}
                </p>
            </div>
        );
    }

    // ── Group answers by section ──
    const sectionMap = new Map<string, EnrichedAnswer[]>();
    for (const a of resolvedAnswers) {
        const key = a.section || t('mfa_decrypt.section_other', 'Sonstige');
        if (!sectionMap.has(key)) sectionMap.set(key, []);
        sectionMap.get(key)!.push(a);
    }

    const criticalEvents = session.triageEvents.filter((event: TriageEvent) => event.level === 'CRITICAL');

    return (
        <article className="flex flex-col gap-5">
            {/* ── Header ── */}
            <header className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-green-500" />
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">
                            {t('mfa_decrypt.title', 'Patientendaten (entschlüsselt)')}
                        </h2>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                        {t('mfa_decrypt.session_id', 'Session')}: <code className="font-mono">{session.id}</code>
                    </p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        aria-label={t('common.close', 'Schließen')}
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </header>

            {/* ── Critical Triage Alerts ── */}
            {criticalEvents.length > 0 && (
                <section
                    className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 space-y-2"
                    aria-label={t('mfa_decrypt.critical_alerts', 'Kritische Triage-Hinweise')}
                >
                    <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        {t('mfa_decrypt.critical_alerts', 'Kritische Triage-Hinweise')}
                    </h3>
                    {criticalEvents.map((event: TriageEvent) => (
                        <div key={event.id} className="text-xs text-red-700 dark:text-red-300">
                            <span className="font-semibold">{event.rule}: </span>
                            {event.details}
                        </div>
                    ))}
                </section>
            )}

            {hasClientEncryptedAnswers && (
                <section className="rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4 space-y-2">
                    <div className="flex items-start gap-3">
                        <Unlock className="w-4 h-4 text-blue-600 dark:text-blue-300 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {t('mfa_decrypt.browser_unlock_title', 'Browser-Entschlüsselung aktiv')}
                            </h3>
                            <p className="text-xs text-blue-700/90 dark:text-blue-200/90">
                                {availableMasterKey
                                    ? t('mfa_decrypt.browser_unlock_ready', 'Neue E2EE-Felder werden lokal im Browser entschlüsselt. Der Schlüssel verlässt den Browser nicht.')
                                    : t('mfa_decrypt.browser_unlock_missing', 'Für neue E2EE-Felder wird ein lokaler Entschlüsselungs-Schlüssel benötigt. Ohne Schlüssel bleiben diese Antworten verborgen.')}
                            </p>
                            {isDecrypting && (
                                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-200">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {t('mfa_decrypt.browser_unlock_loading', 'Entschlüssele verschlüsselte Felder…')}
                                </div>
                            )}
                            {decryptError && (
                                <p className="text-xs text-red-600 dark:text-red-300">{decryptError}</p>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Patient Meta ── */}
            <section className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        <User className="w-3 h-3 inline mr-1" />
                        {t('mfa_decrypt.patient_name', 'Patient')}
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">
                        {session.patientName || t('mfa_decrypt.unknown', '—')}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        <FileText className="w-3 h-3 inline mr-1" />
                        {t('mfa_decrypt.service', 'Service')}
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">
                        {session.selectedService || t('mfa_decrypt.unknown', '—')}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {t('mfa_decrypt.created_at', 'Aufgenommen')}
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">
                        {new Date(session.createdAt).toLocaleString('de-DE')}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        {t('mfa_decrypt.status', 'Status')}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        session.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                        {session.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />}
                        {session.status}
                    </span>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        {t('mfa_decrypt.patient_type', 'Patient-Typ')}
                    </p>
                    <p className="font-semibold text-[var(--text-primary)]">
                        {session.isNewPatient
                            ? t('mfa_decrypt.new_patient', 'Neupatient')
                            : t('mfa_decrypt.returning_patient', 'Bestandspatient')}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-[var(--text-secondary)] mb-0.5">
                        {t('mfa_decrypt.triage_events', 'Triage-Events')}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                        {session.triageEvents.length === 0
                            ? <span className="text-xs text-[var(--text-secondary)]">—</span>
                            : session.triageEvents.map((event: TriageEvent) => (
                                <TriageEventBadge key={event.id} level={event.level} />
                            ))
                        }
                    </div>
                </div>
            </section>

            {/* ── Answers by Section ── */}
            <section>
                <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                    {t('mfa_decrypt.answers_title', 'Antworten')} ({session.answers.length})
                </h3>
                {sectionMap.size === 0 ? (
                    <p className="text-sm text-[var(--text-secondary)] text-center py-6">
                        {t('mfa_decrypt.no_answers', 'Keine Antworten vorhanden.')}
                    </p>
                ) : (
                    <div className="space-y-3">
                        {Array.from(sectionMap.entries()).map(([section, answers]) => (
                            <AnswerSection key={section} section={section} answers={answers} />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Security footer ── */}
            <footer className="flex items-center gap-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border-primary)] pt-4">
                <Lock className="w-3.5 h-3.5 shrink-0 text-green-500" />
                {t('mfa_decrypt.security_notice',
                    'Daten werden nur in dieser gesicherten MFA-Umgebung im Klartext angezeigt. ' +
                    'Legacy-PII bleibt in der Datenbank AES-256-GCM-verschlüsselt, neue E2EE-Felder werden lokal im Browser entschlüsselt.')}
            </footer>
        </article>
    );
}
