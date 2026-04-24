import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTTS } from './useTTS';

type WaitingStatus = 'WAITING' | 'CALLED' | 'IN_TREATMENT' | 'DONE';

interface UseWaitingRoomAvatarGuidanceInput {
    enabled: boolean;
    status: WaitingStatus;
    position: number | null;
    estimatedWait: number | null;
    minIntervalMs?: number;
}

interface UseWaitingRoomAvatarGuidanceResult {
    isSpeaking: boolean;
    stopGuidance: () => void;
}

/**
 * Voice guidance helper for waiting-room queue events.
 *
 * Uses existing TTS abstraction and throttles announcements so patients do not
 * receive repetitive prompts when queue events are noisy.
 */
export function useWaitingRoomAvatarGuidance({
    enabled,
    status,
    position,
    estimatedWait,
    minIntervalMs = 18_000,
}: UseWaitingRoomAvatarGuidanceInput): UseWaitingRoomAvatarGuidanceResult {
    const { t } = useTranslation();
    const { playVoice, stop, isSpeaking } = useTTS();

    const lastSpokenAtRef = useRef(0);
    const lastPositionRef = useRef<number | null>(null);
    const waitBucketRef = useRef(0);
    const calledAnnouncedRef = useRef(false);

    const speakWithCooldown = useCallback((text: string) => {
        if (!enabled || !text.trim()) {
            return;
        }

        const now = Date.now();
        if (now - lastSpokenAtRef.current < minIntervalMs) {
            return;
        }

        lastSpokenAtRef.current = now;
        void playVoice(text);
    }, [enabled, minIntervalMs, playVoice]);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (status === 'CALLED' && !calledAnnouncedRef.current) {
            calledAnnouncedRef.current = true;
            speakWithCooldown(`${t('waiting.called', 'Sie werden aufgerufen!')} ${t('waiting.called_message', 'Bitte begeben Sie sich zum Behandlungsraum.')}`);
            return;
        }

        if (status !== 'CALLED') {
            calledAnnouncedRef.current = false;
        }
    }, [enabled, status, speakWithCooldown, t]);

    useEffect(() => {
        if (!enabled || status !== 'WAITING' || position === null) {
            return;
        }

        const previousPosition = lastPositionRef.current;
        lastPositionRef.current = position;

        if (previousPosition === null || position < previousPosition) {
            speakWithCooldown(`${t('queue.yourPosition', 'Ihre Position')}: ${position}.`);
        }
    }, [enabled, status, position, speakWithCooldown, t]);

    useEffect(() => {
        if (!enabled || status !== 'WAITING' || estimatedWait === null) {
            return;
        }

        const bucket = estimatedWait >= 30 ? 3 : estimatedWait >= 20 ? 2 : estimatedWait >= 10 ? 1 : 0;
        if (bucket > 0 && bucket !== waitBucketRef.current) {
            waitBucketRef.current = bucket;
            speakWithCooldown(`${t('waiting.estimated_wait', 'Geschätzte Wartezeit')}: ${estimatedWait} ${t('waiting.minutes', 'Minuten')}.`);
        }
    }, [enabled, status, estimatedWait, speakWithCooldown, t]);

    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);

    return {
        isSpeaking,
        stopGuidance: stop,
    };
}
