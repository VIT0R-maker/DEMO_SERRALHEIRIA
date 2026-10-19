import { test, expect } from '@playwright/test';
import { recordIntro, expectSiteAvailable } from './helpers/intro';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordIntro(page);
});

test.use({
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ['--autoplay-policy=document-user-activation-required'],
  },
});

test('bloqueio real mantém o poster e inicia com som após Enter', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('.intro-gate');
  const video = page.locator('.intro-gate-video');
  await expect(overlay).toHaveAttribute('data-phase', 'blocked');
  const start = page.getByRole('button', { name: 'Abrir o portão', exact: true });
  const skip = page.getByRole('button', { name: 'Pular introdução', exact: true });
  await expect(start).toBeFocused();
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBe(0);
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  await page.keyboard.press('Shift+Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(start).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(overlay).toHaveAttribute('data-phase', 'playing');
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  await expectSiteAvailable(page);
  await expect(overlay).toHaveCount(0, { timeout: 6000 });
  expect(await page.evaluate(() => window.__introAudit.filter(entry => entry.kind === 'event' && entry.value === 'play'))).toHaveLength(1);
});

test('o visitante também pode pular a abertura bloqueada', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'blocked');
  await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
  await expectSiteAvailable(page);
  await expect(page.locator('.intro-gate-video')).toHaveCount(0);
  expect(await page.evaluate(() => window.__introAudit.some(entry => entry.value === 'play'))).toBe(false);
});
