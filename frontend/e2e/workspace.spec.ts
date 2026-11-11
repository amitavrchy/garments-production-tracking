import { test, expect, Page } from '@playwright/test';
const email = process.env.SEED_ADMIN_EMAIL || 'admin@loom.local',
  password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Production overview.' })).toBeVisible();
}
test('sign in, live overview and desktop visual', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await expect(page.getByText('Live floor updates')).toBeVisible();
  await expect(page.locator('.line-card')).toHaveCount(4);
  await page.screenshot({
    path: 'artifacts/overview-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('every module loads real data without an API error', async ({ page }) => {
  await login(page);
  for (const [path, heading] of [
    ['orders', 'Buyer orders.'],
    ['styles', 'Style library.'],
    ['planning', 'Production planning.'],
    ['cutting', 'Cutting room.'],
    ['production', 'Hourly production.'],
    ['quality', 'Quality control.'],
    ['finishing', 'Finishing & packing.'],
    ['shipments', 'Shipments.'],
    ['inventory', 'Materials & store.'],
    ['payroll', 'Piece-rate payroll.'],
    ['team', 'People & floor.'],
    ['settings', 'Workspace settings.'],
    ['reports', 'Reports & insights.'],
  ]) {
    await page.goto(`/${path}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('.error-banner')).toHaveCount(0);
    await expect(page.locator('table')).toBeVisible();
  }
});
test('buyer create edit and draft deletion persist through the API', async ({ page }) => {
  await login(page);
  await page.goto('/orders');
  await page.getByRole('tab', { name: /Buyers/ }).click();
  await page.getByRole('button', { name: 'New buyer', exact: true }).click();
  const code = `E2E-${Date.now()}`;
  await page.getByLabel('Buyer name').fill('Browser acceptance buyer');
  await page.getByLabel('Buyer code').fill(code);
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('status')).toContainText('Record saved');
  await page.getByRole('button', { name: 'Browser acceptance buyer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit record' }).click();
  await page.getByLabel('Buyer name').fill('Updated browser buyer');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(
    page.getByRole('button', { name: 'Updated browser buyer', exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: /Buyers/ }).click();
  await page.getByRole('button', { name: 'Updated browser buyer', exact: true }).click();
  await page.getByRole('button', { name: 'Delete draft' }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(
    page.getByRole('button', { name: 'Updated browser buyer', exact: true }),
  ).toHaveCount(0);
});
test('hourly form surfaces duplicate slot validation', async ({ page }) => {
  await login(page);
  await page.goto('/production?new=1');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Production line', { exact: true }).selectOption('line-1');
  await page.getByLabel('Purchase order', { exact: true }).selectOption('order-1');
  await page.getByLabel('Hour start (24-hour)', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Duplicate record');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
test('keyboard module search and notifications work', async ({ page }) => {
  await login(page);
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder('Search orders, production, payroll…').fill('Quality');
  await page.getByRole('button', { name: 'Quality control', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quality control.' })).toBeVisible();
  await page.getByRole('button', { name: 'View notifications' }).click();
  await expect(page.getByRole('dialog')).toContainText('Factory notifications');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('mobile navigation has no document overflow and all text is at least 14px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Quality control', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Quality control.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const small = await page.locator('body *').evaluateAll((nodes) =>
    nodes
      .filter(
        (n) =>
          n instanceof HTMLElement &&
          n.getBoundingClientRect().width &&
          [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent?.trim()) &&
          parseFloat(getComputedStyle(n).fontSize) < 14,
      )
      .map((n) => ({
        tag: n.tagName,
        text: n.textContent?.slice(0, 50),
        font: getComputedStyle(n).fontSize,
      })),
  );
  expect(small).toEqual([]);
  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: 'Production overview.' })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/overview-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
test('API rejects unauthenticated and cross-origin writes', async ({ request }) => {
  expect((await request.get('/api/data/orders')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/login', {
        headers: { Origin: 'https://untrusted.example' },
        data: { email, password },
      })
    ).status(),
  ).toBe(403);
});
test('QC role sees quality controls and cannot enter production', async ({ page }) => {
  const response = await page.request.post('/api/auth/login', {
    data: { email: 'qc@loom.local', password },
  });
  expect(response.ok()).toBe(true);
  await page.goto('/quality');
  await expect(page.getByRole('button', { name: 'New qc inspection', exact: true })).toBeVisible();
  await page.goto('/production');
  await expect(page.getByRole('heading', { name: 'Hourly production.' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'New hourly production', exact: true }),
  ).toHaveCount(0);
  expect((await page.request.post('/api/production/hourly', { data: {} })).status()).toBe(403);
});
