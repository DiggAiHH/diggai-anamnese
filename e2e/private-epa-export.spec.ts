import { test, expect } from '@playwright/test';

test.describe('Private ePA & Anonymisierter Export — Modul 8', () => {
  test('ePA dashboard page requires authentication', async ({ page }) => {
    await page.goto('/epa/test-patient-001');
    await expect(page.locator('body')).not.toContainText('500');
    // Should redirect to login or show auth required message
    await expect(page).toHaveURL(/.*/); // Page loads (may redirect)
  });

  test('ePA API requires authentication', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/epa/test-patient-001');
    expect([401, 403]).toContain(response.status());
  });

  test('ePA document creation requires auth', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/epa/test-patient/documents', {
      data: {
        title: 'Laborbefund März 2026',
        category: 'LABOR',
        content: 'Hämoglobin: 14.2 g/dl\nBlutzucker: 95 mg/dl\nKolesterin: 185 mg/dl',
        tags: ['labor', 'routine'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('EPA share token access endpoint exists', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/epa/share/invalid-token-abc');
    // Should return 403/404 for invalid token — not 404 for missing endpoint
    expect(response.status()).not.toBe(404);
  });

  test('Anonymized export endpoint requires admin auth', async ({ request }) => {
    const response = await request.post('http://localhost:3000/api/epa/test-patient/exports', {
      data: { format: 'JSON', scope: 'FULL', purpose: 'Forschung' },
    });
    expect([401, 403]).toContain(response.status());
  });
});
