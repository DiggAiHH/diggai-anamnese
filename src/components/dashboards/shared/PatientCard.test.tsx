/**
 * PatientCard Unit Tests
 * 
 * Tests fuer die PatientCard Komponente mit Privacy-Modus und Drag & Drop
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientCard, PatientListItem } from './PatientCard';
import type { PatientQueueItem } from '../../../types/dashboard';

const mockPatient: PatientQueueItem = {
  id: 'patient-1',
  sessionId: 'session-123',
  patientName: 'Max Mustermann',
  displayName: 'Max M.',
  status: 'PENDING',
  triageLevel: 'NORMAL',
  service: 'Termin / Anamnese',
  waitTimeMinutes: 15,
  checkInTime: new Date(),
  criticalFlags: [],
  quickInfo: {
    allergies: [],
    chronicConditions: [],
    currentMedications: [],
    hasRedFlags: false,
  },
};

const mockCriticalPatient: PatientQueueItem = {
  ...mockPatient,
  id: 'patient-2',
  patientName: 'Anna Schmidt',
  displayName: 'Anna S.',
  triageLevel: 'CRITICAL',
  criticalFlags: [
    { id: 'flag-1', type: 'ALLERGY', severity: 'HIGH', description: 'Penicillin' },
  ],
  quickInfo: {
    ...mockPatient.quickInfo,
    allergies: ['Penicillin'],
    hasRedFlags: true,
  },
};

describe('PatientCard', () => {
  it('renders patient card with correct information', () => {
    render(<PatientCard patient={mockPatient} viewMode="full" />);
    
    expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    expect(screen.getByText('Termin / Anamnese')).toBeInTheDocument();
    expect(screen.getByText('15 Min')).toBeInTheDocument();
  });

  it('shows anonymized name in privacy mode', () => {
    render(<PatientCard patient={mockPatient} viewMode="privacy" />);
    
    // Should show abbreviated name
    expect(screen.getByText('Max M.')).toBeInTheDocument();
    expect(screen.queryByText('Max Mustermann')).not.toBeInTheDocument();
  });

  it('reveals full name on hover in privacy mode', () => {
    render(<PatientCard patient={mockPatient} viewMode="privacy" />);
    
    const nameElement = screen.getByText('Max M.');
    
    // Initially blurred
    expect(nameElement).toHaveClass('blur-sm');
    
    // Hover to reveal
    fireEvent.mouseEnter(nameElement);
    expect(nameElement).not.toHaveClass('blur-sm');
    
    // Mouse leave should blur again
    fireEvent.mouseLeave(nameElement);
    expect(nameElement).toHaveClass('blur-sm');
  });

  it('displays critical triage badge with pulse animation', () => {
    render(<PatientCard patient={mockCriticalPatient} viewMode="full" />);
    
    const pulseElement = document.querySelector('.animate-pulse');
    expect(pulseElement).toBeInTheDocument();
  });

  it('shows critical flags when in full view mode', () => {
    render(<PatientCard patient={mockCriticalPatient} viewMode="full" />);
    
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<PatientCard patient={mockPatient} viewMode="full" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(mockPatient);
  });

  it('shows assigned doctor when available', () => {
    const patientWithDoctor = {
      ...mockPatient,
      assignedDoctorName: 'Dr. Schmidt',
    };
    
    render(<PatientCard patient={patientWithDoctor} viewMode="full" />);
    
    expect(screen.getByText('Dr. Schmidt')).toBeInTheDocument();
  });

  it('displays correct wait time color coding', () => {
    // Short wait time - green
    const { rerender } = render(
      <PatientCard patient={{ ...mockPatient, waitTimeMinutes: 10 }} viewMode="full" />
    );
    expect(screen.getByText('10 Min')).toHaveClass('text-emerald-400');
    
    // Medium wait time - amber
    rerender(<PatientCard patient={{ ...mockPatient, waitTimeMinutes: 20 }} viewMode="full" />);
    expect(screen.getByText('20 Min')).toHaveClass('text-amber-400');
    
    // Long wait time - red
    rerender(<PatientCard patient={{ ...mockPatient, waitTimeMinutes: 35 }} viewMode="full" />);
    expect(screen.getByText('35 Min')).toHaveClass('text-red-400');
  });

  it('has correct ARIA attributes', () => {
    render(<PatientCard patient={mockPatient} viewMode="full" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('tabIndex', '0');
  });
});

describe('PatientListItem', () => {
  it('renders compact list item', () => {
    render(<PatientListItem patient={mockPatient} />);
    
    expect(screen.getByText('Max M.')).toBeInTheDocument();
    expect(screen.getByText('15m')).toBeInTheDocument();
  });

  it('shows selected state', () => {
    render(<PatientListItem patient={mockPatient} selected />);
    
    const item = screen.getByRole('button');
    expect(item).toHaveClass('bg-purple-500/20');
  });

  it('displays triage indicator', () => {
    render(<PatientListItem patient={mockCriticalPatient} />);
    
    // Should show critical triage indicator
    const statusIndicator = document.querySelector('[role="status"]');
    expect(statusIndicator).toBeInTheDocument();
  });
});
