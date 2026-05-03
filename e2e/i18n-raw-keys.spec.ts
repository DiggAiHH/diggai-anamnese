import { expect, test, type Page } from '@playwright/test';
import {
  dismissCookieBannerIfPresent,
  seedCookieConsentForE2E,
  waitForIdle,
} from './helpers/test-utils';

const RAW_I18N_KEY_PATTERN = /^[a-z_]+(\.[a-z_]+){2,}$/;

async function findRawI18nTokens(page: Page) {
  return page.evaluate((patternSource) => {
    const regex = new RegExp(patternSource);
    const text = document.body?.innerText || '';
    const tokens = text
      .split(/\s+/)
      .map((token) => token.trim().replace(/^[^a-z_]+|[^a-z_\.]+$/gi, ''))
      .filter(Boolean);

    return Array.from(new Set(tokens.filter((token) => regex.test(token))));
  }, RAW_I18N_KEY_PATTERN.source);
}

test.describe('i18n raw key guard', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieConsentForE2E(page);
  });

  test('no raw i18n keys on hub/questionnaire/consent-related routes', async ({ page }) => {
    const paths = ['/', '/patient', '/anamnese'];

    for (const path of paths) {
      await page.goto(path);
      await waitForIdle(page, { timeout: 7000 });
      await dismissCookieBannerIfPresent(page);

      const tokens = await findRawI18nTokens(page);
      expect(tokens, `raw i18n keys found on ${path}`).toEqual([]);
    }
  });

  test('consent flow does not render raw i18n key tokens', async ({ page }) => {
    await page.goto('/anamnese');
    await waitForIdle(page, { timeout: 7000 });
    await dismissCookieBannerIfPresent(page);

    const startButton = page.getByRole('button', { name: /anamnese|start|jetzt/i }).first();
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
      await waitForIdle(page, { timeout: 7000 });
    }

    const tokens = await findRawI18nTokens(page);
    expect(tokens, 'raw i18n keys found after opening consent flow').toEqual([]);
  });
});
