/** All paths are relative to Vite's BASE_URL, including on GitHub Pages. */
export const introConfig: {
  frequency: 'session' | 'always';
  storageKey: string;
  videoPath: string;
  posterPath: string;
  fadeMs: number;
  skipFadeMs: number;
  loadingTimeoutMs: number;
  stalledTimeoutMs: number;
  maxWaitMs: number;
} = {
  frequency: 'session',
  storageKey: 'ferro-forma:intro:v2',
  videoPath: 'media/gate-intro.mp4',
  posterPath: 'media/gate-poster.webp',
  fadeMs: 650,
  skipFadeMs: 120,
  loadingTimeoutMs: 4500,
  stalledTimeoutMs: 2500,
  maxWaitMs: 12000,
};
