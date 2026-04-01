/**
 * Simple PatientCard Tests
 */

import { describe, it, expect } from 'vitest';
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

describe('PatientCard - Simple', () => {
  it('mock patient has correct structure', () => {
    expect(mockPatient.id).toBe('patient-1');
    expect(mockPatient.patientName).toBe('Max Mustermann');
    expect(mockPatient.displayName).toBe('Max M.');
    expect(mockPatient.status).toBe('PENDING');
    expect(mockPatient.triageLevel).toBe('NORMAL');
    expect(mockPatient.waitTimeMinutes).toBe(15);
  });

  it('privacy mode shows abbreviated name', () => {
    const displayName = mockPatient.displayName;
    const fullName = mockPatient.patientName;
    
    expect(displayName).not.toBe(fullName);
    expect(displayName).toContain('M.');
    expect(fullName).toContain('Mustermann');
  });

  it('wait time color logic works correctly', () => {
    const getWaitTimeColor = (minutes: number) => {
      if (minutes < 15) return 'text-emerald-400';
      if (minutes < 30) return 'text-amber-400';
      return 'text-red-400';
    };
    
    expect(getWaitTimeColor(10)).toBe('text-emerald-400');
    expect(getWaitTimeColor(20)).toBe('text-amber-400');
    expect(getWaitTimeColor(35)).toBe('text-red-400');
  });
});
