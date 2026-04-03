/**
 * Tomedo Bridge E2E Tests
 * 
 * @phase PHASE_5_TESTS
 */

import { test, expect } from '@playwright/test';

test.describe('Tomedo Bridge', () => {
  test.beforeEach(async ({ page }) => {
    // Login as arzt
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'test-password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should execute bridge successfully', async ({ page }) => {
    // Navigate to PVS settings with Tomedo connection
    await page.goto('/settings/pvs');
    
    // Select Tomedo connection
    await page.selectOption('[data-testid="pvs-type-select"]', 'TOMEDO');
    
    // Fill connection details
    await page.fill('[data-testid="fhir-base-url"]', 'https://api.tomedo.test/fhir/R4');
    await page.fill('[data-testid="client-id"]', 'test-client-id');
    await page.fill('[data-testid="client-secret"]', 'test-client-secret');
    
    // Save connection
    await page.click('[data-testid="save-connection-button"]');
    await page.waitForSelector('[data-testid="connection-saved-toast"]');

    // Navigate to patient session
    await page.goto('/sessions/test-session-123');
    
    // Open Tomedo Bridge panel
    await page.click('[data-testid="tomedo-bridge-button"]');
    
    // Execute bridge
    await page.click('[data-testid="execute-bridge-button"]');
    
    // Wait for execution to complete
    await page.waitForSelector('[data-testid="bridge-success"]');
    
    // Verify success indicators
    await expect(page.locator('[data-testid="bridge-status"]')).toContainText('OK');
    await expect(page.locator('[data-testid="tomedo-sync-status"]')).toContainText('synced');
  });

  test('should show DLQ when sync fails', async ({ page }) => {
    // Navigate to Tomedo Bridge with simulated failure
    await page.goto('/sessions/test-session-456');
    await page.click('[data-testid="tomedo-bridge-button"]');
    
    // Execute bridge with offline mode (simulated)
    await page.click('[data-testid="execute-bridge-button"]');
    
    // Switch to DLQ tab
    await page.click('[data-testid="dlq-tab"]');
    
    // Verify DLQ items are shown
    await expect(page.locator('[data-testid="dlq-item"]')).toBeVisible();
    
    // Retry DLQ item
    await page.click('[data-testid="retry-dlq-item-button"]');
    
    // Verify retry attempt
    await expect(page.locator('[data-testid="dlq-retry-count"]')).toContainText('1');
  });

  test('should display real-time updates via WebSocket', async ({ page }) => {
    await page.goto('/sessions/test-session-789');
    await page.click('[data-testid="tomedo-bridge-button"]');
    
    // Start bridge execution
    await page.click('[data-testid="execute-bridge-button"]');
    
    // Verify real-time progress updates
    await expect(page.locator('[data-testid="team-alpha-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="team-bravo-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="team-charlie-status"]')).toContainText('completed');
    await expect(page.locator('[data-testid="team-delta-status"]')).toContainText('completed');
  });

  test('should show connection status', async ({ page }) => {
    await page.goto('/settings/pvs');
    
    // Click test connection
    await page.click('[data-testid="test-connection-button"]');
    
    // Verify connection status is shown
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-latency"]')).toBeVisible();
  });

  test('should download protocol', async ({ page }) => {
    await page.goto('/sessions/test-session-123');
    await page.click('[data-testid="tomedo-bridge-button"]');
    
    // Execute bridge first
    await page.click('[data-testid="execute-bridge-button"]');
    await page.waitForSelector('[data-testid="bridge-success"]');
    
    // Switch to protocol tab
    await page.click('[data-testid="protocol-tab"]');
    
    // Click download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="download-protocol-button"]'),
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/tomedo-bridge-.*\.md/);
  });
});

test.describe('Tomedo Bridge API', () => {
  test('should get DLQ items via API', async ({ request }) => {
    // Login first
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        username: 'admin',
        password: 'test-password',
      },
    });
    expect(loginResponse.ok()).toBeTruthy();

    // Get DLQ
    const response = await request.get('/api/tomedo-bridge/dlq');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.items).toBeDefined();
    expect(data.stats).toBeDefined();
  });

  test('should retry DLQ via API', async ({ request }) => {
    // Login
    await request.post('/api/auth/login', {
      data: {
        username: 'admin',
        password: 'test-password',
      },
    });

    // Retry all DLQ items
    const response = await request.post('/api/tomedo-bridge/dlq/retry');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.result).toBeDefined();
  });

  test('should test connection via API', async ({ request }) => {
    // Login
    await request.post('/api/auth/login', {
      data: {
        username: 'admin',
        password: 'test-password',
      },
    });

    // Test connection
    const response = await request.get('/api/tomedo-bridge/connection/test-conn-1/status');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.connection).toBeDefined();
    expect(data.connection.status).toMatch(/ONLINE|OFFLINE|DEGRADED/);
  });
});
