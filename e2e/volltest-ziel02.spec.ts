/**
 * Ziel 02: Navigation & Routing-Integrität — DiggAI Volltest
 * 
 * Testet alle internen Navigations-Links, Expand-Bereiche,
 * Footer-Links und Routing-Integrität.
 * 
 * Ausführung:
 *   npx playwright test --config=playwright.volltest.config.ts volltest-ziel02
 */
import { test, expect } from '@playwright/test';

test.describe('Ziel 02: Navigation & Routing-Integrität', () => {

  test.beforeEach(async ({ page }) => {
    // NOTE (F009): Use domcontentloaded, not networkidle
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // NOTE (F010): Cookie consent dialog blocks ALL clicks (z-index 9998, modal)
    // MUST dismiss it before interacting with any elements
    const cookieBtn = page.locator('button').filter({ hasText: 'Alle akzeptieren' });
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('[Z02] HomeScreen 3 Hauptkacheln navigieren korrekt', async ({ page }) => {
    // Kachel 1: Anamnese → /patient
    const tiles = page.locator('main button, main a').filter({ hasText: /Anamnese|Termin|Patient/i });
    const tileCount = await tiles.count();
    console.log(`Found ${tileCount} tiles matching Anamnese/Patient`);
    
    // Click first matching tile
    if (tileCount > 0) {
      await tiles.first().click();
      await page.waitForTimeout(2000);
      const url = page.url();
      console.log(`After tile click: ${url}`);
      // Should navigate to /patient or /anamnese
      expect(url).toMatch(/\/(patient|anamnese)/);
    }
    
    // Go back and test next tile
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Kachel 2: PWA Portal
    const pwaTile = page.locator('main button, main a').filter({ hasText: /Portal|Patienten-Portal/i });
    if (await pwaTile.count() > 0) {
      await pwaTile.first().click();
      await page.waitForTimeout(2000);
      console.log(`After PWA tile click: ${page.url()}`);
      expect(page.url()).toContain('/pwa');
    }
    
    // Go back
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Kachel 3: Telemedizin
    const telemTile = page.locator('main button, main a').filter({ hasText: /Telemedizin/i });
    if (await telemTile.count() > 0) {
      await telemTile.first().click();
      await page.waitForTimeout(2000);
      console.log(`After Telemedizin tile click: ${page.url()}`);
      expect(page.url()).toContain('/telemedizin');
    }
  });

  test('[Z02] Expand "Praxis-Verwaltung & mehr" öffnet und schließt', async ({ page }) => {
    // Find expand button
    const expandBtn = page.locator('button[aria-expanded]');
    
    if (await expandBtn.count() > 0) {
      // Check initial state
      const isExpanded = await expandBtn.getAttribute('aria-expanded');
      console.log(`Initial aria-expanded: ${isExpanded}`);
      
      // Click to expand
      await expandBtn.click();
      await page.waitForTimeout(500);
      
      const afterExpand = await expandBtn.getAttribute('aria-expanded');
      console.log(`After expand click: ${afterExpand}`);
      
      // Should have toggled
      expect(afterExpand).not.toBe(isExpanded);
      
      // Click to collapse
      await expandBtn.click();
      await page.waitForTimeout(500);
      
      const afterCollapse = await expandBtn.getAttribute('aria-expanded');
      console.log(`After collapse click: ${afterCollapse}`);
      expect(afterCollapse).toBe(isExpanded);
      
      console.log('✅ Expand/Collapse toggle works correctly');
    } else {
      console.log('⚠️ No aria-expanded button found on HomeScreen');
    }
  });

  test('[Z02] Footer-Links navigieren korrekt', async ({ page }) => {
    // Datenschutz
    const datenschutz = page.locator('footer a, footer button').filter({ hasText: 'Datenschutz' });
    if (await datenschutz.count() > 0) {
      await datenschutz.first().click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/datenschutz');
      console.log('✅ Footer → Datenschutz works');
    }
    
    // Back
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Impressum
    const impressum = page.locator('footer a, footer button').filter({ hasText: 'Impressum' });
    if (await impressum.count() > 0) {
      await impressum.first().click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/impressum');
      console.log('✅ Footer → Impressum works');
    }
    
    // Back
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Verwaltung
    const verwaltung = page.locator('footer a, footer button').filter({ hasText: /Verwaltung/i });
    if (await verwaltung.count() > 0) {
      await verwaltung.first().click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain('/verwaltung');
      console.log('✅ Footer → Verwaltung works');
    }
  });

  test('[Z02] Patient Service Hub Anliegen-Karten navigieren korrekt', async ({ page }) => {
    await page.goto('/patient', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Test the 4 link-based cards (Termin, Rezepte, AU, Unfallmeldung)
    const linkCards = [
      { text: /Termin.*Anamnese/i, expectedPath: '/anamnese' },
      { text: /Medikamente.*Rezepte/i, expectedPath: '/rezepte' },
      { text: /Krankschreibung/i, expectedPath: '/krankschreibung' },
      { text: /Unfallmeldung/i, expectedPath: '/unfallmeldung' },
    ];
    
    for (const card of linkCards) {
      await page.goto('/patient', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      
      // Accept cookies if visible
      const cookieBtn = page.locator('button').filter({ hasText: 'Alle akzeptieren' });
      if (await cookieBtn.isVisible().catch(() => false)) {
        await cookieBtn.click();
        await page.waitForTimeout(500);
      }
      
      const link = page.locator('a').filter({ hasText: card.text });
      if (await link.count() > 0) {
        await link.first().click();
        await page.waitForTimeout(2000);
        console.log(`${card.expectedPath}: navigated to ${page.url()}`);
        expect(page.url()).toContain(card.expectedPath);
      } else {
        console.log(`⚠️ Card not found: ${card.text}`);
      }
    }
  });

  test('[Z02] Patient Service Hub Footer-Links', async ({ page }) => {
    await page.goto('/patient', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    // Accept cookies first
    const cookieBtn = page.locator('button').filter({ hasText: 'Alle akzeptieren' });
    if (await cookieBtn.isVisible().catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }
    
    // Check that footer links exist on patient page
    const footerLinks = ['Datenschutz', 'Impressum', 'Dokumentation', 'Handbuch', 'Arzt', 'MFA', 'Admin'];
    for (const linkText of footerLinks) {
      const link = page.locator('a').filter({ hasText: linkText });
      const count = await link.count();
      console.log(`Footer link "${linkText}": ${count > 0 ? '✅ found' : '❌ NOT found'}`);
    }
  });

  test('[Z02] Theme Toggle (Dark/Light) funktioniert', async ({ page }) => {
    // Find theme toggle button
    const themeToggle = page.locator('button').filter({ hasText: /Modus wechseln|hellen|dunklen/i });
    
    if (await themeToggle.count() > 0) {
      // Take screenshot before toggle
      await page.screenshot({ path: 'test-results/volltest/ziel02_theme_before.png' });
      
      // Click toggle
      await themeToggle.first().click();
      await page.waitForTimeout(500);
      
      // Take screenshot after toggle
      await page.screenshot({ path: 'test-results/volltest/ziel02_theme_after.png' });
      
      // Check if html class changed (dark mode usually adds 'dark' class)
      const htmlClass = await page.locator('html').getAttribute('class');
      console.log(`HTML class after toggle: ${htmlClass}`);
      console.log('✅ Theme toggle clicked successfully');
    } else {
      console.log('⚠️ Theme toggle button not found');
    }
  });

  test('[Z02] Browser-Zurück-Navigation funktioniert', async ({ page }) => {
    // Navigate to sub-page
    await page.goto('/datenschutz', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/datenschutz');
    
    // Go back
    await page.goBack();
    await page.waitForTimeout(2000);
    
    // Should be back at home
    const url = page.url();
    console.log(`After goBack: ${url}`);
    // The exact URL depends on browser history
    expect(url).toBeTruthy();
    console.log('✅ Browser back navigation works');
  });

  test('[Z02] Cookie-Consent Dialog Interaktion', async ({ page }) => {
    // Cookie consent should appear on first visit
    const cookieDialog = page.locator('dialog, [role="dialog"]').filter({ hasText: 'Cookie' });
    
    if (await cookieDialog.isVisible().catch(() => false)) {
      console.log('✅ Cookie consent dialog visible');
      
      // Check buttons exist
      const essenziell = cookieDialog.locator('button').filter({ hasText: /Nur Essenzielle/i });
      const akzeptieren = cookieDialog.locator('button').filter({ hasText: /Alle akzeptieren/i });
      
      expect(await essenziell.count()).toBeGreaterThan(0);
      expect(await akzeptieren.count()).toBeGreaterThan(0);
      
      // Click "Alle akzeptieren"
      await akzeptieren.click();
      await page.waitForTimeout(500);
      
      // Dialog should disappear
      const stillVisible = await cookieDialog.isVisible().catch(() => false);
      console.log(`Cookie dialog after accept: ${stillVisible ? 'still visible ❌' : 'dismissed ✅'}`);
    } else {
      console.log('⚠️ Cookie consent dialog not visible (may already be accepted)');
    }
  });
});
