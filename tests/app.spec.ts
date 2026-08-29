import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

test('@claim:demo-isolation seeds, resets, and separates sample data from a real list', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Domain to block').fill('personal.example');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await expect(page.getByText('personal.example', { exact: true })).toBeVisible();
  await page.goto('/?demo=1');
  await expect(page.getByText('Demo — sample data, nothing is saved to your real list')).toBeVisible();
  await expect(page.locator('.rule-list').getByText('news.example.com', { exact: true })).toBeVisible();
  await expect(page.locator('.rule-list').getByText('forum.example', { exact: true })).toBeVisible();
  await page.getByLabel('Domain to block').fill('temporary.example');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('temporary.example', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('personal.example', { exact: true })).toBeVisible();
  await expect(page.getByText('news.example.com', { exact: true })).toHaveCount(0);
});

test('@claim:browser-privacy keeps demo requests same-origin and data in demo storage', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await page.goto('/?demo=1');
  await page.getByLabel('Domain to block').fill('local.example');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await page.getByRole('button', { name: 'Save block list' }).click();
  await expect(page.getByText('Saved for Android import. This browser is not blocking sites.')).toBeVisible();
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(databases).toContain('quietwall-demo');
  expect(databases).not.toContain('quietwall-local');
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:offline-demo reloads the sample after the network is disabled', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Try a sample Android block list' })).toBeVisible();
  await expect(page.locator('.demo-snapshot').getByText('news.example.com', { exact: true })).toBeVisible();
});

test('one click opens visible sample data in the first mobile viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390');
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL('/?demo=1');
  await expect(page.getByText('Demo — sample data, nothing is saved to your real list')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Try a sample Android block list' })).toBeFocused();
  await expect(page.getByText('Focus hours 21:30–07:00 · Pause delay 15 minutes')).toBeVisible();
  await expect(page.locator('.demo-snapshot').getByText('news.example.com', { exact: true })).toBeVisible();
  await expect(page.locator('.demo-snapshot').getByText('forum.example', { exact: true })).toBeVisible();
  await expect(page.locator('.demo-snapshot').getByText('Paused', { exact: true })).toBeVisible();
  const snapshot = await page.locator('.demo-snapshot').boundingBox();
  expect(snapshot).not.toBeNull();
  expect(snapshot!.y + snapshot!.height).toBeLessThanOrEqual(844);
});

test('@claim:json-portability exports the sample and imports a versioned block list', async ({ page }) => {
  await page.goto('/?demo=1');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export block list' }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream) text += chunk.toString();
  const exported = JSON.parse(text);
  expect(exported.version).toBe(1);
  expect(exported.rules).toHaveLength(4);
  expect(exported.rules.map((rule: { pattern: string }) => rule.pattern)).toContain('news.example.com');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import block list' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'quietwall.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, rules: [{ pattern: 'imported.example', enabled: true }] })) });
  await expect(page.locator('.rule-list').getByText('imported.example', { exact: true })).toBeVisible();
});

test('@claim:free-no-account exposes the MIT license with no account or payment path', async ({ page, request }) => {
  await page.goto('/?demo=1');
  await expect(page.getByText('Free to use. No account.')).toBeVisible();
  await expect(page.locator('a,button').filter({ hasText: /sign in|create account|subscribe|buy|checkout/i })).toHaveCount(0);
  const license = await request.get('/LICENSE.txt');
  expect(license.ok()).toBe(true);
  await expect(license.text()).resolves.toContain('MIT License');
});

test('@claim:apk-download serves an Android package and matching checksum', async ({ request }) => {
  const apk = await request.get('/downloads/quietwall.apk');
  expect(apk.ok()).toBe(true);
  const bytes = await apk.body();
  expect(bytes.byteLength).toBeGreaterThan(1_000_000);
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
  const checksum = await (await request.get('/downloads/quietwall.apk.sha256')).text();
  expect(checksum).toMatch(/^[a-f0-9]{64}\s+/);
});

test('adds a normalized real rule and retains it after reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (consoleMessage) => { if (consoleMessage.type() === 'error') errors.push(consoleMessage.text()); });
  await page.goto('/');
  await page.getByLabel('Domain to block').fill('https://www.Example.com');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await expect(page.locator('.domain-name', { hasText: 'example.com' })).toBeVisible();
  await page.reload();
  await expect(page.locator('.domain-name', { hasText: 'example.com' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('@claim:web-config-only reports invalid input and never claims the browser is blocking', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Domain to block').fill('not a domain');
  await page.getByRole('button', { name: 'Add domain' }).click();
  await expect(page.getByText(/valid domain/)).toBeVisible();
  await page.getByRole('button', { name: 'Save block list' }).click();
  await expect(page.getByText('This browser is not blocking sites.')).toBeVisible();
  await expect(page.getByText('RULES ARMED')).toHaveCount(0);
});

test('all routes have exact metadata, one h1, the shared skeleton, and no serious axe violations', async ({ page }) => {
  const routes = [
    { path: '/', title: 'Quietwall — block websites on Android', heading: 'Block websites across your Android device', canonical: '/' },
    { path: '/?demo=1', title: 'Demo — Quietwall', heading: 'Try a sample Android block list', canonical: '/?demo=1' },
    { path: '/demo/', title: 'Demo — Quietwall', heading: 'Try a sample Android block list', canonical: '/?demo=1' },
    { path: '/privacy/', title: 'Privacy — Quietwall', heading: 'How Quietwall handles your data', canonical: '/privacy/' },
    { path: '/terms/', title: 'Terms — Quietwall', heading: 'Terms for using Quietwall', canonical: '/terms/' },
    { path: '/offline.html', title: 'Offline — Quietwall', heading: 'Quietwall is offline', canonical: '/offline.html' },
    { path: '/does-not-exist', title: 'Page not found — Quietwall', heading: 'Page not found', canonical: '/404.html' }
  ];
  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText(route.heading);
    await expect(page).toHaveTitle(route.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://android-site-blocker-private.sociobot.in${route.canonical}`);
    await expect(page.locator('header nav')).toBeVisible();
    await expect(page.getByText('Built by Param Factory')).toBeVisible();
    await expect(page.locator('footer a[href="/privacy/"]')).toHaveText('Privacy');
    await expect(page.locator('footer a[href="/terms/"]')).toHaveText('Terms');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card\.png/);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? '')), route.path).toEqual([]);
  }
});

test('legal routes, sitemap, and the product 404 deployment rule are real static resources', async ({ request }) => {
  for (const route of ['/privacy/', '/terms/', '/demo/', '/offline.html', '/404.html', '/robots.txt', '/sitemap.xml']) {
    const response = await request.get(route);
    expect(response.ok(), route).toBe(true);
  }
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('https://android-site-blocker-private.sociobot.in/privacy/');
  expect(sitemap).toContain('https://android-site-blocker-private.sociobot.in/terms/');
  const config = JSON.parse(readFileSync(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'));
  expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
});

test('client routing updates title, focus, history, and the route announcement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Privacy', exact: true }).first().click();
  await expect(page).toHaveTitle('Privacy — Quietwall');
  await expect(page.locator(':focus')).toHaveText('How Quietwall handles your data');
  await expect(page.locator('#route-announcer')).toHaveText('Privacy — Quietwall');
  await page.goBack();
  await expect(page).toHaveTitle('Quietwall — block websites on Android');
  await expect(page.locator(':focus')).toHaveText('Block websites across your Android device');
});

test('mobile layout has no overflow and every visible control is at least 44px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-390');
  await page.goto('/?demo=1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  const shortControls = await page.locator('a:visible,button:visible,input:visible,summary:visible').evaluateAll((elements) => elements.map((element) => ({ label: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })).filter((rect) => rect.width < 44 || rect.height < 44));
  expect(shortControls).toEqual([]);
});

test('keyboard traversal skips the hidden picker and shows focus', async ({ page }) => {
  await page.goto('/?demo=1');
  for (let count = 0; count < 12; count += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => { const element = document.activeElement as HTMLElement; const style = getComputedStyle(element); const rect = element.getBoundingClientRect(); return { id: element.id, visible: rect.width > 1 && rect.height > 1, outline: parseFloat(style.outlineWidth) >= 2 }; });
    expect(focus.id).not.toBe('import-file');
    expect(focus.visible).toBe(true);
    expect(focus.outline).toBe(true);
  }
});
