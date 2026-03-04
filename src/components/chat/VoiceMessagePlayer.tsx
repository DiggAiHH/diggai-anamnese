// ─── Voice Message Player ──────────────────────────────────
// Modul 7/8: Audio playback for voice messages in chat

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  className?: string;
}

export function VoiceMessagePlayer({ audioUrl, duration: initialDuration, className = '' }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [waveWidths] = useState(() =>
    Array.from({ length: 24 }, () => 4 + Math.random() * 20)
  );
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => { setIsPlaying(false); setCurrentTime(0); };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all flex-shrink-0"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center gap-[2px] h-8">
        {waveWidths.map((w, i) => {
          const barProgress = ((i + 1) / waveWidths.length) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-full transition-colors duration-150"
              style={{
                height: `${w}px`,
                backgroundColor: barProgress <= progress ? '#3b82f6' : '#d1d5db',
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
        <Volume2 className="w-3 h-3" />
        <span>{formatTime(isPlaying ? currentTime : duration)}</span>
      </div>
    </div>
  );
}

export default VoiceMessagePlayer;
