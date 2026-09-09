/**
 * Centrale instellingen. De merknaam staat hier één keer, zodat hem wijzigen
 * geen zoek-en-vervang door de hele codebase is.
 */
export const BRAND = {
  name: 'Verblyf',
  legalName: 'Verblyf B.V.',
  tagline: 'Hotels in Europa, zonder commissie voor het hotel',
  email: 'boekingen@verblyf.com',
} as const;

export function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? 'https://verblyf.netlify.app';
}

/**
 * Draait de site op voorbeelddata?
 *
 * Zolang alleen de mock-leverancier actief is, zijn de hotels verzonnen. Dat
 * heeft twee gevolgen die we niet stilzwijgend mogen laten passeren:
 *
 *  1. Bezoekers moeten het weten. Verzonnen hotels tonen alsof ze te boeken
 *     zijn, is misleidend — daarom staat er een melding bovenaan elke pagina.
 *  2. Zoekmachines mogen het niet indexeren. Fictieve accommodaties in Google
 *     zetten is niet alleen slecht voor je reputatie, het is precies waar
 *     spamfilters op letten. Vandaar `noindex` en geen sitemap zolang dit aan
 *     staat, en geen Hotel-structured-data.
 *
 * Zodra LITEAPI_KEY er is en ACTIVE_SUPPLIERS een echte leverancier bevat,
 * schakelt dit alles vanzelf om.
 */
export function isDemoInventory(): boolean {
  const active = (process.env.ACTIVE_SUPPLIERS ?? 'mock')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return active.every((s) => s === 'mock');
}
