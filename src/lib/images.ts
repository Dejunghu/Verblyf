/**
 * Beeldpijplijn.
 *
 * Drie bronnen, in deze volgorde van voorkeur:
 *
 *  1. **Eigen uploads van het partnerhotel** (Cloudinary). Volledig van ons,
 *     onbeperkt te bewerken, en scherper dan wat bedbanks leveren.
 *  2. **Leveranciersfoto's** (LiteAPI, Hotelbeds/GIATA). Tonen mag binnen de
 *     boekingscontext; permanent op je eigen CDN zetten mag doorgaans níét.
 *     Daarom alleen doorlinken of kort cachen — nooit kopiëren naar Cloudinary.
 *  3. **Placeholder** wanneer een hotel nog niets heeft aangeleverd.
 */

export type ImageSource = 'upload' | 'supplier' | 'placeholder';

export interface Photo {
  id: string;
  url: string;
  source: ImageSource;
  alt: string;
  width?: number;
  height?: number;
  /** Piepkleine base64-versie voor een zachte blur tijdens het laden. */
  blurDataUrl?: string;
  isCover?: boolean;
  position?: number;
}

/* ------------------------------------------------------------------ *
 * Cloudinary
 * ------------------------------------------------------------------ */

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME ?? '';

/**
 * Bouwt een Cloudinary-URL met de juiste transformaties.
 *
 * `f_auto` levert AVIF/WebP waar de browser dat aankan, `q_auto:good` kiest de
 * compressie per afbeelding, `c_fill,g_auto` snijdt bij op het interessantste
 * deel van de foto — bij hotelkamers is dat vrijwel altijd het bed of het raam.
 */
export function cloudinaryUrl(
  publicId: string,
  opts: { width: number; height?: number; blur?: boolean } = { width: 1200 },
): string {
  if (!CLOUD) return publicId;
  const t = [
    'f_auto',
    'q_auto:good',
    `w_${opts.width}`,
    opts.height ? `h_${opts.height}` : null,
    opts.height ? 'c_fill,g_auto' : 'c_limit',
    opts.blur ? 'e_blur:800,q_10' : null,
  ].filter(Boolean).join(',');
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}

/** Breedtes waarop we uitleveren; dekt telefoon tot 5K-scherm. */
export const WIDTHS = [400, 640, 828, 1200, 1600, 2048] as const;

export function srcSet(publicId: string, aspect = 3 / 2): string {
  if (!CLOUD) return '';
  return WIDTHS
    .map((w) => `${cloudinaryUrl(publicId, { width: w, height: Math.round(w / aspect) })} ${w}w`)
    .join(', ');
}

/** Standaard `sizes`: volledige breedte op mobiel, kolom op desktop. */
export const SIZES_CARD = '(max-width: 760px) 100vw, (max-width: 1200px) 50vw, 380px';
export const SIZES_HERO = '(max-width: 1000px) 100vw, 1100px';

/* ------------------------------------------------------------------ *
 * Leveranciersfoto's
 * ------------------------------------------------------------------ */

/**
 * Hotelbeds levert paden zonder domein; de maat zit in het pad ervoor.
 * Beschikbaar: small (74px), medium (117px), standaard (320px), bigger (800px),
 * xl (1024px), xxl (2048px), original. Een niet-bestaande maat geeft een 403,
 * dus vallen we terug op `bigger`.
 */
export function hotelbedsImage(path: string, size: 'medium' | 'bigger' | 'xl' | 'xxl' = 'bigger'): string {
  const clean = path.replace(/^\/+/, '');
  return `https://photos.hotelbeds.com/giata/${size}/${clean}`;
}

/** LiteAPI geeft volledige URL's; we normaliseren alleen naar https. */
export function supplierImage(url: string): string {
  return url.startsWith('//') ? `https:${url}` : url.replace(/^http:/, 'https:');
}

/* ------------------------------------------------------------------ *
 * Keuzelogica
 * ------------------------------------------------------------------ */

export function choosePhotos(args: {
  uploaded?: Photo[];
  supplierUrls?: string[];
  hotelName: string;
}): Photo[] {
  const uploaded = (args.uploaded ?? []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  if (uploaded.length >= 3) return uploaded;

  const fromSupplier: Photo[] = (args.supplierUrls ?? []).map((url, i) => ({
    id: `s${i}`,
    url: supplierImage(url),
    source: 'supplier' as const,
    alt: `${args.hotelName} — foto ${i + 1}`,
    position: uploaded.length + i,
  }));

  const all = [...uploaded, ...fromSupplier];
  return all.length ? all : [];
}

/* ------------------------------------------------------------------ *
 * Validatie bij upload
 * ------------------------------------------------------------------ */

export const UPLOAD_RULES = {
  maxBytes: 12 * 1024 * 1024,
  minWidth: 1200,
  minHeight: 800,
  maxPerRoom: 20,
  accept: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'],
} as const;

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!UPLOAD_RULES.accept.includes(file.type as never)) {
    return 'Alleen JPG, PNG, WebP, AVIF of HEIC. Dit bestand is ' + (file.type || 'een onbekend type') + '.';
  }
  if (file.size > UPLOAD_RULES.maxBytes) {
    return `Deze foto is ${(file.size / 1048576).toFixed(1)} MB. Het maximum is 12 MB — verklein hem of exporteer op een lagere kwaliteit.`;
  }
  return null;
}
