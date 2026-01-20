import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h1, h2')).toContainText('登录');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation or success message
    await page.waitForURL('**/contracts', { timeout: 5000 });
    expect(page.url()).toContain('/contracts');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await expect(page.locator('text=/邮箱或密码错误|登录失败/')).toBeVisible({ timeout: 3000 });
  });

  test('should remember email when checkbox is checked', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.check('input[type="checkbox"]'); // Remember me
    await page.click('button[type="submit"]');

    await page.waitForURL('**/contracts', { timeout: 5000 });

    // Logout
    await page.goto('/');
    await page.waitForURL('**/', { timeout: 3000 });

    // Check if email is remembered
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveValue('admin@iclms.com');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.click('text=忘记密码');
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.locator('h1, h2')).toContainText('找回密码');
  });

  test('should show password strength indicator', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('weak');

    // Password strength indicator should appear
    await expect(page.locator('[class*="strength"], [data-testid="password-strength"]')).toBeVisible();
  });

  test('should support Enter key to submit login', async ({ page }) => {
    await page.fill('input[type="email"]', 'admin@iclms.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.keyboard.press('Enter');

    await page.waitForURL('**/contracts', { timeout: 5000 });
    expect(page.url()).toContain('/contracts');
  });
});
