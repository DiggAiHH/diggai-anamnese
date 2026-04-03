# SpeechRecognition Best Practices für React 19

> **Kontext:** VoiceInput Komponente - Troubleshooting von Cleanup/Memory-Leak Issues
> **Ziel:** Moderne React 19 Patterns für robuste SpeechRecognition Integration

---

## 1. Übersicht: Die Hauptprobleme

Die aktuelle VoiceInput-Implementierung hat folgende kritische Probleme:

1. **Memory Leak bei Strict Mode**: Neue Recognition-Instanz bei jedem Klick erstellt
2. **Fehlendes AbortController-Pattern**: Keine saubere Abort-Behandlung
3. **Stale Closures**: Event-Handler greifen auf veraltete State-Referenzen zu
4. **Race Conditions**: Mehrfaches schnelles Klicken erzeugt parallele Recognition-Instanzen

---

## 2. State-Flow Diagramm

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SPEECH RECOGNITION STATE FLOW                       │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐     click      ┌──────────┐   onstart    ┌──────────┐
│  IDLE    │ ─────────────> │ STARTING │ ───────────> │ LISTENING│
│ (ready)  │                │(setup)   │              │(active)  │
└──────────┘                └──────────┘              └────┬─────┘
     ▲                                                    │
     │                                                    │ interim result
     │                                                    ▼
     │                                               ┌──────────┐
     │                                               │ PROCESS  │
     │                                               │ INTERIM  │
     │                                               │ (update  │
     │                                               │  UI)     │
     │                                               └────┬─────┘
     │                                                    │
     │              ┌─────────────────────────────────────┘
     │              │ final result
     │              ▼
     │         ┌──────────┐
     │         │  FINAL   │ ────────> onTranscript(text)
     │         │ RESULT   │
     │         └────┬─────┘
     │              │
     │              │ onend / abort / stop
     │              ▼
     │         ┌──────────┐
     └─────────┤ CLEANUP  │ <─────────────────────────────┐
               │ (reset   │                                │
               │  state)  │                                │
               └──────────┘                                │
                                                           │
                              ┌────────────────────────────┘
                              │
┌─────────────────────────────┼──────────────────────────────┐
│           ERROR HANDLING    │                              │
│  ┌──────────────────────────┘                              │
│  │                                                         │
│  ▼                                                         │
│ ┌──────────┐    onerror    ┌──────────┐                   │
│ │ LISTENING│ ────────────> │  ERROR   │ ──────────────────┘
│ │          │               │ HANDLER  │
│ └──────────┘               │(log &    │
│                            │ cleanup)  │
│                            └──────────┘
└────────────────────────────────────────────────────────────┘
```

### State-Transition Tabelle

| Von State | Event | Nach State | Aktion |
|-----------|-------|------------|--------|
| IDLE | User click | STARTING | Recognition-Instanz erstellen, start() aufrufen |
| STARTING | onstart | LISTENING | isListening = true |
| LISTENING | interim result | PROCESSING | interimText aktualisieren |
| LISTENING | final result | FINAL | onTranscript callback, cleanup |
| LISTENING | onerror | ERROR | Fehler loggen, cleanup |
| LISTENING | User click stop | CLEANUP | stop() aufrufen |
| LISTENING | onend | CLEANUP | State reset |
| * | Unmount | CLEANUP | abort() aufrufen |

---

## 3. React 19 Kompatibel: Saubere VoiceInput Komponente

```typescript
// VoiceInput.tsx - React 19 Best Practices Version
import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { isSpeechSupported } from '../../utils/speechSupport';

// ============================================================================
// TYPE DEFINITIONS
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

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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

export function VoiceInputButton({
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
  // CLEANUP FUNCTION - Das Herzstück für Memory-Leak Prevention
  // ============================================================================

  const cleanup = useCallback(() => {
    // AbortController signalisieren für async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // SpeechRecognition sauber beenden
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        // Entferne alle Event-Listener vor dem Abort
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        recognition.onaudiostart = null;
        recognition.onaudioend = null;
        recognition.onspeechstart = null;
        recognition.onspeechend = null;

        // Abort unterbricht sofort, ohne onend zu triggern
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
  // USEEFFECT: Mount/Unmount Handling für Strict Mode
  // ============================================================================

  useEffect(() => {
    // Mark as mounted
    isMountedRef.current = true;

    // Cleanup-Funktion für Unmount
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

    // Bestehende Recognition cleanup
    cleanup();

    // Neuen AbortController für diese Session
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    // SpeechRecognition erstellen
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Konfiguration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    // ============================================================================
    // EVENT HANDLER (mit Closure-basiertem State-Check)
    // ============================================================================

    recognition.onstart = () => {
      if (signal.aborted || !isMountedRef.current) return;
      setRecognitionState('listening');
      setError(null);
    };

    recognition.onaudiostart = () => {
      if (signal.aborted || !isMountedRef.current) return;
      // Audio-Erfassung hat begonnen
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
        // Stoppe nach final result (nicht-continuous Modus Verhalten)
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
      // onend wird auch nach abort() aufgerufen (außer bei einigen Browsern)
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
```

---

## 4. Custom Hook: useSpeechRecognition

```typescript
// hooks/useSpeechRecognition.ts
import { useState, useCallback, useRef, useEffect } from 'react';
import { isSpeechSupported } from '../utils/speechSupport';

// Types (wie oben definiert)...

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: SpeechRecognitionErrorCode) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  interimText: string;
  finalText: string;
  error: SpeechRecognitionErrorCode | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
  reset: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'de-DE',
    continuous = true,
    interimResults = true,
    onTranscript,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [error, setError] = useState<SpeechRecognitionErrorCode | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isMountedRef = useRef(true);

  const isSupported = isSpeechSupported();

  const cleanup = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      // Alle Event-Listener entfernen
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;

      try {
        recognition.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    if (isMountedRef.current) {
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const start = useCallback(() => {
    if (!isSupported) return;

    cleanup();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onstart = () => {
      if (!isMountedRef.current) return;
      setIsListening(true);
      setError(null);
      onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!isMountedRef.current) return;

      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setFinalText((prev) => prev + final);
        onTranscript?.(final, true);
        if (!continuous) {
          cleanup();
        }
      } else {
        setInterimText(interim);
        onTranscript?.(interim, false);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!isMountedRef.current) return;

      if (event.error !== 'aborted') {
        setError(event.error);
        onError?.(event.error);
      }
      cleanup();
    };

    recognition.onend = () => {
      if (!isMountedRef.current) return;
      setIsListening(false);
      onEnd?.();
    };

    try {
      recognition.start();
    } catch (err) {
      cleanup();
    }
  }, [cleanup, continuous, interimResults, lang, onEnd, onError, onStart, onTranscript, isSupported]);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        cleanup();
      }
    }
  }, [cleanup]);

  const abort = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setInterimText('');
    setFinalText('');
    setError(null);
  }, [cleanup]);

  return {
    isListening,
    interimText,
    finalText,
    error,
    start,
    stop,
    abort,
    reset,
    isSupported,
  };
}
```

---

## 5. Vergleich: Alte vs. Neue Implementierung

| Aspekt | Alte Implementierung | Neue Implementierung |
|--------|---------------------|----------------------|
| **Strict Mode** | ❌ Erstellt neue Instanz bei jedem Klick | ✅ Einmalige Instanz mit korrektem Cleanup |
| **Unmount** | ⚠️ Einfaches abort() | ✅ Alle Event-Listener entfernt, dann abort() |
| **Race Conditions** | ❌ Mehrere parallele Instanzen möglich | ✅ Cleanup vor jedem Start |
| **AbortController** | ❌ Nicht verwendet | ✅ Für async Operationen |
| **isMounted Check** | ❌ Fehlt | ✅ In allen Event-Handlern |
| **TypeScript** | ⚠️ Basic types | ✅ Vollständige DOM Types |
| **Accessibility** | ⚠️ Basic | ✅ ARIA-Attribute, Live-Regions |

---

## 6. Memory Leak Debugging

### Chrome DevTools Workflow

```bash
# 1. Heap Snapshot vor dem Test
devtools > Memory > Take Snapshot

# 2. VoiceInput mehrfach starten/stoppen
# (30+ Mal um Leaks sichtbar zu machen)

# 3. Garbage Collection forcieren
devtools > Memory > Collect Garbage

# 4. Zweiten Snapshot erstellen

# 5. Comparison View
# Suche nach: "SpeechRecognition", "webkitSpeechRecognition"
```

### React DevTools Profiler

```typescript
// Mit Profiler markieren für bessere Identifikation
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
) {
  console.log('[Profiler]', id, phase, actualDuration);
}

// Usage
<Profiler id="VoiceInput" onRender={onRenderCallback}>
  <VoiceInputButton onTranscript={handleTranscript} />
</Profiler>
```

---

## 7. Test-Strategie

```typescript
// VoiceInput.test.tsx - Erweiterte Tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceInputButton } from './VoiceInput';

describe('VoiceInputButton - React 19 Strict Mode', () => {
  const mockOnTranscript = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cleanup on unmount (Strict Mode)', async () => {
    const mockAbort = vi.fn();
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      abort: mockAbort,
      onresult: null,
      onerror: null,
      onend: null,
      onstart: null,
    };

    window.SpeechRecognition = vi.fn(() => mockRecognition) as any;

    const { unmount, rerender } = render(
      <VoiceInputButton onTranscript={mockOnTranscript} />
    );

    // Start listening
    await userEvent.click(screen.getByRole('button'));

    // Simulate Strict Mode remount
    rerender(<VoiceInputButton onTranscript={mockOnTranscript} />);

    // Unmount
    unmount();

    // Abort should have been called
    await waitFor(() => {
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  it('should handle rapid start/stop without memory leaks', async () => {
    // Rapid toggling simulation
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);

    const button = screen.getByRole('button');

    // 10 schnelle Klicks
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        await userEvent.click(button);
      });
    }

    // Sollte nur eine aktive Recognition haben
    // (durch cleanup vor jedem start)
  });

  it('should not call onTranscript after unmount', async () => {
    const mockRecognition: any = {
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
      onstart: null,
    };

    window.SpeechRecognition = vi.fn(() => mockRecognition) as any;

    const { unmount } = render(
      <VoiceInputButton onTranscript={mockOnTranscript} />
    );

    await userEvent.click(screen.getByRole('button'));

    // Unmount before result
    unmount();

    // Simulate late result
    act(() => {
      mockRecognition.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'late result' } }],
      });
    });

    // Callback should not be called
    expect(mockOnTranscript).not.toHaveBeenCalled();
  });
});
```

---

## 8. Zusammenfassung: Die goldenen Regeln

1. **Immer Cleanup in useEffect** - Jede Recognition-Instanz muss beim Unmount abgebaut werden

2. **Event-Listener vor abort entfernen** - Verhindert race conditions beim Cleanup

3. **isMountedRef Pattern** - Prüfe in jedem Event-Handler ob Component noch mounted ist

4. **Cleanup vor Start** - Immer bestehende Recognition beenden bevor neue startet

5. **AbortController für async** - Nutze AbortController für zusätzliche Cancel-Fähigkeit

6. **Keine Recognition im Render** - Recognition-Instanz nur in Event-Handlern oder Effects erstellen

7. **TypeScript Types** - Vollständige DOM-Typen für SpeechRecognition verwenden

8. **Teste mit Strict Mode** - Strict Mode dient als Memory-Leak-Detektor

---

## Referenzen

- [Web Speech API Specification](https://wicg.github.io/speech-api/)
- [MDN: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [React 19 Strict Mode](https://react.dev/reference/react/StrictMode)
- [AbortController API](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
