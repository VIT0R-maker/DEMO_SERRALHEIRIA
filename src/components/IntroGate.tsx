import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { introConfig } from '../introConfig';
import './IntroGate.css';

type Phase = 'loading' | 'blocked' | 'playing' | 'revealing' | 'done';

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
  const [phase, setPhase] = useState<Phase>(() => shouldShowIntro() ? 'loading' : 'done');
  // Select once: resizing/rotating must not replace the playing media or its audio.
  const [media] = useState(() => window.matchMedia(introConfig.mobileQuery).matches ? introConfig.media.mobile : introConfig.media.desktop);
  const [mediaActive, setMediaActive] = useState(phase !== 'done');
  const [fadeMs, setFadeMs] = useState(introConfig.fadeMs);
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
    restoreFocus.current = overlayRef.current?.contains(document.activeElement) ?? false;
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
    if (!video || !['loading', 'blocked'].includes(phaseRef.current)) return;
    attemptedAt.current = performance.now();
    phaseRef.current = 'loading';
    setPhase('loading');
    video.muted = false;
    video.volume = 1;
    void video.play().catch((error: unknown) => {
      if (videoRef.current !== video || !['loading', 'blocked'].includes(phaseRef.current)) return;
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // Audible playback may require a real gesture. Never silently play instead.
        phaseRef.current = 'blocked';
        setPhase('blocked');
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
    if (phase === 'blocked') startRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    if (!mediaActive) return;
    const video = videoRef.current;
    if (!video) { skip(); return; }
    let progressedAt = performance.now();
    let lastTime = video.currentTime;
    const startFrame = requestAnimationFrame(startPlayback);
    const watchdog = window.setInterval(() => {
      const now = performance.now();
      if (phaseRef.current === 'blocked') { progressedAt = now; return; }
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
      cancelAnimationFrame(startFrame);
      clearInterval(watchdog);
      motion.removeEventListener('change', motionChanged);
      window.removeEventListener('hashchange', hashChanged);
      video.pause();
    };
  }, [mediaActive, startPlayback, skip, stopMedia, complete]);

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
      role={active ? 'dialog' : undefined}
      aria-modal={active ? true : undefined}
      aria-label={active ? 'Introdução do site' : undefined}
      aria-hidden={!active ? true : undefined}
      style={{ '--intro-fade-ms': fadeMs + 'ms' } as CSSProperties}
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
          if (['loading', 'blocked'].includes(phaseRef.current)) { phaseRef.current = 'playing'; setPhase('playing'); }
        }}
        onTimeUpdate={event => { if (event.currentTarget.currentTime >= media.animationSeconds) reveal(); }}
        onEnded={() => { setMediaActive(false); reveal(); }}
        onError={skip}
      />}
      {active && <>
        {phase === 'blocked' && <div className="intro-gate-start">
          <span>FERRO & FORMA</span>
          <button ref={startRef} className="intro-gate-control" type="button" onClick={startPlayback}>Abrir o portão <span aria-hidden="true">→</span></button>
          <p>Toque para iniciar a experiência.</p>
        </div>}
        <div className="intro-gate-controls">
          <button ref={skipRef} className="intro-gate-control intro-gate-skip" type="button" onClick={skip}>Pular introdução<span aria-hidden="true">↗</span></button>
        </div>
      </>}
    </div>}
  </>;
}
