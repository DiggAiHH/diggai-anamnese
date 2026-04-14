// ─── AssistantAvatar ────────────────────────────────────────────────────────
// Visual representation of the AI-assisted doctor companion (Dr. Klaproth)
// Phase 12 – Avatar placeholder with speaking pulse, ready for real image swap

import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

export interface AssistantAvatarProps {
  /** Whether the avatar is currently speaking (triggers pulse + mic icon) */
  isSpeaking?: boolean;
  /** Whether the TTS is loading/buffering */
  isLoading?: boolean;
  /** Doctor / staff name shown below the avatar */
  name?: string;
  /** Optional subtitle, e.g. "Ihr digitaler Assistent" */
  subtitle?: string;
  /**
   * URL of the avatar image.
   * Omit (or pass undefined) to show the branded hex placeholder.
   */
  avatarUrl?: string;
  /**
   * Brand hex colour used for the placeholder background.
   * Defaults to DiggAI medical blue.
   */
  brandColor?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Extra CSS classes */
  className?: string;
  /** Called when the avatar is clicked */
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { outer: 'w-12 h-12', inner: 'w-11 h-11', text: 'text-lg', badge: 'w-3 h-3', label: 'text-xs' },
  md: { outer: 'w-16 h-16', inner: 'w-15 h-15', text: 'text-2xl', badge: 'w-4 h-4', label: 'text-sm' },
  lg: { outer: 'w-24 h-24', inner: 'w-22 h-22', text: 'text-4xl', badge: 'w-5 h-5', label: 'text-base' },
};

export function AssistantAvatar({
  isSpeaking = false,
  isLoading = false,
  name = 'Dr. Klaproth',
  subtitle = 'Ihr digitaler Assistent',
  avatarUrl,
  brandColor = '#1e3a8a',
  size = 'md',
  className = '',
  onClick,
}: AssistantAvatarProps) {
  const s = SIZE_MAP[size];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw initials onto canvas for the placeholder when no avatarUrl is given
  useEffect(() => {
    if (avatarUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dim = canvas.width;
    // Background
    ctx.fillStyle = brandColor;
    ctx.beginPath();
    ctx.arc(dim / 2, dim / 2, dim / 2, 0, Math.PI * 2);
    ctx.fill();

    // Subtle gradient overlay for depth
    const grad = ctx.createRadialGradient(dim * 0.4, dim * 0.35, 0, dim / 2, dim / 2, dim / 2);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(dim / 2, dim / 2, dim / 2, 0, Math.PI * 2);
    ctx.fill();

    // Initials
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `bold ${Math.round(dim * 0.35)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, dim / 2, dim / 2 + 1);
  }, [avatarUrl, brandColor, name]);

  const isActive = isSpeaking || isLoading;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      onClick={onClick}
      aria-label={onClick ? `${name} – klicken zum Sprechen` : name}
    >
      {/* ── Outer ring (pulse when speaking) ── */}
      <div className="relative">
        {/* Pulse rings */}
        {isActive && (
          <>
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: brandColor }}
            />
            <span
              className="absolute inset-[-4px] rounded-full animate-pulse opacity-20"
              style={{ backgroundColor: brandColor }}
            />
          </>
        )}

        {/* Avatar circle */}
        <div
          className={`relative ${s.outer} rounded-full ring-2 ring-white/30 shadow-lg overflow-hidden transition-all duration-300 ${
            isActive ? 'shadow-xl' : ''
          }`}
          style={isActive ? { outline: `3px solid ${brandColor}`, outlineOffset: '2px' } : undefined}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            // Canvas placeholder — swapped out once a real photo is provided
            <canvas
              ref={canvasRef}
              width={128}
              height={128}
              className="w-full h-full"
              aria-hidden="true"
            />
          )}

          {/* Speaking overlay shimmer */}
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Status badge (mic) */}
        <span
          className={`absolute bottom-0 right-0 ${s.badge} rounded-full flex items-center justify-center transition-all duration-200 ${
            isSpeaking
              ? 'bg-green-500 text-white shadow-sm'
              : isLoading
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-gray-300 text-gray-600'
          }`}
          title={isSpeaking ? 'Spricht gerade' : isLoading ? 'Lädt Stimme…' : 'Bereit'}
        >
          {isSpeaking ? (
            <Mic className="w-2.5 h-2.5" />
          ) : (
            <MicOff className="w-2.5 h-2.5" />
          )}
        </span>
      </div>

      {/* Name + subtitle */}
      <div className="text-center leading-tight">
        <p className={`font-semibold text-[var(--text-primary)] ${s.label}`}>{name}</p>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
