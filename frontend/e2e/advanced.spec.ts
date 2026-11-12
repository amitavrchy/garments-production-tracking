import { test, expect, Page } from '@playwright/test';
const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
async function signIn(page: Page, email = process.env.SEED_ADMIN_EMAIL || 'admin@loom.local') {
  const response = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(response.ok()).toBe(true);
}
test('public landing has a working product tour, workflow explorer, FAQ and capacity calculator', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Production. Connected at every seam.' }),
  ).toBeVisible();
  await page
    .locator('.lp-spec-stages')
    .getByRole('button', { name: /Deliver/ })
    .click();
  await expect(page.locator('.lp-pattern-callout')).toContainText('Ready for dispatch');
  await page.getByRole('button', { name: 'Take a product tour' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Planning', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Capacity planning.' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('tablist', { name: 'Production journey' })
    .getByRole('tab', { name: /Source/ })
    .click();
  await expect(
    page.getByRole('heading', { name: 'The right material. In the right place.' }),
  ).toBeVisible();
  await page
    .getByRole('tablist', { name: 'Factory roles' })
    .getByRole('tab', { name: 'Quality', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Find the cause. Follow the correction.' }),
  ).toBeVisible();
  await page.getByLabel('Calculator operators').fill('40');
  await expect(page.locator('.lp-calc-result strong')).toContainText('1,280');
  await page.getByRole('button', { name: 'How are factory records protected?' }).click();
  await expect(
    page.getByText(
      'Factory-scoped access, role and line permissions, database constraints, transaction locks and before/after audits protect operational changes. Sensitive financial reads and independent approvals are controlled separately.',
    ),
  ).toBeVisible();
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Production. Connected at every seam.' }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/landing-hero.png', animations: 'disabled' });
  await page.screenshot({
    path: 'artifacts/landing-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});
test('landing mobile menu, text sizing and overflow are correct', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'How it works' })
    .click();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const small = await page.locator('.landing *').evaluateAll((nodes) =>
    nodes
      .filter(
        (n) =>
          n instanceof HTMLElement &&
          n.getBoundingClientRect().width &&
          getComputedStyle(n).visibility !== 'hidden' &&
          [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent?.trim()) &&
          parseFloat(getComputedStyle(n).fontSize) < 14,
      )
      .map((n) => ({
        tag: n.tagName,
        text: n.textContent?.slice(0, 40),
        font: getComputedStyle(n).fontSize,
      })),
  );
  expect(small).toEqual([]);
  await page.screenshot({
    path: 'artifacts/landing-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});

test('landing containers occupy 80 percent at mobile, tablet and wide desktop sizes', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const widths = await page
      .locator('.lp-container')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
    for (const actual of widths) expect(Math.abs(actual - width * 0.8)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.lp-pattern-tracer')).toHaveCSS('animation-name', 'none');
});
test('landing motion runs, reveals sections and stops when reduced motion is requested', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const scan = page.locator('.lp-pattern-scan');
  await expect(scan).toHaveCSS('animation-name', 'loom-scan');
  const initial = await scan.evaluate((node) => getComputedStyle(node).transform);
  await expect
    .poll(() => scan.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(initial);
  const card = page.locator('.lp-bento article').first();
  await card.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      card.evaluate((node) =>
        node.getAnimations().some((animation) => animation.playState === 'running'),
      ),
    )
    .toBe(true);
  await page
    .getByRole('tablist', { name: 'Production journey' })
    .getByRole('tab', { name: /Source/ })
    .click();
  await expect(page.locator('.lp-stage-content')).toHaveCSS('animation-name', 'loom-arrive');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scan).toHaveCSS('animation-name', 'none');
  await expect
    .poll(() =>
      page.locator('.landing').evaluate((node) => node.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
});

test('every advanced workspace loads real persisted data', async ({ page }) => {
  await signIn(page);
  for (const [path, heading] of [
    ['control-tower', 'Control tower.'],
    ['approvals', 'Approval desk.'],
    ['capacity', 'Capacity & line balancing.'],
    ['procurement', 'Procurement.'],
    ['warehouse', 'Warehouse & fabric.'],
    ['traceability', 'Bundle traceability.'],
    ['equipment', 'Equipment & maintenance.'],
    ['workforce', 'Workforce intelligence.'],
    ['assurance', 'Quality assurance.'],
    ['commercial', 'Costing & subcontracting.'],
    ['governance', 'Compliance & impact.'],
  ]) {
    await page.goto('/' + path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.locator('.error-banner')).toHaveCount(0);
  }
  await page.goto('/control-tower');
  await expect(page.getByText('Exception inbox')).toBeVisible();
  await page.screenshot({
    path: 'artifacts/control-tower-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
});
test('capacity scenarios simulate persisted orders and show a reconciled proposal', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/capacity');
  await page.getByRole('button', { name: 'Balanced capacity · next 7 days', exact: true }).click();
  await page.getByRole('button', { name: 'Move to Simulated', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Planned pieces', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').locator('.scenario-result tbody tr').first()).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Operation balance', exact: true }).click();
  const allocations = await (await page.request.get('/api/data/allocations')).json();
  await page
    .getByLabel('Balance date')
    .fill(allocations.find((row: { lineId: string }) => row.lineId === 'line-1').date);
  await expect(page.getByText('Assumption: 80% efficiency')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Qualified workers' })).toBeVisible();
  await page.screenshot({
    path: 'artifacts/capacity-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
});
test('bundle lookup exposes a QR passport and its checkpoint history', async ({ page }) => {
  await signIn(page);
  await page.goto('/traceability?code=BDL-2026-0001');
  await expect(page.getByRole('heading', { name: 'BDL-2026-0001', exact: true })).toBeVisible();
  await expect(page.locator('.trace-timeline li')).toHaveCount(3);
  await expect(page.getByRole('img', { name: 'QR ticket for BDL-2026-0001' })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download QR' }).click();
  expect((await download).suggestedFilename()).toBe('BDL-2026-0001.png');
});
test('quoted cost reconciliation can be independently approved for commercial documents', async ({
  page,
}) => {
  await signIn(page);
  await page.goto('/commercial');
  await page.getByRole('button', { name: 'November cost revision', exact: true }).click();
  const calculate = page.getByRole('button', { name: 'Move to Calculated', exact: true });
  if (await calculate.count()) await calculate.click();
  await expect(
    page.getByRole('dialog').getByText('Reconciled unit cost', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await signIn(page, 'accounts@loom.local');
  await page.goto('/approvals');
  await expect(page.getByRole('heading', { name: 'Approval desk.', exact: true })).toBeVisible();
  const cost = page
    .locator('.approval-card')
    .filter({ has: page.getByRole('heading', { name: 'November cost revision', exact: true }) });
  if (await cost.count()) {
    await cost.getByRole('button', { name: 'Mark Approved', exact: true }).click();
    await expect(cost).toHaveCount(0);
  }
  await page.goto('/documents/shipment-1');
  await page.getByLabel('Document type').selectOption('invoice');
  await expect(page.locator('.shipment-document')).toContainText('COMMERCIAL INVOICE');
  await expect(page.locator('.shipment-document')).toContainText('Total selling value');
  await expect(page.getByText('Commercial price pending', { exact: true })).toHaveCount(0);
});
test('master CSV import previews quoted fields and persists atomically', async ({ page }) => {
  await signIn(page);
  await page.goto('/procurement');
  await page.getByRole('tab', { name: /Suppliers/ }).click();
  await page.getByRole('button', { name: 'Import CSV', exact: true }).click();
  const code = `CSV-${Date.now()}`;
  await page.getByLabel('Master CSV file').setInputFiles({
    name: 'suppliers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `code,name,email,country,paymentTerms\r\n${code},"Browser, supplier",browser@example.com,Bangladesh,Net 30\r\n`,
    ),
  });
  await expect(
    page.getByRole('dialog').getByText('Browser, supplier', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Import 1 records' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search records' }).fill(code);
  await page.getByRole('button', { name: code, exact: true }).click();
  await page.getByRole('button', { name: 'Delete draft' }).click();
  await page.getByRole('button', { name: 'Confirm deletion' }).click();
  await expect(page.getByRole('button', { name: code, exact: true })).toHaveCount(0);
});
test('production outbox saves a local offline draft without claiming a server update', async ({
  page,
  context,
}) => {
  await signIn(page);
  await page.goto('/production?new=1');
  await expect(page.getByRole('dialog', { name: 'New hourly production' })).toBeVisible();
  await page.getByLabel('Hour start (24-hour)', { exact: true }).fill('22');
  await page.getByLabel('Sewing input (pcs)', { exact: true }).fill('1');
  await page.getByLabel('Sewn output (pcs)', { exact: true }).fill('1');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('button', { name: '1 offline draft', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1 offline draft', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Production outbox' })).toContainText(
    'have not changed factory totals',
  );
  await expect(page.getByRole('button', { name: 'Sync pending entries' })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove local draft' }).click();
  await expect(page.getByText('No unsent production drafts.')).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await context.setOffline(false);
});
test('advanced mobile screens keep the document within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  for (const path of ['control-tower', 'capacity', 'traceability', 'equipment', 'approvals']) {
    await page.goto('/' + path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: 'artifacts/approvals-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
});
