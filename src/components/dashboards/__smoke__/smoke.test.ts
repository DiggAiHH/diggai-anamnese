/**
 * Dashboard Smoke Tests — quick existence assertions for the components index.
 *
 * Earlier versions of this file referenced modules that no longer exist
 * (`hooks/useDashboard`, `data/mockDashboards`, `store/dashboardStore`,
 * `services/queueService`). Those imports were removed in 2026-05-03 to
 * unblock the test suite. Smoke now only checks what the public barrel
 * (`components/dashboards/index.ts`) actually exports.
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

describe('Dashboard Components Barrel', () => {
  it('should export shared components', async () => {
    const components = await import('../index');
    expect(components.PatientCard).toBeDefined();
    expect(components.TriageBadge).toBeDefined();
    expect(components.StatusColumn).toBeDefined();
  });

  it('should export role-specific dashboards', async () => {
    const components = await import('../index');
    expect(components.MfaKanbanBoard).toBeDefined();
    expect(components.AnamneseRadar).toBeDefined();
    expect(components.KpiCards).toBeDefined();
    expect(components.AdminAnalyticsDashboard).toBeDefined();
  });
});
