import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  /** Whether to trap focus within the modal (default: true) */
  trapFocus?: boolean;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
  /** Additional CSS class for the modal container */
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

/**
 * Modal Component with Accessibility Features
 * 
 * Phase 5: Accessibility for Stressed Users
 * - Focus trap for keyboard navigation
 * - Escape key handling
 * - ARIA labels and roles
 * - Proper focus management
 * - Reduced motion support
 */
export function Modal({ 
  open, 
  onClose, 
  title, 
  size = 'md', 
  children,
  trapFocus = true,
  showCloseButton = true,
  className = ''
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Apply focus trap
  useFocusTrap(contentRef, {
    isActive: trapFocus && open,
    onEscape: onClose,
    autoFocus: true,
  });

  useEffect(() => {
    if (!open) return;

    // Store the element that had focus before modal opened
    const previousActiveElement = document.activeElement as HTMLElement;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    
    // Add modal-open class for any global styles
    document.body.classList.add('modal-open');

    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
      
      // Return focus to the element that had it before
      if (previousActiveElement && 'focus' in previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, [open]);

  // Handle overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 a11y-modal-overlay"
      style={{ 
        background: 'rgba(0, 0, 0, 0.6)', 
        backdropFilter: 'blur(4px)',
        // Support reduced motion preference
        transition: 'opacity 0.2s ease-out'
      }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby="modal-description"
      data-testid="modal-overlay"
    >
      <div
        ref={contentRef}
        className={`
          relative w-full ${sizeStyles[size]} rounded-2xl p-6 shadow-2xl 
          max-h-[90vh] overflow-y-auto a11y-modal-content
          ${className}
        `}
        style={{ 
          background: 'var(--bg-card)', 
          border: '2px solid var(--border-primary)',
          // Enhanced focus indicator for accessibility
          outline: 'none'
        }}
        // Focus trap container
        tabIndex={-1}
      >
        {/* Header with title and close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between mb-4">
            {title ? (
              <h2 
                id="modal-title"
                className="text-lg font-bold pr-4"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
            ) : (
              <div /> // Spacer for flex alignment
            )}
            
            {showCloseButton && (
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="
                  w-10 h-10 rounded-full flex items-center justify-center 
                  text-lg transition-all duration-200 
                  hover:bg-white/10 hover:scale-105
                  focus-visible:outline-none focus-visible:ring-4 
                  focus-visible:ring-[var(--primary)] focus-visible:ring-opacity-50
                  min-w-[44px] min-h-[44px]
                "
                style={{ color: 'var(--text-muted)' }}
                aria-label="Schließen"
                title="Schließen (Escape)"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        )}
        
        {/* Modal content */}
        <div id="modal-description">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Accessible Modal Header Component
 * Use this for consistent modal headers with proper ARIA
 */
export function ModalHeader({ 
  title, 
  description,
  icon: Icon 
}: { 
  title: string; 
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--primary)' }}
          >
            <Icon className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
        )}
        <div>
          <h3 
            id="modal-title"
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          {description && (
            <p 
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Accessible Modal Footer Component
 * For consistent action buttons in modals
 */
export function ModalFooter({ 
  children,
  className = ''
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <div 
      className={`
        flex items-center justify-end gap-3 mt-6 pt-4 
        border-t border-[var(--border-primary)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Modal;
