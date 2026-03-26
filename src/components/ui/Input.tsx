import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string | null;
  icon?: ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, icon, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium transition-colors duration-200"
            style={{ color: error ? '#C75A3E' : 'var(--text-secondary)' }}
          >
            {label}
            {props.required && <span className="text-[#E07A5F] ml-1">*</span>}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
        
        {/* Input Container */}
        <div className="relative">
          {icon && (
            <span 
              className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none transition-colors duration-200"
              style={{ color: error ? '#E07A5F' : 'var(--text-muted)' }}
            >
              {icon}
            </span>
          )}
          
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`
              w-full
              h-14
              px-4
              text-base
              bg-[var(--bg-input)]
              border-2
              rounded-xl
              outline-none
              transition-all duration-200 ease-out
              placeholder:text-[var(--text-muted)]
              placeholder:opacity-70
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-12' : ''}
              ${error 
                ? 'border-[#E07A5F] focus:border-[#E07A5F] focus:shadow-[0_0_0_4px_rgba(224,122,95,0.15)]' 
                : 'border-[var(--border-primary)] hover:border-[var(--border-hover)] focus:border-[#4A90E2] focus:shadow-[0_0_0_4px_rgba(74,144,226,0.12)]'
              }
              ${className}
            `.trim()}
            {...props}
          />
          
          {/* Success/Error indicator dot */}
          {error && (
            <span 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#E07A5F]"
              aria-hidden="true"
            />
          )}
        </div>
        
        {/* Error Message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="text-sm text-[#C75A3E] animate-gentleFadeIn flex items-center gap-1.5"
            role="alert"
          >
            <span className="inline-block w-1 h-1 rounded-full bg-[#E07A5F]" />
            {error}
          </p>
        )}
        
        {/* Helper Text */}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
