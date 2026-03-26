import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Psychology-based colors - anxiety optimized (NO bright reds)
const STYLES: Record<BadgeVariant, { bg: string; text: string; border: string; icon: string }> = {
  success: { 
    bg: 'rgba(129, 178, 154, 0.15)', 
    text: '#5A8F76', 
    border: 'rgba(129, 178, 154, 0.3)',
    icon: '#81B29A'
  },
  warning: { 
    bg: 'rgba(244, 162, 97, 0.15)', 
    text: '#D9894A', 
    border: 'rgba(244, 162, 97, 0.3)',
    icon: '#F4A261'
  },
  danger: { 
    bg: 'rgba(224, 122, 95, 0.15)', 
    text: '#C75A3E', 
    border: 'rgba(224, 122, 95, 0.3)',
    icon: '#E07A5F'
  },
  info: { 
    bg: 'rgba(94, 139, 158, 0.15)', 
    text: '#4A7A8A', 
    border: 'rgba(94, 139, 158, 0.3)',
    icon: '#5E8B9E'
  },
  neutral: { 
    bg: 'rgba(107, 139, 164, 0.15)', 
    text: '#6B8BA4', 
    border: 'rgba(107, 139, 164, 0.3)',
    icon: '#8BA4B4'
  },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ variant = 'neutral', children, className = '', icon }: BadgeProps) {
  const styles = STYLES[variant];
  
  return (
    <span 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200 ${className}`}
      style={{ 
        backgroundColor: styles.bg, 
        color: styles.text, 
        borderColor: styles.border 
      }}
    >
      {icon && <span style={{ color: styles.icon }}>{icon}</span>}
      {children}
    </span>
  );
}
