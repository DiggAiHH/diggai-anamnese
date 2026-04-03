import { Page, Frame } from '@playwright/test';

interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  zip?: string;
}

export class StripeTestHelper {
  /**
   * Füllt Kartendaten im Stripe Checkout aus
   */
  async fillStripeCard(page: Page, card: CardDetails): Promise<void> {
    // Stripe Checkout iFrames
    const cardNumberFrame = page.frameLocator('iframe[name*="cardnumber"]').first();
    const expiryFrame = page.frameLocator('iframe[name*="expiry"]').first();
    const cvcFrame = page.frameLocator('iframe[name*="cvc"]').first();

    await cardNumberFrame.locator('[name="cardnumber"]').fill(card.number);
    await expiryFrame.locator('[name="exp-date"]').fill(card.expiry);
    await cvcFrame.locator('[name="cvc"]').fill(card.cvc);

    if (card.zip) {
      const zipFrame = page.frameLocator('iframe[name*="postal"]').first();
      await zipFrame.locator('[name="postal"]').fill(card.zip);
    }
  }

  /**
   * Füllt Kartendaten in Stripe Elements (Embedded)
   */
  async fillStripeCardInElements(page: Page, card: CardDetails): Promise<void> {
    // Stripe Elements sind oft in einem iframe
    const stripeFrame = page.frameLocator('iframe[src*="stripe"]').first();
    
    await stripeFrame.locator('[data-testid="card-number-input"]').fill(card.number);
    await stripeFrame.locator('[data-testid="card-expiry-input"]').fill(card.expiry);
    await stripeFrame.locator('[data-testid="card-cvc-input"]').fill(card.cvc);
  }

  /**
   * Handhabt 3D Secure Authentifizierung
   */
  async complete3DSecure(page: Page, outcome: 'success' | 'fail'): Promise<void> {
    // 3D Secure iFrame
    const threeDsFrame = page.frameLocator('iframe[name*="3ds"]').first();
    
    if (outcome === 'success') {
      await threeDsFrame.click('button:has-text("Complete")');
    } else {
      await threeDsFrame.click('button:has-text("Fail")');
    }
  }

  /**
   * Wartet auf Stripe Webhook Verarbeitung
   */
  async waitForWebhookProcessing(page: Page, timeout = 5000): Promise<void> {
    await page.waitForTimeout(timeout); // Webhooks sind async
  }

  /**
   * Simuliert Stripe Webhook Event (für lokale Tests)
   */
  async simulateWebhook(event: string, data: unknown): Promise<void> {
    // POST an lokalen Webhook Endpoint
    const response = await fetch('http://localhost:3001/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 'test-signature' // In echten Tests richtig signieren
      },
      body: JSON.stringify({ type: event, data: { object: data } })
    });

    if (!response.ok) {
      throw new Error(`Webhook simulation failed: ${response.statusText}`);
    }
  }
}
