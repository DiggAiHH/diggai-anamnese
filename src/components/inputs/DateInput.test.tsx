import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateInput } from './DateInput';

describe('DateInput', () => {
  it('should render date input', () => {
    render(<DateInput value={undefined} onChange={vi.fn()} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should display value when provided', () => {
    render(<DateInput value="2024-03-15" onChange={vi.fn()} />);
    
    expect(screen.getByDisplayValue('2024-03-15')).toBeInTheDocument();
  });

  it('should show empty string when value is undefined', () => {
    render(<DateInput value={undefined} onChange={vi.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('should call onChange when date is selected', async () => {
    const handleChange = vi.fn();
    render(<DateInput value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.clear(input);
    await userEvent.type(input, '2024-06-20');
    
    expect(handleChange).toHaveBeenCalledWith('2024-06-20');
  });

  it('should have correct input type', () => {
    render(<DateInput value="" onChange={vi.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'date');
  });

  it('should apply custom className', () => {
    render(<DateInput value="" onChange={vi.fn()} className="custom-date-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-date-class');
  });

  it('should have aria-label with translated text', () => {
    render(<DateInput value="" onChange={vi.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-label', 'Datum');
  });

  it('should have title attribute with translated text', () => {
    render(<DateInput value="" onChange={vi.fn()} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('title', 'Datum eingeben');
  });

  it('should update when value prop changes', () => {
    const { rerender } = render(<DateInput value="2024-01-01" onChange={vi.fn()} />);
    
    expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
    
    rerender(<DateInput value="2024-12-31" onChange={vi.fn()} />);
    
    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument();
  });
});
