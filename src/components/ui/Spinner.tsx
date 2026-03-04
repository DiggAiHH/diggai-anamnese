interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <span
      className={`
        inline-block rounded-full animate-spin
        border-current/30 border-t-current
        ${sizeMap[size]}
        ${className}
      `.trim()}
      style={{ color: 'var(--accent)' }}
      role="status"
      aria-label="Loading"
    />
  );
}
