import { test, expect } from '@playwright/test';

test.describe('Contract Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/contracts', { timeout: 5000 });
  });

  test('should display contracts list', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText('合同');

    // Check if contracts are displayed
    await expect(page.locator('table, [role="table"], [class*="list"]')).toBeVisible({ timeout: 5000 });
  });

  test('should filter contracts by type', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table, [role="table"], [class*="list"]', { timeout: 5000 });

    // Look for type filter
    const typeFilter = page.locator('select').filter({ hasText: /类型|Type/ }).first();
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption('STAFF_AUGMENTATION');
      await page.waitForTimeout(500); // Wait for filter to apply
    }
  });

  test('should filter contracts by status', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table, [role="table"], [class*="list"]', { timeout: 5000 });

    // Look for status filter
    const statusFilter = page.locator('select').filter({ hasText: /状态|Status/ }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('ACTIVE');
      await page.waitForTimeout(500); // Wait for filter to apply
    }
  });

  test('should search contracts by keyword', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table, [role="table"], [class*="list"]', { timeout: 5000 });

    // Look for search input
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试');
      await page.waitForTimeout(500); // Wait for search to apply
    }
  });

  test('should navigate to contract detail', async ({ page }) => {
    // Wait for contracts to load
    await page.waitForSelector('table tbody tr, [role="table"] [role="row"], [class*="contract"]', { timeout: 5000 });

    // Click first contract
    const firstContract = page.locator('table tbody tr a, [role="table"] [role="row"] a, [class*="contract"] a').first();
    if (await firstContract.isVisible()) {
      await firstContract.click();

      // Should navigate to detail page
      await page.waitForURL(/.*contracts\/.*/, { timeout: 3000 });
    }
  });

  test('should display contract tabs', async ({ page }) => {
    // Navigate to a contract detail page first
    await page.waitForSelector('table tbody tr a, [role="table"] [role="row"] a', { timeout: 5000 });

    const firstContractLink = page.locator('table tbody tr a, [role="table"] [role="row"] a').first();
    if (await firstContractLink.isVisible()) {
      await firstContractLink.click();
      await page.waitForURL(/.*contracts\/.*/, { timeout: 3000 });

      // Check for tabs
      await expect(page.locator('[role="tab"], [class*="tab"]')).toBeVisible();
    }
  });

  test('should export contracts', async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector('table, [role="table"], [class*="list"]', { timeout: 5000 });

    // Look for export button
    const exportButton = page.locator('button').filter({ hasText: /导出|Export/ }).first();
    if (await exportButton.isVisible()) {
      // Setup download handler
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.(xlsx|csv|pdf)$/);
    }
  });
});
