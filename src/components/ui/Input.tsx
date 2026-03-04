import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string | null;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, icon, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, '-')}`;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
            {props.required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        {description && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`input-base w-full ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/50 ring-1 ring-red-500/30' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-red-400 animate-pulse">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
