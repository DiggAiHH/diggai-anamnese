/**
 * useVoiceNavigation — Voice Command Navigation Hook
 * 
 * Extends the VoiceInput with navigation commands:
 * - "Weiter" / "Next" → next question
 * - "Zurück" / "Back" → previous question
 * - "Hilfe" / "Help" → toggle help text
 * - "Vorlesen" / "Read" → read current question aloud
 * - "Ja" / "Nein" → answer yes/no questions
 * - "Absenden" / "Submit" → submit form
 * - "Startseite" / "Home" → navigate to home
 * 
 * DSGVO-konform: All processing happens locally in the browser.
 */

import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { isTTSSupported } from '../components/inputs/VoiceOutput';

// ─── Command Types ──────────────────────────────────────

export type VoiceCommand =
  | 'next'
  | 'back'
  | 'help'
  | 'read'
  | 'yes'
  | 'no'
  | 'submit'
  | 'home'
  | 'repeat'
  | 'stop'
  | 'unknown';

export interface VoiceCommandResult {
  command: VoiceCommand;
  confidence: number;
  rawText: string;
}

// ─── Command Patterns (Multi-language) ──────────────────

interface CommandPattern {
  command: VoiceCommand;
  patterns: RegExp[];
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    command: 'next',
    patterns: [
      /^(weiter|nächste|nächster|fortfahren|weiter\s*machen|continue|next|ileri|следующ|dalej|następn|بعدی|suivant|siguiente)$/i,
      /^(ok|okay)\s*(weiter)?$/i,
    ],
  },
  {
    command: 'back',
    patterns: [
      /^(zurück|vorherige|vorheriger|back|previous|geri|назад|wstecz|قبلی|précédent|anterior)$/i,
    ],
  },
  {
    command: 'help',
    patterns: [
      /^(hilfe|help|was\s*ist\s*das|erklär|erklärung|info|information|yardım|помощь|pomoc|کمک|aide|ayuda)$/i,
    ],
  },
  {
    command: 'read',
    patterns: [
      /^(vorlesen|lesen|lies\s*vor|read|read\s*aloud|oku|читай|czytaj|بخوان|lire|leer)$/i,
    ],
  },
  {
    command: 'yes',
    patterns: [
      /^(ja|jawohl|klar|natürlich|yes|yeah|evet|да|tak|بله|oui|sí)$/i,
    ],
  },
  {
    command: 'no',
    patterns: [
      /^(nein|ne|no|nope|hayır|нет|nie|نه|non)$/i,
    ],
  },
  {
    command: 'submit',
    patterns: [
      /^(absenden|fertig|abschicken|senden|submit|done|finish|gönder|отправить|wyślij|ارسال|envoyer|enviar)$/i,
    ],
  },
  {
    command: 'home',
    patterns: [
      /^(startseite|start|home|hauptmenü|anfang|ana\s*sayfa|главная|strona\s*główna|صفحه\s*اصلی|accueil|inicio)$/i,
    ],
  },
  {
    command: 'repeat',
    patterns: [
      /^(wiederholen|nochmal|repeat|again|tekrar|повтор|powtórz|تکرار|répéter|repetir)$/i,
    ],
  },
  {
    command: 'stop',
    patterns: [
      /^(stop|stopp|halt|aufhören|dur|стоп|zatrzymaj|توقف|arrêter|parar)$/i,
    ],
  },
];

// ─── Parse Voice Command ────────────────────────────────

export function parseVoiceCommand(text: string): VoiceCommandResult {
  const cleaned = text.trim().toLowerCase();

  for (const { command, patterns } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(cleaned)) {
        return { command, confidence: 1.0, rawText: text };
      }
    }
  }

  // Fuzzy: check if text starts with a command word
  for (const { command, patterns } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      // Extract first word and test
      const firstWord = cleaned.split(/\s+/)[0];
      if (pattern.test(firstWord)) {
        return { command, confidence: 0.7, rawText: text };
      }
    }
  }

  return { command: 'unknown', confidence: 0, rawText: text };
}

// ─── Voice Navigation Hook ─────────────────────────────

interface UseVoiceNavigationOptions {
  /** Called when "Weiter/Next" is spoken */
  onNext?: () => void;
  /** Called when "Zurück/Back" is spoken */
  onBack?: () => void;
  /** Called when "Hilfe/Help" is spoken */
  onHelp?: () => void;
  /** Called when "Vorlesen/Read" is spoken — reads the provided text */
  onRead?: () => void;
  /** Called when "Ja/Yes" is spoken */
  onYes?: () => void;
  /** Called when "Nein/No" is spoken */
  onNo?: () => void;
  /** Called when "Absenden/Submit" is spoken */
  onSubmit?: () => void;
  /** Called when "Startseite/Home" is spoken */
  onHome?: () => void;
  /** Called when command is unknown — receives the raw transcript */
  onUnknownCommand?: (text: string) => void;
  /** Text to read aloud on "Vorlesen" command */
  readText?: string;
  /** Whether voice navigation is enabled */
  enabled?: boolean;
}

export function useVoiceNavigation(options: UseVoiceNavigationOptions) {
  const { t } = useTranslation();
  const lastCommandRef = useRef<string>('');
  const lastCommandTimeRef = useRef<number>(0);

  const handleTranscript = useCallback((text: string) => {
    if (!options.enabled) return;

    const result = parseVoiceCommand(text);

    // Debounce: prevent duplicate commands within 1.5s
    const now = Date.now();
    if (result.command === lastCommandRef.current && now - lastCommandTimeRef.current < 1500) {
      return;
    }
    lastCommandRef.current = result.command;
    lastCommandTimeRef.current = now;

    // Audio feedback
    const feedbackText = (() => {
      switch (result.command) {
        case 'next': return t('voice.cmd.next', 'Weiter');
        case 'back': return t('voice.cmd.back', 'Zurück');
        case 'help': return t('voice.cmd.help', 'Hilfe');
        case 'yes': return t('voice.cmd.yes', 'Ja');
        case 'no': return t('voice.cmd.no', 'Nein');
        case 'submit': return t('voice.cmd.submit', 'Absenden');
        default: return null;
      }
    })();

    // Speak feedback if TTS is available and command is recognized
    if (feedbackText && isTTSSupported() && result.confidence >= 0.7) {
      const utterance = new SpeechSynthesisUtterance(feedbackText);
      utterance.lang = 'de-DE';
      utterance.rate = 1.2;
      utterance.volume = 0.5;
      window.speechSynthesis.speak(utterance);
    }

    // Dispatch command
    switch (result.command) {
      case 'next': options.onNext?.(); break;
      case 'back': options.onBack?.(); break;
      case 'help': options.onHelp?.(); break;
      case 'read':
        if (options.readText && isTTSSupported()) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(options.readText);
          utterance.lang = 'de-DE';
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
        }
        options.onRead?.();
        break;
      case 'yes': options.onYes?.(); break;
      case 'no': options.onNo?.(); break;
      case 'submit': options.onSubmit?.(); break;
      case 'home': options.onHome?.(); break;
      case 'repeat':
        if (options.readText && isTTSSupported()) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(options.readText);
          u.lang = 'de-DE';
          u.rate = 0.9;
          window.speechSynthesis.speak(u);
        }
        break;
      case 'stop':
        if (isTTSSupported()) window.speechSynthesis.cancel();
        break;
      case 'unknown':
        options.onUnknownCommand?.(text);
        break;
    }
  }, [options, t]);

  return { handleTranscript, parseVoiceCommand };
}
