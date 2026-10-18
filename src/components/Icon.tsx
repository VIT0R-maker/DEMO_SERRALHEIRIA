import type { CSSProperties } from 'react';

export type IconName = 'arrow' | 'whatsapp' | 'gate' | 'door' | 'railing' | 'structure' | 'stairs' | 'table' | 'measure' | 'shield' | 'cube' | 'check' | 'expand' | 'close' | 'menu';

const paths: Record<IconName, React.ReactNode> = {
  arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
  whatsapp: <><path d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.6L3 21l1.7-5a8.5 8.5 0 1 1 15.8-4.4Z" /><path d="m8.1 7.6 1 2-1 1c1 2 2.2 3.2 4.3 4.2l1-1 2.1 1c.2 1.5-1 2-2 1.8-3.7-.8-7-4-7.4-7.2-.1-1 .6-1.9 2-1.8Z" /></>,
  gate: <><path d="M3 3v18M21 3v18M3 5h18M3 19h18M7 5v14M12 5v14M17 5v14" /></>,
  door: <><path d="M6 2h12v20H6z" /><path d="M9 12h.1" strokeWidth="2.7" /></>,
  railing: <><path d="m2 12 20-10M3 12v10l18-9V3M8 10v9M14 7v9M1 13h3M20 13h3" /></>,
  structure: <><path d="M2 9v13M13 12v10M22 5v14M2 9l11 3 9-7-12-3-8 7ZM5 6l12 3M8 4l12 3M1 22h3M12 22h3M21 19h2" /></>,
  stairs: <><path d="M2 21h5v-4h4v-4h4V9h4V5h3M2 21v-3h5M7 17V9L22 1v8M12 14V7M17 10V4" /></>,
  table: <><path d="M2 8h17l3-3H5L2 8ZM2 8v13M19 8v13M22 5v12M6 8v8" /></>,
  measure: <><path d="M5 3h14M21 5v14M19 21H5M3 19V5M1.5 1.5h4v4h-4zM18.5 1.5h4v4h-4zM1.5 18.5h4v4h-4zM18.5 18.5h4v4h-4z" /></>,
  shield: <><path d="m12 2 9 4c0 7-2.5 12-9 16C5.5 18 3 13 3 6l9-4Z" /></>,
  cube: <><path d="m12 2 10 6v9l-10 6-10-6V8l10-6ZM2 8l10 6 10-6M12 14v9" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m7.5 12 3 3 6-6" /></>,
  expand: <><path d="M14 3h7v7M21 3l-7 7M10 21H3v-7M3 21l7-7" /></>,
  close: <><path d="m6 6 12 12M6 18 18 6" /></>,
  menu: <><path d="M3 6h18M3 12h18M3 18h18" /></>,
};

export function Icon({ name, className = '', style }: { name: IconName; className?: string; style?: CSSProperties }) {
  return <svg className={`icon ${className}`} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Brand({ light = false }: { light?: boolean }) {
  return <a className={`brand${light ? ' brand-light' : ''}`} href="#inicio" aria-label="Ferro e Forma — início">
    <svg className="brand-symbol" viewBox="0 0 80 80" aria-hidden="true"><path fill="none" stroke="var(--copper)" strokeWidth="6.5" d="M43 43 10 55V22L48 8v27" /><path fill="none" stroke="currentColor" strokeWidth="6.5" d="m34 37 34-12v33L30 72V45" /></svg>
    <span className="brand-copy"><strong>FERRO & FORMA</strong><span>Serralheria sob medida</span></span>
  </a>;
}
