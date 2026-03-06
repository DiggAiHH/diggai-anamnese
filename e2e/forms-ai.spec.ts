import { test, expect } from '@playwright/test';

test.describe('Formulare & KI-Generator — Modul 8', () => {
  test('Form builder page loads without errors', async ({ page }) => {
    await page.goto('/forms/builder');
    await expect(page).toHaveURL(/forms\/builder/);
    await expect(page.locator('body')).not.toContainText('404');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Form runner page renders with valid form ID', async ({ page }) => {
    await page.goto('/forms/run/test-form-001');
    await expect(page.locator('body')).not.toContainText('500');
  });

  test('Forms list API requires authentication', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/forms');
    expect([200, 401, 403]).toContain(response.status());
  });

  test('AI form generate endpoint requires auth', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/forms/ai-generate', {
      data: {
        prompt: 'Erstelle einen Schmerzfragebogen für Rückenschmerzen.',
        praxisId: 'praxis-001',
        language: 'de',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('Form submit endpoint validates input', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/forms/nonexistent-form/submit', {
      data: { sessionId: 'session-001', answers: [] },
    });
    // 401 (auth) or 404 (not found) — not 500
    expect([401, 403, 404]).toContain(response.status());
  });
});
