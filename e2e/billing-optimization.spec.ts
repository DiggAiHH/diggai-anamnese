import { test, expect } from '@playwright/test';

test.describe('AI Billing Optimization (E2E)', () => {
  test('should suggest GOÄ/EBM codes dynamically for a completed session', async ({ request, page }) => {
    // Navigate to Arzt Dashboard
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'diggai2025');
    await page.click('button[type="submit"]');

    // Open a completed session
    await page.click('text=Geschlossene Sitzungen');
    await page.click('.session-card:first-child');

    // Trigger Billing Optimization
    await page.click('button:has-text("Abrechnungsvorschläge generieren")');
    
    // Verify AI returns suggestions
    await expect(page.locator('text=Chronikerpauschale (03212)')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Eingehende Beratung (GOÄ 3, 1)')).toBeVisible();
  });
});
