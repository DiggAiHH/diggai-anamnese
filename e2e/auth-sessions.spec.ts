import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/verwaltung/login');
    await page.fill('[data-testid="staff-username"]', 'e2e.arzt');
    await page.fill('[data-testid="staff-password"]', 'E2E-StaffPass123!');
    await page.click('[data-testid="staff-login-submit"]');
    await page.waitForURL('/verwaltung/arzt');
  });

  test('User can view active sessions', async ({ page }) => {
    // Navigate to security settings
    await page.goto('/settings/security');
    
    // Wait for sessions to load
    await page.waitForSelector('[data-testid="session-list"]');
    
    // Check current session is displayed
    const currentSession = page.locator('[data-testid="session-current"]');
    await expect(currentSession).toBeVisible();
    await expect(currentSession).toContainText('Aktuell');
  });

  test('User can terminate a session', async ({ page }) => {
    await page.goto('/settings/security');
    await page.waitForSelector('[data-testid="session-list"]');
    
    // Find a non-current session and terminate it
    const otherSession = page.locator('[data-testid="session-item"]').filter({
      hasNot: page.locator('[data-testid="session-current"]')
    }).first();
    
    if (await otherSession.isVisible()) {
      await otherSession.locator('[data-testid="session-terminate"]').click();
      
      // Confirm termination
      await page.click('[data-testid="confirm-terminate"]');
      
      // Verify session is removed
      await expect(otherSession).not.toBeVisible();
    }
  });

  test('User can terminate all other sessions', async ({ page }) => {
    await page.goto('/settings/security');
    await page.waitForSelector('[data-testid="session-list"]');
    
    // Click "Terminate All Others"
    await page.click('[data-testid="terminate-all-sessions"]');
    
    // Confirm
    await page.click('[data-testid="confirm-terminate-all"]');
    
    // Verify only current session remains
    const sessions = page.locator('[data-testid="session-item"]');
    await expect(sessions).toHaveCount(1);
  });
});
