import { test, expect } from '@playwright/test';

test.describe('Department Listing', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/contracts', { timeout: 5000 });
  });

  test('should display departments list', async ({ page }) => {
    await page.goto('/departments');
    await expect(page.locator('h1, h2')).toContainText('部门');

    // Check if departments are displayed
    await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 5000 });
  });

  test('should display all 7 departments', async ({ page }) => {
    await page.goto('/departments');

    // Wait for table to load
    await page.waitForSelector('table tbody tr, [role="table"] [role="row"]', { timeout: 5000 });

    // Count rows in table (excluding header)
    const rows = await page.locator('table tbody tr, [role="table"] [role="rowgroup"] [role="row"]').count();
    expect(rows).toBeGreaterThanOrEqual(7);
  });

  test('should filter departments by search', async ({ page }) => {
    await page.goto('/departments');

    // Wait for table to load
    await page.waitForSelector('table tbody tr, [role="table"] [role="row"]', { timeout: 5000 });

    // Search for "财务"
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]').first();
    await searchInput.fill('财务');
    await page.waitForTimeout(500); // Wait for filter to apply

    // Check filtered results
    const filteredRows = await page.locator('table tbody tr, [role="table"] [role="rowgroup"] [role="row"]').count();
    expect(filteredRows).toBe(1);
  });

  test('should navigate to department detail', async ({ page }) => {
    await page.goto('/departments');

    // Wait for table to load
    await page.waitForSelector('table tbody tr, [role="table"] [role="row"]', { timeout: 5000 });

    // Click first department
    await page.locator('table tbody tr:first-child, [role="table"] [role="rowgroup"] [role="row"]:first-child').click();

    // Should navigate to detail page
    await page.waitForURL(/.*departments\/.*/, { timeout: 3000 });
  });

  test('should display department badges', async ({ page }) => {
    await page.goto('/departments');

    // Wait for table to load
    await page.waitForSelector('table tbody tr, [role="table"] [role="row"]', { timeout: 5000 });

    // Check for badges/labels
    await expect(page.locator('[class*="badge"], [class*="tag"], span[style*="background"]')).toBeVisible();
  });
});
