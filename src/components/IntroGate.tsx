import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { introConfig } from '../introConfig';
import './IntroGate.css';

type Phase = 'ready' | 'loading' | 'playing' | 'revealing' | 'done';

function shouldShowIntro() {
  if (window.location.hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (introConfig.frequency === 'always') return true;
  try {
    return sessionStorage.getItem(introConfig.storageKey) !== 'seen';
  } catch {
    return true;
  }
}

export default function IntroGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() => shouldShowIntro() ? 'ready' : 'done');
  // Select once: resizing/rotating must not replace the playing media or its audio.
  const [media] = useState(() => window.matchMedia(introConfig.mobileQuery).matches ? introConfig.media.mobile : introConfig.media.desktop);
  const [mediaActive, setMediaActive] = useState(phase !== 'done');
  const [fadeMs, setFadeMs] = useState(introConfig.fadeMs);
  const [handlePosition, setHandlePosition] = useState({ x: 0, y: 0, objectPosition: '50% 50%' });
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const phaseRef = useRef(phase);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const attemptedAt = useRef(0);
  const active = phase !== 'done';

  const complete = useCallback(() => {
    if (phaseRef.current === 'done') return;
    restoreFocus.current ||= overlayRef.current?.contains(document.activeElement) ?? false;
    phaseRef.current = 'done';
    setPhase('done');
    // Keep the same media element playing until its original audio reaches ended.
  }, []);

  const reveal = useCallback((quick = false) => {
    if (phaseRef.current === 'done' || phaseRef.current === 'revealing') return;
    phaseRef.current = 'revealing';
    setFadeMs(quick ? introConfig.skipFadeMs : introConfig.fadeMs);
    setPhase('revealing');
  }, []);

  const stopMedia = useCallback(() => {
    videoRef.current?.pause();
    setMediaActive(false);
  }, []);

  const skip = useCallback(() => {
    stopMedia();
    if (phaseRef.current === 'revealing') complete();
    else reveal(true);
  }, [stopMedia, complete, reveal]);

  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video || phaseRef.current !== 'ready') return;
    restoreFocus.current ||= overlayRef.current?.contains(document.activeElement) ?? false;
    attemptedAt.current = performance.now();
    phaseRef.current = 'loading';
    setPhase('loading');
    video.muted = false;
    video.volume = 1;
    void video.play().catch((error: unknown) => {
      if (videoRef.current !== video || phaseRef.current !== 'loading') return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // Keep the gate closed for another real gesture; never play silently.
        phaseRef.current = 'ready';
        setPhase('ready');
      } else {
        skip();
      }
    });
  }, [skip]);

  useLayoutEffect(() => {
    if (!active) {
      if (restoreFocus.current) {
        document.getElementById('conteudo')?.focus({ preventScroll: true });
        restoreFocus.current = false;
      }
      if (window.location.hash) {
        try {
          document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' });
        } catch { /* A malformed fragment must not interrupt the page. */ }
      }
      return;
    }
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    if (scrollbarWidth > 0) body.style.paddingRight = String(parseFloat(getComputedStyle(body).paddingRight) + scrollbarWidth) + 'px';
    body.style.overflow = 'hidden';
    skipRef.current?.focus({ preventScroll: true });
    try { sessionStorage.setItem(introConfig.storageKey, 'seen'); } catch { /* Storage is optional. */ }
    return () => { body.style.overflow = previousOverflow; body.style.paddingRight = previousPadding; };
  }, [active]);

  useEffect(() => {
    if (phase === 'ready') skipRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useLayoutEffect(() => {
    const overlay = overlayRef.current;
    if (!active || !overlay) return;
    const positionHandle = () => {
      const width = overlay.clientWidth, height = overlay.clientHeight;
      const scale = Math.max(width / media.width, height / media.height);
      const renderedWidth = media.width * scale, renderedHeight = media.height * scale;
      // Use the same cover geometry for the film and its handle. Pan only when
      // the usual centered crop would hide the handle (e.g. portrait tablets).
      const place = (viewport: number, rendered: number, anchor: number) => {
        const overflow = viewport - rendered;
        const offset = Math.min(0, Math.max(overflow, Math.min(viewport - 80 - anchor, Math.max(80 - anchor, overflow / 2))));
        return { coordinate: offset + anchor, percent: overflow ? offset / overflow * 100 : 50 };
      };
      const x = place(width, renderedWidth, media.handle.x * scale);
      const y = place(height, renderedHeight, media.handle.y * scale);
      setHandlePosition({ x: x.coordinate, y: y.coordinate, objectPosition: x.percent + '% ' + y.percent + '%' });
    };
    positionHandle();
    const observer = new ResizeObserver(positionHandle);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [active, media]);

  useEffect(() => {
    if (!mediaActive) return;
    const video = videoRef.current;
    if (!video) { skip(); return; }
    let progressedAt = performance.now();
    let lastTime = video.currentTime;
    const watchdog = window.setInterval(() => {
      const now = performance.now();
      if (phaseRef.current === 'ready') { progressedAt = now; return; }
      if (video.currentTime > lastTime + 0.005) { lastTime = video.currentTime; progressedAt = now; }
      const loadingExpired = phaseRef.current === 'loading' && now - attemptedAt.current >= introConfig.loadingTimeoutMs;
      const stalled = phaseRef.current !== 'loading' && now - progressedAt >= introConfig.stalledTimeoutMs;
      if (loadingExpired || stalled || now - attemptedAt.current >= introConfig.maxWaitMs) skip();
    }, 250);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const endImmediately = () => { stopMedia(); complete(); };
    const motionChanged = () => { if (motion.matches) endImmediately(); };
    const hashChanged = () => { if (window.location.hash && phaseRef.current !== 'done') endImmediately(); };
    motion.addEventListener('change', motionChanged);
    window.addEventListener('hashchange', hashChanged);
    return () => {
      clearInterval(watchdog);
      motion.removeEventListener('change', motionChanged);
      window.removeEventListener('hashchange', hashChanged);
      video.pause();
    };
  }, [mediaActive, skip, stopMedia, complete]);

  useEffect(() => {
    if (phase !== 'playing') return;
    let frame: number;
    const checkVisualEnd = () => {
      if ((videoRef.current?.currentTime ?? 0) >= media.animationSeconds) reveal();
      else frame = requestAnimationFrame(checkVisualEnd);
    };
    frame = requestAnimationFrame(checkVisualEnd);
    return () => cancelAnimationFrame(frame);
  }, [phase, media.animationSeconds, reveal]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    const timeout = window.setTimeout(complete, fadeMs + 100);
    return () => clearTimeout(timeout);
  }, [phase, fadeMs, complete]);

  return <>
    <div className="intro-site" inert={active} aria-hidden={active ? true : undefined}>{children}</div>
    {(active || mediaActive) && <div
      ref={overlayRef}
      className="intro-gate"
      data-phase={phase}
      data-variant={media === introConfig.media.mobile ? 'mobile' : 'desktop'}
      data-dragging={dragOffset !== null ? 'true' : undefined}
      role={active ? 'dialog' : undefined}
      aria-modal={active ? true : undefined}
      aria-label={active ? 'Introdução do site' : undefined}
      aria-hidden={!active ? true : undefined}
      style={{
        '--intro-fade-ms': fadeMs + 'ms',
        '--intro-handle-x': handlePosition.x + 'px',
        '--intro-handle-y': handlePosition.y + 'px',
        '--intro-video-position': handlePosition.objectPosition,
        '--intro-drag-offset': (dragOffset ?? 0) + 'px',
      } as CSSProperties}
      onPointerDown={event => {
        if (phaseRef.current !== 'ready' || !event.isPrimary || event.button !== 0 || (event.target as Element).closest('.intro-gate-controls')) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        setDragOffset(0);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const origin = drag.current;
        if (origin?.id === event.pointerId) setDragOffset(Math.min(24, Math.max(0, (event.clientX - origin.x) / 3)));
      }}
      onPointerUp={event => {
        const origin = drag.current;
        if (!origin || origin.id !== event.pointerId) return;
        const dx = event.clientX - origin.x, dy = Math.abs(event.clientY - origin.y);
        drag.current = null;
        setDragOffset(null);
        const threshold = Math.min(72, Math.max(40, event.currentTarget.clientWidth * 0.1));
        // Start inside pointerup so touch devices retain audible-playback permission.
        if (dx >= threshold && dx > dy * 1.35) startPlayback();
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; setDragOffset(null); }}
      onLostPointerCapture={() => { drag.current = null; setDragOffset(null); }}
      onTransitionEnd={event => {
        if (event.target === event.currentTarget && event.propertyName === 'opacity' && phaseRef.current === 'revealing') complete();
      }}
      onKeyDown={event => {
        if (event.key === 'Tab') {
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === 'Escape') { event.preventDefault(); stopMedia(); complete(); }
      }}
    >
      {mediaActive && <video
        ref={videoRef}
        className="intro-gate-video"
        src={import.meta.env.BASE_URL + media.videoPath}
        poster={import.meta.env.BASE_URL + media.posterPath}
        width={media.width}
        height={media.height}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          if (phaseRef.current === 'loading') { phaseRef.current = 'playing'; setPhase('playing'); }
        }}
        onTimeUpdate={event => { if (event.currentTarget.currentTime >= media.animationSeconds) reveal(); }}
        onEnded={() => { setMediaActive(false); reveal(); }}
        onError={skip}
      />}
      {active && <>
        {phase === 'ready' && <button
          ref={startRef}
          className="intro-gate-handle"
          type="button"
          aria-label="Arraste o portão para a direita. Pelo teclado, pressione Enter para abrir."
          onClick={event => { if (event.detail === 0) startPlayback(); }}
          onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); startPlayback(); } }}
        >
          <svg aria-hidden="true" viewBox="0 0 88 48" fill="none"><path d="M14 24h54M54 10l14 14-14 14" /></svg>
        </button>}
        <div className="intro-gate-controls">
          <button ref={skipRef} className="intro-gate-control intro-gate-skip" type="button" onClick={skip}>Pular introdução<span aria-hidden="true">↗</span></button>
        </div>
      </>}
    </div>}
  </>;
}
