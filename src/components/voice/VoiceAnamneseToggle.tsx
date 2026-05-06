/**
 * VoiceAnamneseToggle.tsx
 *
 * Frontend-Component für Voice-Anamnese-Modus (Capture-Side, Class-I-konform).
 *
 * Anker: docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3 (ElevenLabs)
 *
 * REGULATORY GUARD (Klasse-I-Schutz):
 *   - Die Component ist UI-only — sie startet/stoppt eine Voice-Session
 *   - Output des Agents wird vor TTS durch filterAgentOutput im Backend geprüft
 *   - KEINE klinischen Aussagen erlaubt; bei Verbots-Wort-Match → Fallback-Text
 *   - Audio-Stream wird NICHT clientseitig gespeichert (DSGVO)
 *
 * Adressiert F5 (BITV 2.0 Barrierefreiheit) und macht die Anamnese inklusiver
 * für ältere Patienten, sehbehinderte Patienten und Patienten mit motorischen
 * Einschränkungen.
 *
 * STATUS: Skeleton — wartet auf:
 *   1) ELEVENLABS_API_KEY in Fly-Secrets (Backend)
 *   2) AVV mit ElevenLabs (DSGVO Art. 28)
 *   3) WebRTC-Stream-Endpoint im Backend
 *   4) Feature-Flag VOICE_AGENT_ENABLED
 */

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export interface VoiceAnamneseToggleProps {
    /** Session-ID für Audit-Logging (kein Patient-Klarname) */
    sessionId: string;
    /** Aktueller UI-Sprachcode aus i18next */
    language: string;
    /** Wird aufgerufen, wenn der Patient Voice-Mode startet/stoppt */
    onModeChange?: (active: boolean) => void;
    /** Wird aufgerufen, wenn der Voice-Agent ein Antworten-Objekt liefert */
    onAnswersReceived?: (answers: Record<string, string>) => void;
}

type VoiceState = 'idle' | 'requesting-permission' | 'connecting' | 'active' | 'stopping' | 'error';

const SUPPORTED_LANGUAGES: ReadonlyArray<string> = ['de', 'en', 'tr', 'ar', 'uk', 'es', 'fa', 'it', 'fr', 'pl'];

export function VoiceAnamneseToggle({
    sessionId,
    language,
    onModeChange,
    onAnswersReceived: _onAnswersReceived,
}: VoiceAnamneseToggleProps): React.ReactElement {
    const { t } = useTranslation();
    const [state, setState] = useState<VoiceState>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isSupported = SUPPORTED_LANGUAGES.includes(language.split('-')[0] ?? 'de');

    /**
     * Startet Voice-Session. Skeleton: ruft Backend an für agentId+wsUrl,
     * verbindet via WebRTC, streamt Mic-Audio, empfängt TTS-Audio.
     */
    const startVoiceSession = useCallback(async (): Promise<void> => {
        setErrorMsg(null);
        setState('requesting-permission');

        try {
            // 1) Browser-Mikrofon-Permission
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            setState('connecting');

            // 2) Backend-Setup für Voice-Agent abfragen
            // (Skeleton: Backend würde POST /api/voice/sessions/:sessionId/start liefern)
            const response = await fetch(`/api/voice/sessions/${encodeURIComponent(sessionId)}/start`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language }),
            });

            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error(t('voice.notAvailable', { defaultValue: 'Voice-Modus ist derzeit nicht verfügbar. Bitte verwenden Sie die Texteingabe.' }));
                }
                throw new Error(`Backend ${response.status}`);
            }

            // ⚠️ Skeleton-Stub: hier würde der WebRTC-Setup mit ElevenLabs-Stream erfolgen.
            // Aktuell beenden wir mit "not implemented" damit niemand das aktiviert.
            mediaStream.getTracks().forEach((t) => t.stop());

            throw new Error('Voice-Agent-Production noch nicht aktiv (siehe docs/CONNECTOR_DEEP_RESEARCH_2026-05-06.md §2.3)');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setErrorMsg(msg);
            setState('error');
            return;
        }
    }, [sessionId, language, t]);

    const stopVoiceSession = useCallback(async (): Promise<void> => {
        setState('stopping');
        try {
            await fetch(`/api/voice/sessions/${encodeURIComponent(sessionId)}/stop`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            /* nicht-kritisch */
        }
        setState('idle');
        onModeChange?.(false);
    }, [sessionId, onModeChange]);

    useEffect(() => {
        if (state === 'active') {
            onModeChange?.(true);
        }
    }, [state, onModeChange]);

    // ── Render ──────────────────────────────────────────

    if (!isSupported) {
        return (
            <div className="voice-toggle voice-toggle--unsupported">
                <small>
                    {t('voice.languageUnsupported', {
                        defaultValue: 'Voice-Modus für diese Sprache noch nicht verfügbar.',
                    })}
                </small>
            </div>
        );
    }

    return (
        <div className="voice-toggle" data-state={state} data-session={sessionId.slice(0, 8)}>
            <button
                type="button"
                onClick={state === 'active' ? stopVoiceSession : startVoiceSession}
                disabled={state === 'connecting' || state === 'requesting-permission' || state === 'stopping'}
                aria-label={t('voice.toggleLabel', { defaultValue: 'Voice-Modus umschalten' })}
                aria-pressed={state === 'active'}
                className="voice-toggle__button"
            >
                {state === 'idle' && t('voice.startButton', { defaultValue: 'Anamnese per Sprache starten' })}
                {state === 'requesting-permission' && t('voice.askingPermission', { defaultValue: 'Mikrofon-Zugriff anfragen…' })}
                {state === 'connecting' && t('voice.connecting', { defaultValue: 'Verbindung wird hergestellt…' })}
                {state === 'active' && t('voice.stopButton', { defaultValue: 'Voice-Modus beenden' })}
                {state === 'stopping' && t('voice.stopping', { defaultValue: 'Beende Sitzung…' })}
                {state === 'error' && t('voice.retryButton', { defaultValue: 'Erneut versuchen' })}
            </button>

            {state === 'active' && (
                <div className="voice-toggle__indicator" role="status" aria-live="polite">
                    <span className="voice-toggle__pulse" aria-hidden="true" />
                    {t('voice.activeIndicator', { defaultValue: 'Voice-Modus aktiv. Bitte sprechen Sie deutlich.' })}
                </div>
            )}

            {state === 'error' && errorMsg && (
                <div className="voice-toggle__error" role="alert">
                    <strong>{t('voice.errorTitle', { defaultValue: 'Voice-Modus nicht verfügbar' })}:</strong> {errorMsg}
                    <p>
                        <small>
                            {t('voice.fallback', {
                                defaultValue: 'Sie können die Anamnese weiterhin per Tastatur und Touch ausfüllen.',
                            })}
                        </small>
                    </p>
                </div>
            )}

            <p className="voice-toggle__hint">
                <small>
                    {t('voice.privacyHint', {
                        defaultValue: 'Audio wird nicht gespeichert. Voice-Modus ist administrativ — er bestätigt Ihre Eingaben und gibt keine medizinische Beurteilung.',
                    })}
                </small>
            </p>
        </div>
    );
}

export default VoiceAnamneseToggle;
