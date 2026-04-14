// ─── useTTS — Text-to-Speech Hook ───────────────────────────────────────────
// Phase 12 — Prepared for Lia Joham voice clone (ElevenLabs / Azure TTS)
// Current strategy: Web Speech API as fallback until voice-clone API is live.
//
// API contract (ready for production swap):
//   playVoice(textOrKey)  – speak text, returns a Promise<void>
//   stop()                – immediately stop playback
//   isSpeaking            – reactive boolean
//   isLoading             – reactive boolean (buffering)
//
// To switch to a real TTS provider:
//   1. Set VITE_TTS_PROVIDER='elevenlabs' | 'azure' in .env
//   2. Implement the provider fetch inside _fetchAudioUrl()
//   3. The rest of the hook stays identical.

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Provider switch (env-driven, zero-code change to swap) ──────────────────
const TTS_PROVIDER = import.meta.env.VITE_TTS_PROVIDER ?? 'webspeech';
const TTS_API_URL  = import.meta.env.VITE_TTS_API_URL  ?? '/api/tts/speak';
const TTS_VOICE_ID = import.meta.env.VITE_TTS_VOICE_ID ?? '';        // ElevenLabs voice ID
const TTS_LANG      = import.meta.env.VITE_TTS_LANG    ?? 'de-DE';

// ── Types ────────────────────────────────────────────────────────────────────

export type TTSProvider = 'webspeech' | 'elevenlabs' | 'azure' | 'mock';

export interface UseTTSOptions {
  /** Override provider at hook level (e.g. for testing) */
  provider?: TTSProvider;
  /** BCP-47 language tag, e.g. 'de-DE' */
  lang?: string;
  /** Speech rate 0.1 – 10 (Web Speech API only) */
  rate?: number;
  /** Pitch 0 – 2 (Web Speech API only) */
  pitch?: number;
  /** Volume 0 – 1 */
  volume?: number;
}

export interface UseTTSReturn {
  /** Trigger TTS for a plain text string or i18n key */
  playVoice: (textOrKey: string) => Promise<void>;
  /** Stop current playback immediately */
  stop: () => void;
  /** True while audio is playing */
  isSpeaking: boolean;
  /** True while fetching / buffering audio */
  isLoading: boolean;
  /** Last error, if any */
  error: string | null;
  /** Whether TTS is available in this browser */
  isSupported: boolean;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

const isBrowserSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/** Fetches audio from a cloud TTS API and returns an object URL. */
async function _fetchAudioUrl(text: string, provider: TTSProvider): Promise<string> {
  if (provider === 'elevenlabs') {
    const res = await fetch(`${TTS_API_URL}/elevenlabs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: TTS_VOICE_ID, language: TTS_LANG }),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS error: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
  if (provider === 'azure') {
    const res = await fetch(`${TTS_API_URL}/azure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: TTS_LANG }),
    });
    if (!res.ok) throw new Error(`Azure TTS error: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }
  throw new Error(`Unknown TTS provider: ${provider}`);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const {
    provider = (TTS_PROVIDER as TTSProvider),
    lang     = TTS_LANG,
    rate     = 0.95,
    pitch    = 1.0,
    volume   = 0.9,
  } = options;

  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    provider === 'webspeech' || provider === 'mock'
      ? isBrowserSpeechSupported()
      : true; // cloud providers are always "supported"

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      _cleanupAudio();
      if (isBrowserSpeechSupported()) {
        window.speechSynthesis.cancel();
      }
    };
     
  }, []);

  function _cleanupAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  const stop = useCallback(() => {
    if (isBrowserSpeechSupported()) {
      window.speechSynthesis.cancel();
    }
    _cleanupAudio();
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  // ── Web Speech API (free, no server round-trip) ──────────────────────────
  const _playWebSpeech = useCallback(
    (text: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (!isBrowserSpeechSupported()) {
          // Silent fallback — not an error, just unsupported
          resolve();
          return;
        }
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang   = lang;
        utterance.rate   = rate;
        utterance.pitch  = pitch;
        utterance.volume = volume;

        utterance.onstart = () => {
          setIsLoading(false);
          setIsSpeaking(true);
        };
        utterance.onend   = () => { setIsSpeaking(false); resolve(); };
        utterance.onerror = (e) => {
          setIsSpeaking(false);
          reject(new Error(e.error));
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }),
    [lang, rate, pitch, volume],
  );

  // ── Cloud TTS (ElevenLabs / Azure) ───────────────────────────────────────
  const _playCloudTTS = useCallback(
    async (text: string) => {
      setIsLoading(true);
      _cleanupAudio();

      const url = await _fetchAudioUrl(text, provider);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.volume = volume;

      audio.oncanplaythrough = () => {
        setIsLoading(false);
        setIsSpeaking(true);
        void audio.play();
      };
      audio.onended = () => {
        setIsSpeaking(false);
        _cleanupAudio();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        setIsLoading(false);
        _cleanupAudio();
      };
    },
    [provider, volume],
  );

  // ── Mock provider (dev / test) ────────────────────────────────────────────
  const _playMock = useCallback(async (text: string) => {
     
    console.info(`[useTTS mock] Playing TTS for: "${text}"`);
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 300));
    setIsLoading(false);
    setIsSpeaking(true);
    const duration = Math.min(Math.max(text.length * 55, 1500), 8000);
    await new Promise(r => setTimeout(r, duration));
    setIsSpeaking(false);
  }, []);

  // ── Public: playVoice ────────────────────────────────────────────────────
  const playVoice = useCallback(
    async (textOrKey: string): Promise<void> => {
      if (!textOrKey) return;
      setError(null);

      try {
        if (provider === 'mock') {
          await _playMock(textOrKey);
        } else if (provider === 'webspeech') {
          setIsLoading(true);
          await _playWebSpeech(textOrKey);
        } else {
          await _playCloudTTS(textOrKey);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setIsSpeaking(false);
        setIsLoading(false);

        // Transparent fallback: if cloud TTS fails, try Web Speech
        if (provider !== 'webspeech' && isBrowserSpeechSupported()) {
          await _playWebSpeech(textOrKey).catch(() => undefined);
        }
      }
    },
    [provider, _playMock, _playWebSpeech, _playCloudTTS],
  );

  return { playVoice, stop, isSpeaking, isLoading, error, isSupported };
}
