// VoiceInput.improved.tsx
// React 19 Best Practices Implementation für SpeechRecognition
// - Strict Mode kompatibel
// - Memory Leak Prevention
// - AbortController Pattern
// - TypeScript strict mode

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { isSpeechSupported } from '../../utils/speechSupport';

// ============================================================================
// TYPE DEFINITIONS (Vollständige Web Speech API Types)
// ============================================================================

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

type SpeechRecognitionErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// NOTE: Global Window declaration removed to prevent conflicts with VoiceInput.tsx
// If this file is activated, ensure global declaration is properly merged

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

type RecognitionState = 'idle' | 'starting' | 'listening' | 'processing' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

function VoiceInputButton({
  onTranscript,
  lang = 'de-DE',
  className = '',
  disabled = false,
  placeholder = '🎙️ Zuhören…',
}: VoiceInputButtonProps) {
  // State
  const [recognitionState, setRecognitionState] = useState<RecognitionState>('idle');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs für React 19 Strict Mode Kompatibilität
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const id = useId();

  const isListening = recognitionState === 'listening' || recognitionState === 'processing';

  // ============================================================================
  // CLEANUP FUNCTION - Memory-Leak Prevention
  // ============================================================================

  const cleanup = useCallback(() => {
    // AbortController signalisieren
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // SpeechRecognition sauber beenden
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        // WICHTIG: Event-Listener ENTFERNEN vor abort()
        // Dies verhindert race conditions beim Cleanup
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        recognition.onaudiostart = null;
        recognition.onaudioend = null;
        recognition.onspeechstart = null;
        recognition.onspeechend = null;

        // Abort unterbricht sofort
        recognition.abort();
      } catch {
        // Ignore errors during cleanup
      }
      recognitionRef.current = null;
    }

    // State nur aktualisieren wenn Component noch mounted
    if (isMountedRef.current) {
      setRecognitionState('idle');
      setInterimText('');
    }
  }, []);

  // ============================================================================
  // USEEFFECT: Mount/Unmount Handling für React 19 Strict Mode
  // ============================================================================

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // ============================================================================
  // START RECOGNITION
  // ============================================================================

  const startRecognition = useCallback(() => {
    if (!isSpeechSupported()) return;

    // WICHTIG: Bestehende Recognition cleanup VOR dem Start
    // Dies verhindert parallele Instanzen (race conditions)
    cleanup();

    // Neuen AbortController für diese Session
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // SpeechRecognition erstellen
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition() as SpeechRecognition;
    recognitionRef.current = recognition;

    // Konfiguration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    // ============================================================================
    // EVENT HANDLER (mit AbortSignal Check)
    // ============================================================================

    recognition.onstart = () => {
      // Prüfe ob Aborted oder Unmounted
      if (signal.aborted || !isMountedRef.current) return;
      setRecognitionState('listening');
      setError(null);
    };

    recognition.onaudiostart = () => {
      if (signal.aborted || !isMountedRef.current) return;
      console.debug('[VoiceInput] Audio capture started');
    };

    recognition.onspeechstart = () => {
      if (signal.aborted || !isMountedRef.current) return;
      setRecognitionState('processing');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (signal.aborted || !isMountedRef.current) return;

      let finalTranscript = '';
      let interim = '';

      // Iteriere über alle Results seit dem letzten Event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        // Final result - callback und cleanup
        onTranscript(finalTranscript.trim());
        setInterimText('');
        cleanup();
      } else {
        // Interim result - UI aktualisieren
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;

      // Ignoriere aborted Fehler (erwartet bei Cleanup)
      if (event.error === 'aborted') {
        return;
      }

      // Ignoriere no-speech als non-critical
      if (event.error === 'no-speech') {
        console.debug('[VoiceInput] No speech detected');
        return;
      }

      // Kritische Fehler loggen
      console.warn('[VoiceInput] Recognition error:', event.error);
      setError(event.error);
      cleanup();
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;

      // Nur cleanup wenn nicht schon durch error oder result erledigt
      if (recognitionRef.current === recognition) {
        cleanup();
      }
    };

    // Starte Recognition
    try {
      setRecognitionState('starting');
      recognition.start();
    } catch (err) {
      console.error('[VoiceInput] Failed to start recognition:', err);
      cleanup();
    }
  }, [lang, onTranscript, cleanup]);

  // ============================================================================
  // STOP RECOGNITION (User-initiated)
  // ============================================================================

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        // stop() erlaubt final results zu verarbeiten
        recognition.stop();
      } catch {
        cleanup();
      }
    }
  }, [cleanup]);

  // ============================================================================
  // TOGGLE HANDLER
  // ============================================================================

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  }, [isListening, startRecognition, stopRecognition]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isSpeechSupported()) return null;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`
          relative p-2.5 rounded-xl transition-all duration-200 border
          ${isListening
            ? 'bg-red-500/20 border-red-500/40 text-red-400 shadow-lg shadow-red-500/20'
            : 'bg-[var(--bg-card)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-500/10'
          }
          disabled:opacity-30 disabled:cursor-not-allowed
        `}
        aria-label={isListening ? 'Spracheingabe stoppen' : 'Spracheingabe starten'}
        title={isListening ? 'Spracheingabe stoppen' : 'Spracheingabe starten (Mikrofon)'}
        aria-pressed={isListening}
        aria-describedby={interimText ? `${id}-interim` : undefined}
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-30" />
          </>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Interim text indicator */}
      {isListening && interimText && (
        <div
          id={`${id}-interim`}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] italic max-w-[200px] truncate"
        >
          <Loader2 className="w-3 h-3 animate-spin text-red-400 shrink-0" />
          <span className="truncate">{interimText}</span>
        </div>
      )}

      {isListening && !interimText && (
        <span className="text-xs text-red-400 font-medium animate-pulse">
          {placeholder}
        </span>
      )}

      {error && (
        <span className="text-xs text-amber-500">
          Fehler: {error}
        </span>
      )}
    </div>
  );
}
