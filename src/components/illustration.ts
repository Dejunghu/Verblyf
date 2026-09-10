/**
 * Illustratiesysteem.
 *
 * In plaats van stockfoto's tekent Verblyf elk hotel als een gestileerde
 * gevel, in dezelfde stille steenkleuren als de rest van de site. Zodra een
 * hotel eigen foto's uploadt, verdwijnt de tekening naar de achtergrond.
 *
 * Twee varianten:
 *  - `compact` voor lijsten en kaarten: minder ramen, geen filmkorrel. Scheelt
 *    ongeveer tweederde aan HTML op een zoekpagina met veertien hotels.
 *  - volledig voor de hoteldetailpagina, waar het beeld groot in beeld staat.
 */

export type Style = 'grachtenpand' | 'tower' | 'boutique' | 'kust' | 'paleis' | 'loft';
export type Palette = 'stone' | 'slate' | 'clay' | 'moss' | 'sandstone';

const PALETTES: Record<Palette, { a: string; b: string; mass: string; dark: string; glow: string }> = {
  stone:     { a: '#d9d8d2', b: '#efeee9', mass: '#8d8b81', dark: '#6d6b62', glow: '#f4e7cd' },
  slate:     { a: '#ccd2d4', b: '#e9edee', mass: '#79868c', dark: '#5b666b', glow: '#f2e8d6' },
  clay:      { a: '#e0d3c9', b: '#f3ebe4', mass: '#9a8072', dark: '#786256', glow: '#f6e9d2' },
  moss:      { a: '#d3d8cd', b: '#eef0ea', mass: '#7c8a76', dark: '#5e6a59', glow: '#f2ead4' },
  sandstone: { a: '#e2dbcb', b: '#f4f0e6', mass: '#a2937a', dark: '#7f735d', glow: '#f7ecd6' },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function windows(
  x: number, y: number, cols: number, rows: number,
  w: number, h: number, gx: number, gy: number,
  glow: string, seed: number,
): string {
  let out = '';
  let n = seed;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      const lit = (n >> 16) % 4 === 0;
      out += `<rect x="${x + c * (w + gx)}" y="${y + r * (h + gy)}" width="${w}" height="${h}" fill="${glow}" opacity="${lit ? '.9' : '.45'}"/>`;
    }
  }
  return out;
}

/** Zelfstandige SVG, viewBox 400×300. */
export function hotelIllustration(style: Style, palette: Palette, seed = 'verblyf', compact = false): string {
  const p = PALETTES[palette] ?? PALETTES.stone;
  const s = hash(seed) % 100000;
  const id = `a${hash(seed + style + palette)}`;
  const d = compact ? 1 : 0; // in compacte modus minder ramenrijen

  let defs =
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0%" stop-color="${p.a}"/><stop offset="72%" stop-color="${p.b}"/></linearGradient>`;
  if (!compact) {
    defs +=
      `<linearGradient id="${id}v" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="40%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".1"/></linearGradient>` +
      `<filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/>` +
        `<feColorMatrix type="saturate" values="0"/></filter>`;
  }
  defs += '</defs>';

  let body =
    `<rect width="400" height="300" fill="url(#${id})"/>` +
    `<circle cx="${312 + (s % 26)}" cy="62" r="26" fill="${p.glow}" opacity=".5"/>`;

  switch (style) {
    case 'grachtenpand':
      body +=
        `<rect x="34" y="126" width="66" height="174" fill="${p.dark}"/><path d="M34 126 L67 96 L100 126 Z" fill="${p.dark}"/>` +
        `<rect x="105" y="104" width="78" height="196" fill="${p.mass}"/>` +
        `<path d="M105 104h78v-11h-14v-13h-18v13h-14v-13h-18v13h-14z" fill="${p.mass}"/>` +
        `<rect x="188" y="140" width="64" height="160" fill="${p.dark}"/><path d="M188 140 L220 112 L252 140 Z" fill="${p.dark}"/>` +
        `<rect x="257" y="120" width="76" height="180" fill="${p.mass}"/><path d="M257 120 L295 90 L333 120 Z" fill="${p.mass}"/>` +
        windows(46, 146, 2, 4 - d, 18, 24, 14, 16, p.glow, s) +
        windows(118, 126, 3, 5 - d, 16, 22, 10, 15, p.glow, s + 7) +
        windows(199, 160, 2, 4 - d, 18, 22, 12, 15, p.glow, s + 13) +
        windows(269, 142, 2, 4 - d, 20, 24, 14, 16, p.glow, s + 21);
      break;
    case 'tower':
      body +=
        `<rect x="40" y="182" width="80" height="118" fill="${p.dark}"/>` +
        `<rect x="134" y="68" width="122" height="232" fill="${p.mass}"/>` +
        `<rect x="270" y="146" width="86" height="154" fill="${p.dark}"/>` +
        windows(146, 92, 5, 8 - d * 3, 14, 16, 7, 9, p.glow, s) +
        windows(52, 198, 3, 4 - d, 16, 14, 8, 11, p.glow, s + 5) +
        windows(282, 162, 3, 5 - d, 16, 14, 8, 11, p.glow, s + 9);
      break;
    case 'boutique': {
      let arches = '';
      for (let i = 0; i < 5; i++) arches += `<path d="M${72 + i * 58} 196a15 15 0 0 1 30 0v20h-30z" fill="${p.glow}" opacity=".62"/>`;
      body +=
        `<rect x="46" y="146" width="308" height="154" fill="${p.mass}"/>` +
        `<rect x="46" y="134" width="308" height="13" fill="${p.dark}"/>` + arches +
        windows(72, 238, 5, 1, 30, 34, 28, 0, p.glow, s) +
        `<rect x="180" y="244" width="38" height="56" fill="${p.dark}"/>`;
      break;
    }
    case 'kust':
      body +=
        `<rect x="0" y="212" width="400" height="88" fill="${p.mass}" opacity=".22"/>` +
        `<path d="M0 222q42-11 84 0t84 0 84 0 84 0 84 0v78H0z" fill="${p.mass}" opacity=".4"/>` +
        `<rect x="80" y="130" width="240" height="92" fill="${p.mass}"/>` +
        `<rect x="80" y="130" width="240" height="12" fill="${p.dark}"/>` +
        `<rect x="136" y="104" width="128" height="26" fill="${p.dark}"/>` +
        windows(96, 158, 6, 2 - d, 25, 20, 12, 12, p.glow, s);
      break;
    case 'paleis': {
      let cols = '';
      for (let i = 0; i < 6; i++) cols += `<rect x="${134 + i * 27}" y="168" width="13" height="86" fill="${p.glow}" opacity=".55"/>`;
      body +=
        `<rect x="54" y="152" width="292" height="148" fill="${p.mass}"/>` +
        `<path d="M120 152 L200 112 L280 152 Z" fill="${p.dark}"/>` + cols +
        windows(68, 176, 2, 3 - d, 20, 26, 14, 15, p.glow, s) +
        windows(286, 176, 2, 3 - d, 20, 26, 14, 15, p.glow, s + 3) +
        `<rect x="184" y="254" width="34" height="46" fill="${p.dark}"/>`;
      break;
    }
    case 'loft':
    default: {
      let saw = '';
      for (let i = 0; i < 4; i++) {
        saw += `<path d="M${42 + i * 79} 164v-36l40 36z" fill="${p.dark}"/>`;
        saw += `<path d="M${82 + i * 79} 164v-36l-40 36z" fill="${p.glow}" opacity=".5"/>`;
      }
      body +=
        `<rect x="42" y="164" width="316" height="136" fill="${p.mass}"/>` + saw +
        windows(60, 186, 8, 3 - d, 27, 24, 10, 13, p.glow, s) +
        `<rect x="172" y="258" width="48" height="42" fill="${p.dark}"/>`;
      break;
    }
  }

  if (!compact) {
    body += `<rect width="400" height="300" fill="url(#${id}v)"/>` +
            `<rect width="400" height="300" filter="url(#${id}g)" opacity=".055"/>`;
  }

  return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tekening van de gevel" preserveAspectRatio="xMidYMid slice">${defs}${body}</svg>`;
}
