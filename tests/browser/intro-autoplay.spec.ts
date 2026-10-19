import { test, expect } from '@playwright/test';
import { recordIntro, expectSiteAvailable, openGate } from './helpers/intro';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordIntro(page);
});

test.use({
  video: 'on',
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ['--autoplay-policy=document-user-activation-required'],
  },
});

test('arrastar para a direita inicia com áudio sob a política real de interação', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('.intro-gate');
  const video = page.locator('.intro-gate-video');
  await expect(overlay).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator('.intro-gate-start')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Abrir o portão', exact: true })).toHaveCount(0);
  await expect(page.locator('.intro-gate-handle svg')).toHaveCSS('animation-name', 'gate-pull-hint');
  const initialArrowTransform = await page.locator('.intro-gate-handle svg').evaluate(element => getComputedStyle(element).transform);
  await expect.poll(() => page.locator('.intro-gate-handle svg').evaluate(element => getComputedStyle(element).transform)).not.toBe(initialArrowTransform);
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBe(0);
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  await openGate(page);
  await expect(overlay).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('.intro-gate-handle')).toHaveCount(0);
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  await expectSiteAvailable(page);
  await expect(overlay).toHaveCount(0, { timeout: 6000 });
  expect(await page.evaluate(() => window.__introAudit.filter(entry => entry.kind === 'event' && entry.value === 'play'))).toHaveLength(1);
});

test('toques, arrastos curtos, verticais e para a esquerda não abrem o portão', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const handle = page.locator('.intro-gate-handle');
  await handle.click();
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'ready');
  const b = await handle.boundingBox();
  const x = b!.x + b!.width / 2, y = b!.y + b!.height / 2;
  for (const [dx, dy] of [[18, 0], [-100, 0], [70, 130]]) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'ready');
  }
  expect(await page.locator('.intro-gate-video').evaluate(element => (element as HTMLVideoElement).currentTime)).toBe(0);
  await openGate(page);
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  await page.keyboard.press('Escape');
  await expectSiteAvailable(page);
});

test('a seta também abre pelo teclado e preserva a contenção de foco', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const skip = page.getByRole('button', { name: 'Pular introdução', exact: true });
  const handle = page.getByRole('button', { name: /Arraste o portão para a direita/ });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(handle).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  await expectSiteAvailable(page);
  await expect(page.locator('main#conteudo')).toBeFocused();
});

test('pular enquanto espera pelo gesto encerra a introdução sem tocar áudio', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'ready');
  await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
  await expectSiteAvailable(page);
  await expect(page.locator('.intro-gate-video')).toHaveCount(0);
  expect(await page.evaluate(() => window.__introAudit.some(entry => entry.value === 'play'))).toBe(false);
});

test('gesto de toque no celular abre com áudio e cancelamento não inicia playback', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  try {
    const page = await context.newPage();
    await recordIntro(page);
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    const arrow = page.locator('.intro-gate-handle');
    const b = await arrow.boundingBox();
    const x = b!.x + b!.width / 2, y = b!.y + b!.height / 2;
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'ready');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 90, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
    await expect(page.locator('.intro-gate-video')).toHaveAttribute('src', /gate-mobile-v3\.mp4$/);
    expect(await page.locator('.intro-gate-video').evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
    await expectSiteAvailable(page);
    await expect(page.locator('.intro-gate')).toHaveCount(0, { timeout: 6000 });
  } finally { await context.close(); }
});
