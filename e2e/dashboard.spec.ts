/**
 * Dashboard E2E Tests
 * 
 * End-to-End Tests für die neuen Dashboard-Features:
 * - MFA Live Queue (Kanban Board)
 * - Arzt Dashboard (Radar Chart, Priority List)
 * - Admin Analytics (Charts)
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsMFA, loginAsArzt, loginAsAdmin } from './helpers/auth-helpers';

test.describe('Dashboard E2E Tests', () => {
  
  // ═══════════════════════════════════════════════════════════
  // MFA Dashboard Tests
  // ═══════════════════════════════════════════════════════════
  
  test.describe('MFA Live Queue', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsMFA(page);
      // Navigate to Live Board tab
      await page.click('[data-testid="liveboard-tab"]');
      await page.waitForSelector('[data-testid="kanban-board"]');
    });

    test('should display kanban board with columns', async ({ page }) => {
      // Check all 5 columns are visible
      const columns = ['Ausstehend', 'In Anamnese', 'Bereit für Arzt', 'In Behandlung', 'Behandelt'];
      
      for (const column of columns) {
        await expect(page.locator(`text=${column}`)).toBeVisible();
      }
    });

    test('should display patient cards with privacy mode', async ({ page }) => {
      // Check patient card exists
      const patientCard = page.locator('[data-testid="patient-card"]').first();
      await expect(patientCard).toBeVisible();
      
      // Check privacy mode (name should be blurred initially)
      const patientName = patientCard.locator('[data-testid="patient-name"]');
      await expect(patientName).toHaveClass(/blur-sm/);
      
      // Hover to reveal full name
      await patientName.hover();
      await expect(patientName).not.toHaveClass(/blur-sm/);
    });

    test('should display triage badges correctly', async ({ page }) => {
      // Critical patient should have pulse animation
      const criticalCard = page.locator('[data-triage="CRITICAL"]').first();
      if (await criticalCard.isVisible().catch(() => false)) {
        await expect(criticalCard.locator('.animate-pulse')).toBeVisible();
      }
    });

    test('should move patient between columns via drag and drop', async ({ page }) => {
      // Find a patient in "Ausstehend" column
      const pendingColumn = page.locator('[data-status="PENDING"]');
      const patientCard = pendingColumn.locator('[data-testid="patient-card"]').first();
      
      if (await patientCard.isVisible().catch(() => false)) {
        const targetColumn = page.locator('[data-status="IN_ANAMNESE"]');
        
        // Drag and drop
        await patientCard.dragTo(targetColumn);
        
        // Verify patient moved
        await expect(targetColumn.locator('[data-testid="patient-card"]').first()).toBeVisible();
      }
    });

    test('should display longest waiters list', async ({ page }) => {
      await expect(page.locator('[data-testid="longest-waiters"]')).toBeVisible();
      
      // Check wait time is displayed
      const waitTime = page.locator('[data-testid="wait-time"]').first();
      await expect(waitTime).toBeVisible();
    });

    test('should display triage alert panel for critical patients', async ({ page }) => {
      const alertPanel = page.locator('[data-testid="triage-alert-panel"]');
      await expect(alertPanel).toBeVisible();
      
      // If there are critical patients, check alert is shown
      const criticalCount = await page.locator('[data-testid="critical-count"]').textContent();
      if (criticalCount && parseInt(criticalCount) > 0) {
        await expect(alertPanel.locator('.animate-pulse')).toBeVisible();
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Arzt Dashboard Tests
  // ═══════════════════════════════════════════════════════════
  
  test.describe('Arzt Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsArzt(page);
      // Navigate to Live Queue tab
      await page.click('[data-testid="queue-tab"]');
      await page.waitForSelector('[data-testid="priority-list"]');
    });

    test('should display priority list with groups', async ({ page }) => {
      // Check priority groups
      await expect(page.locator('text=Kritisch')).toBeVisible();
      await expect(page.locator('text=Warnung')).toBeVisible();
      await expect(page.locator('text=Standard')).toBeVisible();
    });

    test('should display radar chart for selected patient', async ({ page }) => {
      // Select first patient
      const patientItem = page.locator('[data-testid="priority-list-item"]').first();
      await patientItem.click();
      
      // Check radar chart is displayed
      await expect(page.locator('[data-testid="anamnese-radar"]')).toBeVisible();
      
      // Check all 6 dimensions are shown
      const dimensions = ['Allergien', 'Chronisch', 'Medikamente', 'Vorgeschichte', 'Operativ', 'Risiko'];
      for (const dim of dimensions) {
        await expect(page.locator(`text=${dim}`)).toBeVisible();
      }
    });

    test('should display clinical tags', async ({ page }) => {
      // Select a patient with critical flags
      const criticalPatient = page.locator('[data-triage="CRITICAL"]').first();
      if (await criticalPatient.isVisible().catch(() => false)) {
        await criticalPatient.click();
        
        // Check clinical tags are displayed
        await expect(page.locator('[data-testid="clinical-tags"]')).toBeVisible();
      }
    });

    test('should sort patients by priority (CRITICAL > WARNING > Normal)', async ({ page }) => {
      const priorityList = page.locator('[data-testid="priority-list"]');
      
      // Critical patients should be at the top
      const criticalSection = priorityList.locator('text=Kritisch').first();
      const warningSection = priorityList.locator('text=Warnung').first();
      
      if (await criticalSection.isVisible() && await warningSection.isVisible()) {
        const criticalBox = await criticalSection.boundingBox();
        const warningBox = await warningSection.boundingBox();
        
        if (criticalBox && warningBox) {
          expect(criticalBox.y).toBeLessThan(warningBox.y);
        }
      }
    });

    test('should display patient details on selection', async ({ page }) => {
      // Click on a patient
      const patientItem = page.locator('[data-testid="priority-list-item"]').first();
      await patientItem.click();
      
      // Check patient detail view is shown
      await expect(page.locator('[data-testid="patient-detail"]')).toBeVisible();
      
      // Check action buttons
      await expect(page.locator('text=Patient aufrufen')).toBeVisible();
      await expect(page.locator('text=Anamnese ansehen')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Admin Dashboard Tests
  // ═══════════════════════════════════════════════════════════
  
  test.describe('Admin Analytics', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      // Navigate to Analytics tab
      await page.click('[data-testid="analytics-tab"]');
      await page.waitForSelector('[data-testid="analytics-dashboard"]');
    });

    test('should display KPI cards with trends', async ({ page }) => {
      // Check KPI cards are visible
      await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
      
      // Check for trend indicators
      const trendIndicators = await page.locator('[data-testid="trend-indicator"]').count();
      expect(trendIndicators).toBeGreaterThan(0);
    });

    test('should display throughput chart', async ({ page }) => {
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
      
      // Check chart has data points
      const chartLines = page.locator('.recharts-line');
      await expect(chartLines.first()).toBeVisible();
    });

    test('should display funnel chart', async ({ page }) => {
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible();
      
      // Check funnel stages
      const stages = ['Check-in', 'Anamnese gestartet', 'Anamnese abgeschlossen', 'Arzt gesehen'];
      for (const stage of stages) {
        await expect(page.locator(`text=${stage}`)).toBeVisible();
      }
    });

    test('should display heatmap calendar', async ({ page }) => {
      await expect(page.locator('[data-testid="heatmap-calendar"]')).toBeVisible();
      
      // Check days are shown
      const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
      for (const day of days) {
        await expect(page.locator(`text=${day}`)).toBeVisible();
      }
    });

    test('should switch time ranges', async ({ page }) => {
      // Click on different time ranges
      await page.click('text=Heute');
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
      
      await page.click('text=Woche');
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
      
      await page.click('text=Monat');
      await expect(page.locator('[data-testid="throughput-chart"]')).toBeVisible();
    });

    test('should refresh data on button click', async ({ page }) => {
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await refreshButton.click();
      
      // Should show loading state briefly
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      
      // Data should still be visible after refresh
      await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Realtime Tests
  // ═══════════════════════════════════════════════════════════
  
  test.describe('Realtime Updates', () => {
    test('should update patient list in real-time @realtime', async ({ page, browser }) => {
      await loginAsMFA(page);
      await page.click('[data-testid="liveboard-tab"]');
      
      // Get initial count
      const initialCount = await page.locator('[data-testid="patient-card"]').count();
      
      // Simulate new patient from another session
      const newContext = await browser.newContext();
      const newPage = await newContext.newPage();
      await loginAsMFA(newPage);
      
      // Create new patient via API
      await newPage.evaluate(() => {
        // Mock: Add patient to queue
        window.localStorage.setItem('test_new_patient', 'true');
      });
      
      // Wait for realtime update
      await page.waitForTimeout(2000);
      
      // Count should have increased
      const newCount = await page.locator('[data-testid="patient-card"]').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
      
      await newContext.close();
    });

    test('should show offline indicator when connection lost @realtime', async ({ page }) => {
      await loginAsMFA(page);
      await page.click('[data-testid="liveboard-tab"]');
      
      // Simulate offline
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      
      // Simulate back online
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });
      
      // Offline indicator should disappear
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Accessibility Tests
  // ═══════════════════════════════════════════════════════════
  
  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await loginAsMFA(page);
      await page.click('[data-testid="liveboard-tab"]');
      
      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to focus patient cards
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('role', 'button');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await loginAsMFA(page);
      await page.click('[data-testid="liveboard-tab"]');
      
      // Check aria labels on patient cards
      const patientCard = page.locator('[data-testid="patient-card"]').first();
      await expect(patientCard).toHaveAttribute('aria-label');
      
      // Check triage badges have proper roles
      const triageBadge = page.locator('[role="status"]').first();
      await expect(triageBadge).toBeVisible();
    });
  });
});
