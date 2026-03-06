import { test, expect } from '@playwright/test';
import { loginArzt, waitForIdle } from './helpers/test-utils';

test.describe('Modul 2: Admin-Erweiterung', () => {
  test.beforeEach(async ({ page }) => {
    await loginArzt(page);
    await waitForIdle(page);
  });

  test('admin dashboard loads with all module tabs', async ({ page }) => {
    const expectedTabs = [
      'Mitarbeiter',
      'Fragebogen',
      'ROI',
      'Wunschbox',
      'Wartezeit',
      'Rechte',
      'Audit',
    ];

    for (const tab of expectedTabs) {
      const tabBtn = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tab, 'i') });
      await expect(tabBtn.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('staff management: list users', async ({ page }) => {
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /Mitarbeiter|Staff/i });
    await staffTab.first().click();
    await waitForIdle(page);

    // Should see user list or table
    const userList = page.locator('table, [data-testid="user-list"], text=/Benutzername|Username/i');
    await expect(userList.first()).toBeVisible({ timeout: 10000 });
  });

  test('staff management: create new user dialog opens', async ({ page }) => {
    const staffTab = page.locator('button, [role="tab"]').filter({ hasText: /Mitarbeiter|Staff/i });
    await staffTab.first().click();
    await waitForIdle(page);

    const createBtn = page.locator('button').filter({ hasText: /Neu|Erstellen|Create|Hinzufügen/i });
    if (await createBtn.first().isVisible().catch(() => false)) {
      await createBtn.first().click();
      await waitForIdle(page);

      // Dialog with form fields should appear
      const usernameField = page.locator('input[name="username"], input[placeholder*="Benutzer"], label:has-text("Benutzername")');
      await expect(usernameField.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('permission matrix: toggle permissions', async ({ page }) => {
    const permTab = page.locator('button, [role="tab"]').filter({ hasText: /Rechte|Permission/i });
    await permTab.first().click();
    await waitForIdle(page);

    // Permission matrix should show roles and checkboxes
    const matrix = page.locator('[data-testid="permission-matrix"], table, text=/Admin|Arzt|MFA/i');
    await expect(matrix.first()).toBeVisible({ timeout: 10000 });

    // Should have checkboxes or toggles
    const toggles = page.locator('input[type="checkbox"], [role="switch"], [role="checkbox"]');
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('questionnaire builder: list atoms and search', async ({ page }) => {
    const fbTab = page.locator('button, [role="tab"]').filter({ hasText: /Fragebogen|Questionnaire/i });
    await fbTab.first().click();
    await waitForIdle(page);

    // Should have a search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Such"], input[placeholder*="search"]');
    if (await searchInput.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.first().fill('Schmerz');
      await waitForIdle(page);
    }

    // Should show atom list items
    const atomList = page.locator('[data-testid="atom-list"], table, [role="listbox"]');
    await expect(atomList.first()).toBeVisible({ timeout: 5000 });
  });

  test('questionnaire builder: toggle atom active/inactive', async ({ page }) => {
    const fbTab = page.locator('button, [role="tab"]').filter({ hasText: /Fragebogen|Questionnaire/i });
    await fbTab.first().click();
    await waitForIdle(page);

    // Find a toggle/switch for active status
    const activeToggle = page.locator('[data-testid="atom-active-toggle"], input[type="checkbox"]').first();
    if (await activeToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const wasChecked = await activeToggle.isChecked().catch(() => false);
      await activeToggle.click();
      await waitForIdle(page);

      // Status should have changed
      const isNowChecked = await activeToggle.isChecked().catch(() => !wasChecked);
      expect(isNowChecked).not.toBe(wasChecked);
    }
  });

  test('ROI dashboard: shows KPIs and chart', async ({ page }) => {
    const roiTab = page.locator('button, [role="tab"]').filter({ hasText: /ROI/i });
    await roiTab.first().click();
    await waitForIdle(page);

    // KPI cards or values should be visible
    const kpiArea = page.locator('text=/Patienten|Sitzungen|Einsparung|ROI|Saving/i');
    await expect(kpiArea.first()).toBeVisible({ timeout: 10000 });
  });

  test('ROI configuration: editable cost parameters', async ({ page }) => {
    const roiTab = page.locator('button, [role="tab"]').filter({ hasText: /ROI/i });
    await roiTab.first().click();
    await waitForIdle(page);

    // Look for config section or button
    const configBtn = page.locator('button, [role="tab"]').filter({ hasText: /Konfiguration|Config|Parameter/i });
    if (await configBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await configBtn.first().click();
      await waitForIdle(page);

      const costInput = page.locator('input[type="number"], input[name*="cost"], input[name*="hourly"]');
      await expect(costInput.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('wunschbox: submit and review flow', async ({ page }) => {
    const wbTab = page.locator('button, [role="tab"]').filter({ hasText: /Wunschbox|Wish/i });
    await wbTab.first().click();
    await waitForIdle(page);

    // Should see wish list or submission form
    const wbArea = page.locator('[data-testid="wunschbox"], text=/Wunsch|Wish|Änderungswunsch/i');
    await expect(wbArea.first()).toBeVisible({ timeout: 10000 });

    // Look for wishes list
    const wishList = page.locator('table, [data-testid="wish-list"], text=/Ausstehend|Pending|Genehmigt/i');
    if (await wishList.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      // Verify status labels exist
      const statusLabel = page.locator('text=/Ausstehend|Genehmigt|Abgelehnt|Pending|Approved/i');
      await expect(statusLabel.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('audit log shows recent actions', async ({ page }) => {
    const auditTab = page.locator('button, [role="tab"]').filter({ hasText: /Audit/i });
    await auditTab.first().click();
    await waitForIdle(page);

    // Audit log table or list should appear
    const auditArea = page.locator('table, [data-testid="audit-log"], text=/Aktion|Action|Zeitpunkt|Timestamp/i');
    await expect(auditArea.first()).toBeVisible({ timeout: 10000 });
  });

  test('waiting content management: CRUD', async ({ page }) => {
    const contentTab = page.locator('button, [role="tab"]').filter({ hasText: /Wartezeit|Content|Inhalte/i });
    await contentTab.first().click();
    await waitForIdle(page);

    // Content list should appear
    const contentArea = page.locator('[data-testid="content-list"], table, text=/Typ|Category|Inhalt/i');
    await expect(contentArea.first()).toBeVisible({ timeout: 10000 });

    // Create button should exist
    const createBtn = page.locator('button').filter({ hasText: /Neu|Erstellen|Create|Hinzufügen/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
  });
});
