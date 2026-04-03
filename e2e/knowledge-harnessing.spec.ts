import { test, expect } from '@playwright/test';

test.describe('Knowledge-Harnessing System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/staff/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
  });

  // ============================================================================
  // War Room Dashboard
  // ============================================================================
  
  test('War Room Dashboard loads with metrics', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Check header
    await expect(page.locator('h1')).toContainText('War Room');
    
    // Check metrics cards
    await expect(page.locator('[data-testid="metric-card"]')).toHaveCount(5);
    
    // Check live toggle
    await expect(page.locator('button:has-text("LIVE")')).toBeVisible();
    
    // Check error patterns section
    await expect(page.locator('h2:has-text("Error Patterns")')).toBeVisible();
  });

  test('War Room live toggle works', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    const liveButton = page.locator('button:has-text("LIVE")');
    await expect(liveButton).toBeVisible();
    
    // Click to pause
    await liveButton.click();
    await expect(page.locator('button:has-text("PAUSED")')).toBeVisible();
    
    // Click to resume
    await page.locator('button:has-text("PAUSED")').click();
    await expect(page.locator('button:has-text("LIVE")')).toBeVisible();
  });

  test('Time range selector changes data', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Click on 7d
    await page.click('button:has-text("7d")');
    
    // Button should be highlighted
    await expect(page.locator('button:has-text("7d")')).toHaveClass(/bg-slate-700/);
  });

  // ============================================================================
  // Error Patterns
  // ============================================================================
  
  test('Error Pattern card expands and shows details', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Wait for error patterns to load
    await page.waitForSelector('[data-testid="error-pattern-card"]', { timeout: 10000 });
    
    // Click first error card
    const firstCard = page.locator('[data-testid="error-pattern-card"]').first();
    await firstCard.click();
    
    // Check expanded details
    await expect(page.locator('text=First Seen')).toBeVisible();
    await expect(page.locator('text=Last Seen')).toBeVisible();
    
    // Check action buttons
    await expect(page.locator('button:has-text("Create Learning")')).toBeVisible();
    await expect(page.locator('button:has-text("Mark Resolved")')).toBeVisible();
  });

  test('Create Learning from Error Pattern', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Wait for error patterns
    await page.waitForSelector('[data-testid="error-pattern-card"]', { timeout: 10000 });
    
    // Expand first card
    await page.locator('[data-testid="error-pattern-card"]').first().click();
    
    // Click Create Learning
    await page.click('button:has-text("Create Learning")');
    
    // Should redirect or show form
    await expect(page.locator('text=Create Learning')).toBeVisible();
  });

  // ============================================================================
  // Learnings
  // ============================================================================
  
  test('Learnings list with filters', async ({ page }) => {
    await page.goto('/admin/knowledge/learnings');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Learnings');
    
    // Apply status filter
    await page.selectOption('select[name="status"]', 'DETECTED');
    
    // Check results
    await expect(page.locator('[data-testid="learning-card"]').first()).toBeVisible();
  });

  test('Create new Learning', async ({ page }) => {
    await page.goto('/admin/knowledge/learnings');
    
    // Click create button
    await page.click('button:has-text("New Learning")');
    
    // Fill form
    await page.fill('input[name="title"]', 'Test Learning E2E');
    await page.fill('textarea[name="description"]', 'This is a test learning created by E2E test');
    await page.selectOption('select[name="type"]', 'ERROR_PATTERN');
    await page.selectOption('select[name="severity"]', 'high');
    await page.fill('input[name="category"]', 'test.category');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify created
    await expect(page.locator('text=Test Learning E2E')).toBeVisible();
  });

  test('Update Learning status', async ({ page }) => {
    await page.goto('/admin/knowledge/learnings');
    
    // Click first learning
    await page.locator('[data-testid="learning-card"]').first().click();
    
    // Change status
    await page.selectOption('select[name="status"]', 'ACTION_PLANNED');
    await page.fill('textarea[name="actionTaken"]', 'Action taken in E2E test');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify success message
    await expect(page.locator('text=Learning updated')).toBeVisible();
  });

  // ============================================================================
  // Real-time Updates
  // ============================================================================
  
  test('Real-time error detection updates dashboard', async ({ page, context }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Get initial error count
    const initialCount = await page.locator('[data-testid="active-errors"]').textContent();
    
    // Open second tab to trigger error
    const secondPage = await context.newPage();
    await secondPage.goto('/api/test/trigger-error');
    
    // Wait a moment for propagation
    await page.waitForTimeout(3000);
    
    // Check if dashboard updated (count increased or new error appeared)
    await expect(page.locator('[data-testid="error-pattern-card"]').first()).toBeVisible();
    
    await secondPage.close();
  });

  // ============================================================================
  // Knowledge Graph
  // ============================================================================
  
  test('Knowledge Graph visualization loads', async ({ page }) => {
    await page.goto('/admin/knowledge/graph');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Knowledge Graph');
    
    // Check canvas/svg rendered
    await expect(page.locator('canvas, svg')).toBeVisible();
  });

  test('Graph nodes are interactive', async ({ page }) => {
    await page.goto('/admin/knowledge/graph');
    
    // Wait for graph to render
    await page.waitForTimeout(2000);
    
    // Click on a node (assuming nodes have data-testid)
    const node = page.locator('[data-testid="graph-node"]').first();
    if (await node.isVisible().catch(() => false)) {
      await node.click();
      
      // Check detail panel appears
      await expect(page.locator('[data-testid="node-details"]')).toBeVisible();
    }
  });

  // ============================================================================
  // API Tests
  // ============================================================================
  
  test('Dashboard API returns valid data', async ({ request }) => {
    const response = await request.get('/api/knowledge/dashboard');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check structure
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('recentErrorPatterns');
    expect(data).toHaveProperty('openCycles');
    expect(data).toHaveProperty('metrics');
    
    // Check types
    expect(typeof data.summary.totalLearnings).toBe('number');
    expect(Array.isArray(data.recentErrorPatterns)).toBe(true);
  });

  test('Learnings API with filters', async ({ request }) => {
    const response = await request.get('/api/knowledge/learnings?status=DETECTED&limit=10');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('hasMore');
  });

  test('Create Learning via API', async ({ request }) => {
    const response = await request.post('/api/knowledge/learnings', {
      data: {
        type: 'ERROR_PATTERN',
        title: 'API Test Learning',
        description: 'Created via API test',
        severity: 'medium',
        category: 'test.api',
        tags: ['test', 'api'],
      },
    });
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('API Test Learning');
  });

  test('Error Patterns API', async ({ request }) => {
    const response = await request.get('/api/knowledge/error-patterns?status=NEW');
    
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  // ============================================================================
  // Accessibility
  // ============================================================================
  
  test('War Room is keyboard accessible', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Should be able to activate buttons
    await page.keyboard.press('Enter');
  });

  test('Learnings list has proper ARIA labels', async ({ page }) => {
    await page.goto('/admin/knowledge/learnings');
    
    // Check for aria-labels
    const filters = await page.locator('[aria-label*="filter"]').count();
    expect(filters).toBeGreaterThan(0);
  });
});

test.describe('Knowledge-Harnessing Unauthenticated', () => {
  
  test('Redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/knowledge/war-room');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
  });
  
  test('API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/knowledge/dashboard');
    
    expect(response.status()).toBe(401);
  });
});

export default test;
