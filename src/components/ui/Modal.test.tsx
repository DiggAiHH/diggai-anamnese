import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  afterEach(() => {
    // Cleanup body overflow style
    document.body.style.overflow = '';
  });

  it('should not render when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={mockOnClose}>
        Modal Content
      </Modal>
    );
    
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        Modal Content
      </Modal>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('should render with title', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title="Test Title">
        Content
      </Modal>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should call onClose when clicking close button', async () => {
    render(
      <Modal open={true} onClose={mockOnClose} title="Test">
        Content
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close');
    await userEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking overlay', async () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        Content
      </Modal>
    );
    
    const overlay = screen.getByRole('dialog');
    await userEvent.click(overlay);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking modal content', async () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        <button>Inside Button</button>
      </Modal>
    );
    
    const insideButton = screen.getByText('Inside Button');
    await userEvent.click(insideButton);
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should call onClose when pressing Escape', () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        Content
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have correct ARIA attributes', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title="Test Modal">
        Content
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Test Modal');
  });

  it('should have aria-label from title when provided', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title="Custom Label">
        Content
      </Modal>
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('should render with small size', () => {
    render(
      <Modal open={true} onClose={mockOnClose} size="sm">
        Content
      </Modal>
    );
    
    const modalContent = screen.getByText('Content').parentElement;
    expect(modalContent).toHaveClass('max-w-sm');
  });

  it('should render with medium size by default', () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        Content
      </Modal>
    );
    
    const modalContent = screen.getByText('Content').parentElement;
    expect(modalContent).toHaveClass('max-w-lg');
  });

  it('should render with large size', () => {
    render(
      <Modal open={true} onClose={mockOnClose} size="lg">
        Content
      </Modal>
    );
    
    const modalContent = screen.getByText('Content').parentElement;
    expect(modalContent).toHaveClass('max-w-2xl');
  });

  it('should set body overflow to hidden when open', () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        Content
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('should reset body overflow when closed', () => {
    const { unmount } = render(
      <Modal open={true} onClose={mockOnClose}>
        Content
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    
    expect(document.body.style.overflow).toBe('');
  });

  it('should render without title', () => {
    render(
      <Modal open={true} onClose={mockOnClose}>
        <div data-testid="content">No Title Content</div>
      </Modal>
    );
    
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('should handle complex children', () => {
    render(
      <Modal open={true} onClose={mockOnClose} title="Complex">
        <div>
          <h3>Subtitle</h3>
          <p>Paragraph</p>
          <button>Action</button>
        </div>
      </Modal>
    );
    
    expect(screen.getByText('Complex')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
