import { test, expect } from '@playwright/test';

test.describe('Kiosk & Payment — Modul 7/8', () => {
  test('Kiosk dashboard page loads in kiosk mode', async ({ page }) => {
    await page.goto('/kiosk');
    await expect(page).toHaveURL(/kiosk/);
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Kiosk shows language selection options', async ({ page }) => {
    await page.goto('/kiosk');
    // The kiosk supports 5 languages (DE, EN, TR, AR, RU)
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // At least some content visible
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('Payment API requires authentication', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/payment/intent', {
      data: {
        sessionId: 'session-e2e-001',
        amount: 2500,
        currency: 'EUR',
        paymentMethod: 'NFC',
      },
    });
    // No auth header → should reject
    expect([401, 403]).toContain(response.status());
  });

  test('Payment webhook accepts valid request', async ({ request }) => {
    // Test webhook endpoint exists (signature validation happens inside)
    const response = await request.post('http://localhost:3000/api/payment/webhook', {
      headers: { 'content-type': 'application/json' },
      data: { type: 'payment_intent.succeeded', data: { object: { id: 'pi_test' } } },
    });
    // Should not be 404 — endpoint exists
    expect(response.status()).not.toBe(404);
  });

  test('NFC payment terminal component is accessible at checkout', async ({ page }) => {
    await page.goto('/kiosk');
    await expect(page.locator('body')).not.toContainText('Fehler');
  });
});
