import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Loader2, Plus } from 'lucide-react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  Plus: () => <span data-testid="plus-icon">+</span>,
}));

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    
    expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render with primary variant by default', () => {
    render(<Button>Primary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gradient-to-br');
    expect(button).toHaveClass('text-white');
  });

  it('should render with secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-2');
    expect(button).not.toHaveClass('text-white');
  });

  it('should render with ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('should render with danger variant', () => {
    render(<Button variant="danger">Danger</Button>);
    
    const button = screen.getByRole('button');
    // Danger uses rgba soft-coral, not bg-red-500/20
    expect(button.className).toMatch(/rgba\(224/);
  });

  it('should render with medium size by default', () => {
    render(<Button>Medium</Button>);
    
    const button = screen.getByRole('button');
    // md size: px-6 py-3 text-base rounded-xl h-14
    expect(button).toHaveClass('px-6', 'py-3', 'h-14');
  });

  it('should render with small size', () => {
    render(<Button size="sm">Small</Button>);
    
    const button = screen.getByRole('button');
    // sm size: px-4 py-2 text-sm rounded-xl h-10
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm', 'h-10');
  });

  it('should render with large size', () => {
    render(<Button size="lg">Large</Button>);
    
    const button = screen.getByRole('button');
    // lg size: px-8 py-4 text-lg rounded-xl h-16
    expect(button).toHaveClass('px-8', 'py-4', 'text-lg', 'h-16');
  });

  it('should render with icon', () => {
    render(<Button icon={<span data-testid="custom-icon">★</span>}>With Icon</Button>);
    
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should forward type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('should forward type button attribute', () => {
    render(<Button type="button">Button</Button>);
    
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('should handle multiple props together', () => {
    render(
      <Button 
        variant="primary" 
        size="lg" 
        loading 
        className="extra-class"
      >
        Complex Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('extra-class');
    expect(button).toHaveClass('bg-gradient-to-br');
    expect(button).toBeDisabled();
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should not call onClick when loading', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} loading>Loading</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });
});
