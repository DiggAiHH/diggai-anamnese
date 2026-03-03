import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

// Extend Window for SpeechRecognition API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  lang?: string;
  className?: string;
  disabled?: boolean;
}

// isSpeechSupported moved to ../../utils/speechSupport.ts for Fast Refresh compatibility
import { isSpeechSupported } from '../../utils/speechSupport';

/**
 * VoiceInputButton — Microphone button that uses the browser's Web Speech API.
 * Audio is processed entirely in the browser — NO data is sent to external servers.
 * DSGVO-konform: Keine Audiodaten werden gespeichert oder übertragen.
 */
export function VoiceInputButton({ onTranscript, lang = 'de-DE', className = '', disabled = false }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!isSpeechSupported()) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimText('');
      return;
    }

    // Create new recognition instance
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'aborted' and 'no-speech' are non-critical
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('[VoiceInput] Error:', event.error);
      }
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Chrome sometimes throws if already started
      setIsListening(false);
    }
  }, [isListening, lang, onTranscript]);

  // Don't render if Speech API not supported
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
      >
        {isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            {/* Pulsing ring animation */}
            <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-30" />
          </>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Interim text indicator */}
      {isListening && interimText && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] italic max-w-[200px] truncate">
          <Loader2 className="w-3 h-3 animate-spin text-red-400 shrink-0" />
          <span className="truncate">{interimText}</span>
        </div>
      )}

      {isListening && !interimText && (
        <span className="text-xs text-red-400 font-medium animate-pulse">
          🎙️ Zuhören…
        </span>
      )}
    </div>
  );
}
