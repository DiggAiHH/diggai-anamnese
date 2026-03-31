import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioInput } from './RadioInput';
import type { Option } from '../../types/question';

describe('RadioInput', () => {
  const mockOptions: Option[] = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  it('should render all options', () => {
    render(<RadioInput value={undefined} onChange={vi.fn()} options={mockOptions} />);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('should call onChange when option is clicked', async () => {
    const handleChange = vi.fn();
    render(<RadioInput value={undefined} onChange={handleChange} options={mockOptions} />);
    
    const option2Button = screen.getByText('Option 2').closest('button');
    await userEvent.click(option2Button!);
    
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('should show selected option with active styling', () => {
    render(<RadioInput value="option2" onChange={vi.fn()} options={mockOptions} />);
    
    const buttons = screen.getAllByRole('button');
    expect(buttons[1]).toHaveClass('option-card-selected');
  });

  it('should show radio indicator for selected option', () => {
    render(<RadioInput value="option2" onChange={vi.fn()} options={mockOptions} />);
    
    // The selected option should have a filled radio circle
    const buttons = screen.getAllByRole('button');
    const selectedButton = buttons[1];
    const radioCircle = selectedButton.querySelector('.bg-blue-500');
    expect(radioCircle).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<RadioInput value={undefined} onChange={vi.fn()} options={mockOptions} className="custom-class" />);
    
    const container = screen.getByText('Option 1').closest('.flex-col');
    expect(container).toHaveClass('custom-class');
  });

  it('should render with flex-col layout by default', () => {
    render(<RadioInput value={undefined} onChange={vi.fn()} options={mockOptions} />);
    
    const container = screen.getByText('Option 1').closest('.flex-col');
    expect(container).toHaveClass('flex-col');
  });

  it('should handle option with followUpQuestions', async () => {
    const optionsWithFollowUp: Option[] = [
      { value: 'yes', label: 'Yes', followUpQuestions: ['Q001', 'Q002'] },
      { value: 'no', label: 'No' },
    ];
    const handleChange = vi.fn();
    
    render(<RadioInput value={undefined} onChange={handleChange} options={optionsWithFollowUp} />);
    
    const yesButton = screen.getByText('Yes').closest('button');
    await userEvent.click(yesButton!);
    
    expect(handleChange).toHaveBeenCalledWith('yes');
  });

  it('should update selection when value prop changes', () => {
    const { rerender } = render(
      <RadioInput value="option1" onChange={vi.fn()} options={mockOptions} />
    );
    
    let buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('option-card-selected');
    
    rerender(<RadioInput value="option3" onChange={vi.fn()} options={mockOptions} />);
    
    buttons = screen.getAllByRole('button');
    expect(buttons[2]).toHaveClass('option-card-selected');
    expect(buttons[0]).not.toHaveClass('option-card-selected');
  });
});
