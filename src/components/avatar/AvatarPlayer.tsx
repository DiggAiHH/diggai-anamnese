// ─── Avatar Player ─────────────────────────────────────────
// Modul 8: Animated avatar that speaks to patients via TTS

import { useState, useRef, useCallback, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Globe, RefreshCw, User } from 'lucide-react';

interface AvatarPlayerProps {
  staffId: string;
  avatarUrl?: string;
  avatarType?: '2D' | '3D' | 'REAL_PHOTO';
  staffName?: string;
  text?: string;
  language?: string;
  autoPlay?: boolean;
  compact?: boolean;
  onSpeakComplete?: () => void;
}

const LANGUAGES = [
  { code: 'de-DE', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'en-US', label: 'English', flag: '🇬🇧' },
  { code: 'tr-TR', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar-SA', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru-RU', label: 'Русский', flag: '🇷🇺' },
];

type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

export function AvatarPlayer({
  staffId,
  avatarUrl,
  avatarType = '2D',
  staffName = 'Praxis-Assistent',
  text,
  language: initialLang = 'de-DE',
  autoPlay = false,
  compact = false,
  onSpeakComplete,
}: AvatarPlayerProps) {
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [muted, setMuted] = useState(false);
  const [language, setLanguage] = useState(initialLang);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-play on mount if requested
  useEffect(() => {
    if (autoPlay && text) {
      handleSpeak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpeak = useCallback(async () => {
    if (!text) return;
    setPlayState('loading');

    try {
      // In production: call api.avatarSpeak(staffId, text, language)
      // Simulating TTS response
      await new Promise(r => setTimeout(r, 800));

      setPlayState('playing');
      setIsSpeaking(true);

      // Simulate speech duration based on text length
      const duration = Math.max(2000, text.length * 60);
      await new Promise(r => setTimeout(r, duration));

      setPlayState('idle');
      setIsSpeaking(false);
      onSpeakComplete?.();
    } catch {
      setPlayState('idle');
      setIsSpeaking(false);
    }
  }, [text, language, staffId, onSpeakComplete]);

  const handlePause = useCallback(() => {
    if (playState === 'playing') {
      setPlayState('paused');
      setIsSpeaking(false);
      audioRef.current?.pause();
    } else if (playState === 'paused') {
      setPlayState('playing');
      setIsSpeaking(true);
      audioRef.current?.play();
    }
  }, [playState]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${isSpeaking ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse' : ''}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={staffName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-blue-100 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-blue-800">{staffName}</p>
          {text && <p className="text-xs text-blue-600 truncate">{text}</p>}
        </div>
        <button
          onClick={playState === 'idle' ? handleSpeak : handlePause}
          disabled={!text || playState === 'loading'}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-40 transition-all"
        >
          {playState === 'loading' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : playState === 'playing' ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden max-w-sm">
      {/* Avatar Display */}
      <div className="relative bg-gradient-to-br from-blue-100 to-indigo-100 p-8 flex items-center justify-center">
        <div className={`relative transition-all duration-300 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
          {avatarUrl ? (
            <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${isSpeaking ? 'border-blue-400 shadow-lg shadow-blue-200' : 'border-white shadow-md'} transition-all`}>
              <img src={avatarUrl} alt={staffName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center border-4 ${isSpeaking ? 'border-blue-300 shadow-lg shadow-blue-200' : 'border-white shadow-md'} transition-all`}>
              <User className="w-16 h-16 text-white" />
            </div>
          )}

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1">
              {[0, 1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className="w-1 bg-blue-500 rounded-full animate-bounce"
                  style={{
                    height: `${8 + Math.random() * 12}px`,
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '600ms',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Avatar type badge */}
        <span className="absolute top-3 right-3 px-2 py-0.5 bg-white/80 backdrop-blur rounded-full text-xs text-gray-500">
          {avatarType}
        </span>
      </div>

      {/* Info & Controls */}
      <div className="p-5 space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-gray-800">{staffName}</h3>
          <p className="text-sm text-gray-400">Praxis-Avatar</p>
        </div>

        {/* Text preview */}
        {text && (
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 line-clamp-3">{text}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {/* Language picker */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Globe className="w-4 h-4" />
              {LANGUAGES.find(l => l.code === language)?.flag}
            </button>
            {showLangPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 z-10 min-w-[140px]">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLanguage(l.code); setShowLangPicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      language === l.code ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Play/Pause */}
          <button
            onClick={playState === 'idle' ? handleSpeak : handlePause}
            disabled={!text || playState === 'loading'}
            className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-all shadow-md"
          >
            {playState === 'loading' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : playState === 'playing' ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Mute */}
          <button
            onClick={() => setMuted(!muted)}
            className={`px-3 py-2 rounded-lg transition-all ${muted ? 'text-red-500 bg-red-50' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <audio ref={audioRef} muted={muted} />
    </div>
  );
}

export default AvatarPlayer;
