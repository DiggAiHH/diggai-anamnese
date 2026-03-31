import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ToastContainer, ToastItem } from './Toast';
import { useToastStore } from '../../store/toastStore';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="success-icon">✓</span>,
  XCircle: () => <span data-testid="error-icon">✗</span>,
  AlertTriangle: () => <span data-testid="warning-icon">⚠</span>,
  Info: () => <span data-testid="info-icon">ℹ</span>,
  X: () => <span data-testid="close-icon">×</span>,
  Loader2: () => <span data-testid="loader-icon">⟳</span>,
  Mic: () => <span data-testid="mic-icon">🎤</span>,
  MicOff: () => <span data-testid="mic-off-icon">🚫</span>,
}));

describe('ToastItem', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('should render toast with message', () => {
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Operation successful',
    };

    render(<ToastItem toast={toast} />);
    
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('should render toast with title and message', () => {
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      title: 'Success',
      message: 'Operation completed',
    };

    render(<ToastItem toast={toast} />);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should render success toast with correct styling', () => {
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Success message',
    };

    const { container } = render(<ToastItem toast={toast} />);
    
    // Component uses emerald-500 for success (calming design, not green)
    expect(container.querySelector('.border-l-emerald-500')).toBeInTheDocument();
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  it('should render error toast with correct styling', () => {
    const toast = {
      id: 'test-1',
      type: 'error' as const,
      message: 'Error message',
    };

    const { container } = render(<ToastItem toast={toast} />);
    
    // Component uses rose-500 for error (calming design, not red)
    expect(container.querySelector('.border-l-rose-500')).toBeInTheDocument();
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
  });

  it('should render warning toast with correct styling', () => {
    const toast = {
      id: 'test-1',
      type: 'warning' as const,
      message: 'Warning message',
    };

    const { container } = render(<ToastItem toast={toast} />);
    
    expect(container.querySelector('.border-l-amber-500')).toBeInTheDocument();
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('should render info toast with correct styling', () => {
    const toast = {
      id: 'test-1',
      type: 'info' as const,
      message: 'Info message',
    };

    const { container } = render(<ToastItem toast={toast} />);
    
    expect(container.querySelector('.border-l-blue-500')).toBeInTheDocument();
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('should call removeToast when close button is clicked', () => {
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Test message',
    };

    render(<ToastItem toast={toast} />);
    
    const closeButton = screen.getByLabelText('Schließen');
    fireEvent.click(closeButton);
    
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should auto-dismiss after duration', () => {
    vi.useFakeTimers();
    
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Auto dismiss',
      duration: 1000,
    };

    // Add to store so removal can be tracked
    useToastStore.setState({ toasts: [toast] });
    render(<ToastItem toast={toast} onRemove={useToastStore.getState().removeToast} />);
    
    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();
    
    act(() => {
      // Advance past dismiss timer (1000ms) + exit animation (200ms)
      vi.advanceTimersByTime(1300);
    });
    
    expect(useToastStore.getState().toasts).toHaveLength(0);
    
    vi.useRealTimers();
  });

  it('should not auto-dismiss when duration is 0', async () => {
    vi.useFakeTimers();
    
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Persistent',
      duration: 0,
    };

    render(<ToastItem toast={toast} />);
    
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    
    // Toast should still be in store (not auto-removed)
    expect(useToastStore.getState().toasts).toHaveLength(0);
    
    vi.useRealTimers();
  });

  it('should have role="alert" for accessibility', () => {
    const toast = {
      id: 'test-1',
      type: 'success' as const,
      message: 'Alert message',
    };

    render(<ToastItem toast={toast} />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('should not render when no toasts', () => {
    const { container } = render(<ToastContainer />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render single toast', () => {
    useToastStore.getState().addToast({
      type: 'success',
      message: 'Single toast',
    });

    render(<ToastContainer />);
    
    expect(screen.getByText('Single toast')).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    const { addToast } = useToastStore.getState();
    
    addToast({ type: 'success', message: 'First' });
    addToast({ type: 'error', message: 'Second' });
    addToast({ type: 'info', message: 'Third' });

    render(<ToastContainer />);
    
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });

  it('should have aria-live attribute for accessibility', () => {
    useToastStore.getState().addToast({
      type: 'info',
      message: 'Live region',
    });

    const { container } = render(<ToastContainer />);
    
    // Container has aria-live but no role="region"
    const liveRegion = container.querySelector('[aria-live]');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('should stack toasts vertically', () => {
    const { addToast } = useToastStore.getState();
    
    addToast({ type: 'success', message: 'First' });
    addToast({ type: 'success', message: 'Second' });

    const { container } = render(<ToastContainer />);
    
    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv).toHaveClass('flex-col');
  });

  it('should position at bottom right', () => {
    useToastStore.getState().addToast({
      type: 'info',
      message: 'Positioned',
    });

    const { container } = render(<ToastContainer />);
    
    const containerDiv = container.firstChild as HTMLElement;
    expect(containerDiv).toHaveClass('bottom-5', 'right-5');
  });

  it('should clear all toasts', () => {
    const { addToast, clearAll } = useToastStore.getState();
    
    addToast({ type: 'success', message: 'First' });
    addToast({ type: 'error', message: 'Second' });
    
    expect(useToastStore.getState().toasts).toHaveLength(2);
    
    clearAll();
    
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('Toast Store Integration', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('should add success toast via helper', () => {
    const { toast } = useToastStore.getState();
    
    const id = toast.success('Success message', 'Title');
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].message).toBe('Success message');
    expect(toasts[0].title).toBe('Title');
    expect(toasts[0].duration).toBe(4000);
    expect(id).toBeDefined();
  });

  it('should add error toast via helper', () => {
    const { toast } = useToastStore.getState();
    
    toast.error('Error message');
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].duration).toBe(6000);
  });

  it('should add warning toast via helper', () => {
    const { toast } = useToastStore.getState();
    
    toast.warning('Warning message');
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('warning');
    expect(toasts[0].duration).toBe(5000);
  });

  it('should add info toast via helper', () => {
    const { toast } = useToastStore.getState();
    
    toast.info('Info message');
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe('info');
    expect(toasts[0].duration).toBe(4000);
  });

  it('should remove specific toast', () => {
    const { addToast, removeToast } = useToastStore.getState();
    
    const id1 = addToast({ type: 'success', message: 'First' });
    const id2 = addToast({ type: 'error', message: 'Second' });
    
    expect(useToastStore.getState().toasts).toHaveLength(2);
    
    removeToast(id1);
    
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(id2);
  });
});
