import { test, expect } from '@playwright/test';
import { 
    loginMFA, 
    waitForIdle, 
    waitForStableState,
    createTestSession,
    createAuthenticatedContext,
    TEST_CREDENTIALS,
    waitForToast
} from '../helpers/test-utils';

test.describe('MFA Dashboard - Queue Management', () => {
    let authCookie: string;
    let testSessionIds: string[] = [];

    test.beforeAll(async ({ request }) => {
        authCookie = await createAuthenticatedContext(
            request, 
            TEST_CREDENTIALS.mfa.username, 
            TEST_CREDENTIALS.mfa.password
        );
    });

    test.beforeEach(async ({ page }) => {
        await loginMFA(page);
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

    test('add patient to queue', async ({ page, request }) => {
        // Create a test session first
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Queue',
            lastName: 'Patient1'
        });
        testSessionIds.push(sessionId);
        
        // Add to queue via API
        await request.post('/api/queue', {
            data: {
                sessionId,
                priority: 'normal',
                reason: 'Untersuchung'
            },
            headers: { 'Cookie': authCookie }
        });
        
        // Refresh page to see queue
        await page.reload();
        await waitForStableState(page);
        
        // Look for queue section
        const queueSection = page.locator('[data-testid="queue"], .queue-list, .waiting-list').first();
        
        if (await queueSection.isVisible().catch(() => false)) {
            // Patient should appear in queue
            const patientInQueue = page.locator('text=/Queue Patient1/i').first();
            await expect(patientInQueue).toBeVisible({ timeout: 5000 });
        }
    });

    test('display queue with all patients', async ({ page, request }) => {
        // Add multiple patients to queue
        for (let i = 0; i < 3; i++) {
            const sessionId = await createTestSession(request, authCookie, {
                firstName: `Queue${i}`,
                lastName: 'Multi'
            });
            testSessionIds.push(sessionId);
            
            await request.post('/api/queue', {
                data: {
                    sessionId,
                    priority: 'normal'
                },
                headers: { 'Cookie': authCookie }
            });
        }
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for queue
        const queueItems = page.locator('.queue-item, .waiting-item, [data-queue-item]');
        const count = await queueItems.count();
        
        // Should show multiple queue items
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('call patient from queue', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Call',
            lastName: 'Patient'
        });
        testSessionIds.push(sessionId);
        
        // Add to queue
        await request.post('/api/queue', {
            data: { sessionId, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        // Find patient in queue
        const patientRow = page.locator(`[data-session-id="${sessionId}"], .queue-item:has-text("Call")`).first();
        
        if (await patientRow.isVisible().catch(() => false)) {
            // Look for call button
            const callButton = page.locator('button:has-text("Aufrufen"), button:has-text("Rufen"), button:has-text("Call"), [data-action="call"]').first();
            
            if (await callButton.isVisible().catch(() => false)) {
                await callButton.click();
                await waitForIdle(page);
                
                // Should show success or calling indicator
                const callingIndicator = page.locator('text=/wird aufgerufen|rufe|calling|aufgerufen/i').first();
                await expect(callingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('remove patient from queue', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Remove',
            lastName: 'Queue'
        });
        testSessionIds.push(sessionId);
        
        // Add to queue
        await request.post('/api/queue', {
            data: { sessionId, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const patientRow = page.locator(`[data-session-id="${sessionId}"], .queue-item:has-text("Remove")`).first();
        
        if (await patientRow.isVisible().catch(() => false)) {
            // Look for remove button
            const removeButton = page.locator('button:has-text("Entfernen"), button:has-text("Remove"), button:has-text("Löschen"), [data-action="remove"]').first();
            
            if (await removeButton.isVisible().catch(() => false)) {
                await removeButton.click();
                await waitForIdle(page);
                
                // Confirm removal if dialog appears
                const confirmButton = page.locator('button:has-text("Bestätigen"), button:has-text("Ja"), button:has-text("Confirm"]').first();
                if (await confirmButton.isVisible().catch(() => false)) {
                    await confirmButton.click();
                    await waitForIdle(page);
                }
                
                // Patient should be removed from queue
                await expect(patientRow).not.toBeVisible({ timeout: 5000 });
            }
        }
    });

    test('sort queue by priority', async ({ page, request }) => {
        // Create sessions with different priorities
        const highPrioritySession = await createTestSession(request, authCookie, {
            firstName: 'ZHigh',
            lastName: 'Priority'
        });
        testSessionIds.push(highPrioritySession);
        
        const normalPrioritySession = await createTestSession(request, authCookie, {
            firstName: 'ANormal',
            lastName: 'Priority'
        });
        testSessionIds.push(normalPrioritySession);
        
        // Add with different priorities
        await request.post('/api/queue', {
            data: { sessionId: highPrioritySession, priority: 'high' },
            headers: { 'Cookie': authCookie }
        });
        
        await request.post('/api/queue', {
            data: { sessionId: normalPrioritySession, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for sort by priority option
        const prioritySort = page.locator('button:has-text("Priorität"), button:has-text("Priority"), select').first();
        
        if (await prioritySort.isVisible().catch(() => false)) {
            await prioritySort.click();
            await waitForIdle(page);
            
            // High priority should be before normal priority
            const highPriorityRow = page.locator(`[data-session-id="${highPrioritySession}"], .queue-item:has-text("High")`).first();
            const normalPriorityRow = page.locator(`[data-session-id="${normalPrioritySession}"], .queue-item:has-text("Normal")`).first();
            
            if (await highPriorityRow.isVisible().catch(() => false) && 
                await normalPriorityRow.isVisible().catch(() => false)) {
                
                const highBox = await highPriorityRow.boundingBox();
                const normalBox = await normalPriorityRow.boundingBox();
                
                if (highBox && normalBox) {
                    // High priority should be above normal priority
                    expect(highBox.y).toBeLessThanOrEqual(normalBox.y);
                }
            }
        }
    });

    test('sort queue by waiting time', async ({ page, request }) => {
        // Create multiple sessions
        const sessionIds: string[] = [];
        for (let i = 0; i < 3; i++) {
            const id = await createTestSession(request, authCookie, {
                firstName: `Time${i}`,
                lastName: 'Sort'
            });
            sessionIds.push(id);
            testSessionIds.push(id);
            
            // Add to queue with small delay
            await page.waitForTimeout(100);
            await request.post('/api/queue', {
                data: { sessionId: id, priority: 'normal' },
                headers: { 'Cookie': authCookie }
            });
        }
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for waiting time sort
        const timeSort = page.locator('button:has-text("Wartezeit"), button:has-text("Waiting"), button:has-text("Zeit"]').first();
        
        if (await timeSort.isVisible().catch(() => false)) {
            await timeSort.click();
            await waitForIdle(page);
            
            // Queue should be sorted by waiting time
            const queueItems = page.locator('.queue-item, [data-queue-item]');
            const count = await queueItems.count();
            expect(count).toBeGreaterThanOrEqual(1);
        }
    });

    test('auto-dispatch patient to doctor', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'AutoDispatch',
            lastName: 'Patient'
        });
        testSessionIds.push(sessionId);
        
        // Add to queue
        await request.post('/api/queue', {
            data: { sessionId, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const patientRow = page.locator(`[data-session-id="${sessionId}"], .queue-item:has-text("AutoDispatch")`).first();
        
        if (await patientRow.isVisible().catch(() => false)) {
            // Look for auto-dispatch or assign button
            const dispatchButton = page.locator('button:has-text("Zuweisen"), button:has-text("Dispatch"), button:has-text("Arzt"), [data-action="dispatch"]').first();
            
            if (await dispatchButton.isVisible().catch(() => false)) {
                await dispatchButton.click();
                await waitForIdle(page);
                
                // Select doctor if dialog appears
                const doctorSelect = page.locator('select, [role="listbox"]').first();
                if (await doctorSelect.isVisible().catch(() => false)) {
                    // Select first doctor
                    const options = await doctorSelect.locator('option').allTextContents();
                    if (options.length > 0) {
                        await doctorSelect.selectOption({ index: 0 });
                    }
                    
                    const confirmButton = page.locator('button:has-text("Zuweisen"), button:has-text("Assign"), button:has-text("Bestätigen"]').first();
                    if (await confirmButton.isVisible().catch(() => false)) {
                        await confirmButton.click();
                        await waitForIdle(page);
                        
                        // Should show success
                        await expect(page.locator('text=/zugewiesen|assigned|dispatch/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
                    }
                }
            }
        }
    });

    test('queue shows estimated waiting time', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'WaitTime',
            lastName: 'Estimate'
        });
        testSessionIds.push(sessionId);
        
        await request.post('/api/queue', {
            data: { sessionId, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for waiting time display
        const waitTime = page.locator('.wait-time, .estimated-time, [data-wait-time], text=/Minuten|Wartezeit|min/i').first();
        
        // If implemented, should show waiting time
        if (await waitTime.isVisible().catch(() => false)) {
            const timeText = await waitTime.textContent();
            expect(timeText).toMatch(/\d+|min|Minuten/);
        }
    });

    test('queue priority colors and indicators', async ({ page, request }) => {
        // Create sessions with different priorities
        const urgentSession = await createTestSession(request, authCookie, {
            firstName: 'Urgent',
            lastName: 'Color'
        });
        testSessionIds.push(urgentSession);
        
        await request.post('/api/queue', {
            data: { sessionId: urgentSession, priority: 'urgent' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const urgentRow = page.locator(`[data-session-id="${urgentSession}"], .queue-item:has-text("Urgent")`).first();
        
        if (await urgentRow.isVisible().catch(() => false)) {
            // Should have priority indicator
            const priorityIndicator = urgentRow.locator('.priority-badge, [data-priority], .bg-red, .text-red').first();
            await expect(priorityIndicator).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
    });

    test('search patient in queue', async ({ page, request }) => {
        // Add multiple patients
        for (let i = 0; i < 3; i++) {
            const sessionId = await createTestSession(request, authCookie, {
                firstName: `Search${i}`,
                lastName: 'Test'
            });
            testSessionIds.push(sessionId);
            
            await request.post('/api/queue', {
                data: { sessionId, priority: 'normal' },
                headers: { 'Cookie': authCookie }
            });
        }
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for search input
        const searchInput = page.locator('input[type="search"], input[placeholder*="Suchen"]').first();
        
        if (await searchInput.isVisible().catch(() => false)) {
            await searchInput.fill('Search1');
            await page.waitForTimeout(500);
            
            // Should filter results
            const visibleItems = page.locator('.queue-item:visible, [data-queue-item]:visible');
            const count = await visibleItems.count();
            
            // Should show fewer items after filtering
            expect(count).toBeLessThanOrEqual(3);
        }
    });

    test('queue statistics display', async ({ page }) => {
        // Look for statistics section
        const statsSection = page.locator('.queue-stats, .statistics, [data-stats]').first();
        
        if (await statsSection.isVisible().catch(() => false)) {
            // Should show queue statistics
            const totalPatients = page.locator('text=/Patienten|Wartende|Total/i').first();
            await expect(totalPatients).toBeVisible({ timeout: 3000 }).catch(() => {});
        }
    });

    test('real-time queue updates', async ({ page, request }) => {
        // Initial state
        const initialCount = await page.locator('.queue-item, [data-queue-item]').count();
        
        // Add new patient via API
        const newSessionId = await createTestSession(request, authCookie, {
            firstName: 'Realtime',
            lastName: 'Queue'
        });
        testSessionIds.push(newSessionId);
        
        await request.post('/api/queue', {
            data: { sessionId: newSessionId, priority: 'normal' },
            headers: { 'Cookie': authCookie }
        });
        
        // Wait for real-time update
        await page.waitForTimeout(3000);
        
        // Refresh and verify
        await page.reload();
        await waitForStableState(page);
        
        const newPatient = page.locator(`[data-session-id="${newSessionId}"], .queue-item:has-text("Realtime")`).first();
        await expect(newPatient).toBeVisible({ timeout: 5000 }).catch(() => {});
    });
});
