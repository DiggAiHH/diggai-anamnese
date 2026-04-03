import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TOTPInput } from './TOTPInput';

describe('TOTPInput', () => {
  it('renders correct number of input fields', () => {
    render(<TOTPInput value="" onChange={() => {}} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('renders custom length of input fields', () => {
    render(<TOTPInput length={4} value="" onChange={() => {}} />);
    
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4);
  });

  it('displays current value in inputs', () => {
    render(<TOTPInput value="123456" onChange={() => {}} />);
    
    expect(screen.getByTestId('totp-input-0')).toHaveValue('1');
    expect(screen.getByTestId('totp-input-1')).toHaveValue('2');
    expect(screen.getByTestId('totp-input-2')).toHaveValue('3');
    expect(screen.getByTestId('totp-input-3')).toHaveValue('4');
    expect(screen.getByTestId('totp-input-4')).toHaveValue('5');
    expect(screen.getByTestId('totp-input-5')).toHaveValue('6');
  });

  it('calls onChange when digit is entered', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="" onChange={onChange} />);
    
    fireEvent.change(screen.getByTestId('totp-input-0'), { target: { value: '5' } });
    
    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('auto-focuses next input on digit entry', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="1" onChange={onChange} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    const input1 = screen.getByTestId('totp-input-1');
    
    // First input should have value
    expect(input0).toHaveValue('1');
    
    // Simulate typing in second input
    fireEvent.change(input1, { target: { value: '2' } });
    
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('handles backspace to clear current digit', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="123" onChange={onChange} />);
    
    const input2 = screen.getByTestId('totp-input-2');
    
    fireEvent.keyDown(input2, { key: 'Backspace' });
    
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('handles backspace to move to previous input when empty', () => {
    const onChange = vi.fn();
    const { rerender } = render(<TOTPInput value="12" onChange={onChange} />);
    
    const input2 = screen.getByTestId('totp-input-2');
    
    fireEvent.keyDown(input2, { key: 'Backspace' });
    
    expect(onChange).toHaveBeenCalledWith('1');
    
    // Simulate the rerender after onChange
    rerender(<TOTPInput value="1" onChange={onChange} />);
    
    const input1 = screen.getByTestId('totp-input-1');
    fireEvent.keyDown(input1, { key: 'Backspace' });
    
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('handles arrow left navigation', () => {
    render(<TOTPInput value="123456" onChange={() => {}} />);
    
    const input1 = screen.getByTestId('totp-input-1');
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.keyDown(input1, { key: 'ArrowLeft' });
    
    expect(document.activeElement).toBe(input0);
  });

  it('handles arrow right navigation', () => {
    render(<TOTPInput value="123456" onChange={() => {}} />);
    
    const input1 = screen.getByTestId('totp-input-1');
    const input2 = screen.getByTestId('totp-input-2');
    
    fireEvent.keyDown(input1, { key: 'ArrowRight' });
    
    expect(document.activeElement).toBe(input2);
  });

  it('handles paste event with complete code', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    
    render(
      <TOTPInput 
        value="" 
        onChange={onChange} 
        onComplete={onComplete}
      />
    );
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.paste(input0, {
      clipboardData: {
        getData: () => '123456',
      },
    });
    
    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('handles paste event with partial code', () => {
    const onChange = vi.fn();
    
    render(<TOTPInput value="" onChange={onChange} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.paste(input0, {
      clipboardData: {
        getData: () => '123',
      },
    });
    
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('filters out non-digit characters from paste', () => {
    const onChange = vi.fn();
    
    render(<TOTPInput value="" onChange={onChange} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.paste(input0, {
      clipboardData: {
        getData: () => 'a1b2c3d4e5f6',
      },
    });
    
    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('calls onComplete when all digits are entered', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    
    render(
      <TOTPInput 
        value="12345" 
        onChange={onChange} 
        onComplete={onComplete}
      />
    );
    
    const input5 = screen.getByTestId('totp-input-5');
    
    fireEvent.change(input5, { target: { value: '6' } });
    
    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('displays error message when error prop is provided', () => {
    render(<TOTPInput value="" onChange={() => {}} error="Ungültiger Code" />);
    
    expect(screen.getByRole('alert')).toHaveTextContent('Ungültiger Code');
  });

  it('applies error styling to inputs when error is present', () => {
    render(<TOTPInput value="123" onChange={() => {}} error="Ungültiger Code" />);
    
    const input0 = screen.getByTestId('totp-input-0');
    expect(input0).toHaveClass('border-red-500', 'bg-red-50', 'text-red-700');
  });

  it('disables all inputs when disabled prop is true', () => {
    render(<TOTPInput value="123456" onChange={() => {}} disabled />);
    
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  it('prevents input when disabled', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="" onChange={onChange} disabled />);
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.change(input0, { target: { value: '5' } });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has correct ARIA labels for accessibility', () => {
    render(<TOTPInput value="" onChange={() => {}} />);
    
    expect(screen.getByLabelText('Digit 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 4')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 5')).toBeInTheDocument();
    expect(screen.getByLabelText('Digit 6')).toBeInTheDocument();
  });

  it('has correct role and aria-label for the group', () => {
    render(<TOTPInput value="" onChange={() => {}} />);
    
    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'TOTP Code Eingabe');
  });

  it('has inputMode numeric for mobile keyboards', () => {
    render(<TOTPInput value="" onChange={() => {}} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    expect(input0).toHaveAttribute('inputMode', 'numeric');
  });

  it('only allows single digit input', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="" onChange={onChange} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    
    // Try entering multiple characters
    fireEvent.change(input0, { target: { value: '123' } });
    
    // Should only take the last digit
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('ignores non-digit input', () => {
    const onChange = vi.fn();
    render(<TOTPInput value="" onChange={onChange} />);
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.change(input0, { target: { value: 'abc' } });
    
    expect(onChange).not.toHaveBeenCalled();
  });

  it('truncates value to specified length', () => {
    render(<TOTPInput value="1234567890" onChange={() => {}} />);
    
    expect(screen.getByTestId('totp-input-0')).toHaveValue('1');
    expect(screen.getByTestId('totp-input-5')).toHaveValue('6');
  });

  it('does not call onComplete if value is not complete', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    
    render(
      <TOTPInput 
        value="" 
        onChange={onChange} 
        onComplete={onComplete}
      />
    );
    
    const input0 = screen.getByTestId('totp-input-0');
    
    fireEvent.change(input0, { target: { value: '1' } });
    
    expect(onChange).toHaveBeenCalledWith('1');
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('updates focus state correctly on focus', () => {
    render(<TOTPInput value="123456" onChange={() => {}} autoFocus={false} />);
    
    const input2 = screen.getByTestId('totp-input-2');
    
    fireEvent.focus(input2);
    
    expect(input2).toHaveClass('border-blue-500', 'ring-2', 'ring-blue-200');
  });
});
