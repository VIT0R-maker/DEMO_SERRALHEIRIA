import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { introConfig } from '../introConfig';
import './IntroGate.css';

type Phase = 'loading' | 'playing' | 'revealing' | 'done';

function shouldShowIntro() {
  if (window.location.hash || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (introConfig.frequency === 'always') return true;
  try {
    return sessionStorage.getItem(introConfig.storageKey) !== 'seen';
  } catch {
    // Storage can be disabled. The component still plays at most once per mount.
    return true;
  }
}

export default function IntroGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(() => shouldShowIntro() ? 'loading' : 'done');
  const [fadeMs, setFadeMs] = useState(introConfig.fadeMs);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const phaseRef = useRef(phase);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const soundRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const active = phase !== 'done';

  const complete = useCallback(() => {
    if (phaseRef.current === 'done') return;
    restoreFocus.current = overlayRef.current?.contains(document.activeElement) ?? false;
    phaseRef.current = 'done';
    videoRef.current?.pause();
    setPhase('done');
  }, []);

  const reveal = useCallback((quick = false) => {
    // ended, error, rejected play and the watchdog may arrive in the same turn.
    if (phaseRef.current === 'done' || phaseRef.current === 'revealing') return;
    phaseRef.current = 'revealing';
    videoRef.current?.pause();
    setFadeMs(quick ? introConfig.skipFadeMs : introConfig.fadeMs);
    setPhase('revealing');
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video || phaseRef.current === 'revealing' || phaseRef.current === 'done') return;
    // A user gesture permits sound while reliable autoplay starts muted.
    const enable = video.muted;
    video.muted = !enable;
    setSoundEnabled(enable);
    if (video.paused) {
      void video.play().catch(() => {
        video.muted = true;
        setSoundEnabled(false);
      });
    }
  };

  useLayoutEffect(() => {
    if (!active) {
      if (restoreFocus.current) {
        document.getElementById('conteudo')?.focus({ preventScroll: true });
        restoreFocus.current = false;
      }
      // The browser may resolve the fragment before React mounts its target.
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
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbarWidth}px`;
    }
    body.style.overflow = 'hidden';
    skipRef.current?.focus({ preventScroll: true });
    try {
      sessionStorage.setItem(introConfig.storageKey, 'seen');
    } catch { /* Storage failures must never prevent access to the site. */ }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) { complete(); return; }
    let cancelled = false;
    const startedAt = performance.now();
    let progressedAt = startedAt;
    let lastTime = video.currentTime;
    let observedPlayback = false;

    // The cancelled frame in StrictMode's first effect pass never starts playback.
    // No seek, load(), loop or playbackRate change can restart the animation.
    const startFrame = requestAnimationFrame(() => {
      if (phaseRef.current === 'revealing' || phaseRef.current === 'done') return;
      video.muted = true;
      video.defaultMuted = true;
      try {
        void video.play().catch(() => { if (!cancelled) reveal(true); });
      } catch {
        reveal(true);
      }
    });

    const watchdog = window.setInterval(() => {
      if (phaseRef.current === 'revealing' || phaseRef.current === 'done') return;
      const now = performance.now();
      if (phaseRef.current === 'playing' && !observedPlayback) {
        observedPlayback = true;
        progressedAt = now;
      }
      if (video.currentTime > lastTime + 0.005) {
        lastTime = video.currentTime;
        progressedAt = now;
      }
      const loadingExpired = phaseRef.current === 'loading' && now - startedAt >= introConfig.loadingTimeoutMs;
      const stalled = phaseRef.current === 'playing' && now - progressedAt >= introConfig.stalledTimeoutMs;
      if (loadingExpired || stalled || now - startedAt >= introConfig.maxWaitMs) reveal(true);
    }, 250);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { if (motion.matches) complete(); };
    const hashChanged = () => { if (window.location.hash) complete(); };
    motion.addEventListener('change', motionChanged);
    window.addEventListener('hashchange', hashChanged);
    return () => {
      cancelled = true;
      cancelAnimationFrame(startFrame);
      clearInterval(watchdog);
      motion.removeEventListener('change', motionChanged);
      window.removeEventListener('hashchange', hashChanged);
      video.pause();
    };
  }, [active, complete, reveal]);

  useEffect(() => {
    if (phase !== 'revealing') return;
    // Safety net for a missing transitionend (background tab or browser setting).
    const timeout = window.setTimeout(complete, fadeMs + 100);
    return () => clearTimeout(timeout);
  }, [phase, fadeMs, complete]);

  return <>
    <div className="intro-site" inert={active} aria-hidden={active ? true : undefined}>{children}</div>
    {active && <div
      ref={overlayRef}
      className="intro-gate"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label="Introdução do site"
      style={{ '--intro-fade-ms': `${fadeMs}ms` } as CSSProperties}
      onTransitionEnd={event => {
        if (event.target === event.currentTarget && event.propertyName === 'opacity' && phaseRef.current === 'revealing') complete();
      }}
      onKeyDown={event => {
        if (event.key === 'Tab') {
          if (!event.shiftKey && document.activeElement === skipRef.current) {
            event.preventDefault(); soundRef.current?.focus();
          } else if (event.shiftKey && document.activeElement === soundRef.current) {
            event.preventDefault(); skipRef.current?.focus();
          }
        }
        if (event.key === 'Escape') { event.preventDefault(); complete(); }
      }}
    >
      <video
        ref={videoRef}
        className="intro-gate-video"
        src={`${import.meta.env.BASE_URL}${introConfig.videoPath}`}
        poster={`${import.meta.env.BASE_URL}${introConfig.posterPath}`}
        width="1920"
        height="1080"
        autoPlay
        muted={!soundEnabled}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          if (phaseRef.current === 'loading') { phaseRef.current = 'playing'; setPhase('playing'); }
        }}
        onEnded={() => reveal()}
        onError={() => reveal(true)}
        onVolumeChange={event => setSoundEnabled(!event.currentTarget.muted)}
      />
      <div className="intro-gate-controls">
        <button ref={soundRef} className="intro-gate-control" type="button" aria-pressed={soundEnabled} onClick={toggleSound}>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            {soundEnabled ? <path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /> : <path d="m16 9 5 6m0-6-5 6" />}
          </svg>
          {soundEnabled ? 'Silenciar' : 'Ativar som'}
        </button>
        <button ref={skipRef} className="intro-gate-control intro-gate-skip" type="button" onClick={() => {
          if (phaseRef.current === 'revealing') complete();
          else reveal(true);
        }}>Pular introdução<span aria-hidden="true">↗</span></button>
      </div>
    </div>}
  </>;
}
