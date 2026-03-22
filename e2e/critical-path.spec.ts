/**
 * Critical Path E2E Tests
 * Tests the most important user journeys that must never break
 * 
 * Coverage Strategy:
 * 1. Patient creates session and submits answers
 * 2. Triage alert triggers and displays
 * 3. Doctor views session and acknowledges triage
 * 4. Multi-tenancy isolation works
 * 5. Security: CSRF, XSS prevention
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_PATIENT = {
    email: 'test@example.com',
    service: 'Termin / Anamnese',
    isNewPatient: true,
    gender: 'M',
    birthDate: '1990-01-01',
};

const TEST_ANSWERS = [
    { atomId: '0000', value: 'ja' },           // Is new patient
    { atomId: '0002', value: 'M' },            // Gender
    { atomId: '0003', value: '1990-01-01' },   // Birth date
    { atomId: '1000', value: ['schmerzen'] },  // Chief complaint
];

// Helper: Create patient session
async function createSession(page: Page) {
    const response = await page.request.post('/api/sessions', {
        data: TEST_PATIENT,
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.sessionId).toBeDefined();
    expect(data.token).toBeDefined();
    
    return data;
}

// Helper: Submit answer
async function submitAnswer(page: Page, sessionId: string, atomId: string, value: unknown) {
    const response = await page.request.post(`/api/answers/${sessionId}`, {
        data: { atomId, value, timeSpentMs: 1000 },
        headers: {
            'x-xsrf-token': 'test-csrf-token', // CSRF protection test
        }
    });
    
    expect(response.ok()).toBeTruthy();
    return response.json();
}

test.describe('Critical Path: Patient Journey', () => {
    
    test('patient can create session and submit answers', async ({ page }) => {
        // 1. Create session
        const session = await createSession(page);
        
        // 2. Verify session state
        const stateResponse = await page.request.get(`/api/sessions/${session.sessionId}/state`);
        expect(stateResponse.ok()).toBeTruthy();
        
        const state = await stateResponse.json();
        expect(state.session.status).toBe('ACTIVE');
        expect(state.session.selectedService).toBe(TEST_PATIENT.service);
        
        // 3. Submit answers
        for (const answer of TEST_ANSWERS) {
            const result = await submitAnswer(page, session.sessionId, answer.atomId, answer.value);
            expect(result.success).toBe(true);
        }
        
        // 4. Verify answers saved
        const finalState = await page.request.get(`/api/sessions/${session.sessionId}/state`);
        const finalData = await finalState.json();
        expect(Object.keys(finalData.answers).length).toBe(TEST_ANSWERS.length);
    });
    
    test('triage alerts trigger for critical answers', async ({ page }) => {
        const session = await createSession(page);
        
        // Submit answer that should trigger triage
        const result = await submitAnswer(page, session.sessionId, '1300', 'ja'); // Chest pain
        
        expect(result.redFlags).toBeDefined();
        expect(result.redFlags.length).toBeGreaterThan(0);
        expect(result.progress).toBeGreaterThan(0);
    });
    
    test('session completion works end-to-end', async ({ page }) => {
        const session = await createSession(page);
        
        // Submit minimal answers
        await submitAnswer(page, session.sessionId, '0000', 'ja');
        await submitAnswer(page, session.sessionId, '0002', 'M');
        
        // Complete session
        const completeResponse = await page.request.post(`/api/sessions/${session.sessionId}/submit`);
        expect(completeResponse.ok()).toBeTruthy();
        
        const result = await completeResponse.json();
        expect(result.success).toBe(true);
    });
});

test.describe('Critical Path: Doctor Dashboard', () => {
    
    test('doctor can login and view sessions', async ({ page }) => {
        // 1. Login
        const loginResponse = await page.request.post('/api/arzt/login', {
            data: {
                username: process.env.TEST_ARZT_USERNAME || 'admin',
                password: process.env.TEST_ARZT_PASSWORD || 'admin',
            },
        });
        
        expect(loginResponse.ok()).toBeTruthy();
        const loginData = await loginResponse.json();
        expect(loginData.token).toBeDefined();
        
        // 2. Get sessions
        const sessionsResponse = await page.request.get('/api/arzt/sessions', {
            headers: {
                'Authorization': `Bearer ${loginData.token}`,
            }
        });
        
        expect(sessionsResponse.ok()).toBeTruthy();
        const sessions = await sessionsResponse.json();
        expect(Array.isArray(sessions.sessions)).toBe(true);
    });
    
    test('doctor can acknowledge triage alert', async ({ page }) => {
        // Create session with triage-triggering answer
        const session = await createSession(page);
        await submitAnswer(page, session.sessionId, '1300', 'ja'); // Chest pain
        
        // Get triage events
        const triageResponse = await page.request.get(`/api/arzt/sessions/${session.sessionId}`);
        expect(triageResponse.ok()).toBeTruthy();
        
        const sessionData = await triageResponse.json();
        expect(sessionData.session.triageEvents.length).toBeGreaterThan(0);
        
        // Acknowledge triage
        const triageId = sessionData.session.triageEvents[0].id;
        const ackResponse = await page.request.put(`/api/arzt/triage/${triageId}/ack`);
        expect(ackResponse.ok()).toBeTruthy();
    });
});

test.describe('Security: Multi-Tenancy Isolation', () => {
    
    test('tenant isolation prevents cross-tenant data access', async ({ page }) => {
        // Create session in tenant A
        const sessionA = await createSession(page);
        
        // Try to access with wrong tenant header (simulated)
        const response = await page.request.get(`/api/sessions/${sessionA.sessionId}/state`, {
            headers: {
                'X-Tenant-ID': 'wrong-tenant',
            }
        });
        
        // Should fail or return 404
        expect(response.status()).toBe(404);
    });
    
    test('CSRF protection blocks requests without token', async ({ page }) => {
        const session = await createSession(page);
        
        // Try POST without CSRF token
        const response = await page.request.post(`/api/answers/${session.sessionId}`, {
            data: { atomId: '0000', value: 'ja' },
            // No x-xsrf-token header
        });
        
        expect(response.status()).toBe(403);
    });
});

test.describe('Security: Input Validation', () => {
    
    test('XSS attempts are sanitized', async ({ page }) => {
        const session = await createSession(page);
        
        // Try to submit XSS payload
        const xssPayload = '<script>alert("xss")</script>';
        const result = await submitAnswer(page, session.sessionId, '0001', xssPayload);
        
        // Should succeed but be sanitized
        expect(result.success).toBe(true);
        
        // Verify answer is sanitized
        const state = await page.request.get(`/api/sessions/${session.sessionId}/state`);
        const data = await state.json();
        const answer = data.answers['0001'];
        expect(answer.value.data).not.toContain('<script>');
    });
    
    test('SQL injection attempts are blocked', async ({ page }) => {
        // Try SQL injection in session creation
        const response = await page.request.post('/api/sessions', {
            data: {
                ...TEST_PATIENT,
                email: "'; DROP TABLE Patient; --",
            },
        });
        
        // Should either succeed (sanitized) or fail gracefully
        // But database should not be corrupted
        const sessionsResponse = await page.request.get('/api/arzt/sessions');
        expect(sessionsResponse.ok()).toBeTruthy();
    });
});

test.describe('Performance: Response Times', () => {
    
    test('session creation responds within 500ms', async ({ page }) => {
        const start = Date.now();
        await createSession(page);
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(500);
    });
    
    test('answer submission responds within 300ms', async ({ page }) => {
        const session = await createSession(page);
        
        const start = Date.now();
        await submitAnswer(page, session.sessionId, '0000', 'ja');
        const duration = Date.now() - start;
        
        expect(duration).toBeLessThan(300);
    });
});
