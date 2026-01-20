import { test, expect } from '@playwright/test';

test.describe('Customer Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/contracts', { timeout: 5000 });
  });

  test('should display customers list', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('h1, h2')).toContainText('客户');

    // Check if customers are displayed
    await expect(page.locator('table, [role="table"], [class*="list"]')).toBeVisible({ timeout: 5000 });
  });

  test('should search customers by name', async ({ page }) => {
    await page.goto('/customers');

    // Wait for page to load
    await page.waitForSelector('table, [role="table"], [class*="list"]', { timeout: 5000 });

    // Look for search input
    const searchInput = page.locator('input[placeholder*="搜索"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('测试');
      await page.waitForTimeout(500); // Wait for search to apply
    }
  });

  test('should navigate to customer detail', async ({ page }) => {
    await page.goto('/customers');

    // Wait for customers to load
    await page.waitForSelector('table tbody tr a, [role="table"] [role="row"] a', { timeout: 5000 });

    // Click first customer
    const firstCustomer = page.locator('table tbody tr a, [role="table"] [role="row"] a').first();
    if (await firstCustomer.isVisible()) {
      await firstCustomer.click();

      // Should navigate to detail page
      await page.waitForURL(/.*customers\/.*/, { timeout: 3000 });
    }
  });

  test('should display customer contacts', async ({ page }) => {
    // Navigate to a customer detail page first
    await page.goto('/customers');

    await page.waitForSelector('table tbody tr a, [role="table"] [role="row"] a', { timeout: 5000 });

    const firstCustomerLink = page.locator('table tbody tr a, [role="table"] [role="row"] a').first();
    if (await firstCustomerLink.isVisible()) {
      await firstCustomerLink.click();
      await page.waitForURL(/.*customers\/.*/, { timeout: 3000 });

      // Check for contacts section
      await expect(page.locator('text=/联系人|Contacts/')).toBeVisible();
    }
  });

  test('should display customer contracts', async ({ page }) => {
    // Navigate to a customer detail page
    await page.goto('/customers');

    await page.waitForSelector('table tbody tr a, [role="table"] [role="row"] a', { timeout: 5000 });

    const firstCustomerLink = page.locator('table tbody tr a, [role="table"] [role="row"] a').first();
    if (await firstCustomerLink.isVisible()) {
      await firstCustomerLink.click();
      await page.waitForURL(/.*customers\/.*/, { timeout: 3000 });

      // Check for contracts section
      await expect(page.locator('text=/合同|Contracts/')).toBeVisible();
    }
  });
});
