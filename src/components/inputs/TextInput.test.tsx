import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './TextInput';

// Mock speechSupport
vi.mock('../../utils/speechSupport', () => ({
  isSpeechSupported: () => true,
}));

// Mock VoiceInputButton
vi.mock('./VoiceInput', () => ({
  VoiceInputButton: ({ onTranscript }: { onTranscript: (text: string) => void }) => (
    <button 
      data-testid="voice-input-button" 
      onClick={() => onTranscript('voice transcript')}
    >
      Voice
    </button>
  ),
}));

describe('TextInput', () => {
  it('should render input with placeholder', () => {
    render(<TextInput value="" onChange={vi.fn()} placeholder="Enter text" />);
    
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should display current value', () => {
    render(<TextInput value="test value" onChange={vi.fn()} />);
    
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const handleChange = vi.fn();
    render(<TextInput value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'abc');
    
    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(handleChange).toHaveBeenNthCalledWith(1, 'a');
    expect(handleChange).toHaveBeenNthCalledWith(2, 'b');
    expect(handleChange).toHaveBeenNthCalledWith(3, 'c');
  });

  it('should render with email type', () => {
    render(<TextInput value="" onChange={vi.fn()} type="email" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('should render with tel type', () => {
    render(<TextInput value="" onChange={vi.fn()} type="tel" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'tel');
    expect(input).toHaveAttribute('autocomplete', 'tel');
  });

  it('should apply custom className', () => {
    render(<TextInput value="" onChange={vi.fn()} className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('should show voice input button for text type', () => {
    render(<TextInput value="" onChange={vi.fn()} type="text" />);
    
    expect(screen.getByTestId('voice-input-button')).toBeInTheDocument();
  });

  it('should not show voice input button for email type', () => {
    render(<TextInput value="" onChange={vi.fn()} type="email" />);
    
    expect(screen.queryByTestId('voice-input-button')).not.toBeInTheDocument();
  });

  it('should append voice transcript to existing value', async () => {
    const handleChange = vi.fn();
    render(<TextInput value="existing" onChange={handleChange} type="text" />);
    
    const voiceButton = screen.getByTestId('voice-input-button');
    await userEvent.click(voiceButton);
    
    expect(handleChange).toHaveBeenCalledWith('existing voice transcript');
  });

  it('should set voice transcript as value when empty', async () => {
    const handleChange = vi.fn();
    render(<TextInput value="" onChange={handleChange} type="text" />);
    
    const voiceButton = screen.getByTestId('voice-input-button');
    await userEvent.click(voiceButton);
    
    expect(handleChange).toHaveBeenCalledWith('voice transcript');
  });
});
