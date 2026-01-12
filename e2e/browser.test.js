import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page.locator('text=Credit Card Benefits')).toBeVisible();
  });

  test('shows all cards', async ({ page }) => {
    await expect(page.locator('text=American Express Platinum')).toBeVisible();
    await expect(page.locator('text=Chase Sapphire Reserve')).toBeVisible();
  });

  test('shows summary stats', async ({ page }) => {
    await expect(page.locator('text=Total Value')).toBeVisible();
  });

  test('shows all benefits', async ({ page }) => {
    await expect(page.locator('text=Uber Cash')).toBeVisible();
    await expect(page.locator('text=Saks Fifth Avenue')).toBeVisible();
    await expect(page.locator('text=Airline Fee Credit')).toBeVisible();
    await expect(page.locator('text=Travel Credit')).toBeVisible();
    await expect(page.locator('text=Global Entry/TSA PreCheck')).toBeVisible();
  });
});

test.describe('Benefit Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays benefit name and description', async ({ page }) => {
    await expect(page.locator('text=Uber Cash')).toBeVisible();
    await expect(page.locator('text=$200 annually')).toBeVisible();
  });

  test('shows progress bar', async ({ page }) => {
    const uberCard = page.locator('text=Uber Cash').locator('..').locator('..');
    await expect(uberCard.locator('text=$0 / $200')).toBeVisible();
  });

  test('shows status badge', async ({ page }) => {
    await expect(page.locator('text=Pending').first()).toBeVisible();
  });

  test('shows expiration date', async ({ page }) => {
    await expect(page.locator('text=Expires:')).toBeVisible();
  });
});

test.describe('Edit Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens when Edit button clicked', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();
    await expect(page.locator('text=Edit')).toBeVisible();
  });

  test('pre-fills current amount', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    const input = page.locator('input[type="number"]');
    await expect(input).toHaveValue('0');
  });

  test('saves updated amount', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await page.locator('input[type="number"]').fill('100');
    await page.locator('button:has-text("Save")').click();
    
    const card = page.locator('text=Uber Cash').locator('..').locator('..');
    await expect(card.locator('text=$100 / $200')).toBeVisible();
  });

  test('cancels without saving', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await page.locator('input[type="number"]').fill('100');
    await page.locator('button:has-text("Cancel")').click();
    
    const card = page.locator('text=Uber Cash').locator('..').locator('..');
    await expect(card.locator('text=$0 / $200')).toBeVisible();
  });

  test('Clear button resets to 0', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await page.locator('input[type="number"]').fill('100');
    await page.locator('button:has-text("Clear")').click();
    await expect(page.locator('input[type="number"]')).toHaveValue('0');
  });

  test('Full Amount button sets to max', async ({ page }) => {
    await page.locator('button:has-text("Edit")').first().click();
    await page.locator('button:has-text("Full Amount")').click();
    await expect(page.locator('input[type="number"]')).toHaveValue('200');
  });
});

test.describe('Activation Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows Needs Activation for unactivated benefits', async ({ page }) => {
    await expect(page.locator('button:has-text("Needs Activation")').first()).toBeVisible();
  });

  test('toggles to Activated when clicked', async ({ page }) => {
    await page.locator('button:has-text("Needs Activation")').first().click();
    await expect(page.locator('button:has-text("Activated")').first()).toBeVisible();
  });
});

test.describe('Card Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Amex filter shows only Amex benefits', async ({ page }) => {
    await page.locator('button:has-text("Amex")').click();
    await expect(page.locator('text=Uber Cash')).toBeVisible();
    await expect(page.locator('text=Travel Credit')).toBeHidden();
  });

  test('Chase filter shows only Chase benefits', async ({ page }) => {
    await page.locator('button:has-text("Chase")').click();
    await expect(page.locator('text=Uber Cash')).toBeHidden();
    await expect(page.locator('text=Travel Credit')).toBeVisible();
  });

  test('All Cards shows both', async ({ page }) => {
    await page.locator('button:has-text("Amex")').click();
    await page.locator('button:has-text("All Cards")').click();
    await expect(page.locator('text=Uber Cash')).toBeVisible();
    await expect(page.locator('text=Travel Credit')).toBeVisible();
  });
});
