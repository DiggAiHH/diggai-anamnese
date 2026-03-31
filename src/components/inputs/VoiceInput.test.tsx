import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoiceInputButton } from './VoiceInput';

// Mock isSpeechSupported
const mockIsSpeechSupported = vi.fn();
vi.mock('../../utils/speechSupport', () => ({
  isSpeechSupported: () => mockIsSpeechSupported(),
}));

describe('VoiceInputButton', () => {
  const mockOnTranscript = vi.fn();

  beforeEach(() => {
    mockIsSpeechSupported.mockReturnValue(true);
    mockOnTranscript.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when speech is not supported', () => {
    mockIsSpeechSupported.mockReturnValue(false);
    
    const { container } = render(
      <VoiceInputButton onTranscript={mockOnTranscript} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when speech is supported', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show microphone icon when not listening', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should start listening when clicked', async () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    // After clicking, should show listening state with red styling
    expect(button).toHaveClass('bg-red-500/20');
  });

  it('should have correct aria-label', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Spracheingabe starten');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} disabled />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} className="custom-class" />);
    
    const container = screen.getByRole('button').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('should use custom language when provided', () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} lang="en-US" />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should cleanup recognition on unmount', () => {
    const { unmount } = render(
      <VoiceInputButton onTranscript={mockOnTranscript} />
    );
    
    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });

  it('should show listening indicator text when active', async () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    // Should show listening text
    expect(screen.getByText('🎙️ Zuhören…')).toBeInTheDocument();
  });
});

describe('VoiceInput - Speech Recognition Events', () => {
  const mockOnTranscript = vi.fn();
  let mockRecognition: any;

  beforeEach(() => {
    mockIsSpeechSupported.mockReturnValue(true);
    
    mockRecognition = {
      continuous: false,
      interimResults: false,
      lang: 'de-DE',
      start: vi.fn().mockImplementation(() => {
        if (mockRecognition.onstart) mockRecognition.onstart();
      }),
      stop: vi.fn().mockImplementation(() => {
        if (mockRecognition.onend) mockRecognition.onend();
      }),
      abort: vi.fn(),
      onresult: null,
      onerror: null,
      onend: null,
      onstart: null,
    };

    window.SpeechRecognition = vi.fn(function() { return mockRecognition; }) as any;
    window.webkitSpeechRecognition = vi.fn(function() { return mockRecognition; }) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle speech recognition result', async () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    // Simulate recognition result
    const resultEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          0: { transcript: 'Hallo Welt' },
        },
      ],
    };

    act(() => {
      mockRecognition.onresult(resultEvent);
    });

    await waitFor(() => {
      expect(mockOnTranscript).toHaveBeenCalledWith('Hallo Welt');
    });
  });

  it('should handle interim results', async () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    // Simulate interim result
    const resultEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: false,
          0: { transcript: 'interim text' },
        },
      ],
    };

    act(() => {
      mockRecognition.onresult(resultEvent);
    });

    // Should show interim text
    await waitFor(() => {
      expect(screen.getByText('interim text')).toBeInTheDocument();
    });
  });

  it('should handle recognition error', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    act(() => {
      mockRecognition.onerror({ error: 'network' });
    });

    // Should reset listening state
    await waitFor(() => {
      expect(button).not.toHaveClass('bg-red-500/20');
    });

    consoleSpy.mockRestore();
  });

  it('should ignore aborted errors', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);

    act(() => {
      mockRecognition.onerror({ error: 'aborted' });
    });

    // Should not log warning for aborted errors
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should stop listening when clicked again', async () => {
    render(<VoiceInputButton onTranscript={mockOnTranscript} />);
    
    const button = screen.getByRole('button');
    
    // Start listening
    await userEvent.click(button);
    expect(mockRecognition.start).toHaveBeenCalled();

    // Stop listening
    await userEvent.click(button);
    expect(mockRecognition.stop).toHaveBeenCalled();
  });
});
