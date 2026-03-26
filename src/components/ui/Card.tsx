import type { HTMLAttributes, ReactNode } from 'react';
import type { CardVariant } from '../../design/tokens';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  children: ReactNode;
}

// Phase 6: Updated padding with 32px (xl) option
const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-8', // 32px for trust-building spaciousness
};

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  // Phase 6: Base with very rounded corners (20px)
  const base = `
    rounded-[20px] 
    transition-all duration-300 ease-out
    ${paddingStyles[padding]}
  `;

  // Phase 6: Variant styles with glassmorphism and trust-building aesthetics
  const variantClass = (() => {
    switch (variant) {
      case 'glass':
        return `
          backdrop-blur-xl 
          bg-white/5 
          border border-white/10 
          shadow-[0_8px_32px_rgba(44,95,138,0.08)]
        `;
      case 'interactive':
        return `
          cursor-pointer 
          active:scale-[0.98]
          bg-[var(--bg-card)]
          border border-[var(--border-primary)]
          shadow-[0_4px_20px_rgba(44,95,138,0.06)]
        `;
      case 'calm':
        return `
          bg-gradient-to-br from-[rgba(94,139,158,0.08)] to-[rgba(74,144,226,0.05)]
          border border-[rgba(94,139,158,0.2)]
          shadow-[0_8px_32px_rgba(94,139,158,0.1)]
        `;
      default:
        return `
          bg-[var(--bg-card)]
          border border-[var(--border-primary)]
          shadow-[0_8px_32px_rgba(44,95,138,0.08)]
        `;
    }
  })();

  // Phase 6: Enhanced hover effect for trust-building
  const hoverClass = hoverable 
    ? 'hover:shadow-[0_12px_48px_rgba(44,95,138,0.12)] hover:-translate-y-1 hover:border-[var(--border-hover)]' 
    : '';

  return (
    <div
      className={`${base} ${variantClass} ${hoverClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
