import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonVariant, ButtonSize } from '../../design/tokens';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

// Phase 6: Psychology-based button styles with calming design
const variantStyles: Record<ButtonVariant, string> = {
  // Primary: Trust-building serene blue
  primary: `
    bg-gradient-to-br from-[#4A90E2] to-[#2C5F8A]
    text-white
    border-none
    shadow-[0_4px_16px_rgba(74,144,226,0.3)]
    hover:shadow-[0_8px_24px_rgba(74,144,226,0.4)]
  `,
  // Secondary: Subtle, non-competing
  secondary: `
    bg-[var(--bg-card)]
    text-[var(--text-secondary)]
    border-2 border-[var(--border-primary)]
    hover:border-[var(--border-hover)]
    hover:bg-[var(--bg-card-hover)]
    hover:text-[var(--text-primary)]
  `,
  // Ghost: Minimal, for low-priority actions
  ghost: `
    bg-transparent
    text-[var(--text-secondary)]
    border-2 border-transparent
    hover:bg-[rgba(74,144,226,0.08)]
    hover:text-[var(--text-primary)]
  `,
  // Danger: Soft coral, anxiety-optimized
  danger: `
    bg-[rgba(224,122,95,0.15)]
    text-[#C75A3E]
    border-2 border-[rgba(224,122,95,0.3)]
    hover:bg-[rgba(224,122,95,0.25)]
    hover:border-[rgba(224,122,95,0.5)]
  `,
  // Phase 6: Calm variant - promotes relaxation
  calm: `
    bg-gradient-to-br from-[#5E8B9E] to-[#4A7A8A]
    text-white
    border-none
    shadow-[0_4px_16px_rgba(94,139,158,0.3)]
    hover:shadow-[0_8px_24px_rgba(94,139,158,0.4)]
  `,
  // Phase 6: Success variant - healing confirmation
  success: `
    bg-gradient-to-br from-[#81B29A] to-[#5A8F76]
    text-white
    border-none
    shadow-[0_4px_16px_rgba(129,178,154,0.3)]
    hover:shadow-[0_8px_24px_rgba(129,178,154,0.4)]
  `,
  // Phase 6: Warning variant - warm caution
  warning: `
    bg-gradient-to-br from-[#F4A261] to-[#D9894A]
    text-white
    border-none
    shadow-[0_4px_16px_rgba(244,162,97,0.3)]
    hover:shadow-[0_8px_24px_rgba(244,162,97,0.4)]
  `,
};

// Phase 6: Updated size styles with 12px border radius and generous padding
const sizeStyles: Record<ButtonSize, string> = {
  // Small: Compact but still accessible
  sm: 'px-4 py-2 text-sm rounded-xl h-10',
  // Medium: Standard with generous touch target (16px 24px equivalent)
  md: 'px-6 py-3 text-base rounded-xl h-14',
  // Large: Maximum accessibility
  lg: 'px-8 py-4 text-lg rounded-xl h-16',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2.5
        font-medium
        transition-all duration-300 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        hover:-translate-y-0.5 active:translate-y-0
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span 
          className="inline-block w-5 h-5 border-2 rounded-full animate-spin"
          style={{ 
            borderColor: 'rgba(255,255,255,0.3)', 
            borderTopColor: 'currentColor' 
          }}
        />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
