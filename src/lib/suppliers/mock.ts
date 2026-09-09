import { ROOM_TYPES, SEED_HOTELS, type SeedHotel } from './inventory';
import {
  SupplierError,
  type BookingRequest,
  type BookingResult,
  type HotelSupplier,
  type HotelSummary,
  type HotelWithOffers,
  type RoomOffer,
  type SearchQuery,
} from './types';

/**
 * Mock-adapter: dezelfde interface als Amadeus, maar met lokale inventaris.
 * Prijzen variëren deterministisch op datum en verblijfsduur, zodat de demo
 * zich als een echte zoekmachine gedraagt zonder externe calls.
 */

function nights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
}

/** Deterministische pseudo-random op basis van een string. */
function seededFactor(seed: string, spread = 0.18): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unit = ((h >>> 0) % 1000) / 1000;
  return 1 + (unit - 0.5) * 2 * spread;
}

/** Weekendtoeslag en seizoenseffect, zoals elke revenue manager doet. */
function demandMultiplier(dateIso: string): number {
  const d = new Date(dateIso);
  const day = d.getDay(); // 0 = zondag
  const weekend = day === 5 || day === 6 ? 1.22 : 1.0;
  const month = d.getMonth();
  const season = [0.88, 0.9, 0.96, 1.05, 1.12, 1.18, 1.24, 1.2, 1.1, 1.02, 0.92, 0.95][month];
  return weekend * season;
}

function toHotelSummary(seed: SeedHotel): HotelSummary {
  return {
    id: `mock:${seed.code}`,
    supplier: 'mock',
    supplierHotelId: seed.code,
    name: seed.name,
    stars: seed.stars,
    city: seed.city,
    country: seed.country,
    address: `${seed.address}, ${seed.city}`,
    geo: seed.geo,
    images: [],
    amenities: seed.amenities,
    rating: seed.rating,
    description: seed.description,
  };
}

function buildOffers(seed: SeedHotel, query: SearchQuery): RoomOffer[] {
  const n = nights(query.checkIn, query.checkOut);
  const demand = demandMultiplier(query.checkIn);
  const noise = seededFactor(`${seed.code}${query.checkIn}`);

  return ROOM_TYPES.filter((rt) => rt.occupancy >= query.adults + (query.children ?? 0))
    .map((rt) => {
      const perNight = Math.round(seed.baseRateCents * rt.multiplier * demand * noise);
      const total = perNight * n * query.rooms;
      const deadline = new Date(query.checkIn);
      deadline.setDate(deadline.getDate() - 2);

      return {
        id: `mock:${seed.code}-${rt.key}-${query.checkIn}`,
        supplier: 'mock' as const,
        supplierOfferId: `${seed.code}-${rt.key}`,
        hotelId: `mock:${seed.code}`,
        roomName: rt.name,
        bedType: rt.bedType,
        boardType: rt.board,
        maxOccupancy: rt.occupancy,
        refundable: rt.refundable,
        cancellationDeadline: rt.refundable ? deadline.toISOString() : undefined,
        cancellationPolicyText: rt.refundable
          ? `Gratis annuleren tot ${deadline.toLocaleDateString('nl-NL')} 18:00.`
          : 'Niet-restitueerbaar tarief. Bij annulering wordt het volledige bedrag in rekening gebracht.',
        supplierTotal: { amount: total, currency: 'EUR' as const },
        taxesIncluded: true,
        nights: n,
      };
    })
    .sort((a, b) => a.supplierTotal.amount - b.supplierTotal.amount);
}

function matches(seed: SeedHotel, destination: string): boolean {
  const q = destination.trim().toLowerCase();
  if (!q) return true;
  return [seed.city, seed.country, seed.name, seed.neighbourhood]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

export const mockSupplier: HotelSupplier = {
  id: 'mock',

  async search(query: SearchQuery): Promise<HotelWithOffers[]> {
    const hits = SEED_HOTELS.filter((s) => matches(s, query.destination));
    const pool = hits.length ? hits : SEED_HOTELS;
    return pool.map((seed) => ({ hotel: toHotelSummary(seed), offers: buildOffers(seed, query) }));
  },

  async getHotel(hotelId: string, query: SearchQuery): Promise<HotelWithOffers | null> {
    const code = hotelId.replace(/^mock:/, '');
    const seed = SEED_HOTELS.find((s) => s.code === code);
    if (!seed) return null;
    return { hotel: toHotelSummary(seed), offers: buildOffers(seed, query) };
  },

  async priceOffer(offerId: string): Promise<RoomOffer | null> {
    const [, rest] = offerId.split(':');
    const [code, roomKey, checkIn] = rest.split(/-(?=[a-z]+$|\d{4}-)/).length === 3
      ? rest.split(/-(?=[a-z]+$|\d{4}-)/)
      : [rest.slice(0, 7), 'standard', new Date().toISOString().slice(0, 10)];
    const seed = SEED_HOTELS.find((s) => s.code === code.replace(/-$/, ''));
    if (!seed) return null;
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);
    const offers = buildOffers(seed, {
      destination: seed.city, checkIn, checkOut: checkOut.toISOString().slice(0, 10),
      adults: 2, rooms: 1,
    });
    return offers.find((o) => o.supplierOfferId.endsWith(roomKey)) ?? offers[0] ?? null;
  },

  async book(request: BookingRequest): Promise<BookingResult> {
    if (!request.paymentReference) {
      throw new SupplierError('mock', 'NO_PAYMENT', 'Boeking zonder betalingsreferentie geweigerd', 400);
    }
    const ref = `VBF-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    return {
      supplier: 'mock',
      supplierBookingId: ref,
      confirmationNumber: ref,
      status: 'CONFIRMED',
      hotelName: 'Demo-hotel',
      checkIn: '',
      checkOut: '',
    };
  },
};
