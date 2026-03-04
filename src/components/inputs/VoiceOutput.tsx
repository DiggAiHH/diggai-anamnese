/**
 * VoiceOutput — Text-to-Speech Component using Web Speech API
 * 
 * DSGVO-konform: Alle Sprachausgabe erfolgt lokal im Browser.
 * Keine Daten werden an externe Server gesendet.
 * 
 * Features:
 * - Vorlesen von Fragen und Hilfetexten
 * - Sprache folgt der aktuellen i18n-Locale
 * - Pause/Resume/Stop Steuerung
 * - Geschwindigkeit und Lautstärke anpassbar
 * - Visuelles Feedback während der Sprache
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Pause, Play, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ─── TTS Support Detection ─────────────────────────────

export function isTTSSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ─── Language → Voice Mapping ───────────────────────────

const LANG_VOICE_MAP: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  tr: 'tr-TR',
  ar: 'ar-SA',
  ru: 'ru-RU',
  pl: 'pl-PL',
  fa: 'fa-IR',
  uk: 'uk-UA',
  fr: 'fr-FR',
  es: 'es-ES',
};

// ─── Speak Button (Inline) ─────────────────────────────

interface VoiceOutputButtonProps {
  /** Text to speak */
  text: string;
  /** Optional language override (default: current i18n lang) */
  lang?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
}

export function VoiceOutputButton({
  text,
  lang,
  className = '',
  disabled = false,
  size = 'md',
}: VoiceOutputButtonProps) {
  const { i18n, t } = useTranslation();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const voiceLang = LANG_VOICE_MAP[lang || i18n.language] || 'de-DE';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTTSSupported()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync speaking state
  useEffect(() => {
    if (!isTTSSupported()) return;
    const check = setInterval(() => {
      setIsSpeaking(window.speechSynthesis.speaking);
      setIsPaused(window.speechSynthesis.paused);
    }, 200);
    return () => clearInterval(check);
  }, []);

  const speak = useCallback(() => {
    if (!isTTSSupported() || !text) return;

    // If already speaking — toggle pause/resume
    if (window.speechSynthesis.speaking) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    // Start new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceLang;
    utterance.rate = 0.9; // Slightly slower for medical terms
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang === voiceLang) ||
                          voices.find(v => v.lang.startsWith(voiceLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, voiceLang]);

  const stop = useCallback(() => {
    if (isTTSSupported()) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, []);

  if (!isTTSSupported()) return null;

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSize = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={speak}
        disabled={disabled || !text}
        className={`
          ${sizeClasses[size]} rounded-lg transition-all
          ${isSpeaking && !isPaused
            ? 'bg-blue-500/20 text-blue-400 animate-pulse'
            : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
          }
          border border-[var(--border-primary)] hover:border-[var(--border-hover)]
          disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
        `}
        aria-label={
          isSpeaking
            ? isPaused
              ? t('voice.resume', 'Fortsetzen')
              : t('voice.pause', 'Pause')
            : t('voice.read_aloud', 'Vorlesen')
        }
        title={
          isSpeaking
            ? isPaused
              ? t('voice.resume', 'Fortsetzen')
              : t('voice.pause', 'Pause')
            : t('voice.read_aloud', 'Vorlesen')
        }
      >
        {isSpeaking ? (
          isPaused ? <Play className={iconSize[size]} /> : <Pause className={iconSize[size]} />
        ) : (
          <Volume2 className={iconSize[size]} />
        )}
      </button>

      {/* Stop button — only visible while speaking */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stop}
          className={`
            ${sizeClasses[size]} rounded-lg transition-all
            bg-red-500/20 hover:bg-red-500/30 text-red-400
            border border-red-500/30
            focus:outline-none focus:ring-2 focus:ring-red-500/30
          `}
          aria-label={t('voice.stop', 'Stoppen')}
          title={t('voice.stop', 'Stoppen')}
        >
          <Square className={iconSize[size]} />
        </button>
      )}
    </div>
  );
}

// ─── Auto-read Component ────────────────────────────────

interface AutoVoiceOutputProps {
  /** Text to auto-read when it changes */
  text: string;
  /** Whether auto-read is enabled */
  enabled?: boolean;
  /** Delay before speaking (ms) */
  delay?: number;
  /** Language override */
  lang?: string;
}

/**
 * AutoVoiceOutput — Automatically reads text when it changes
 * Used for question labels and help texts in accessible mode
 */
export function AutoVoiceOutput({ text, enabled = false, delay = 500, lang }: AutoVoiceOutputProps) {
  const { i18n } = useTranslation();
  const voiceLang = LANG_VOICE_MAP[lang || i18n.language] || 'de-DE';
  const prevTextRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !isTTSSupported() || !text || text === prevTextRef.current) return;
    prevTextRef.current = text;

    const timer = setTimeout(() => {
      window.speechSynthesis.cancel(); // Stop previous

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang;
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === voiceLang) ||
                    voices.find(v => v.lang.startsWith(voiceLang.split('-')[0]));
      if (voice) utterance.voice = voice;

      window.speechSynthesis.speak(utterance);
    }, delay);

    return () => clearTimeout(timer);
  }, [text, enabled, delay, voiceLang]);

  return null; // Invisible component
}

// ─── Global TTS Toggle Hook ────────────────────────────

export function useVoiceOutput() {
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    try {
      return localStorage.getItem('diggai_tts_enabled') === 'true';
    } catch {
      return false;
    }
  });

  const toggleTTS = useCallback(() => {
    setTtsEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('diggai_tts_enabled', String(next)); } catch {}
      if (!next && isTTSSupported()) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  return { ttsEnabled, toggleTTS };
}

// ─── TTS Toggle Button ─────────────────────────────────

export function TTSToggleButton() {
  const { t } = useTranslation();
  const { ttsEnabled, toggleTTS } = useVoiceOutput();

  if (!isTTSSupported()) return null;

  return (
    <button
      type="button"
      onClick={toggleTTS}
      className={`
        p-2 rounded-lg transition-all border
        ${ttsEnabled
          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
          : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-primary)] hover:text-[var(--text-secondary)]'
        }
        focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30
      `}
      aria-label={ttsEnabled ? t('voice.tts_off', 'Vorlesen deaktivieren') : t('voice.tts_on', 'Vorlesen aktivieren')}
      title={ttsEnabled ? t('voice.tts_off', 'Vorlesen deaktivieren') : t('voice.tts_on', 'Vorlesen aktivieren')}
      aria-pressed={ttsEnabled}
    >
      {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
    </button>
  );
}
