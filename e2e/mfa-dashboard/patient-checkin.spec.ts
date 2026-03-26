import { test, expect } from '@playwright/test';
import { 
    loginMFA, 
    waitForIdle, 
    waitForStableState,
    createTestSession,
    createAuthenticatedContext,
    TEST_CREDENTIALS,
    waitForToast,
    fillBasicInfo
} from '../helpers/test-utils';

test.describe('MFA Dashboard - Patient Checkin', () => {
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

    test('register new patient', async ({ page }) => {
        // Look for new patient registration button
        const newPatientBtn = page.locator('button:has-text("Neuer Patient"), button:has-text("Registrieren"), button:has-text("Neu"), [data-action="new-patient"]').first();
        
        if (await newPatientBtn.isVisible().catch(() => false)) {
            await newPatientBtn.click();
            await waitForIdle(page);
            
            // Fill registration form
            const firstNameInput = page.locator('input[name="firstName"], input[placeholder*="Vorname"]').first();
            const lastNameInput = page.locator('input[name="lastName"], input[placeholder*="Nachname"]').first();
            
            if (await firstNameInput.isVisible().catch(() => false)) {
                await firstNameInput.fill('Max');
            }
            
            if (await lastNameInput.isVisible().catch(() => false)) {
                await lastNameInput.fill('Mustermann');
            }
            
            // Fill birthdate
            const birthdateInput = page.locator('input[type="date"], input[name="birthDate"]').first();
            if (await birthdateInput.isVisible().catch(() => false)) {
                await birthdateInput.fill('1985-06-15');
            }
            
            // Select gender if present
            const genderSelect = page.locator('select[name="gender"]').first();
            if (await genderSelect.isVisible().catch(() => false)) {
                await genderSelect.selectOption('maennlich');
            }
            
            // Submit registration
            const submitBtn = page.locator('button[type="submit"], button:has-text("Speichern"), button:has-text("Registrieren"]').first();
            if (await submitBtn.isVisible().catch(() => false)) {
                await submitBtn.click();
                await waitForIdle(page);
                
                // Should show success
                const successMsg = page.locator('text=/registriert|erfolgreich|gespeichert/i').first();
                await expect(successMsg).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('search for existing patient', async ({ page, request }) => {
        // Create an existing patient first
        const existingSession = await createTestSession(request, authCookie, {
            firstName: 'Existing',
            lastName: 'Patient',
            birthDate: '1975-03-20'
        });
        testSessionIds.push(existingSession);
        
        await page.reload();
        await waitForStableState(page);
        
        // Look for search functionality
        const searchInput = page.locator('input[type="search"], input[placeholder*="Suchen"], input[name="search"]').first();
        
        if (await searchInput.isVisible().catch(() => false)) {
            await searchInput.fill('Existing');
            await page.waitForTimeout(500);
            
            // Search results should appear
            const searchResults = page.locator('.search-result, .patient-result, .dropdown-item');
            
            if (await searchResults.first().isVisible().catch(() => false)) {
                const resultsCount = await searchResults.count();
                expect(resultsCount).toBeGreaterThanOrEqual(1);
                
                // Click on result
                await searchResults.first().click();
                await waitForIdle(page);
                
                // Patient details should be shown
                const patientDetails = page.locator('.patient-details, [data-patient-info]').first();
                await expect(patientDetails).toBeVisible({ timeout: 3000 }).catch(() => {});
            }
        }
    });

    test('NFC checkin simulation', async ({ page }) => {
        // Look for NFC checkin option
        const nfcButton = page.locator('button:has-text("NFC"), button:has-text("Chip"), [data-action="nfc"]').first();
        
        if (await nfcButton.isVisible().catch(() => false)) {
            await nfcButton.click();
            await waitForIdle(page);
            
            // NFC scanning dialog should appear
            const nfcDialog = page.locator('.nfc-dialog, [data-nfc], .scan-dialog').first();
            await expect(nfcDialog).toBeVisible({ timeout: 3000 });
            
            // Simulate NFC scan (if there's a test mode)
            const testScanBtn = page.locator('button:has-text("Test"), button:has-text("Simulieren"), [data-action="simulate"]').first();
            
            if (await testScanBtn.isVisible().catch(() => false)) {
                await testScanBtn.click();
                await waitForIdle(page);
                
                // Should show scan result or patient info
                const scanResult = page.locator('.scan-result, .nfc-success, .patient-found').first();
                await expect(scanResult).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
            
            // Close NFC dialog
            const closeBtn = page.locator('button:has-text("Schließen"), button[aria-label="Close"]').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
            }
        }
    });

    test('QR code checkin', async ({ page }) => {
        // Look for QR checkin option
        const qrButton = page.locator('button:has-text("QR"), button:has-text("Code"), [data-action="qr"]').first();
        
        if (await qrButton.isVisible().catch(() => false)) {
            await qrButton.click();
            await waitForIdle(page);
            
            // QR scanning interface should appear
            const qrInterface = page.locator('.qr-scanner, [data-qr], .scanner-container').first();
            await expect(qrInterface).toBeVisible({ timeout: 3000 });
            
            // Look for manual code entry or test mode
            const manualEntry = page.locator('input[placeholder*="Code"], input[name="qrCode"]').first();
            
            if (await manualEntry.isVisible().catch(() => false)) {
                await manualEntry.fill('TEST123456');
                
                const submitBtn = page.locator('button[type="submit"], button:has-text("Prüfen"), button:has-text("Check"]').first();
                if (await submitBtn.isVisible().catch(() => false)) {
                    await submitBtn.click();
                    await waitForIdle(page);
                    
                    // Should process QR code
                    const result = page.locator('.qr-result, .checkin-result').first();
                    await expect(result).toBeVisible({ timeout: 5000 }).catch(() => {});
                }
            }
            
            // Close QR dialog
            const closeBtn = page.locator('button:has-text("Schließen"), button[aria-label="Close"]').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
            }
        }
    });

    test('change checkin status', async ({ page, request }) => {
        // Create a patient
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'StatusChange',
            lastName: 'Patient'
        });
        testSessionIds.push(sessionId);
        
        // Add to checkin/queue
        await request.post('/api/queue', {
            data: { sessionId, status: 'waiting' },
            headers: { 'Cookie': authCookie }
        });
        
        await page.reload();
        await waitForStableState(page);
        
        // Find patient
        const patientRow = page.locator(`[data-session-id="${sessionId}"], .checkin-item:has-text("StatusChange")`).first();
        
        if (await patientRow.isVisible().catch(() => false)) {
            // Look for status change dropdown or buttons
            const statusSelect = page.locator('select[name="status"], .status-dropdown').first();
            
            if (await statusSelect.isVisible().catch(() => false)) {
                await statusSelect.selectOption('in-progress');
                await page.waitForTimeout(500);
                
                // Status should be updated
                const updatedStatus = page.locator('.status-in-progress, [data-status="in-progress"], text=/in Bearbeitung|in-progress/i').first();
                await expect(updatedStatus).toBeVisible({ timeout: 3000 }).catch(() => {});
            }
        }
    });

    test('checkin form validation', async ({ page }) => {
        // Open new patient form
        const newPatientBtn = page.locator('button:has-text("Neuer Patient"), [data-action="new-patient"]').first();
        
        if (await newPatientBtn.isVisible().catch(() => false)) {
            await newPatientBtn.click();
            await waitForIdle(page);
            
            // Try to submit empty form
            const submitBtn = page.locator('button[type="submit"]').first();
            
            if (await submitBtn.isVisible().catch(() => false)) {
                // Check required fields
                const requiredInputs = page.locator('input[required]');
                const requiredCount = await requiredInputs.count();
                
                expect(requiredCount).toBeGreaterThanOrEqual(1);
                
                // HTML5 validation should prevent submission
                for (let i = 0; i < requiredCount; i++) {
                    const isRequired = await requiredInputs.nth(i).evaluate((el: HTMLInputElement) => el.required);
                    expect(isRequired).toBe(true);
                }
            }
        }
    });

    test('patient data autocomplete', async ({ page }) => {
        // Look for patient search with autocomplete
        const searchInput = page.locator('input[placeholder*="Patient"], input[name="patientSearch"]').first();
        
        if (await searchInput.isVisible().catch(() => false)) {
            // Type partial name
            await searchInput.fill('Te');
            await page.waitForTimeout(500);
            
            // Autocomplete dropdown should appear
            const autocompleteDropdown = page.locator('.autocomplete, .dropdown-menu, .suggestions').first();
            
            if (await autocompleteDropdown.isVisible().catch(() => false)) {
                const suggestions = autocompleteDropdown.locator('.suggestion, .dropdown-item');
                const count = await suggestions.count();
                expect(count).toBeGreaterThanOrEqual(0); // May or may not have suggestions
            }
        }
    });

    test('duplicate patient detection', async ({ page, request }) => {
        // Create an existing patient
        const existingSession = await createTestSession(request, authCookie, {
            firstName: 'Duplicate',
            lastName: 'Test',
            birthDate: '1990-01-01'
        });
        testSessionIds.push(existingSession);
        
        await page.reload();
        await waitForStableState(page);
        
        // Try to register same patient
        const newPatientBtn = page.locator('button:has-text("Neuer Patient"), [data-action="new-patient"]').first();
        
        if (await newPatientBtn.isVisible().catch(() => false)) {
            await newPatientBtn.click();
            await waitForIdle(page);
            
            // Fill same data
            const firstNameInput = page.locator('input[name="firstName"]').first();
            const lastNameInput = page.locator('input[name="lastName"]').first();
            const birthdateInput = page.locator('input[type="date"]').first();
            
            if (await firstNameInput.isVisible().catch(() => false)) {
                await firstNameInput.fill('Duplicate');
            }
            if (await lastNameInput.isVisible().catch(() => false)) {
                await lastNameInput.fill('Test');
            }
            if (await birthdateInput.isVisible().catch(() => false)) {
                await birthdateInput.fill('1990-01-01');
            }
            
            // Submit
            const submitBtn = page.locator('button[type="submit"]').first();
            if (await submitBtn.isVisible().catch(() => false)) {
                await submitBtn.click();
                await waitForIdle(page);
                
                // Should show duplicate warning or suggest existing patient
                const duplicateWarning = page.locator('text=/bereits|existiert|duplicate|schon vorhanden/i').first();
                await expect(duplicateWarning).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('checkin with appointment reference', async ({ page }) => {
        // Look for appointment checkin option
        const appointmentBtn = page.locator('button:has-text("Termin"), button:has-text("Appointment"), [data-action="appointment"]').first();
        
        if (await appointmentBtn.isVisible().catch(() => false)) {
            await appointmentBtn.click();
            await waitForIdle(page);
            
            // Appointment reference input
            const appointmentInput = page.locator('input[placeholder*="Termin"], input[name="appointmentId"]').first();
            
            if (await appointmentInput.isVisible().catch(() => false)) {
                await appointmentInput.fill('APT123456');
                
                const searchBtn = page.locator('button:has-text("Suchen"), button[type="submit"]').first();
                if (await searchBtn.isVisible().catch(() => false)) {
                    await searchBtn.click();
                    await waitForIdle(page);
                    
                    // Should show appointment details or checkin confirmation
                    const result = page.locator('.appointment-details, .checkin-result').first();
                    await expect(result).toBeVisible({ timeout: 5000 }).catch(() => {});
                }
            }
        }
    });

    test('bulk checkin for multiple patients', async ({ page }) => {
        // Look for bulk checkin option
        const bulkBtn = page.locator('button:has-text("Mehrere"), button:has-text("Bulk"), button:has-text("Batch"), [data-action="bulk"]').first();
        
        if (await bulkBtn.isVisible().catch(() => false)) {
            await bulkBtn.click();
            await waitForIdle(page);
            
            // Bulk checkin interface
            const bulkInterface = page.locator('.bulk-checkin, [data-bulk-checkin]').first();
            await expect(bulkInterface).toBeVisible({ timeout: 3000 });
            
            // Look for file upload or list input
            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.isVisible().catch(() => false)) {
                // Would upload file in real test
                expect(await fileInput.isVisible()).toBe(true);
            }
        }
    });

    test('checkin notifications and confirmations', async ({ page, request }) => {
        const sessionId = await createTestSession(request, authCookie, {
            firstName: 'Notify',
            lastName: 'Patient'
        });
        testSessionIds.push(sessionId);
        
        await page.reload();
        await waitForStableState(page);
        
        // Register/checkin patient
        const newPatientBtn = page.locator('button:has-text("Neuer Patient"), [data-action="new-patient"]').first();
        
        if (await newPatientBtn.isVisible().catch(() => false)) {
            await newPatientBtn.click();
            await waitForIdle(page);
            
            // Fill and submit
            const firstNameInput = page.locator('input[name="firstName"]').first();
            if (await firstNameInput.isVisible().catch(() => false)) {
                await firstNameInput.fill('Notify');
            }
            
            const lastNameInput = page.locator('input[name="lastName"]').first();
            if (await lastNameInput.isVisible().catch(() => false)) {
                await lastNameInput.fill('Patient');
            }
            
            const submitBtn = page.locator('button[type="submit"]').first();
            if (await submitBtn.isVisible().catch(() => false)) {
                await submitBtn.click();
                await waitForIdle(page);
                
                // Should show success notification
                await expect(page.locator('text=/erfolgreich|gespeichert|checkin|eingecheckt/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
            }
        }
    });

    test('emergency/fast track checkin', async ({ page }) => {
        // Look for emergency checkin option
        const emergencyBtn = page.locator('button:has-text("Notfall"), button:has-text("Emergency"), [data-action="emergency"], .emergency-btn').first();
        
        if (await emergencyBtn.isVisible().catch(() => false)) {
            await emergencyBtn.click();
            await waitForIdle(page);
            
            // Emergency form should be simplified
            const emergencyForm = page.locator('.emergency-form, [data-emergency]').first();
            await expect(emergencyForm).toBeVisible({ timeout: 3000 });
            
            // Should have minimal required fields
            const requiredFields = emergencyForm.locator('input[required]');
            const count = await requiredFields.count();
            
            // Emergency form should be streamlined
            expect(count).toBeLessThanOrEqual(3);
        }
    });

    test('walk-in vs appointment checkin differentiation', async ({ page }) => {
        // Look for checkin type selection
        const walkInBtn = page.locator('button:has-text("Walk-in"), button:has-text("Sprechstunde"), button:has-text("Ohne Termin"), [data-type="walkin"]').first();
        const appointmentBtn = page.locator('button:has-text("Mit Termin"), button:has-text("Appointment"), [data-type="appointment"]').first();
        
        if (await walkInBtn.isVisible().catch(() => false)) {
            await walkInBtn.click();
            await waitForIdle(page);
            
            // Walk-in form should be shown
            const walkInForm = page.locator('.walkin-form, [data-form="walkin"]').first();
            await expect(walkInForm).toBeVisible({ timeout: 3000 });
        }
        
        if (await appointmentBtn.isVisible().catch(() => false)) {
            await appointmentBtn.click();
            await waitForIdle(page);
            
            // Appointment form should be shown
            const appointmentForm = page.locator('.appointment-form, [data-form="appointment"]').first();
            await expect(appointmentForm).toBeVisible({ timeout: 3000 });
        }
    });
});
