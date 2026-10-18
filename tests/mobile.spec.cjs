const { test, expect } = require('@playwright/test');
const widths = [320, 360, 375, 390, 412, 430, 680, 768, 1024, 1440];

for (const width of widths) {
  test('Landing responsive / ' + width + 'px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width, height: width <= 430 ? 780 : 900 },
      deviceScaleFactor: width <= 430 ? 3 : 1,
      isMobile: width <= 768,
      hasTouch: width <= 768,
      reducedMotion: 'reduce',
      locale: 'tr-TR'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#hero-title')).toBeVisible();
    await expect(page.locator('#basla')).toBeAttached();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    expect(dimensions.scroll, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 2);
    expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 2);
    if (width <= 920) {
      await page.locator('#ex-mobile-menu-button').click();
      await expect(page.locator('#ex-mobile-menu')).toBeVisible();
      await page.locator('#ex-mobile-menu a[href="#deneyim"]').click();
      await expect(page.locator('#ex-mobile-menu')).toBeHidden();
    }
    await page.locator('.ex-choice[data-ex-goal="almanya"]').click();
    await page.locator('.ex-levels button[data-ex-level="A2"]').click();
    await expect(page.locator('#ex-wizard-summary')).toContainText('A2');
    await page.locator('.ex-start').click();
    await expect(page.locator('.ex-tab.active')).toBeVisible();
    await page.locator('.ex-steps button[data-ex-step="2"]').click();
    for (let i = 0; i < 3; i++) {
      await page.locator('#ex-answer-options button').first().click();
      await page.locator('#ex-check-answer').click();
      await page.locator('#ex-next-question').click();
    }
    await expect(page.locator('#ex-result')).toBeVisible();
    await expect(page.locator('#ex-panel-full')).toHaveAttribute('href', /level=A2/);
    await expect(page.locator('.ex-wa[data-placement="final"]')).toHaveAttribute('href', /wa\.me\/905409112503/);
    expect(errors, 'Uncaught JavaScript errors at ' + width + 'px').toEqual([]);
    await context.close();
  });
}

test('Student panel A2 navigation and mobile menu', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, deviceScaleFactor: 3,
    isMobile: true, hasTouch: true, reducedMotion: 'reduce'
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/panel.html?level=A2&view=practice', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#app-practice')).toHaveClass(/active/);
  await expect(page.locator('.level-tabs button[data-level="A2"]')).toHaveClass(/active/);
  await expect(page.locator('#unitGrid button[data-unit]')).toHaveCount(8);
  await page.locator('#unitGrid button[data-unit="0"]').click();
  await expect(page.locator('#app-lesson')).toHaveClass(/active/);
  await expect(page.locator('#quizOptions button')).toHaveCount(3);
  await page.locator('#backUnits').click();
  await expect(page.locator('#app-practice')).toHaveClass(/active/);
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width + 2);
  expect(errors).toEqual([]);
  await context.close();
});

test('Main site navigation and clean links', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('footer.ex-footer')).toHaveCount(1);
  await expect(page.locator('#ex-mobile-menu')).toHaveAttribute('hidden', '');
  const result = await page.evaluate(() => Array.from(document.querySelectorAll('a[href^="#"]')).filter(a => {
    const id = a.getAttribute('href').slice(1);
    return id && !document.getElementById(id);
  }).map(a => a.getAttribute('href')));
  expect(result).toEqual([]);
});
