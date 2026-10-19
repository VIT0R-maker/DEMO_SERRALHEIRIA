import { test, expect } from '@playwright/test';
import type { Route } from '@playwright/test';

import { recordIntro, expectSiteAvailable } from './helpers/intro';

const sessionKey = 'ferro-forma:intro:v3';
const mediaRoute = '**/media/gate-*-v3.mp4';

// The recordings retain the actual moving transition for visual review.
test.use({
  video: 'on',
  launchOptions: {
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}),
    args: ['--autoplay-policy=no-user-gesture-required'],
  },
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordIntro(page);
});

for (const film of [
  { name: 'desktop', width: 1440, height: 900, videoWidth: 1920, videoHeight: 1080, visual: 1.6, audio: 4.179002 },
  { name: 'mobile', width: 390, height: 844, videoWidth: 1080, videoHeight: 1920, visual: 1.8, audio: 4.04 },
]) {
  test(film.name + ': imagem termina no tempo certo e áudio continua até o fim original', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: film.width, height: film.height });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    const overlay = page.locator('.intro-gate');
    const video = page.locator('.intro-gate-video');
    const site = page.locator('.intro-site');
    await expect(overlay).toHaveAttribute('data-phase', 'playing');
    const handle = await video.elementHandle();
    const playback = await video.evaluate(element => {
      const media = element as HTMLVideoElement;
      return { muted: media.muted, volume: media.volume, inline: media.playsInline,
        controls: media.controls, loop: media.loop, rate: media.playbackRate,
        width: media.videoWidth, height: media.videoHeight, duration: media.duration,
        source: new URL(media.currentSrc).pathname };
    });
    expect(playback).toMatchObject({ muted: false, volume: 1, inline: true, controls: false, loop: false, rate: 1, width: film.videoWidth, height: film.videoHeight });
    expect(playback.duration).toBeCloseTo(film.audio, 4);
    expect(playback.source).toBe(new URL('media/gate-' + film.name + '-v3.mp4', page.url()).pathname);
    await expect(page.getByRole('button', { name: /Ativar som|Silenciar/ })).toHaveCount(0);
    await expect(overlay).toHaveCSS('opacity', '1');
    await expect(site).toHaveAttribute('inert', '');
    await site.locator('a').first().evaluate(element => (element as HTMLElement).focus());
    expect(await site.evaluate(element => element.contains(document.activeElement))).toBe(false);
    await page.keyboard.press('PageDown');
    expect(await page.evaluate(() => scrollY)).toBe(0);
    const heroLeft = await page.locator('.hero').evaluate(element => element.getBoundingClientRect().left);
    await page.screenshot({ path: testInfo.outputPath('intro-playing.png') });

    await expect(overlay).toHaveAttribute('data-phase', 'revealing');
    await expect(overlay).toHaveCSS('transition-duration', '0.65s');
    const revealAudit = await page.evaluate(() => window.__introAudit);
    const reveal = revealAudit.find(entry => entry.kind === 'phase' && entry.value === 'revealing');
    expect(reveal!.currentTime).toBeGreaterThanOrEqual(film.visual);
    expect(reveal!.currentTime).toBeLessThan(film.visual + 0.1);
    expect(reveal!.ended).toBe(false);
    expect(revealAudit.some(entry => entry.kind === 'event' && entry.value === 'ended')).toBe(false);
    await expect(video).toHaveCSS('opacity', '0');
    await expectSiteAvailable(page);
    await expect(overlay).toHaveCSS('pointer-events', 'none');
    await expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(await handle!.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false);
    expect(await handle!.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
    expect(await page.locator('.hero').evaluate(element => element.getBoundingClientRect().left)).toBeCloseTo(heroLeft, 0);
    await page.screenshot({ path: testInfo.outputPath('intro-completed-with-audio.png') });

    // The revealed page accepts navigation while the original soundtrack finishes.
    await page.getByRole('link', { name: 'Solicitar orçamento', exact: true }).click();
    await expect(page).toHaveURL(/#contato$/);
    expect(await handle!.evaluate(element => (element as HTMLVideoElement).paused)).toBe(false);
    await expect.poll(() => handle!.evaluate(element => (element as HTMLVideoElement).ended)).toBe(true);
    expect(await handle!.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(film.audio, 4);
    await expect(overlay).toHaveCount(0);
    const audit = await page.evaluate(() => window.__introAudit);
    expect(audit.filter(entry => entry.kind === 'event' && entry.value === 'play')).toHaveLength(1);
    expect(audit.filter(entry => entry.kind === 'phase' && entry.value === 'revealing')).toHaveLength(1);
    const ended = audit.find(entry => entry.kind === 'event' && entry.value === 'ended');
    const done = audit.find(entry => entry.kind === 'phase' && entry.value === 'done');
    expect(ended!.at).toBeGreaterThan(done!.at);
    expect(audit.filter(entry => entry.kind === 'frame' && entry.value === 'playing').every(entry => Number(entry.opacity) === 1)).toBe(true);
    expect(audit.some(entry => entry.kind === 'frame' && entry.value === 'revealing' && Number(entry.opacity) > 0 && Number(entry.opacity) < 0.9)).toBe(true);
    await testInfo.attach('intro-events', { body: JSON.stringify(audit, null, 2), contentType: 'application/json' });
    expect(await page.evaluate(key => sessionStorage.getItem(key), sessionKey)).toBe('seen');
    expect(errors).toEqual([]);
  });
}

test('celular em paisagem usa o filme vertical e só baixa a variante selecionada', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  try {
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', request => { if (/gate-.*-v3\\.mp4/.test(request.url())) requests.push(request.url()); });
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
    await expect(page.locator('.intro-gate-video')).toHaveAttribute('src', /gate-mobile-v3\\.mp4$/);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.every(url => url.endsWith('gate-mobile-v3.mp4'))).toBe(true);
    await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
    await expectSiteAvailable(page);
  } finally { await context.close(); }
});

test('pular pelo teclado interrompe o vídeo, libera rolagem e transfere foco para o conteúdo', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  const video = await page.locator('.intro-gate-video').elementHandle();
  const skip = page.getByRole('button', { name: 'Pular introdução', exact: true });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expectSiteAvailable(page, 1500);
  await expect(page.locator('main#conteudo')).toBeFocused();
  expect(await video!.evaluate((element) => (element as HTMLVideoElement).paused)).toBe(true);
  expect(await page.evaluate(() => window.__introAudit.some((entry) => entry.value === 'ended'))).toBe(false);
  await page.getByRole('link', { name: 'Solicitar orçamento', exact: true }).click();
  await expect(page).toHaveURL(/#contato$/);
  await expect(page.locator('#quote-name')).toBeEditable();
});

test('a mesma sessão não repete a introdução; um contexto novo volta a exibi-la', async ({ page, browser, baseURL }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
  await expectSiteAvailable(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectSiteAvailable(page);
  expect(await page.evaluate(() => window.__introAudit.filter((entry) => entry.value === 'play'))).toEqual([]);

  const freshContext = await browser.newContext({ baseURL, reducedMotion: 'no-preference' });
  try {
    const freshPage = await freshContext.newPage();
    await freshPage.goto('./', { waitUntil: 'domcontentloaded' });
    await expect(freshPage.locator('.intro-gate')).toBeVisible();
    await freshPage.getByRole('button', { name: 'Pular introdução', exact: true }).click();
    await expectSiteAvailable(freshPage);
  } finally {
    await freshContext.close();
  }
});

test('acesso direto a #contato prioriza a âncora e não reproduz a introdução', async ({ page }) => {
  await page.goto('./#contato');
  await expectSiteAvailable(page);
  await expect(page.locator('#contato')).toBeInViewport();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__introAudit.some((entry) => entry.value === 'play'))).toBe(false);
});

test('movimento reduzido apresenta diretamente a página', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expectSiteAvailable(page);
  await expect(page.locator('.intro-gate-video')).toHaveCount(0);
  expect(await page.evaluate(() => window.__introAudit.some((entry) => entry.value === 'play'))).toBe(false);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('sessionStorage indisponível não impede a reprodução nem a liberação da página', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() { throw new DOMException('Storage blocked for this test', 'SecurityError'); },
    });
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  await page.getByRole('button', { name: 'Pular introdução', exact: true }).click();
  await expectSiteAvailable(page);
  expect(errors).toEqual([]);
});

test('erro de reprodução libera a página sem exigir interação', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException('Unsupported media for this test', 'NotSupportedError'));
    };
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expectSiteAvailable(page, 3000);
  expect(errors).toEqual([]);
});

for (const mediaFailure of ['ausente', 'inválido'] as const) {
  test(`vídeo ${mediaFailure} libera o site automaticamente`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route(mediaRoute, (route) => route.fulfill({
      status: mediaFailure === 'ausente' ? 404 : 200,
      contentType: 'video/mp4',
      body: mediaFailure === 'ausente' ? '' : 'invalid-media-for-decoder-recovery-test',
    }));
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expectSiteAvailable(page, 3500);
    expect(errors).toEqual([]);
  });
}

test('carregamento sem resposta tem limite de espera e mantém o botão de pular disponível', async ({ page }) => {
  const pendingRoutes: Route[] = [];
  await page.route(mediaRoute, (route) => { pendingRoutes.push(route); });
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => pendingRoutes.length).toBeGreaterThan(0);
    await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'loading');
    await expect(page.getByRole('button', { name: 'Pular introdução', exact: true })).toBeVisible();
    await expectSiteAvailable(page, 7500);
    expect(await page.evaluate(() => window.__introAudit.some((entry) => entry.value === 'ended'))).toBe(false);
  } finally {
    await Promise.all(pendingRoutes.map((route) => route.abort().catch(() => {})));
  }
});

test('reprodução sem progresso aciona recuperação em vez de prender o visitante', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  await page.locator('.intro-gate-video').evaluate((element) => (element as HTMLVideoElement).pause());
  await expectSiteAvailable(page, 6500);
  expect(await page.evaluate(() => window.__introAudit.some((entry) => entry.value === 'ended'))).toBe(false);
});

test('redimensionar e girar a tela preserva o elemento e o progresso da reprodução', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const video = page.locator('.intro-gate-video');
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  let previousTime = await video.evaluate((element) => {
    element.setAttribute('data-test-original-video', 'true');
    return (element as HTMLVideoElement).currentTime;
  });

  for (const viewport of [{ width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await expect(video).toHaveAttribute('data-test-original-video', 'true');
    const currentTime = await video.evaluate((element) => (element as HTMLVideoElement).currentTime);
    expect(currentTime).toBeGreaterThanOrEqual(previousTime);
    previousTime = currentTime;
  }

  await expectSiteAvailable(page, 6500);
  const playEvents = await page.evaluate(() => window.__introAudit.filter((entry) => entry.kind === 'event' && entry.value === 'play'));
  expect(playEvents).toHaveLength(1);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 360, height: 800 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
]) {
  test(`enquadramento e página liberada em ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    const overlay = page.locator('.intro-gate');
    const video = page.locator('.intro-gate-video');
    await expect(overlay).toHaveAttribute('data-phase', 'playing');
    await expect(overlay).toHaveCSS('position', 'fixed');
    await expect(overlay).toHaveCSS('opacity', '1');
    await expect(video).toHaveCSS('object-fit', 'cover');
    const bounds = await overlay.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBeGreaterThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    expect(bounds!.height).toBe(viewport.height);
    const skipBounds = await page.getByRole('button', { name: 'Pular introdução', exact: true }).boundingBox();
    expect(skipBounds!.width).toBeGreaterThanOrEqual(44);
    expect(skipBounds!.height).toBeGreaterThanOrEqual(44);
    expect(skipBounds!.x).toBeGreaterThanOrEqual(0);
    expect(skipBounds!.x + skipBounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(skipBounds!.y + skipBounds!.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByRole('button', { name: /Ativar som|Silenciar/ })).toHaveCount(0);
    await expect(video).toHaveAttribute('src', viewport.width < 768 ? /gate-mobile-v3\\.mp4$/ : /gate-desktop-v3\\.mp4$/);
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.35);
    await page.screenshot({ path: testInfo.outputPath(`intro-${viewport.width}x${viewport.height}.png`) });
    await expectSiteAvailable(page, 6500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`site-${viewport.width}x${viewport.height}.png`) });
  });
}
