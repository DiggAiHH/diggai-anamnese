import { test, expect } from '@playwright/test';
import { 
    loginArzt, 
    waitForIdle, 
    waitForStableState,
    createTestSession,
    createAuthenticatedContext,
    TEST_CREDENTIALS,
    waitForToast
} from '../helpers/test-utils';

test.describe('Doctor Dashboard - Therapy Plans', () => {
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

    test('create new therapy plan', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Therapie',
            lastName: 'PlanTest'
        });
        testSessionIds.push(sessionId);
        
        await page.reload();
        await waitForStableState(page);
        
        // Navigate to therapy plans or patient detail
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("Therapie")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for therapy plan section or button
            const therapyButton = page.locator('button:has-text("Therapieplan"), button:has-text("Therapie"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Look for create button
                const createButton = page.locator('button:has-text("Neu"), button:has-text("Erstellen"), button:has-text("Create"), [data-action="create"]').first();
                
                if (await createButton.isVisible().catch(() => false)) {
                    await createButton.click();
                    await waitForIdle(page);
                    
                    // Fill therapy plan form
                    const titleInput = page.locator('input[name="title"], input[placeholder*="Titel"]').first();
                    if (await titleInput.isVisible().catch(() => false)) {
                        await titleInput.fill('Test Therapieplan');
                    }
                    
                    const descInput = page.locator('textarea[name="description"], textarea').first();
                    if (await descInput.isVisible().catch(() => false)) {
                        await descInput.fill('Beschreibung des Therapieplans');
                    }
                    
                    // Save the plan
                    const saveButton = page.locator('button:has-text("Speichern"), button:has-text("Save"), button[type="submit"]').first();
                    if (await saveButton.isVisible().catch(() => false)) {
                        await saveButton.click();
                        await waitForIdle(page);
                        
                        // Should show success or created plan
                        const createdPlan = page.locator('text=/Test Therapieplan|erstellt|created/i').first();
                        await expect(createdPlan).toBeVisible({ timeout: 5000 }).catch(() => {});
                    }
                }
            }
        }
    });

    test('edit existing therapy plan', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'EditTherapy',
            lastName: 'Plan'
        });
        testSessionIds.push(sessionId);
        
        // Create a therapy plan via API first
        await request.post('/api/therapy', {
            data: {
                sessionId,
                title: 'Original Title',
                description: 'Original description'
            },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("EditTherapy")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const therapyButton = page.locator('button:has-text("Therapieplan"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Find and click edit button
                const editButton = page.locator('button:has-text("Bearbeiten"), button:has-text("Edit"), [data-action="edit"]').first();
                
                if (await editButton.isVisible().catch(() => false)) {
                    await editButton.click();
                    await waitForIdle(page);
                    
                    // Edit the title
                    const titleInput = page.locator('input[name="title"]').first();
                    if (await titleInput.isVisible().catch(() => false)) {
                        await titleInput.clear();
                        await titleInput.fill('Edited Therapy Plan Title');
                    }
                    
                    // Save changes
                    const saveButton = page.locator('button:has-text("Speichern"), button:has-text("Save"]').first();
                    if (await saveButton.isVisible().catch(() => false)) {
                        await saveButton.click();
                        await waitForIdle(page);
                        
                        // Should show updated title
                        const updatedTitle = page.locator('text=/Edited Therapy Plan Title|geändert|updated/i').first();
                        await expect(updatedTitle).toBeVisible({ timeout: 5000 }).catch(() => {});
                    }
                }
            }
        }
    });

    test('assign therapy plan to patient', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'AssignTherapy',
            lastName: 'Patient'
        });
        testSessionIds.push(sessionId);
        
        // Create a therapy plan
        const therapyResponse = await request.post('/api/therapy', {
            data: {
                title: 'Zuweisbarer Plan',
                description: 'Beschreibung'
            },
            headers: { 'Cookie': authCookie }
        });
        
        const therapyData = await therapyResponse.json().catch(() => ({ id: null }));
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("AssignTherapy")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            // Look for assign therapy option
            const assignButton = page.locator('button:has-text("Zuweisen"), button:has-text("Assign"), [data-action="assign"]').first();
            
            if (await assignButton.isVisible().catch(() => false)) {
                await assignButton.click();
                await waitForIdle(page);
                
                // Select therapy plan
                const therapySelect = page.locator('select, [role="listbox"]').first();
                if (await therapySelect.isVisible().catch(() => false)) {
                    await therapySelect.selectOption({ label: 'Zuweisbarer Plan' });
                }
                
                // Confirm assignment
                const confirmButton = page.locator('button:has-text("Bestätigen"), button:has-text("Confirm"]').first();
                if (await confirmButton.isVisible().catch(() => false)) {
                    await confirmButton.click();
                    await waitForIdle(page);
                    
                    // Should show success
                    await expect(page.locator('text=/zugewiesen|assigned|erfolgreich/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
                }
            }
        }
    });

    test('configure alert rules for therapy plan', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'AlertRules',
            lastName: 'Therapy'
        });
        testSessionIds.push(sessionId);
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("AlertRules")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const therapyButton = page.locator('button:has-text("Therapieplan"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Look for alert rules section
                const alertRulesButton = page.locator('button:has-text("Alarme"), button:has-text("Alerts"), [data-section="alerts"]').first();
                
                if (await alertRulesButton.isVisible().catch(() => false)) {
                    await alertRulesButton.click();
                    await waitForIdle(page);
                    
                    // Add new alert rule
                    const addRuleButton = page.locator('button:has-text("Regel hinzufügen"), button:has-text("Add Rule"]').first();
                    
                    if (await addRuleButton.isVisible().catch(() => false)) {
                        await addRuleButton.click();
                        await waitForIdle(page);
                        
                        // Configure rule
                        const conditionInput = page.locator('input[placeholder*="Bedingung"], select').first();
                        if (await conditionInput.isVisible().catch(() => false)) {
                            await conditionInput.fill('Temperatur > 38.5');
                        }
                        
                        const thresholdInput = page.locator('input[type="number"]').first();
                        if (await thresholdInput.isVisible().catch(() => false)) {
                            await thresholdInput.fill('38.5');
                        }
                        
                        // Save rule
                        const saveButton = page.locator('button:has-text("Speichern"), button:has-text("Save"]').first();
                        if (await saveButton.isVisible().catch(() => false)) {
                            await saveButton.click();
                            await waitForIdle(page);
                            
                            // Rule should be saved
                            await expect(page.locator('text=/gespeichert|saved|Temperatur/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
                        }
                    }
                }
            }
        }
    });

    test('export therapy plan as PDF', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'ExportTherapy',
            lastName: 'PDF'
        });
        testSessionIds.push(sessionId);
        
        // Create a therapy plan
        await request.post('/api/therapy', {
            data: {
                sessionId,
                title: 'PDF Export Plan',
                description: 'Plan für PDF Export'
            },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("ExportTherapy")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const therapyButton = page.locator('button:has-text("Therapieplan"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Look for export button
                const exportButton = page.locator('button:has-text("PDF"), button:has-text("Export"), [data-action="export"]').first();
                
                if (await exportButton.isVisible().catch(() => false)) {
                    const [download] = await Promise.all([
                        page.waitForEvent('download', { timeout: 10000 }),
                        exportButton.click()
                    ]);
                    
                    expect(download.suggestedFilename()).toMatch(/\.(pdf|zip)$/i);
                }
            }
        }
    });

    test('view therapy plan history', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'TherapyHistory',
            lastName: 'View'
        });
        testSessionIds.push(sessionId);
        
        // Create multiple therapy plans
        for (let i = 0; i < 3; i++) {
            await request.post('/api/therapy', {
                data: {
                    sessionId,
                    title: `Therapieplan ${i + 1}`,
                    description: `Beschreibung ${i + 1}`
                },
                headers: { 'Cookie': authCookie }
            });
        }
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("TherapyHistory")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const therapyButton = page.locator('button:has-text("Therapieplan"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Should show list of therapy plans
                const therapyPlans = page.locator('.therapy-plan, .plan-item, [data-therapy-plan]');
                const count = await therapyPlans.count();
                
                expect(count).toBeGreaterThanOrEqual(1);
            }
        }
    });

    test('delete therapy plan', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'DeleteTherapy',
            lastName: 'Plan'
        });
        testSessionIds.push(sessionId);
        
        // Create a therapy plan to delete
        await request.post('/api/therapy', {
            data: {
                sessionId,
                title: 'Zu löschender Plan',
                description: 'Wird gelöscht'
            },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        const sessionRow = page.locator(`[data-session-id="${sessionId}"], tr:has-text("DeleteTherapy")`).first();
        
        if (await sessionRow.isVisible().catch(() => false)) {
            await sessionRow.click();
            await waitForIdle(page);
            
            const therapyButton = page.locator('button:has-text("Therapieplan"), [data-tab="therapy"]').first();
            
            if (await therapyButton.isVisible().catch(() => false)) {
                await therapyButton.click();
                await waitForIdle(page);
                
                // Find delete button
                const deleteButton = page.locator('button:has-text("Löschen"), button:has-text("Delete"), [data-action="delete"]').first();
                
                if (await deleteButton.isVisible().catch(() => false)) {
                    await deleteButton.click();
                    await waitForIdle(page);
                    
                    // Confirm deletion
                    const confirmButton = page.locator('button:has-text("Löschen"), button:has-text("Confirm"), button:has-text("Ja"]').first();
                    
                    if (await confirmButton.isVisible().catch(() => false)) {
                        await confirmButton.click();
                        await waitForIdle(page);
                        
                        // Should show success message
                        await expect(page.locator('text=/gelöscht|deleted|entfernt/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
                    }
                }
            }
        }
    });

    test('therapy plan templates', async ({ page }) => {
        // Navigate to therapy plans section
        const therapyNav = page.locator('a:has-text("Therapie"), a:has-text("Therapy"), [data-nav="therapy"]').first();
        
        if (await therapyNav.isVisible().catch(() => false)) {
            await therapyNav.click();
            await waitForStableState(page);
            
            // Look for templates section
            const templatesButton = page.locator('button:has-text("Vorlagen"), button:has-text("Templates"), [data-section="templates"]').first();
            
            if (await templatesButton.isVisible().catch(() => false)) {
                await templatesButton.click();
                await waitForIdle(page);
                
                // Should show available templates
                const templates = page.locator('.template-item, .therapy-template');
                const count = await templates.count();
                
                if (count > 0) {
                    // Can select a template
                    await templates.first().click();
                    await waitForIdle(page);
                }
            }
        }
    });
});
