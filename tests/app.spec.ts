import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('adds a normalized rule and retains it after reload', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await page.getByLabel('Domain to block').fill('https://www.Example.com');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await expect(page.getByText('example.com', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('example.com', { exact: true })).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('reports invalid input and empty protection state', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Domain to block').fill('not a domain');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await expect(page.getByText(/valid domain/)).toBeVisible();
  await page.getByRole('button', { name: 'ARM RULES' }).click();
  await expect(page.getByText(/Add and enable at least one domain/)).toBeVisible();
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('Tab order skips the hidden file picker and always shows focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const focusedStops: string[] = [];
  for (let tabCount = 0; tabCount < 20; tabCount += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      if (!element) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        id: element.id || `${element.tagName.toLowerCase()}:${element.getAttribute('href') ?? ''}:${element.className}`,
        visible: rect.width > 1 && rect.height > 1 && style.visibility !== 'hidden' && style.display !== 'none',
        focusIndicator: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2
      };
    });

    expect(focused).not.toBeNull();
    if (focused!.id === 'body::') break;
    expect(focused!.visible, `${focused!.id} must be visible when focused`).toBe(true);
    expect(focused!.focusIndicator, `${focused!.id} must show a focus indicator`).toBe(true);
    if (focusedStops.includes(focused!.id)) break;
    focusedStops.push(focused!.id);
  }

  expect(focusedStops).toEqual([
    'a:#main:skip-link',
    'a:/:brand',
    'power-button',
    'domain',
    'button::button primary',
    'import-button',
    'summary::',
    'a:/:brand footer-brand',
    'a:/privacy/:',
    'a:/terms/:',
    'a:https://github.com/B-Divyesh/sf-android-site-blocker-private:'
  ]);
  expect(focusedStops).not.toContain('import-file');

  const picker = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import' }).press('Enter');
  await expect(await picker).toBeTruthy();
});

test('app shell and saved state work offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.getByLabel('Domain to block').fill('offline.example');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Your block list/ })).toBeVisible();
  await expect(page.getByText('offline.example', { exact: true })).toBeVisible();
});

test('privacy and terms are real static routes', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page.locator('main h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: /Nothing to hide/ })).toBeVisible();
  await page.goto('/terms/');
  await expect(page.locator('main h1')).toHaveCount(1);
});
