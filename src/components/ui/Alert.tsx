import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

// Phase 6: Psychology-based alert colors - anxiety optimized with soft palette
const STYLES: Record<AlertVariant, { 
  border: string; 
  bg: string; 
  icon: string; 
  iconEl: ReactNode;
  title: string;
}> = {
  info: { 
    border: 'rgba(94, 139, 158, 0.25)',  
    bg: 'rgba(94, 139, 158, 0.08)',  
    icon: '#5E8B9E',
    title: '#4A7A8A',
    iconEl: <Info className="w-5 h-5 flex-shrink-0" /> 
  },
  success: { 
    border: 'rgba(129, 178, 154, 0.25)', 
    bg: 'rgba(129, 178, 154, 0.08)', 
    icon: '#81B29A',
    title: '#5A8F76',
    iconEl: <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> 
  },
  warning: { 
    border: 'rgba(244, 162, 97, 0.25)', 
    bg: 'rgba(244, 162, 97, 0.08)', 
    icon: '#F4A261',
    title: '#D9894A',
    iconEl: <AlertTriangle className="w-5 h-5 flex-shrink-0" /> 
  },
  error: { 
    border: 'rgba(224, 122, 95, 0.25)',   
    bg: 'rgba(224, 122, 95, 0.08)',   
    icon: '#E07A5F',
    title: '#C75A3E',
    iconEl: <XCircle className="w-5 h-5 flex-shrink-0" /> 
  },
};

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
  const s = STYLES[variant];
  
  return (
    <div 
      role="alert" 
      className={`
        flex gap-4 
        p-5 
        rounded-[16px] 
        border-2 
        transition-all duration-300 ease-out
        ${className}
      `.trim()}
      style={{ 
        backgroundColor: s.bg, 
        borderColor: s.border 
      }}
    >
      {/* Icon */}
      <span 
        className="mt-0.5"
        style={{ color: s.icon }}
        aria-hidden="true"
      >
        {s.iconEl}
      </span>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <p 
            className="text-sm font-semibold mb-1.5" 
            style={{ color: s.title }}
          >
            {title}
          </p>
        )}
        <div 
          className="text-sm leading-relaxed" 
          style={{ color: 'var(--text-secondary)' }}
        >
          {children}
        </div>
      </div>
      
      {/* Dismiss Button */}
      {onDismiss && (
        <button 
          type="button" 
          onClick={onDismiss}
          className="
            flex-shrink-0
            p-1
            rounded-lg
            transition-all duration-200
            hover:bg-white/10
          "
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
