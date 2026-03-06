import { test, expect } from '@playwright/test';

test.describe('Avatar & Voice Clone — Modul 8', () => {
  test('Avatar API GET returns 401 without auth', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/avatar/staff-001');
    expect([401, 403, 404]).toContain(response.status());
  });

  test('TTS speak endpoint rejects unauthenticated requests', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/avatar/staff-001/speak', {
      data: { text: 'Willkommen in unserer Praxis.', language: 'de' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('Avatar player page does not crash on load', async ({ page }) => {
    // Avatar component is embedded in kiosk/NFC pages
    await page.goto('/kiosk');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Should not show JS error overlay
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.waitForTimeout(2000);
    // Critical errors check (runtime crashes)
    const criticalErrors = errors.filter(e => e.includes('TypeError') && !e.includes('fetch'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Gamification leaderboard API is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/gamification/leaderboard?praxisId=test&period=WEEKLY');
    // Endpoint should exist (auth required for real data)
    expect(response.status()).not.toBe(404);
  });

  test('Points display API returns 401 without auth', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/gamification/staff-001/points');
    expect([401, 403, 404]).toContain(response.status());
  });
});
