import type { HTMLAttributes, ReactNode } from 'react';
import type { CardVariant } from '../../design/tokens';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
};

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const base = `rounded-2xl transition-all duration-200 ${paddingStyles[padding]}`;

  const variantClass =
    variant === 'glass'
      ? 'backdrop-blur-xl bg-white/5 border border-white/10 shadow-lg'
      : variant === 'interactive'
        ? 'cursor-pointer active:scale-[0.98]'
        : '';

  const hoverClass = hoverable ? 'hover:shadow-lg hover:scale-[1.01]' : '';

  return (
    <div
      className={`${base} ${variantClass} ${hoverClass} ${className}`}
      style={{
        background: variant === 'glass' ? undefined : 'var(--bg-card)',
        border: variant === 'glass' ? undefined : '1px solid var(--border-primary)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
