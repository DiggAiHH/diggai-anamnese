import { useEffect, useRef, useState, type RefObject } from 'react';

interface FocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean;
  /** Callback when user presses Escape */
  onEscape?: () => void;
  /** Element to return focus to when trap is deactivated */
  returnFocusTo?: HTMLElement | null;
  /** Whether to focus first element on activation */
  autoFocus?: boolean;
}

/**
 * useFocusTrap - Traps focus within a container for accessibility
 * 
 * Features:
 * - Traps Tab key navigation within container
 * - Cycles focus from last to first element and vice versa
 * - Handles Shift+Tab for reverse navigation
 * - Calls onEscape when user presses Escape
 * - Returns focus to specified element on deactivation
 * - Auto-focuses first element when activated
 * 
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * useFocusTrap({
 *   containerRef,
 *   isActive: isOpen,
 *   onEscape: closeModal,
 * });
 * 
 * @example
 * // In a modal component
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap({
 *   isActive: isOpen,
 *   onEscape: onClose,
 *   returnFocusTo: triggerButtonRef.current,
 *   autoFocus: true,
 * });
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: FocusTrapOptions
) {
  const { isActive, onEscape, returnFocusTo, autoFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Store the currently focused element when trap activates
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
    
    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]',
      ].join(', ');
      
      const elements = Array.from(
        container.querySelectorAll(focusableSelectors)
      ) as HTMLElement[];
      
      // Filter out hidden elements
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
    };
    
    // Handle keydown events
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;
      
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      
      // Handle Tab key
      if (e.key !== 'Tab') return;
      
      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;
      
      // Shift + Tab: cycle to last element if at first
      if (e.shiftKey) {
        if (activeElement === firstElement || !focusableElements.includes(activeElement)) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: cycle to first element if at last
        if (activeElement === lastElement || !focusableElements.includes(activeElement)) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    
    // Auto-focus first element
    if (isActive && autoFocus) {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          focusableElements[0].focus();
        }, 0);
      }
    }
    
    // Add event listener
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Return focus when deactivated
      if (!isActive && previousFocusRef.current) {
        const elementToFocus = returnFocusTo || previousFocusRef.current;
        if (elementToFocus && 'focus' in elementToFocus) {
          elementToFocus.focus();
        }
      }
    };
  }, [isActive, onEscape, autoFocus, containerRef, returnFocusTo]);
}

/**
 * Hook that manages focus visible state (keyboard vs mouse)
 * Useful for showing focus rings only when navigating with keyboard
 */
export function useFocusVisible(): boolean {
  const [isKeyboard, setIsKeyboard] = useState(false);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboard(true);
      }
    };
    
    const handleMouseDown = () => {
      setIsKeyboard(false);
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);
  
  return isKeyboard;
}

export default useFocusTrap;
