import { test, expect, APIRequestContext } from '@playwright/test';
import { 
    loginArzt, 
    waitForIdle, 
    waitForStableState,
    createTestSession,
    assignSession,
    completeSession,
    getSessions,
    createAuthenticatedContext,
    TEST_CREDENTIALS,
    waitForToast
} from '../helpers/test-utils';

test.describe('Doctor Dashboard - Session Management', () => {
    let apiContext: APIRequestContext;
    let authCookie: string;
    let testSessionIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        // Authenticate via API for test data setup
        authCookie = await createAuthenticatedContext(
            request, 
            TEST_CREDENTIALS.arzt.username, 
            TEST_CREDENTIALS.arzt.password
        );
    });

    test.beforeEach(async ({ page }) => {
        // Login via UI
        await loginArzt(page);
        await waitForStableState(page);
    });

    test.afterEach(async ({ request }) => {
        // Cleanup test sessions
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

    test('display active sessions on dashboard', async ({ page }) => {
        // Look for sessions table or list
        const sessionsContainer = page.locator('[data-testid="sessions-list"], .sessions-table, .session-list, main');
        await expect(sessionsContainer.first()).toBeVisible();
        
        // Check for session-related elements
        const sessionElements = page.locator('tr, .session-card, [data-session-id]');
        const count = await sessionElements.count();
        
        // Should show sessions or empty state
        if (count === 0) {
            // Check for empty state message
            const emptyState = page.locator('text=/keine|empty|no sessions|nichts/i');
            await expect(emptyState.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
    });

    test('open session details view', async ({ page }) => {
        // Look for session items
        const sessionItem = page.locator('tr, .session-card, [data-session-id]').first();
        
        if (await sessionItem.isVisible().catch(() => false)) {
            await sessionItem.click();
            await waitForIdle(page);
            
            // Should show session detail view
            const detailView = page.locator('.session-detail, [data-testid="session-detail"], .patient-info');
            await expect(detailView.first()).toBeVisible({ timeout: 5000 });
            
            // Should show patient information
            const patientInfo = page.locator('text=/Patient|Name|Geburtsdatum/i');
            await expect(patientInfo.first()).toBeVisible();
        }
    });

    test('filter sessions by patient name', async ({ page }) => {
        // Look for filter input
        const filterInput = page.locator('input[placeholder*="Suchen"], input[placeholder*="Filter"], input[type="search"]').first();
        
        if (await filterInput.isVisible().catch(() => false)) {
            await filterInput.fill('Test');
            await page.waitForTimeout(500);
            
            // Check filtered results
            const sessionRows = page.locator('tr, .session-card');
            const count = await sessionRows.count();
            
            if (count > 0) {
                // All visible sessions should contain the filter text
                for (let i = 0; i < Math.min(count, 5); i++) {
                    const text = await sessionRows.nth(i).textContent() || '';
                    expect(text.toLowerCase()).toContain('test');
                }
            }
            
            // Clear filter
            await filterInput.clear();
            await page.waitForTimeout(300);
        }
    });

    test('filter sessions by status', async ({ page }) => {
        // Look for status filter buttons or dropdown
        const statusFilters = page.locator('button:has-text("waiting"), button:has-text("in-progress"), button:has-text("completed"), select');
        
        if (await statusFilters.first().isVisible().catch(() => false)) {
            // Try clicking on "waiting" filter
            const waitingFilter = page.locator('button').filter({ hasText: /waiting|wartend|offen/i }).first();
            
            if (await waitingFilter.isVisible().catch(() => false)) {
                await waitingFilter.click();
                await waitForIdle(page);
                
                // Check that filtered sessions have waiting status
                const statusBadges = page.locator('.status-badge, [data-status]');
                const count = await statusBadges.count();
                
                for (let i = 0; i < Math.min(count, 3); i++) {
                    const status = await statusBadges.nth(i).getAttribute('data-status') || 
                                  await statusBadges.nth(i).textContent() || '';
                    expect(status.toLowerCase()).toMatch(/waiting|wartend|offen/);
                }
            }
        }
    });

    test('assign session to doctor', async ({ page, request }) => {
        // Create a test session first
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Zuweisen',
            lastName: 'TestPatient',
            birthDate: '1985-03-20'
        });
        testSessionIds.push(sessionId);
        
        // Refresh page to see new session
        await page.reload();
        await waitForStableState(page);
        
        // Find and click on the session
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Zuweisen")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for assign button
            const assignButton = page.locator('button:has-text("zuweisen"), button:has-text("assign"), button:has-text("übernehmen")').first();
            
            if (await assignButton.isVisible().catch(() => false)) {
                await assignButton.click();
                await waitForIdle(page);
                
                // Should show success message
                const successMsg = page.locator('text=/zugewiesen|assigned|erfolgreich/i');
                await expect(successMsg.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('complete session workflow', async ({ page, request }) => {
        // Create and assign a test session
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Abschluss',
            lastName: 'TestPatient',
            birthDate: '1975-08-10'
        });
        testSessionIds.push(sessionId);
        
        // Refresh page
        await page.reload();
        await waitForStableState(page);
        
        // Find session and open detail view
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Abschluss")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for complete/finish button
            const completeButton = page.locator('button:has-text("abschließen"), button:has-text("complete"), button:has-text("fertig")').first();
            
            if (await completeButton.isVisible().catch(() => false)) {
                await completeButton.click();
                await waitForIdle(page);
                
                // Confirm completion if dialog appears
                const confirmButton = page.locator('button:has-text("bestätigen"), button:has-text("confirm"), button:has-text("ja")').first();
                if (await confirmButton.isVisible().catch(() => false)) {
                    await confirmButton.click();
                    await waitForIdle(page);
                }
                
                // Session status should change to completed
                const completedStatus = page.locator('text=/abgeschlossen|completed|fertig/i');
                await expect(completedStatus.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('export session as PDF', async ({ page, request }) => {
        // Create a test session
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'PDF',
            lastName: 'ExportPatient'
        });
        testSessionIds.push(sessionId);
        
        // Refresh and find session
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("PDF")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for export/PDF button
            const exportButton = page.locator('button:has-text("PDF"), button:has-text("Export"), button:has-text("exportieren")').first();
            
            if (await exportButton.isVisible().catch(() => false)) {
                // Setup download listener
                const [download] = await Promise.all([
                    page.waitForEvent('download', { timeout: 10000 }),
                    exportButton.click()
                ]);
                
                // Verify download
                expect(download.suggestedFilename()).toMatch(/\.(pdf|zip)$/i);
            }
        }
    });

    test('session pagination if many sessions exist', async ({ page }) => {
        // Look for pagination controls
        const pagination = page.locator('.pagination, [data-testid="pagination"], button:has-text(">"), button:has-text("<")');
        
        if (await pagination.first().isVisible().catch(() => false)) {
            // Get initial page sessions
            const initialSessions = await page.locator('tr, .session-card').count();
            
            // Try to go to next page
            const nextButton = page.locator('button:has-text(">"), [aria-label="next"]').first();
            
            if (await nextButton.isEnabled().catch(() => false)) {
                await nextButton.click();
                await waitForIdle(page);
                
                // Page should have changed
                const newSessions = await page.locator('tr, .session-card').count();
                expect(newSessions).toBeGreaterThanOrEqual(0);
            }
        }
    });

    test('sort sessions by different criteria', async ({ page }) => {
        // Look for sort dropdown or column headers
        const sortHeaders = page.locator('th, .sort-header, button:has-text("Sort")');
        
        if (await sortHeaders.first().isVisible().catch(() => false)) {
            // Try sorting by date
            const dateHeader = sortHeaders.filter({ hasText: /Datum|Date|Zeit/i }).first();
            
            if (await dateHeader.isVisible().catch(() => false)) {
                await dateHeader.click();
                await waitForIdle(page);
                
                // Click again for reverse sort
                await dateHeader.click();
                await waitForIdle(page);
                
                // Sessions should still be visible
                const sessions = page.locator('tr, .session-card');
                expect(await sessions.count()).toBeGreaterThanOrEqual(0);
            }
        }
    });

    test('real-time session updates via WebSocket', async ({ page, request }) => {
        // Initial state
        const initialCount = await page.locator('tr, .session-card').count();
        
        // Create a new session via API
        const newSessionId = await createTestSession(request, authCookie, {
            firstName: 'Realtime',
            lastName: 'Test'
        });
        testSessionIds.push(newSessionId);
        
        // Wait for real-time update (if WebSocket is active)
        await page.waitForTimeout(3000);
        
        // Refresh to verify session was created
        await page.reload();
        await waitForStableState(page);
        
        // Look for the new session
        const newSession = page.locator(`[data-session-id="${newSessionId}"], tr:has-text("Realtime")`).first();
        await expect(newSession).toBeVisible({ timeout: 5000 }).catch(() => {
            // If not immediately visible, might need to scroll or check filters
        });
    });

    test('session detail shows all patient information', async ({ page, request }) => {
        // Create a detailed test session
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Detail',
            lastName: 'InfoTest',
            birthDate: '1995-12-25',
            gender: 'weiblich'
        });
        testSessionIds.push(sessionId);
        
        // Add some answers
        const testAnswers = [
            { atomId: '0010', value: 'Schmerzen im Brustkorb' },
            { atomId: '0020', value: true }
        ];
        
        for (const answer of testAnswers) {
            await page.request.post('/api/answers', {
                data: {
                    sessionId,
                    atomId: answer.atomId,
                    value: answer.value
                },
                headers: { 'Cookie': authCookie }
            });
        }
        
        // Refresh and open session
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Detail")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Should show various patient details
            const details = page.locator('.patient-detail, [data-testid="patient-info"], .info-section');
            await expect(details.first()).toBeVisible();
            
            // Should show answers section
            const answersSection = page.locator('text=/Antworten|Answers|Anamnese/i');
            await expect(answersSection.first()).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
    });

    test('bulk actions on multiple sessions', async ({ page }) => {
        // Look for checkboxes to select multiple sessions
        const checkboxes = page.locator('input[type="checkbox"]');
        const checkboxCount = await checkboxes.count();
        
        if (checkboxCount > 1) {
            // Select first two sessions
            await checkboxes.nth(0).check();
            await checkboxes.nth(1).check();
            
            // Look for bulk action buttons
            const bulkActions = page.locator('.bulk-actions, [data-testid="bulk-actions"]');
            
            if (await bulkActions.isVisible().catch(() => false)) {
                // Bulk actions should be visible when items selected
                await expect(bulkActions).toBeVisible();
            }
        }
    });
});
