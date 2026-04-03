import { test, expect } from '@playwright/test';

test.describe('TOTP Input', () => {
  test.beforeEach(async ({ page }) => {
    // Login vor jedem Test
    await page.goto('/verwaltung/login');
    await page.fill('[data-testid="staff-username"]', 'e2e.arzt');
    await page.fill('[data-testid="staff-password"]', 'E2E-StaffPass123!');
    await page.click('[data-testid="staff-login-submit"]');
    await page.waitForURL('/verwaltung/arzt');
  });

  test('TOTP input accepts 6 digits', async ({ page }) => {
    await page.goto('/settings/security');
    
    // Start 2FA setup
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    // Enter TOTP code
    const inputs = page.locator('[data-testid^="totp-input-"]');
    await expect(inputs).toHaveCount(6);
    
    // Type digits
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill(String(i + 1));
    }
    
    // Verify all inputs filled
    for (let i = 0; i < 6; i++) {
      await expect(inputs.nth(i)).toHaveValue(String(i + 1));
    }
  });

  test('TOTP input supports paste', async ({ page }) => {
    await page.goto('/settings/security');
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    const input = page.locator('[data-testid="totp-input-0"]');
    
    // Simulate paste
    await input.evaluate((el, value) => {
      const event = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
      });
      event.clipboardData?.setData('text/plain', value);
      el.dispatchEvent(event);
    }, '123456');
    
    // Verify all inputs filled
    const inputs = page.locator('[data-testid^="totp-input-"]');
    for (let i = 0; i < 6; i++) {
      await expect(inputs.nth(i)).toHaveValue(String(i + 1));
    }
  });

  test('TOTP input has correct accessibility', async ({ page }) => {
    await page.goto('/settings/security');
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    // Check ARIA labels
    const input = page.locator('[data-testid="totp-input-0"]');
    await expect(input).toHaveAttribute('aria-label', 'Digit 1');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
    
    // Check group role
    const group = page.locator('[role="group"]');
    await expect(group).toHaveAttribute('aria-label', 'TOTP Code Eingabe');
  });

  test('TOTP input auto-advances on input', async ({ page }) => {
    await page.goto('/settings/security');
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    const inputs = page.locator('[data-testid^="totp-input-"]');
    
    // Type first digit - focus should move to next
    await inputs.nth(0).fill('1');
    await expect(inputs.nth(1)).toBeFocused();
    
    // Type second digit
    await inputs.nth(1).fill('2');
    await expect(inputs.nth(2)).toBeFocused();
  });

  test('TOTP input supports backspace navigation', async ({ page }) => {
    await page.goto('/settings/security');
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    const inputs = page.locator('[data-testid^="totp-input-"]');
    
    // Fill first two inputs
    await inputs.nth(0).fill('1');
    await inputs.nth(1).fill('2');
    
    // Press backspace - should move back to previous
    await inputs.nth(1).press('Backspace');
    await expect(inputs.nth(0)).toBeFocused();
  });
});
