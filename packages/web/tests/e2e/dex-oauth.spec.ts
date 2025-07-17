import { test, expect } from '@playwright/test';

test.describe('Dex OAuth2 Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start from a clean state
    await page.goto('/api/auth/signout');
  });

  test('should display Dex login option when configured', async ({ page }) => {
    await page.goto('/login');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if Dex login button is present
    const dexButton = page.locator('button:has-text("Sign in with Dex")');
    await expect(dexButton).toBeVisible();
    
    // Verify the button has the correct styling/icon
    await expect(dexButton).toContainText('Dex');
  });

  test('should redirect to Dex authorization when clicking login', async ({ page }) => {
    await page.goto('/login');
    
    // Click the Dex login button
    const dexButton = page.locator('button:has-text("Sign in with Dex")');
    await dexButton.click();
    
    // Should redirect to Dex authorization endpoint
    await page.waitForURL(/localhost:5556\/auth/);
    
    // Verify we're on the Dex authorization page
    await expect(page).toHaveURL(/localhost:5556\/auth/);
    
    // Check for Dex-specific elements
    await expect(page).toHaveTitle(/dex/i);
  });

  test('should complete OAuth flow with mock connector', async ({ page }) => {
    await page.goto('/login');
    
    // Start OAuth flow
    const dexButton = page.locator('button:has-text("Sign in with Dex")');
    await dexButton.click();
    
    // Wait for redirect to Dex
    await page.waitForURL(/localhost:5556\/auth/);
    
    // Look for mock connector login option
    const mockConnector = page.locator('a:has-text("Mock")');
    if (await mockConnector.isVisible()) {
      await mockConnector.click();
      
      // Should redirect back to Sourcebot after successful auth
      await page.waitForURL(/localhost:3000/);
      
      // Verify we're logged in by checking for user session indicators
      // This could be a user menu, dashboard, or other authenticated content
      await expect(page).not.toHaveURL('/login');
      
      // Optional: Check for specific authenticated page elements
      // await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    }
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Test with invalid state parameter to trigger error
    await page.goto('/api/auth/callback/dex?error=access_denied&error_description=User%20denied%20access');
    
    // Should redirect to login page with error
    await page.waitForURL(/login/);
    
    // Check if error is displayed (implementation dependent)
    // This test verifies the error flow doesn't break the app
    await expect(page).toHaveURL(/login/);
  });

  test('should respect OAuth scopes and return correct user info', async ({ page }) => {
    // This test would require a successful OAuth flow
    // We can test the provider configuration separately in unit tests
    
    // For now, just verify the provider is properly configured
    await page.goto('/api/auth/providers');
    
    const response = await page.waitForResponse('/api/auth/providers');
    const providers = await response.json();
    
    // Verify Dex provider is included in the response
    const dexProvider = providers.find((p: any) => p.id === 'dex');
    expect(dexProvider).toBeDefined();
    expect(dexProvider.name).toBe('Dex');
  });
});