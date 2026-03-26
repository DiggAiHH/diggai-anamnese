import { test, expect } from '@playwright/test';

test.describe('Wearable Data Synchronization (E2E)', () => {
  test('should ingest Apple Health data and trigger Triage Alert', async ({ request, page }) => {
    // 1. Simulate Wearable Sync via REST API
    const response = await request.post('/api/wearables/ingest', {
      data: {
        source: 'APPLE_HEALTH',
        metricType: 'HEART_RATE',
        value: 135,
        unit: 'bpm',
        recordedAt: new Date().toISOString()
      },
      headers: {
        'Authorization': 'Bearer test-patient-token'
      }
    });
    
    expect(response.status()).toBe(200);

    // 2. Doctor Dashboard Verification
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'diggai2025');
    await page.click('button[type="submit"]');
    
    await page.goto('/arzt');
    await expect(page.locator('text=Wearable Alarm: Herzfrequenz (135 bpm)')).toBeVisible();
  });
});
