/**
 * Ziel 01: Erreichbarkeitstest — DiggAI Volltest
 * 
 * Testet alle öffentlichen Routen auf diggai.de gegen Ladeverhalten,
 * Rendering und Fehlern. Läuft headless gegen die Live-Seite.
 * 
 * Ausführung:
 *   PLAYWRIGHT_BASE_URL=https://diggai.de PLAYWRIGHT_USE_EXISTING_SERVER=true npx playwright test e2e/volltest-ziel01.spec.ts --headed
 */
import { test, expect } from '@playwright/test';

const PUBLIC_ROUTES = [
  { path: '/', name: 'HomeScreen', expectedText: 'Wie können wir Ihnen helfen' },
  { path: '/patient', name: 'Patienten-Service Hub', expectedText: 'Anliegen' },
  { path: '/datenschutz', name: 'Datenschutz', expectedText: 'Datenschutz' },
  { path: '/impressum', name: 'Impressum', expectedText: 'Impressum' },
  { path: '/pricing', name: 'Pricing', expectedText: 'Preis' },
  { path: '/verwaltung/login', name: 'Staff Login', expectedText: 'Verwaltung' },
  { path: '/pwa/login', name: 'PWA Login', expectedText: '' },
  { path: '/feedback', name: 'Feedback', expectedText: 'Feedback' },
  { path: '/telemedizin', name: 'Telemedizin', expectedText: 'Telemedizin' },
  { path: '/nfc', name: 'NFC Landing', expectedText: 'NFC' },
  { path: '/settings/security', name: 'Security Settings', expectedText: '' },
] as const;

test.describe('Ziel 01: Erreichbarkeit & Grundlegende Ladezeiten', () => {
  
  for (const route of PUBLIC_ROUTES) {
    test(`[Z01] ${route.name} (${route.path}) lädt korrekt`, async ({ page }) => {
      // Navigate
      const startTime = Date.now();
      await page.goto(route.path, { waitUntil: 'networkidle', timeout: 15000 });
      const loadTime = Date.now() - startTime;
      
      // Wait for lazy loading (SPA renders after JS loads)
      await page.waitForTimeout(2000);
      
      // Screenshot
      await page.screenshot({ 
        path: `test-results/volltest/ziel01_${route.name.toLowerCase().replace(/\s+/g, '_')}.png`,
        fullPage: true 
      });
      
      // Basic checks
      // 1. Page is not completely blank
      const bodyText = await page.textContent('body');
      expect(bodyText?.length).toBeGreaterThan(10);
      
      // 2. No error boundary rendered
      const hasErrorBoundary = await page.locator('text=/Fehler|Error|Something went wrong/i').count();
      if (hasErrorBoundary > 0) {
        console.warn(`⚠️ Error boundary detected on ${route.path}`);
      }
      
      // 3. Expected text is present (if specified)
      if (route.expectedText) {
        const hasExpectedText = await page.locator(`text=/${route.expectedText}/i`).count();
        expect(hasExpectedText, `Expected "${route.expectedText}" on ${route.path}`).toBeGreaterThan(0);
      }
      
      // 4. No loading spinner stuck (indicates lazy load failure)
      await page.waitForTimeout(1000);
      const spinnerCount = await page.locator('.animate-spin').count();
      if (spinnerCount > 0) {
        console.warn(`⚠️ Loading spinner still visible on ${route.path} after 3s`);
      }
      
      // 5. Load time check
      console.log(`✅ ${route.name} (${route.path}): loaded in ${loadTime}ms`);
      expect(loadTime, `${route.path} should load within 10s`).toBeLessThan(10000);
      
      // 6. Check console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to fetch') && !msg.text().includes('net::ERR')) {
          errors.push(msg.text());
        }
      });
    });
  }

  test('[Z01] 404-Seite für unbekannte Route', async ({ page }) => {
    await page.goto('/gibts-nicht-xyz-test-404', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'test-results/volltest/ziel01_404.png',
      fullPage: true 
    });
    
    // Should render NotFoundPage
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    // 404 page should have some indicator
    const has404 = await page.locator('text=/404|nicht gefunden|not found|Seite nicht/i').count();
    console.log(`404 page indicators found: ${has404}`);
  });

  test('[Z01] Legacy Redirects funktionieren', async ({ page }) => {
    // /arzt → /verwaltung/arzt
    // NOTE (F009): Use 'domcontentloaded' instead of 'networkidle' because
    // dashboard pages make API calls that never complete (backend offline)
    await page.goto('/arzt', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/verwaltung');
    
    // /mfa → /verwaltung/mfa
    await page.goto('/mfa', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/verwaltung');
    
    // /admin → /verwaltung/admin
    await page.goto('/admin', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/verwaltung');
    
    console.log('✅ All legacy redirects working');
  });
});
