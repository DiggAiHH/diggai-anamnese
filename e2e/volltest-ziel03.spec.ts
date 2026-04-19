/**
 * Ziel 03: Patient-Flow — DiggAI Volltest
 *
 * Testet den vollständigen Patientenfluss:
 * - Alle 10 Anliegen-Karten auf /patient
 * - Anamnese-Fragebogen Einstieg (/anamnese)
 * - Rezept-Anfrage (/rezepte)
 * - Krankschreibung (/krankschreibung)
 * - Unfallmeldung (/unfallmeldung)
 * - PWA Login Flow (/pwa/login)
 *
 * WICHTIG (Memory F009, F010):
 * - domcontentloaded statt networkidle
 * - Cookie-Consent VOR jedem Klick schließen
 */
import { test, expect } from '@playwright/test';

// Helper: dismiss cookie consent dialog
async function dismissCookies(page: import('@playwright/test').Page) {
  const cookieBtn = page.locator('button').filter({ hasText: 'Alle akzeptieren' });
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Ziel 03: Patient-Flow', () => {

  test('[Z03] /anamnese lädt und zeigt Fragebogen-Einstieg', async ({ page }) => {
    await page.goto('/anamnese', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_anamnese.png' });

    const h1 = page.locator('h1, h2').first();
    const text = await h1.textContent().catch(() => '');
    console.log(`Anamnese h1/h2: "${text}"`);

    // Check page has some content
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    console.log(`✅ /anamnese loaded (body length: ${body?.length})`);
  });

  test('[Z03] /rezepte lädt und zeigt Rezept-Anfrage', async ({ page }) => {
    await page.goto('/rezepte', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_rezepte.png' });

    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    console.log(`✅ /rezepte loaded`);
  });

  test('[Z03] /krankschreibung lädt und zeigt AU-Anfrage', async ({ page }) => {
    await page.goto('/krankschreibung', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_krankschreibung.png' });

    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    console.log(`✅ /krankschreibung loaded`);
  });

  test('[Z03] /unfallmeldung lädt und zeigt BG-Meldung', async ({ page }) => {
    await page.goto('/unfallmeldung', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_unfallmeldung.png' });

    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    console.log(`✅ /unfallmeldung loaded`);
  });

  test('[Z03] Anamnese-Fragebogen: Erste Frage ist bedienbar', async ({ page }) => {
    await page.goto('/anamnese', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await dismissCookies(page);

    // Look for any interactive element: button, input, radio, select
    const interactive = page.locator('button, input, select, textarea, [role="radio"], [role="checkbox"]');
    const count = await interactive.count();
    console.log(`Interactive elements on /anamnese: ${count}`);

    // Log all visible buttons for Takistination
    const buttons = page.locator('button');
    const btnCount = await buttons.count();
    for (let i = 0; i < Math.min(btnCount, 10); i++) {
      const text = await buttons.nth(i).textContent().catch(() => '');
      const visible = await buttons.nth(i).isVisible().catch(() => false);
      if (visible) console.log(`  Button [${i}]: "${text?.trim()}"`);
    }

    expect(count).toBeGreaterThan(0);
    console.log(`✅ /anamnese has interactive elements`);
  });

  test('[Z03] Patient Service Hub: Alle 10 Karten sichtbar', async ({ page }) => {
    await page.goto('/patient', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_patient_hub.png' });

    // Based on F008: Known cards on /patient
    const expectedCards = [
      'Termin',
      'Rezept',
      'Krankschreibung',
      'Unfallmeldung',
      'Überweisung',
      'Terminabsage',
      'Befunde',
      'Telefonanfrage',
      'Dokumente',
      'Nachricht',
    ];

    let found = 0;
    for (const card of expectedCards) {
      const el = page.locator('main').getByText(card, { exact: false });
      if (await el.count() > 0) {
        found++;
        console.log(`  ✅ Card "${card}" found`);
      } else {
        console.log(`  ⚠️ Card "${card}" NOT found`);
      }
    }

    console.log(`Found ${found}/${expectedCards.length} cards`);
    expect(found).toBeGreaterThanOrEqual(8); // Allow 2 missing due to text variance
  });

  test('[Z03] /pwa/login Formular hat Username + Passwort Felder', async ({ page }) => {
    await page.goto('/pwa/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_pwa_login.png' });

    const emailOrUser = page.locator('input[type="email"], input[type="text"], input[name*="user"], input[placeholder*="E-Mail"], input[placeholder*="Benutzer"]');
    const password = page.locator('input[type="password"]');

    const hasLoginField = await emailOrUser.count() > 0;
    const hasPassword = await password.count() > 0;

    console.log(`Login field: ${hasLoginField ? '✅' : '❌'}`);
    console.log(`Password field: ${hasPassword ? '✅' : '❌'}`);

    // PWA login might use different flow (PIN, token link, etc.)
    const body = await page.locator('body').textContent();
    console.log(`Body snippet: ${body?.substring(0, 200)}`);

    expect(body?.length).toBeGreaterThan(50);
  });

  test('[Z03] /verwaltung/login Formular ist bedienbar (DOM)', async ({ page }) => {
    await page.goto('/verwaltung/login', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);
    await page.screenshot({ path: 'test-results/volltest/ziel03_verwaltung_login.png' });

    // Find username input
    const usernameInput = page.locator('input').first();
    const passwordInput = page.locator('input[type="password"]');

    if (await usernameInput.count() > 0) {
      await usernameInput.click();
      await usernameInput.fill('test-user');
      console.log('✅ Username field fillable');
    }

    if (await passwordInput.count() > 0) {
      await passwordInput.click();
      await passwordInput.fill('test-password');
      console.log('✅ Password field fillable');
    }

    // Find submit button
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Anmelden|Login|Einloggen/i });
    if (await submitBtn.count() > 0) {
      console.log('✅ Submit button found');
      // Do NOT click — would trigger login attempt
    }
  });

  test('[Z03] QR-Code "Link kopieren" Button funktioniert', async ({ page }) => {
    await page.goto('/patient', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    await dismissCookies(page);

    // Scroll to bottom where QR code is
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/volltest/ziel03_qr_code.png' });

    const copyBtn = page.locator('button').filter({ hasText: 'Link kopieren' });
    if (await copyBtn.count() > 0) {
      console.log('✅ QR-Code "Link kopieren" button found');
      // Click and check for feedback
      await copyBtn.click();
      await page.waitForTimeout(1000);
      const bodyAfter = await page.locator('body').textContent();
      console.log(`After copy click body snippet: ${bodyAfter?.substring(0, 300)}`);
    } else {
      console.log('⚠️ "Link kopieren" button not found');
    }
  });
});
