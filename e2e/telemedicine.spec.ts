import { test, expect } from '@playwright/test';

test.describe('Telemedizin — Modul 8', () => {
  test('Telemedizin API requires authentication', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/telemedizin/sessions', {
      data: {
        patientSessionId: 'session-e2e-001',
        praxisId: 'praxis-001',
        scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('PreCheckinForm page renders correctly', async ({ page }) => {
    await page.goto('/telemedizin/pre-checkin/test-session');
    await expect(page).toHaveURL(/telemedizin|pre-checkin/);
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Telemedicine video room page loads', async ({ page }) => {
    await page.goto('/telemedizin/room/test-session-001');
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('Telemedizin session list requires auth', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/telemedizin/sessions');
    expect([401, 403]).toContain(response.status());
  });

  test('WebRTC join endpoint is protected', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/telemedizin/sessions/test-id/join', {
      data: { role: 'PATIENT', consentGiven: true },
    });
    expect([401, 403, 404]).toContain(response.status());
  });
});
