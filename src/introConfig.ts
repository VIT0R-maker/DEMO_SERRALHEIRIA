export interface IntroMedia {
  videoPath: string;
  posterPath: string;
  width: number;
  height: number;
  animationSeconds: number;
}

/** Paths are relative to Vite's BASE_URL, including on GitHub Pages. */
export const introConfig: {
  frequency: 'session' | 'always';
  storageKey: string;
  mobileQuery: string;
  media: { desktop: IntroMedia; mobile: IntroMedia };
  fadeMs: number;
  skipFadeMs: number;
  loadingTimeoutMs: number;
  stalledTimeoutMs: number;
  maxWaitMs: number;
} = {
  frequency: 'session',
  storageKey: 'ferro-forma:intro:v3',
  mobileQuery: '(max-width: 767px), (pointer: coarse) and (max-height: 600px)',
  media: {
    desktop: {
      videoPath: 'media/gate-desktop-v3.mp4',
      posterPath: 'media/gate-desktop-v3.webp',
      width: 1920, height: 1080, animationSeconds: 1.6,
    },
    mobile: {
      videoPath: 'media/gate-mobile-v3.mp4',
      posterPath: 'media/gate-mobile-v3.webp',
      width: 1080, height: 1920, animationSeconds: 1.8,
    },
  },
  fadeMs: 650,
  skipFadeMs: 120,
  loadingTimeoutMs: 4500,
  stalledTimeoutMs: 2500,
  maxWaitMs: 12000,
};
