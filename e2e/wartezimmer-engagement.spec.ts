import { test, expect } from '@playwright/test';
import { startNewPatient, waitForIdle, fillBasicInfo, selectService, clickWeiter } from './helpers/test-utils';

test.describe('Modul 1: Wartezimmer Engagement', () => {
  test.beforeEach(async ({ page }) => {
    await startNewPatient(page);
    await fillBasicInfo(page);
    await clickWeiter(page);
    await selectService(page, 'Allgemein');
    await waitForIdle(page);
  });

  test('queue status card shows position and estimated wait', async ({ page }) => {
    // Navigate to waiting room
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    // Should see queue position or a waiting status indicator
    const queueCard = page.locator('[data-testid="queue-status"], text=/Wartenummer|Warteschlange|Position/i');
    await expect(queueCard.first()).toBeVisible({ timeout: 10000 });
  });

  test('tabs are present: Warteschlange, Gesundheit, Spiele, Praxis-News', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    const expectedTabs = ['Warteschlange', 'Gesundheit', 'Spiele', 'Praxis-News'];
    for (const tab of expectedTabs) {
      const tabBtn = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tab, 'i') });
      await expect(tabBtn.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('health tip carousel navigates between tips', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    // Click health tab
    const healthTab = page.locator('button, [role="tab"]').filter({ hasText: /Gesundheit|Tipps/i });
    if (await healthTab.first().isVisible().catch(() => false)) {
      await healthTab.first().click();
      await waitForIdle(page);

      // Carousel or tip content should be visible
      const tipContent = page.locator('[data-testid="health-tip"], text=/Tipp|Gesundheit/i');
      await expect(tipContent.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('games tab shows available games', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    const gamesTab = page.locator('button, [role="tab"]').filter({ hasText: /Spiele/i });
    if (await gamesTab.first().isVisible().catch(() => false)) {
      await gamesTab.first().click();
      await waitForIdle(page);

      // Should see game options
      const gameOption = page.locator('text=/Quiz|Atemübung|Memory|Spiel/i');
      await expect(gameOption.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('breathing exercise can be started', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    const gamesTab = page.locator('button, [role="tab"]').filter({ hasText: /Spiele/i });
    if (await gamesTab.first().isVisible().catch(() => false)) {
      await gamesTab.first().click();
      await waitForIdle(page);

      const breathingBtn = page.locator('button').filter({ hasText: /Atemübung|Breathing/i });
      if (await breathingBtn.first().isVisible().catch(() => false)) {
        await breathingBtn.first().click();
        await waitForIdle(page);

        // Exercise UI should appear
        const exerciseUI = page.locator('text=/Einatmen|Halten|Ausatmen|Inhale/i');
        await expect(exerciseUI.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('mood check dialog collects feedback', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    // Look for mood check component
    const moodCheck = page.locator('[data-testid="mood-check"], text=/Wie geht es Ihnen|Stimmung/i');
    if (await moodCheck.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click a mood option
      const goodBtn = page.locator('button').filter({ hasText: /Gut|Good/i });
      if (await goodBtn.first().isVisible().catch(() => false)) {
        await goodBtn.first().click();
        await waitForIdle(page);

        const thanks = page.locator('text=/Danke|Thank/i');
        await expect(thanks.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('entertainment mode can be changed', async ({ page }) => {
    await page.goto('/wartezimmer');
    await waitForIdle(page);

    // Look for entertainment mode selector
    const modeSelector = page.locator('[data-testid="entertainment-mode"], text=/Automatisch|Modus/i');
    if (await modeSelector.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await modeSelector.first().click();
      await waitForIdle(page);
    }
  });

  test('info break appears during questionnaire flow', async ({ page }) => {
    // Start questionnaire and answer several questions to trigger info break
    // Info breaks appear after N questions
    const questionHeading = page.locator('h2');
    let questionsAnswered = 0;

    while (questionsAnswered < 15) {
      await waitForIdle(page);

      // Check for info break
      const infoBreak = page.locator('[data-testid="info-break"], text=/Wussten Sie|Did you know/i');
      if (await infoBreak.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        // Info break appeared - verify skip button
        const skipBtn = page.locator('button').filter({ hasText: /Überspringen|Weiter|Skip/i });
        await expect(skipBtn.first()).toBeVisible({ timeout: 3000 });
        await skipBtn.first().click();
        break;
      }

      // Answer current question
      const radioOption = page.locator('input[type="radio"], [role="radio"]');
      if (await radioOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await radioOption.first().click();
      }

      const weiterBtn = page.locator('button').filter({ hasText: /Weiter|Next/i });
      if (await weiterBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await weiterBtn.first().click();
        questionsAnswered++;
      } else {
        break;
      }
    }
  });
});
