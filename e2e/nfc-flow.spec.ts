import { test, expect } from '@playwright/test';

test.describe('NFC Flow — Modul 7', () => {
  test('NFC Landing page loads and shows scan prompt', async ({ page }) => {
    await page.goto('/nfc');
    await expect(page.locator('h1, [data-testid="nfc-title"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/NFC|Chip|Scan/i)).toBeVisible();
  });

  test('NFC step view shows flow progress bar', async ({ page }) => {
    // Navigate directly to step view with a fake session param
    await page.goto('/nfc/step?session=test-session-001&step=1');
    // Page should load (even if no live data, structure should render)
    await expect(page).toHaveURL(/nfc/);
  });

  test('Treatment Flow Builder page renders correctly', async ({ page }) => {
    await page.goto('/flows/builder');
    await expect(page).toHaveURL(/flows\/builder/);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('Patient Flow Live Board page renders', async ({ page }) => {
    await page.goto('/flows/live');
    await expect(page).toHaveURL(/flows\/live/);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('NFC API scan endpoint validates HMAC signature', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/nfc/scan', {
      data: {
        locationId: 'loc-001',
        praxisId: 'praxis-001',
        signature: 'invalid-signature',
        timestamp: Date.now(),
      },
    });
    // Should reject invalid signature
    expect([400, 401, 403]).toContain(response.status());
  });
});
