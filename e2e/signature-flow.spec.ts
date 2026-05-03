/**
 * e2e/signature-flow.spec.ts
 *
 * Playwright E2E tests for the Signature Pad UX (H4) and Submit Flow (K8).
 *
 * Fixes: H4 (sticky save bar), K8 (submit error handling)
 * Arzt-Feedback 2026-05-03
 */

import { expect, test, type Page } from '@playwright/test';
import { seedCookieConsentForE2E, waitForIdle } from './helpers/test-utils';

// ─── Helpers ─────────────────────────────────────────────────

/** Draw a simple diagonal line on the signature canvas */
async function drawSignature(page: Page) {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });

  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 80);
  await page.mouse.move(box.x + 140, box.y + 40);
  await page.mouse.up();
}

/** Open the consent modal by clicking the start CTA */
async function openConsentModal(page: Page) {
  // Ensure DSGVO consent is NOT in localStorage so modal appears
  await page.evaluate(() => localStorage.removeItem('dsgvo_consent'));

  const startBtn = page
    .getByRole('button', { name: /anamnese jetzt starten|starten|start/i })
    .first();
  await startBtn.waitFor({ state: 'visible' });
  await startBtn.click();

  // Dismiss the DSGVO info game if it appears (click Weiter/Überspringen)
  const skipBtn = page.getByRole('button', { name: /überspringen|weiter|skip/i }).first();
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
  }

  // Wait for the consent+signature modal
  await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
}

/** Check all consent checkboxes */
async function checkAllConsents(page: Page) {
  const checkboxes = page.locator('[role="dialog"] input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) {
    const cb = checkboxes.nth(i);
    if (!(await cb.isChecked())) {
      await cb.click();
    }
  }
}

// ─── Tests ───────────────────────────────────────────────────

test.describe('Signature Pad UX (H4)', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsentForE2E(page);
    await page.goto('/anamnese');
    await waitForIdle(page, { timeout: 8000 });
    await openConsentModal(page);
  });

  test('canvas is visible and accepts drawing', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    await drawSignature(page);

    // After drawing, the confirm/save button should be enabled
    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen|gespeichert/i })
      .first();
    await expect(confirmBtn).not.toBeDisabled();
  });

  test('save bar is visible near the canvas after drawing', async ({ page }) => {
    await drawSignature(page);

    // The inline save bar (div with ref=saveBarRef) should contain the confirm button
    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen/i })
      .first();
    await expect(confirmBtn).toBeVisible();
  });

  test('auto-saved feedback appears after 3 s of inactivity (label check)', async ({ page }) => {
    await drawSignature(page);

    // Wait for the auto-save badge
    const badge = page.getByText(/automatisch gespeichert/i).first();
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test('reset button clears the canvas', async ({ page }) => {
    await drawSignature(page);

    const resetBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /zurücksetzen/i })
      .first();
    await expect(resetBtn).not.toBeDisabled();
    await resetBtn.click();

    // After reset, confirm button should be disabled again
    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen/i })
      .first();
    await expect(confirmBtn).toBeDisabled();
  });

  test('confirm button touch target meets WCAG min 44px', async ({ page }) => {
    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen/i })
      .first();

    const box = await confirmBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('Consent Submit Flow (K8)', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsentForE2E(page);
    await page.goto('/anamnese');
    await waitForIdle(page, { timeout: 8000 });
    await openConsentModal(page);
  });

  test('submit button is disabled until all checks + signature done', async ({ page }) => {
    const submitBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /einwilligung|abgeben|submit/i })
      .first();

    // Initially disabled (no checkboxes, no signature)
    await expect(submitBtn).toBeDisabled();

    // After checking all boxes but no signature — still disabled
    await checkAllConsents(page);
    await expect(submitBtn).toBeDisabled();
  });

  test('submit shows spinner when pending (mock slow network)', async ({ page }) => {
    // Intercept the session creation endpoint to delay it
    await page.route('**/api/sessions', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });

    await checkAllConsents(page);
    await drawSignature(page);

    // Confirm signature
    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen/i })
      .first();
    if (await confirmBtn.isEnabled().catch(() => false)) {
      await confirmBtn.click();
    }

    const submitBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /einwilligung|abgeben/i })
      .first();
    await submitBtn.click();

    // Spinner should appear
    const spinner = page.locator('[role="dialog"] .animate-spin').first();
    await expect(spinner).toBeVisible({ timeout: 3000 });

    // Modal should remain open during pending
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('inline error shown on network failure (mock 500)', async ({ page }) => {
    // Intercept session creation and return error
    await page.route('**/api/sessions', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await checkAllConsents(page);
    await drawSignature(page);

    const confirmBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /bestätigen/i })
      .first();
    if (await confirmBtn.isEnabled().catch(() => false)) {
      await confirmBtn.click();
    }

    const submitBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /einwilligung|abgeben/i })
      .first();
    await submitBtn.click();

    // Inline error message should appear (not a blocking modal)
    const errorMsg = page.locator('[role="alert"]').first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });

    // Modal should stay open (not close on error)
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('cancel button dismisses the modal', async ({ page }) => {
    const cancelBtn = page
      .locator('[role="dialog"]')
      .getByRole('button', { name: /abbrechen|cancel/i })
      .first();
    await cancelBtn.click();

    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 2000 });
  });
});
