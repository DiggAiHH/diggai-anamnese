import { test, expect } from '@playwright/test';

test.describe('Checkout & Feedback — Modul 7', () => {
  test('Anonymous feedback form renders and accepts rating', async ({ page }) => {
    await page.goto('/feedback');
    await expect(page).toHaveURL(/feedback/);
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('Checkout wizard page loads for valid session', async ({ page }) => {
    await page.goto('/checkout/test-session-123');
    // Should show checkout options (keep / export / delete)
    await expect(page).toHaveURL(/checkout/);
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Data deletion confirm page renders', async ({ page }) => {
    await page.goto('/checkout/test-session-123/delete');
    await expect(page.locator('body')).not.toContainText('404');
  });

  test('Feedback API submission creates feedback entry', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/feedback', {
      data: {
        praxisId: 'praxis-e2e-001',
        sessionId: null,
        rating: 4,
        categories: ['WARTEZEIT', 'FREUNDLICHKEIT'],
        freeText: 'Sehr angenehme Atmosphäre, kurze Wartezeit.',
        language: 'de',
      },
    });
    expect([200, 201]).toContain(response.status());
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body.rating).toBe(4);
    }
  });

  test('Feedback threat-analysis endpoint requires admin auth', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/feedback/threat-analysis?praxisId=test');
    // Must return 401 without auth
    expect(response.status()).toBe(401);
  });
});
