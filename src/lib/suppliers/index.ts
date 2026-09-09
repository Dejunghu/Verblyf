import { amadeusSupplier } from './amadeus';
import { liteapiSupplier } from './liteapi';
import { mockSupplier } from './mock';
import type { HotelSupplier, HotelWithOffers, SearchQuery, SupplierId } from './types';

/**
 * Registry + fan-out.
 *
 * Meerdere leveranciers worden parallel bevraagd; resultaten worden
 * samengevoegd en ontdubbeld. Faalt één leverancier, dan blijft de rest
 * gewoon werken (belangrijk: een timeout bij Hotelbeds mag Amadeus-resultaten
 * niet blokkeren).
 */

const REGISTRY: Record<string, HotelSupplier> = {
  amadeus: amadeusSupplier,
  liteapi: liteapiSupplier,
  mock: mockSupplier,
};

export function activeSuppliers(): HotelSupplier[] {
  const configured = (process.env.ACTIVE_SUPPLIERS ?? 'mock')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list = configured.map((id) => REGISTRY[id]).filter(Boolean);
  return list.length ? list : [mockSupplier];
}

export function supplierFor(id: SupplierId | string): HotelSupplier {
  return REGISTRY[id] ?? mockSupplier;
}

export function supplierOfHotelId(compositeId: string): HotelSupplier {
  return supplierFor(compositeId.split(':')[0]);
}

const SEARCH_TIMEOUT_MS = Number(process.env.SUPPLIER_TIMEOUT_MS ?? 8000);

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('supplier timeout')), ms)),
  ]);
}

export async function searchAllSuppliers(query: SearchQuery): Promise<{
  results: HotelWithOffers[];
  errors: Array<{ supplier: string; message: string }>;
}> {
  const suppliers = activeSuppliers();
  const settled = await Promise.allSettled(
    suppliers.map((s) => withTimeout(s.search(query), SEARCH_TIMEOUT_MS)),
  );

  const results: HotelWithOffers[] = [];
  const errors: Array<{ supplier: string; message: string }> = [];

  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') results.push(...r.value);
    else errors.push({ supplier: suppliers[i].id, message: String(r.reason?.message ?? r.reason) });
  });

  // Ontdubbelen op naam + stad: hetzelfde hotel kan bij meerdere bedbanks
  // staan. We houden per hotel het goedkoopste tarief over.
  const byKey = new Map<string, HotelWithOffers>();
  for (const entry of results) {
    const key = `${entry.hotel.name.toLowerCase()}|${entry.hotel.city.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
      continue;
    }
    const cheapest = (e: HotelWithOffers) => Math.min(...e.offers.map((o) => o.supplierTotal.amount));
    if (cheapest(entry) < cheapest(existing)) byKey.set(key, entry);
  }

  return { results: [...byKey.values()], errors };
}

export * from './types';
