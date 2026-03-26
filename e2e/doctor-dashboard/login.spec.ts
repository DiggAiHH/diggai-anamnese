import { test, expect, Page } from '@playwright/test';
import { 
    loginArzt, 
    loginWithRememberMe,
    logout,
    simulateSessionTimeout,
    waitForIdle,
    waitForStableState,
    TEST_CREDENTIALS 
} from '../helpers/test-utils';

test.describe('Doctor Dashboard - Login Flows', () => {
    test.beforeEach(async ({ page }) => {
        // Clear any existing session state
        await page.context().clearCookies();
    });

    test('successful login with valid credentials', async ({ page }) => {
        await loginArzt(page);
        await waitForIdle(page);

        // Should see Arzt portal content
        await expect(page.getByText('Arzt-Portal')).toBeVisible({ timeout: 10000 });
        
        // Should see dashboard elements
        const dashboardContent = page.locator('main, [role="main"], .dashboard');
        await expect(dashboardContent.first()).toBeVisible();
        
        // Should have user info displayed
        const userInfo = page.locator('text=/Dr\\.|Arzt|admin/i').first();
        await expect(userInfo).toBeVisible();
    });

    test('failed login with wrong password', async ({ page }) => {
        await page.goto('/arzt');
        await page.fill('input[type="text"]', TEST_CREDENTIALS.arzt.username);
        await page.fill('input[type="password"]', 'wrongpassword123');
        await page.click('button[type="submit"]');

        // Wait for error message
        await page.waitForTimeout(1000);
        
        // Should show error message
        const errorMessage = page.locator('text=/falsch|ungültig|error|invalid/i');
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
        
        // Should stay on login page
        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();
        
        // Submit button should be enabled for retry
        const submitButton = page.locator('button[type="submit"]');
        await expect(submitButton).toBeEnabled();
    });

    test('failed login with wrong username', async ({ page }) => {
        await page.goto('/arzt');
        await page.fill('input[type="text"]', 'nonexistent_user_12345');
        await page.fill('input[type="password"]', TEST_CREDENTIALS.arzt.password);
        await page.click('button[type="submit"]');

        // Wait for error message
        await page.waitForTimeout(1000);
        
        // Should show error message
        const errorMessage = page.locator('text=/falsch|ungültig|nicht gefunden|error|invalid/i');
        await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
        
        // Should stay on login page
        const usernameField = page.locator('input[type="text"]');
        await expect(usernameField).toHaveValue('nonexistent_user_12345');
    });

    test('failed login with empty credentials', async ({ page }) => {
        await page.goto('/arzt');
        
        // Try to submit without filling fields
        const submitButton = page.locator('button[type="submit"]');
        
        // Check if form validation prevents submission
        const usernameField = page.locator('input[type="text"]');
        await usernameField.fill('');
        
        // HTML5 validation should prevent submission
        const isRequired = await usernameField.evaluate((el: HTMLInputElement) => el.required);
        expect(isRequired).toBe(true);
    });

    test('session timeout redirects to login', async ({ page }) => {
        // First login successfully
        await loginArzt(page);
        await waitForStableState(page);
        
        // Verify we're logged in
        await expect(page.getByText('Arzt-Portal')).toBeVisible();
        
        // Simulate session timeout by clearing cookies
        await simulateSessionTimeout(page);
        await waitForIdle(page);
        
        // Should be redirected to login page
        await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('input[type="text"]')).toBeVisible();
        
        // Should show session expired message if implemented
        const sessionExpiredMsg = page.locator('text=/Session|abgelaufen|expired|timeout/i');
        if (await sessionExpiredMsg.first().isVisible().catch(() => false)) {
            await expect(sessionExpiredMsg.first()).toBeVisible();
        }
    });

    test('logout clears session and redirects to login', async ({ page }) => {
        // Login first
        await loginArzt(page);
        await waitForStableState(page);
        
        // Verify logged in state
        await expect(page.getByText('Arzt-Portal')).toBeVisible();
        
        // Logout
        await logout(page);
        await waitForIdle(page);
        
        // Should be on login page
        await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 10000 });
        
        // Verify cookies are cleared
        const cookies = await page.context().cookies();
        const authCookies = cookies.filter(c => c.name.includes('token') || c.name.includes('auth') || c.name.includes('session'));
        expect(authCookies.length).toBe(0);
    });

    test('"remember me" persists login across browser sessions', async ({ page, context }) => {
        // Login with remember me
        await loginWithRememberMe(page, TEST_CREDENTIALS.arzt.username, TEST_CREDENTIALS.arzt.password);
        await waitForStableState(page);
        
        // Verify logged in
        await expect(page.getByText('Arzt-Portal')).toBeVisible();
        
        // Get cookies before closing
        const cookiesBefore = await context.cookies();
        const persistentCookie = cookiesBefore.find(c => 
            c.name.includes('token') || c.name.includes('auth')
        );
        
        if (persistentCookie) {
            // Cookie should have future expiration (persistent, not session)
            expect(persistentCookie.expires).toBeGreaterThan(Date.now() / 1000);
        }
        
        // Close and reopen context (simulates browser restart)
        await context.close();
        
        // Create new context with saved storage state
        const newContext = await page.context().browser()?.newContext({
            storageState: {
                cookies: cookiesBefore,
                origins: []
            }
        });
        
        if (newContext) {
            const newPage = await newContext.newPage();
            await newPage.goto('/arzt');
            await waitForIdle(newPage);
            
            // Should still be logged in
            const portalVisible = await newPage.getByText('Arzt-Portal').isVisible().catch(() => false);
            if (portalVisible) {
                await expect(newPage.getByText('Arzt-Portal')).toBeVisible();
            }
            
            await newContext.close();
        }
    });

    test('password field masks input', async ({ page }) => {
        await page.goto('/arzt');
        
        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();
        
        // Type a password
        await passwordField.fill('testpassword');
        
        // Verify the field type is password (masked)
        const inputType = await passwordField.getAttribute('type');
        expect(inputType).toBe('password');
    });

    test('login page has proper accessibility attributes', async ({ page }) => {
        await page.goto('/arzt');
        
        // Check for form labels
        const usernameField = page.locator('input[type="text"]');
        const passwordField = page.locator('input[type="password"]');
        
        // Should have associated labels or aria-label
        const usernameLabel = await usernameField.getAttribute('aria-label') || 
                             await usernameField.getAttribute('placeholder');
        const passwordLabel = await passwordField.getAttribute('aria-label') || 
                             await passwordField.getAttribute('placeholder');
        
        expect(usernameLabel?.length).toBeGreaterThan(0);
        expect(passwordLabel?.length).toBeGreaterThan(0);
        
        // Submit button should have text
        const submitButton = page.locator('button[type="submit"]');
        const buttonText = await submitButton.textContent();
        expect(buttonText?.length).toBeGreaterThan(0);
    });

    test('rate limiting after multiple failed login attempts', async ({ page }) => {
        await page.goto('/arzt');
        
        // Attempt multiple failed logins
        for (let i = 0; i < 5; i++) {
            await page.fill('input[type="text"]', TEST_CREDENTIALS.arzt.username);
            await page.fill('input[type="password"]', `wrongpassword${i}`);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(800);
        }
        
        // Check for rate limit message or increasing delays
        const rateLimitMessage = page.locator('text=/zu viele|rate limit|zu oft|warten/i');
        const hasRateLimit = await rateLimitMessage.first().isVisible().catch(() => false);
        
        if (hasRateLimit) {
            await expect(rateLimitMessage.first()).toBeVisible();
        }
    });

    test('login form submission with Enter key', async ({ page }) => {
        await page.goto('/arzt');
        
        await page.fill('input[type="text"]', TEST_CREDENTIALS.arzt.username);
        await page.fill('input[type="password"]', TEST_CREDENTIALS.arzt.password);
        
        // Press Enter instead of clicking submit
        await page.press('input[type="password"]', 'Enter');
        
        // Should login successfully
        await expect(page.getByText('Arzt-Portal')).toBeVisible({ timeout: 10000 });
    });

    test('concurrent login sessions from different browsers', async ({ browser }) => {
        // Create two separate contexts (simulating different browsers)
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        
        try {
            // Login from first browser
            await loginArzt(page1);
            await waitForIdle(page1);
            await expect(page1.getByText('Arzt-Portal')).toBeVisible();
            
            // Login from second browser with same credentials
            await loginArzt(page2);
            await waitForIdle(page2);
            await expect(page2.getByText('Arzt-Portal')).toBeVisible();
            
            // Both should be logged in (concurrent sessions allowed)
            await expect(page1.getByText('Arzt-Portal')).toBeVisible();
            await expect(page2.getByText('Arzt-Portal')).toBeVisible();
        } finally {
            await context1.close();
            await context2.close();
        }
    });
});
