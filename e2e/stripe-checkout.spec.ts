import { test, expect } from '@playwright/test';
import { StripeTestHelper } from './helpers/stripe';

test.describe('Stripe Checkout Flow', () => {
  const helper = new StripeTestHelper();
  
  test.beforeEach(async ({ page }) => {
    // Login als Admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@praxis.de');
    await page.fill('[name="password"]', process.env.E2E_ARZT_PASSWORD || 'test');
    await page.click('button[type="submit"]');
    await page.waitForURL('/verwaltung');
  });

  test.describe('Subscription Checkout', () => {
    test('should complete checkout with test card 4242', async ({ page }) => {
      // 1. Zur Pricing Page gehen
      await page.goto('/pricing');
      await expect(page.locator('text=Transparente Preise')).toBeVisible();

      // 2. Professional Plan wählen
      await page.click('[data-testid="plan-professional"]');
      
      // 3. Formular ausfüllen
      await page.fill('[name="email"]', 'test@praxis.de');
      await page.fill('[name="praxisName"]', 'Test Praxis');
      await page.click('button:has-text("Professional testen")');

      // 4. Auf Stripe Checkout warten
      await page.waitForURL('https://checkout.stripe.com/**');

      // 5. Test-Kartendaten eingeben
      await helper.fillStripeCard(page, {
        number: '4242 4242 4242 4242',
        expiry: '12/25',
        cvc: '123',
        zip: '12345'
      });

      // 6. Bezahlen
      await page.click('button:has-text("Jetzt bezahlen")');

      // 7. Success Page prüfen
      await page.waitForURL('/checkout/success**');
      await expect(page.locator('text=Willkommen bei DiggAI!')).toBeVisible();

      // 8. Subscription in DB verifizieren
      await page.goto('/verwaltung/billing');
      await expect(page.locator('text=Professional')).toBeVisible();
      await expect(page.locator('text=Testphase')).toBeVisible();
    });

    test('should handle declined card 0002', async ({ page }) => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-starter"]');
      
      await page.fill('[name="email"]', 'decline@test.de');
      await page.fill('[name="praxisName"]', 'Decline Praxis');
      await page.click('button:has-text("Jetzt starten")');

      await page.waitForURL('https://checkout.stripe.com/**');

      // Abgelehnte Karte
      await helper.fillStripeCard(page, {
        number: '4000 0000 0000 0002',
        expiry: '12/25',
        cvc: '123',
        zip: '12345'
      });

      await page.click('button:has-text("Jetzt bezahlen")');

      // Fehlermeldung prüfen
      await expect(page.locator('text=Ihre Karte wurde abgelehnt')).toBeVisible();
    });

    test('should handle 3D Secure authentication', async ({ page }) => {
      await page.goto('/pricing');
      await page.click('[data-testid="plan-professional"]');
      
      await page.fill('[name="email"]', '3ds@test.de');
      await page.click('button:has-text("Professional testen")');

      await page.waitForURL('https://checkout.stripe.com/**');

      // 3D Secure Karte
      await helper.fillStripeCard(page, {
        number: '4000 0025 0000 3155',
        expiry: '12/25',
        cvc: '123',
        zip: '12345'
      });

      await page.click('button:has-text("Jetzt bezahlen")');

      // 3D Secure iFrame handhaben
      await helper.complete3DSecure(page, 'success');

      // Erfolg prüfen
      await page.waitForURL('/checkout/success**');
    });
  });

  test.describe('Subscription Management', () => {
    test('should cancel subscription', async ({ page }) => {
      // Voraussetzung: Aktive Subscription
      await page.goto('/verwaltung/billing');
      
      // Kündigen Button klicken
      await page.click('button:has-text("Kündigen")');
      
      // Bestätigungsdialog
      await page.click('button:has-text("Ja, kündigen")');

      // Erfolg prüfen
      await expect(page.locator('text=Ihr Abonnement wird gekündigt')).toBeVisible();
      await expect(page.locator('text=Gekündigt')).toBeVisible();
    });

    test('should upgrade subscription', async ({ page }) => {
      await page.goto('/verwaltung/billing');
      
      // Upgrade Button
      await page.click('button:has-text("Upgrade")');
      
      // Zu Professional upgraden
      await page.click('[data-testid="upgrade-professional"]');

      // Stripe Checkout für Upgrade
      await page.waitForURL('https://checkout.stripe.com/**');
      await helper.fillStripeCard(page, {
        number: '4242 4242 4242 4242',
        expiry: '12/25',
        cvc: '123'
      });
      await page.click('button:has-text("Jetzt bezahlen")');

      // Zurück zum Dashboard
      await page.waitForURL('/verwaltung/billing');
      await expect(page.locator('text=Professional')).toBeVisible();
    });
  });

  test.describe('Payment Methods', () => {
    test('should add new payment method', async ({ page }) => {
      await page.goto('/verwaltung/billing');
      
      // Zahlungsmethoden Tab
      await page.click('text=Zahlungsmethoden');
      
      // Hinzufügen
      await page.click('button:has-text("Hinzufügen")');

      // Stripe Elements
      await helper.fillStripeCardInElements(page, {
        number: '4242 4242 4242 4242',
        expiry: '12/25',
        cvc: '123'
      });

      await page.click('button:has-text("Speichern")');

      // Erfolg prüfen
      await expect(page.locator('text=Visa •••• 4242')).toBeVisible();
    });

    test('should remove payment method', async ({ page }) => {
      await page.goto('/verwaltung/billing');
      await page.click('text=Zahlungsmethoden');

      // Löschen Button
      await page.click('[data-testid="remove-payment-method"]:first-of-type');
      
      // Bestätigen
      await page.click('button:has-text("Ja")');

      // Erfolg prüfen
      await expect(page.locator('text=Zahlungsmethode entfernt')).toBeVisible();
    });
  });

  test.describe('Invoices', () => {
    test('should display invoice list', async ({ page }) => {
      await page.goto('/verwaltung/billing');
      await page.click('text=Rechnungen');

      // Rechnungen sollten angezeigt werden
      await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
    });

    test('should download invoice PDF', async ({ page }) => {
      await page.goto('/verwaltung/billing');
      await page.click('text=Rechnungen');

      // Download-Listener
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="download-invoice"]:first-of-type')
      ]);

      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });
  });

  test.describe('Kiosk Payment', () => {
    test('should process kiosk payment', async ({ page }) => {
      // Kiosk-Modus öffnen
      await page.goto('/kiosk');
      
      // Betrag eingeben
      await page.fill('[name="amount"]', '29.99');
      await page.selectOption('[name="type"]', 'IGEL');

      // Zahlung starten
      await page.click('button:has-text("Zahlung starten")');

      // Stripe Elements im Kiosk
      await helper.fillStripeCardInElements(page, {
        number: '4242 4242 4242 4242',
        expiry: '12/25',
        cvc: '123'
      });

      await page.click('button:has-text("Bezahlen")');

      // Erfolg
      await expect(page.locator('text=Zahlung erfolgreich')).toBeVisible();
      await expect(page.locator('button:has-text("Quittung drucken")')).toBeVisible();
    });
  });
});
