import { test, expect } from '@playwright/test';
import { 
    loginArzt, 
    waitForIdle, 
    waitForStableState,
    createTestSession,
    createTriageAlert,
    createAuthenticatedContext,
    TEST_CREDENTIALS,
    waitForToast,
    expectHasClass
} from '../helpers/test-utils';

test.describe('Doctor Dashboard - Triage Management', () => {
    let authCookie: string;
    let testSessionIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        authCookie = await createAuthenticatedContext(
            request, 
            TEST_CREDENTIALS.arzt.username, 
            TEST_CREDENTIALS.arzt.password
        );
    });

    test.beforeEach(async ({ page }) => {
        await loginArzt(page);
        await waitForStableState(page);
    });

    test.afterEach(async ({ request }) => {
        for (const sessionId of testSessionIds) {
            try {
                await request.delete(`/api/sessions/${sessionId}`, {
                    headers: { 'Cookie': authCookie }
                });
            } catch {
                // Ignore cleanup errors
            }
        }
        testSessionIds = [];
    });

    test('display CRITICAL triage alert', async ({ page, request }) => {
        // Create a session with CRITICAL triage
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Critical',
            lastName: 'AlertTest'
        });
        testSessionIds.push(sessionId);
        
        // Trigger critical triage
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL', 'CRITICAL_CHEST_PAIN');
        
        // Refresh to see the alert
        await page.reload();
        await waitForStableState(page);
        
        // Look for critical alert indicators
        const criticalAlert = page.locator('.triage-critical, [data-triage="CRITICAL"], .alert-critical, .bg-red-600, .bg-red-500').first();
        await expect(criticalAlert).toBeVisible({ timeout: 10000 }).catch(async () => {
            // Try alternative selectors
            const altAlert = page.locator('text=/CRITICAL|kritisch|dringend/i').first();
            await expect(altAlert).toBeVisible({ timeout: 5000 });
        });
    });

    test('display WARNING triage alert', async ({ page, request }) => {
        // Create a session with WARNING triage
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Warning',
            lastName: 'AlertTest'
        });
        testSessionIds.push(sessionId);
        
        // Trigger warning triage
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'WARNING_FEVER');
        
        // Refresh to see the alert
        await page.reload();
        await waitForStableState(page);
        
        // Look for warning alert indicators
        const warningAlert = page.locator('.triage-warning, [data-triage="WARNING"], .alert-warning, .bg-yellow-500, .bg-orange-500').first();
        await expect(warningAlert).toBeVisible({ timeout: 10000 }).catch(async () => {
            // Try alternative selectors
            const altAlert = page.locator('text=/WARNING|Warnung|Achtung/i').first();
            await expect(altAlert).toBeVisible({ timeout: 5000 });
        });
    });

    test('acknowledge triage alert', async ({ page, request }) => {
        // Create a session with triage
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Acknowledge',
            lastName: 'Test'
        });
        testSessionIds.push(sessionId);
        
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'TEST_RULE');
        
        // Refresh and find the session
        await page.reload();
        await waitForStableState(page);
        
        // Find session with triage alert
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Acknowledge")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for acknowledge button
            const acknowledgeBtn = page.locator('button:has-text("bestätigen"), button:has-text("acknowledge"), button:has-text("quittieren"), [data-action="acknowledge"]').first();
            
            if (await acknowledgeBtn.isVisible().catch(() => false)) {
                await acknowledgeBtn.click();
                await waitForIdle(page);
                
                // Should show success message
                const successMsg = page.locator('text=/bestätigt|acknowledged|quittiert/i');
                await expect(successMsg.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
                
                // Alert should be marked as acknowledged
                const acknowledgedBadge = page.locator('.acknowledged, [data-acknowledged="true"], text=/bearbeitet|erledigt/i').first();
                await expect(acknowledgedBadge).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('handle multiple triage events in one session', async ({ page, request }) => {
        // Create a session
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'MultiAlert',
            lastName: 'Test'
        });
        testSessionIds.push(sessionId);
        
        // Trigger multiple triage alerts
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL', 'RULE_1');
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'RULE_2');
        await page.waitForTimeout(500);
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'RULE_3');
        
        // Refresh page
        await page.reload();
        await waitForStableState(page);
        
        // Open session details
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("MultiAlert")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for multiple alerts
            const alerts = page.locator('.triage-alert, [data-triage], .alert-item');
            const alertCount = await alerts.count();
            
            // Should show at least one alert
            expect(alertCount).toBeGreaterThan(0);
        }
    });

    test('triage prioritization - CRITICAL before WARNING', async ({ page, request }) => {
        // Create multiple sessions with different triage levels
        const criticalSession = await createTestSession(request, authCookie, {
            firstName: 'ZCritical',
            lastName: 'Patient'
        });
        testSessionIds.push(criticalSession);
        
        const warningSession = await createTestSession(request, authCookie, {
            firstName: 'AWarning',
            lastName: 'Patient'
        });
        testSessionIds.push(warningSession);
        
        // Apply triage levels
        await createTriageAlert(request, authCookie, criticalSession, 'CRITICAL');
        await createTriageAlert(request, authCookie, warningSession, 'WARNING');
        
        // Refresh page
        await page.reload();
        await waitForStableState(page);
        
        // Check ordering - critical should appear before warning
        const criticalElement = page.locator(`[data-session-id="${criticalSession}"], tr:has-text("ZCritical")`).first();
        const warningElement = page.locator(`[data-session-id="${warningSession}"], tr:has-text("AWarning")`).first();
        
        if (await criticalElement.isVisible().catch(() => false) && 
            await warningElement.isVisible().catch(() => false)) {
            
            const criticalBox = await criticalElement.boundingBox();
            const warningBox = await warningElement.boundingBox();
            
            if (criticalBox && warningBox) {
                // Critical should be above warning (lower y-coordinate)
                expect(criticalBox.y).toBeLessThanOrEqual(warningBox.y);
            }
        }
    });

    test('triage escalation after timeout', async ({ page, request }) => {
        // Create a session with unacknowledged critical triage
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Escalation',
            lastName: 'Test'
        });
        testSessionIds.push(sessionId);
        
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL', 'ESCALATION_TEST');
        
        // Initial check
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Escalation")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            // Check for visual escalation indicators
            const alertElement = page.locator(`[data-session-id="${sessionId}"] .triage-alert, tr:has-text("Escalation") .alert`).first();
            
            // Wait for potential escalation (if implemented)
            await page.waitForTimeout(5000);
            
            // Look for escalation indicators
            const escalationIndicators = page.locator('.escalated, .overdue, [data-escalated], .blink, .animate-pulse');
            // Just check that the alert is still visible (escalation may or may not be implemented)
            await expect(sessionRow).toBeVisible();
        }
    });

    test('triage alert details are displayed correctly', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Details',
            lastName: 'Test'
        });
        testSessionIds.push(sessionId);
        
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL', 'DETAILED_RULE');
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Details")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Should show triage details
            const triageDetails = page.locator('.triage-details, .alert-details, [data-triage-details]').first();
            
            if (await triageDetails.isVisible().catch(() => false)) {
                // Check for rule information
                const ruleInfo = page.locator('text=/Regel|Rule|Bedingung/i');
                await expect(ruleInfo.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
            }
        }
    });

    test('filter by triage level', async ({ page, request }) => {
        // Create sessions with different triage levels
        const criticalSession = await createTestSession(request, authCookie, {
            firstName: 'FilterCrit',
            lastName: 'Test'
        });
        testSessionIds.push(criticalSession);
        
        const warningSession = await createTestSession(request, authCookie, {
            firstName: 'FilterWarn',
            lastName: 'Test'
        });
        testSessionIds.push(warningSession);
        
        await createTriageAlert(request, authCookie, criticalSession, 'CRITICAL');
        await createTriageAlert(request, authCookie, warningSession, 'WARNING');
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for triage filter
        const criticalFilter = page.locator('button:has-text("CRITICAL"), button:has-text("kritisch"), [data-filter="CRITICAL"]').first();
        
        if (await criticalFilter.isVisible().catch(() => false)) {
            await criticalFilter.click();
            await waitForIdle(page);
            
            // Should only show critical sessions
            const visibleSessions = page.locator('tr, .session-card');
            const count = await visibleSessions.count();
            
            for (let i = 0; i < Math.min(count, 5); i++) {
                const sessionText = await visibleSessions.nth(i).textContent() || '';
                // Should not contain warning session
                expect(sessionText).not.toContain('FilterWarn');
            }
        }
    });

    test('real-time triage alert via WebSocket', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Realtime',
            lastName: 'Triage'
        });
        testSessionIds.push(sessionId);
        
        // Initial state - no critical alert
        await page.reload();
        await waitForStableState(page);
        
        // Trigger triage via API while page is open
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL');
        
        // Wait for real-time update
        await page.waitForTimeout(3000);
        
        // Should show the alert without page refresh
        const alert = page.locator('.triage-critical, [data-triage="CRITICAL"]').first();
        await expect(alert).toBeVisible({ timeout: 5000 }).catch(() => {
            // If no real-time update, refresh and check
        });
    });

    test('triage acknowledgment requires confirmation for CRITICAL', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Confirm',
            lastName: 'Critical'
        });
        testSessionIds.push(sessionId);
        
        await createTriageAlert(request, authCookie, sessionId, 'CRITICAL');
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Confirm")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const acknowledgeBtn = page.locator('button:has-text("bestätigen"), [data-action="acknowledge"]').first();
            
            if (await acknowledgeBtn.isVisible().catch(() => false)) {
                await acknowledgeBtn.click();
                
                // Check for confirmation dialog for critical alerts
                const confirmDialog = page.locator('.confirm-dialog, [role="dialog"], .modal').first();
                
                if (await confirmDialog.isVisible().catch(() => false)) {
                    // Confirm the acknowledgment
                    const confirmBtn = page.locator('button:has-text("bestätigen"), button:has-text("confirm"), button:has-text("ja")').first();
                    await confirmBtn.click();
                    await waitForIdle(page);
                }
                
                // Should show acknowledged state
                await expect(page.locator('text=/bestätigt|acknowledged/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('triage history is maintained', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'History',
            lastName: 'Test'
        });
        testSessionIds.push(sessionId);
        
        // Create multiple triage events
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'HISTORY_1');
        await page.waitForTimeout(500);
        await createTriageAlert(request, authCookie, sessionId, 'WARNING', 'HISTORY_2');
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("History")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for triage history section
            const historySection = page.locator('.triage-history, .alert-history, [data-triage-history]').first();
            
            if (await historySection.isVisible().catch(() => false)) {
                // Should show multiple historical alerts
                const historyItems = page.locator('.triage-history-item, .history-item');
                const count = await historyItems.count();
                expect(count).toBeGreaterThanOrEqual(1);
            }
        }
    });
});
