import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export async function openGate(page: Page) {
  const handle = page.getByRole('button', { name: /Arraste o portão para a direita/ });
  await expect(handle).toBeVisible();
  const bounds = await handle.boundingBox();
  const x = bounds!.x + bounds!.width / 2, y = bounds!.y + bounds!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y, { steps: 8 });
  await page.mouse.up();
}

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

export async function recordIntro(page: Page) {
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

export async function expectSiteAvailable(page: Page, timeout = 5000) {
  await expect(page.locator('.intro-gate[role="dialog"]')).toHaveCount(0, { timeout });
  await expect(page.locator('main#conteudo')).toBeVisible();
  await expect.poll(() => page.locator('.intro-site').evaluate((element) => (element as HTMLElement).inert)).toBe(false);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).not.toBe('hidden');
}
