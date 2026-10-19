import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

const sessionKey = 'ferro-forma:intro:v2';
const mediaRoute = '**/media/gate-intro.mp4';

interface IntroAuditEntry {
  kind: 'phase' | 'event' | 'frame';
  value: string;
  at: number;
  currentTime: number | null;
  duration: number | null;
  ended: boolean | null;
  opacity?: string;
  videoVisibility?: string;
}

declare global {
  interface Window {
    __introAudit: IntroAuditEntry[];
  }
}

async function recordIntro(page: Page) {
  await page.addInitScript(() => {
    window.__introAudit = [];
    let previousPhase: string | null = null;

    const record = (kind: 'phase' | 'event' | 'frame', value: string) => {
      const video = document.querySelector<HTMLVideoElement>('.intro-gate-video');
      const overlay = document.querySelector<HTMLElement>('.intro-gate');
      window.__introAudit.push({
        kind,
        value,
        at: performance.now(),
        currentTime: video?.currentTime ?? null,
        duration: video && Number.isFinite(video.duration) ? video.duration : null,
        ended: video?.ended ?? null,
        opacity: overlay ? getComputedStyle(overlay).opacity : undefined,
        videoVisibility: video ? getComputedStyle(video).visibility : undefined,
      });
    };

    for (const event of ['play', 'playing', 'ended', 'pause', 'error']) {
      document.addEventListener(event, (event) => {
        if (event.target instanceof HTMLVideoElement && event.target.classList.contains('intro-gate-video')) {
          record('event', event.type);
        }
      }, true);
    }

    new MutationObserver(() => {
      const overlay = document.querySelector<HTMLElement>('.intro-gate');
      const phase = overlay?.dataset.phase ?? (previousPhase ? 'removed' : null);
      if (phase && phase !== previousPhase) {
        previousPhase = phase;
        record('phase', phase);
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase'] });

    let sawOverlay = false;
    const inspectRenderedFrame = () => {
      const overlay = document.querySelector<HTMLElement>('.intro-gate');
      if (overlay) {
        sawOverlay = true;
        const phase = overlay.dataset.phase;
        if (phase === 'playing' || phase === 'revealing') record('frame', phase);
      } else if (sawOverlay || (document.querySelector('.intro-site') && document.readyState !== 'loading')) {
        return;
      }
      requestAnimationFrame(inspectRenderedFrame);
    };
    requestAnimationFrame(inspectRenderedFrame);
  });
}

async function expectSiteAvailable(page: Page, timeout = 5000) {
  await expect(page.locator('.intro-gate')).toHaveCount(0, { timeout });
  await expect(page.locator('main#conteudo')).toBeVisible();
  await expect.poll(() => page.locator('.intro-site').evaluate((element) => (element as HTMLElement).inert)).toBe(false);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
}

// The recordings retain the actual moving transition for visual review.
test.use({ video: 'on' });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await recordIntro(page);
});

test('vídeo real termina antes da revelação branca, sem expor ou liberar o site durante a abertura', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  const overlay = page.locator('.intro-gate');
  const video = page.locator('.intro-gate-video');
  const site = page.locator('.intro-site');

  await expect(overlay).toHaveAttribute('data-phase', 'playing');
  await expect(overlay).toHaveCSS('opacity', '1');
  // The supplied video's white matte can be 253 rather than 255 after decoding.
  const whiteMatte = await overlay.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(whiteMatte).toMatch(/^rgb\((253|254|255), (253|254|255), (253|254|255)\)$/);
  await expect(site).toHaveAttribute('inert', '');
  const playback = await video.evaluate((element) => {
    const media = element as HTMLVideoElement;
    return {
      autoplay: media.autoplay, muted: media.muted, inline: media.playsInline,
      controls: media.controls, loop: media.loop, rate: media.playbackRate,
      width: media.videoWidth, height: media.videoHeight, duration: media.duration,
      source: new URL(media.currentSrc).pathname, poster: new URL(media.poster).pathname,
    };
  });
  expect(playback).toMatchObject({ autoplay: true, muted: true, inline: true, controls: false, loop: false, rate: 1, width: 1920, height: 1080 });
  expect(playback.duration).toBeGreaterThan(1.55);
  expect(playback.duration).toBeLessThan(1.7);
  expect(playback.source).toBe(new URL('media/gate-intro.mp4', page.url()).pathname);
  expect(playback.poster).toBe(new URL('media/gate-poster.webp', page.url()).pathname);

  await site.locator('a').first().evaluate((element) => (element as HTMLElement).focus());
  expect(await site.evaluate((element) => element.contains(document.activeElement))).toBe(false);
  await page.keyboard.press('PageDown');
  expect(await page.evaluate(() => scrollY)).toBe(0);
  // The page and its hero load beneath the opaque overlay, independently of the video.
  await expect.poll(() => page.locator('.hero-visual img').evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const heroLeft = await page.locator('.hero').evaluate((element) => element.getBoundingClientRect().left);
  await page.screenshot({ path: testInfo.outputPath('intro-playing.png') });

  await expect(overlay).toHaveAttribute('data-phase', 'revealing', { timeout: 5000 });
  await expect(overlay).toHaveCSS('transition-duration', '0.65s');
  const auditAtReveal = await page.evaluate(() => window.__introAudit);
  const ended = auditAtReveal.find((entry) => entry.kind === 'event' && entry.value === 'ended');
  const reveal = auditAtReveal.find((entry) => entry.kind === 'phase' && entry.value === 'revealing');
  expect(ended, JSON.stringify(auditAtReveal)).toBeDefined();
  expect(reveal).toBeDefined();
  expect(reveal!.at).toBeGreaterThanOrEqual(ended!.at);
  expect(reveal!.ended).toBe(true);
  await expect(video).toHaveCSS('visibility', 'hidden');
  await page.screenshot({ path: testInfo.outputPath('intro-white-reveal.png') });
  await expectSiteAvailable(page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  expect(await page.locator('.hero').evaluate((element) => element.getBoundingClientRect().left)).toBeCloseTo(heroLeft, 0);
  const completedAudit = await page.evaluate(() => window.__introAudit);
  expect(completedAudit.filter((entry) => entry.kind === 'event' && entry.value === 'play')).toHaveLength(1);
  expect(completedAudit.filter((entry) => entry.kind === 'phase' && entry.value === 'revealing')).toHaveLength(1);
  const playbackFrames = completedAudit.filter((entry) => entry.kind === 'frame' && entry.value === 'playing');
  expect(playbackFrames.length).toBeGreaterThan(1);
  expect(playbackFrames.every((entry) => Number(entry.opacity) === 1)).toBe(true);
  const fadeFrames = completedAudit.filter((entry) => entry.kind === 'frame' && entry.value === 'revealing');
  expect(fadeFrames.filter((entry) => Number(entry.opacity) > 0 && Number(entry.opacity) < 0.95).length).toBeGreaterThan(1);
  expect(fadeFrames.some((entry) => Number(entry.opacity) < 0.1)).toBe(true);
  await testInfo.attach('intro-events-and-rendered-frames', { body: JSON.stringify(completedAudit, null, 2), contentType: 'application/json' });
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).not.toBeNull();
  await page.screenshot({ path: testInfo.outputPath('intro-completed.png') });
  expect(pageErrors).toEqual([]);
});

test('som pode ser ativado e silenciado pelo teclado sem reiniciar a animação', async ({ page }) => {
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.intro-gate')).toHaveAttribute('data-phase', 'playing');
  const video = page.locator('.intro-gate-video');
  const startTime = await video.evaluate(element => (element as HTMLVideoElement).currentTime);
  const skip = page.getByRole('button', { name: 'Pular introdução', exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab');
  const sound = page.getByRole('button', { name: 'Ativar som', exact: true });
  await expect(sound).toBeFocused();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Enter');
  const mute = page.getByRole('button', { name: 'Silenciar', exact: true });
  await expect(mute).toHaveAttribute('aria-pressed', 'true');
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(false);
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeGreaterThanOrEqual(startTime);
  await page.keyboard.press('Enter');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  expect(await video.evaluate(element => (element as HTMLVideoElement).muted)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(skip).toBeFocused();
  await expectSiteAvailable(page);
  expect(await page.evaluate(() => window.__introAudit.filter(entry => entry.kind === 'event' && entry.value === 'play'))).toHaveLength(1);
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

test('rejeição de play revela a página sem exigir interação', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException('Autoplay blocked for this test', 'NotAllowedError'));
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
    const soundBounds = await page.getByRole('button', { name: 'Ativar som', exact: true }).boundingBox();
    expect(soundBounds!.height).toBeGreaterThanOrEqual(44);
    expect(soundBounds!.x).toBeGreaterThanOrEqual(0);
    expect(soundBounds!.x + soundBounds!.width).toBeLessThan(skipBounds!.x);
    await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.35);
    await page.screenshot({ path: testInfo.outputPath(`intro-${viewport.width}x${viewport.height}.png`) });
    await expectSiteAvailable(page, 6500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`site-${viewport.width}x${viewport.height}.png`) });
  });
}
