import { test, expect } from '@playwright/test';

test.describe('Dynamic AI Intake Pivot (E2E)', () => {
  test('should trigger AI follow-up when critical keyword is used', async ({ page }) => {
    // 1. Start Questionnaire
    await page.goto('/kiosk');
    await page.click('text=Termin / Anamnese');

    // 2. Answer with keyword that triggers AI Pivot
    await page.fill('textarea[name="hauptbeschwerde"]', 'Starke Schmerzen in der Brust ausstrahlend in den linken Arm');
    await page.click('button:has-text("Weiter")');

    // 3. Verify that the UI switches to processing mode, then shows an AI dynamic question
    await expect(page.locator('text=Dr. Klaproth AI analysiert Ihre Symptome...')).toBeVisible();
    await expect(page.locator('text=Haben Sie auch Atemnot oder Schweißausbrüche?')).toBeVisible({ timeout: 15000 });
  });
});
