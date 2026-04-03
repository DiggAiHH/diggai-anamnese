import { test, expect } from '@playwright/test';

test.describe('Security Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/verwaltung/login');
    await page.fill('[data-testid="staff-username"]', 'e2e.arzt');
    await page.fill('[data-testid="staff-password"]', 'E2E-StaffPass123!');
    await page.click('[data-testid="staff-login-submit"]');
    await page.waitForURL('/verwaltung/arzt');
  });

  test('Password change form validation', async ({ page }) => {
    await page.goto('/settings/security');
    
    // Try to submit without current password
    await page.click('button:has-text("Passwort ändern")');
    
    // Should show validation error
    await expect(page.locator('[role="alert"]')).toContainText('Passwort');
  });

  test('Password mismatch shows error', async ({ page }) => {
    await page.goto('/settings/security');
    
    await page.fill('input[name="currentPassword"]', 'OldPass123!');
    await page.fill('input[name="newPassword"]', 'NewPass123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
    
    await page.click('button:has-text("Passwort ändern")');
    
    await expect(page.locator('text=Passwörter stimmen nicht überein')).toBeVisible();
  });

  test('2FA setup wizard flow', async ({ page }) => {
    await page.goto('/settings/security');
    
    // Start setup
    await page.click('[data-testid="enable-2fa"]');
    
    // Step 1: Intro
    await expect(page.locator('text=2FA schützt Ihren Account')).toBeVisible();
    await page.click('[data-testid="2fa-setup-start"]');
    
    // Step 2: QR Code
    await expect(page.locator('text=Scannen Sie den QR-Code')).toBeVisible();
    await page.click('[data-testid="2fa-setup-next"]');
    
    // Step 3: Verify
    await expect(page.locator('text=6-stelligen Code')).toBeVisible();
    
    // Enter code
    const inputs = page.locator('[data-testid^="totp-input-"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill('1');
    }
    
    await page.click('button:has-text("Verifizieren")');
    
    // Step 4: Backup codes
    await expect(page.locator('text=Backup-Codes')).toBeVisible();
  });

  test('Can cancel 2FA setup', async ({ page }) => {
    await page.goto('/settings/security');
    
    await page.click('[data-testid="enable-2fa"]');
    await expect(page.locator('text=2FA schützt Ihren Account')).toBeVisible();
    
    // Cancel setup
    await page.click('button:has-text("Abbrechen")');
    
    // Should return to security settings
    await expect(page.locator('h1:has-text("Sicherheit")')).toBeVisible();
  });

  test('Shows password strength indicator', async ({ page }) => {
    await page.goto('/settings/security');
    
    const newPasswordInput = page.locator('input[name="newPassword"]');
    await newPasswordInput.fill('weak');
    
    // Should show weak password indicator
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('Schwach');
    
    // Strong password
    await newPasswordInput.fill('Str0ng!Passw0rd');
    await expect(page.locator('[data-testid="password-strength"]')).toContainText('Stark');
  });

  test('Can download backup codes after 2FA setup', async ({ page }) => {
    await page.goto('/settings/security');
    
    // Complete 2FA setup
    await page.click('[data-testid="enable-2fa"]');
    await page.click('[data-testid="2fa-setup-start"]');
    await page.click('[data-testid="2fa-setup-next"]');
    
    const inputs = page.locator('[data-testid^="totp-input-"]');
    for (let i = 0; i < 6; i++) {
      await inputs.nth(i).fill('1');
    }
    
    await page.click('button:has-text("Verifizieren")');
    
    // Should be able to download backup codes
    const downloadButton = page.locator('[data-testid="download-backup-codes"]');
    await expect(downloadButton).toBeVisible();
    
    // Click download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadButton.click(),
    ]);
    
    expect(download.suggestedFilename()).toContain('backup-codes');
  });

  test('Security settings page is accessible', async ({ page }) => {
    await page.goto('/settings/security');
    
    // Check page title
    await expect(page).toHaveTitle(/Sicherheit/);
    
    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Sicherheit');
    
    // Check landmarks
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
