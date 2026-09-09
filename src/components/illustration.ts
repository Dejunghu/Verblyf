/**
 * Illustratiesysteem.
 *
 * In plaats van stockfoto's tekent Verblyf elk hotel als een gestileerde
 * gevel. Voordelen: geen licentiekosten, geen trage image-CDN, en een
 * herkenbare huisstijl die niet lijkt op elke andere boekingssite. Zodra een
 * leverancier echte foto's meelevert, wordt dit de fallback.
 */

export type Style = 'grachtenpand' | 'tower' | 'boutique' | 'kust' | 'paleis' | 'loft';
export type Palette = 'teal' | 'sand' | 'plum' | 'forest' | 'copper' | 'indigo';

const PALETTES: Record<Palette, { sky: [string, string]; wall: string; wallDark: string; accent: string; ground: string }> = {
  teal:   { sky: ['#bfe3dc', '#e8f2ee'], wall: '#0f5a52', wallDark: '#0a423c', accent: '#e8b04b', ground: '#0c4a44' },
  sand:   { sky: ['#f6ddc0', '#fdf3e6'], wall: '#c07a45', wallDark: '#9a5c31', accent: '#2f5e57', ground: '#a8663a' },
  plum:   { sky: ['#dcc9dd', '#f3e9f2'], wall: '#5b3552', wallDark: '#42253c', accent: '#e0a15c', ground: '#4b2b44' },
  forest: { sky: ['#cfe0c4', '#eef4e8'], wall: '#2f5233', wallDark: '#213b25', accent: '#d9a441', ground: '#28472c' },
  copper: { sky: ['#f2d3c1', '#fbeee6'], wall: '#a24b30', wallDark: '#7d3823', accent: '#2c5b62', ground: '#8c3f28' },
  indigo: { sky: ['#c8cfe8', '#eaeef7'], wall: '#2c3a66', wallDark: '#1e2a4d', accent: '#e3a857', ground: '#26325a' },
};

function windows(x: number, y: number, cols: number, rows: number, w: number, h: number, gapX: number, gapY: number, fill: string, lit: string, seed: number) {
  let out = '';
  let n = seed;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      const isLit = (n >> 16) % 5 === 0;
      out += `<rect x="${x + c * (w + gapX)}" y="${y + r * (h + gapY)}" width="${w}" height="${h}" rx="1.5" fill="${isLit ? lit : fill}"/>`;
    }
  }
  return out;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 100000;
}

/** Geeft een complete, zelfstandige SVG terug (400×260 viewBox). */
export function hotelIllustration(style: Style, palette: Palette, seed = 'verblyf'): string {
  const p = PALETTES[palette];
  const id = `g${hash(seed + style + palette)}`;
  const s = hash(seed);

  const sky = `
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.sky[0]}"/>
        <stop offset="100%" stop-color="${p.sky[1]}"/>
      </linearGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.14"/>
      </linearGradient>
    </defs>
    <rect width="400" height="260" fill="url(#${id})"/>
    <circle cx="${318 + (s % 30)}" cy="52" r="20" fill="#f4c86a" opacity="0.6"/>`;

  const body = ((): string => {
    switch (style) {
      case 'grachtenpand':
        return `
          <rect x="40" y="90" width="70" height="170" fill="${p.wallDark}"/>
          <path d="M40 90 L75 58 L110 90 Z" fill="${p.wallDark}"/>
          <rect x="115" y="66" width="80" height="194" fill="${p.wall}"/>
          <path d="M115 66 h80 v-10 h-14 v-12 h-18 v12 h-16 v-12 h-18 v12 h-14 z" fill="${p.wall}"/>
          <rect x="200" y="104" width="66" height="156" fill="${p.wallDark}"/>
          <path d="M200 104 L233 74 L266 104 Z" fill="${p.wallDark}"/>
          <rect x="271" y="86" width="74" height="174" fill="${p.wall}"/>
          <path d="M271 86 L308 56 L345 86 Z" fill="${p.wall}"/>
          ${windows(52, 110, 2, 4, 18, 24, 14, 14, p.sky[1], p.accent, s)}
          ${windows(128, 88, 3, 5, 16, 22, 10, 14, p.sky[1], p.accent, s + 7)}
          ${windows(211, 124, 2, 4, 18, 22, 12, 14, p.sky[1], p.accent, s + 13)}
          ${windows(283, 106, 2, 4, 20, 24, 14, 14, p.sky[1], p.accent, s + 21)}
          <rect x="0" y="238" width="400" height="22" fill="${p.ground}" opacity="0.35"/>`;
      case 'tower':
        return `
          <rect x="46" y="150" width="78" height="110" fill="${p.wallDark}"/>
          <rect x="140" y="40" width="120" height="220" fill="${p.wall}"/>
          <rect x="140" y="40" width="120" height="10" fill="${p.accent}"/>
          <rect x="276" y="112" width="82" height="148" fill="${p.wallDark}"/>
          ${windows(152, 62, 5, 8, 14, 16, 6, 8, p.sky[1], p.accent, s)}
          ${windows(58, 166, 3, 4, 16, 14, 8, 10, p.sky[1], p.accent, s + 5)}
          ${windows(288, 128, 3, 5, 16, 14, 8, 10, p.sky[1], p.accent, s + 9)}
          <rect x="0" y="242" width="400" height="18" fill="${p.ground}" opacity="0.35"/>`;
      case 'boutique':
        return `
          <rect x="52" y="112" width="296" height="148" fill="${p.wall}"/>
          <rect x="52" y="100" width="296" height="14" rx="4" fill="${p.wallDark}"/>
          <path d="M52 172 h296 v14 h-296 z" fill="${p.accent}" opacity="0.85"/>
          ${[0,1,2,3,4].map(i => `<path d="M${76 + i*56} 156 a14 14 0 0 1 28 0 v18 h-28 z" fill="${p.sky[1]}"/>`).join('')}
          ${windows(76, 200, 5, 1, 28, 34, 28, 0, p.sky[1], p.accent, s)}
          <rect x="182" y="206" width="36" height="54" rx="3" fill="${p.wallDark}"/>
          <rect x="0" y="252" width="400" height="8" fill="${p.ground}" opacity="0.4"/>`;
      case 'kust':
        return `
          <rect x="0" y="176" width="400" height="84" fill="${p.wall}" opacity="0.30"/>
          <path d="M0 186 q40 -10 80 0 t80 0 t80 0 t80 0 t80 0 v74 H0 z" fill="${p.wall}" opacity="0.5"/>
          <rect x="86" y="88" width="228" height="84" rx="6" fill="${p.wall}"/>
          <rect x="86" y="88" width="228" height="12" rx="6" fill="${p.wallDark}"/>
          ${windows(102, 112, 6, 2, 24, 18, 12, 10, p.sky[1], p.accent, s)}
          <rect x="140" y="64" width="120" height="24" rx="6" fill="${p.wallDark}"/>
          <path d="M0 246 q60 -12 120 0 t120 0 t160 0 v14 H0 z" fill="${p.ground}" opacity="0.45"/>`;
      case 'paleis':
        return `
          <rect x="60" y="118" width="280" height="142" fill="${p.wall}"/>
          <path d="M124 118 L200 80 L276 118 Z" fill="${p.wallDark}"/>
          <rect x="124" y="112" width="152" height="12" fill="${p.accent}" opacity="0.9"/>
          ${[0,1,2,3,4,5].map(i => `<rect x="${138 + i*26}" y="132" width="12" height="82" fill="${p.sky[1]}" opacity="0.75"/>`).join('')}
          ${windows(74, 140, 2, 3, 20, 26, 14, 14, p.sky[1], p.accent, s)}
          ${windows(288, 140, 2, 3, 20, 26, 14, 14, p.sky[1], p.accent, s + 3)}
          <rect x="186" y="214" width="34" height="46" rx="2" fill="${p.wallDark}"/>
          <rect x="0" y="252" width="400" height="8" fill="${p.ground}" opacity="0.4"/>`;
      case 'loft':
      default:
        return `
          <rect x="48" y="128" width="304" height="132" fill="${p.wall}"/>
          ${[0,1,2,3].map(i => `<path d="M${48 + i*76} 128 v-34 l38 34 z" fill="${p.wallDark}"/>`).join('')}
          ${[0,1,2,3].map(i => `<path d="M${86 + i*76} 128 v-34 l-38 34 z" fill="${p.sky[1]}" opacity="0.7"/>`).join('')}
          ${windows(66, 148, 8, 3, 26, 24, 10, 12, p.sky[1], p.accent, s)}
          <rect x="176" y="220" width="46" height="40" rx="2" fill="${p.wallDark}"/>
          <rect x="0" y="252" width="400" height="8" fill="${p.ground}" opacity="0.4"/>`;
    }
  })();

  return `<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustratie van het hotel" preserveAspectRatio="xMidYMid slice">${sky}${body}<rect width="400" height="260" fill="url(#${id}s)"/></svg>`;
}
