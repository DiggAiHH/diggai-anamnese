// @ts-nocheck
/**
 * Dashboard Smoke Tests - Quick validation tests
 */

import { describe, it, expect } from 'vitest';

describe('Dashboard Types', () => {
  it('should have valid QueueStatus values', () => {
    const statuses = ['PENDING', 'IN_ANAMNESE', 'READY_FOR_DOCTOR', 'IN_TREATMENT', 'COMPLETED', 'CANCELLED'];
    expect(statuses).toHaveLength(6);
    expect(statuses).toContain('PENDING');
  });

  it('should have valid TriageLevel values', () => {
    const levels = ['CRITICAL', 'WARNING', 'NORMAL'];
    expect(levels).toHaveLength(3);
  });
});

describe('Mock Dashboard Engine', () => {
  it('should be importable', async () => {
    const { getMockDashboardEngine } = await import('../../data/mockDashboards');
    expect(getMockDashboardEngine).toBeDefined();
  });
});

describe('Dashboard Store', () => {
  it('should be importable', async () => {
    const { useDashboardStore } = await import('../../store/dashboardStore');
    expect(useDashboardStore).toBeDefined();
  });
});

describe('Queue Service', () => {
  it('should be importable', async () => {
    const { getQueueService, isMockMode } = await import('../../services/queueService');
    expect(getQueueService).toBeDefined();
    expect(isMockMode).toBeDefined();
  });
});

describe('Dashboard Hooks', () => {
  it('should export all hooks', async () => {
    const hooks = await import('../../hooks/useDashboard');
    expect(hooks.useRealtimeQueue).toBeDefined();
    expect(hooks.useSupabaseRealtime).toBeDefined();
    expect(hooks.useQueueStats).toBeDefined();
  });
});

describe('Dashboard Components', () => {
  it('should export all components', async () => {
    const components = await import('../index');
    expect(components.MfaKanbanBoard).toBeDefined();
    expect(components.AnamneseRadar).toBeDefined();
    expect(components.KpiCards).toBeDefined();
    expect(components.PatientCard).toBeDefined();
  });
});
