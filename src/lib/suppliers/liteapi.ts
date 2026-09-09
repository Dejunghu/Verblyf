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
 * LiteAPI (Nuitée Connect) — de leverancier die het beste bij dit model past.
 *
 * Waarom deze naast Amadeus:
 *  - gratis sleutel bij aanmelden, geen minimumvolume of contractonderhandeling;
 *  - ruim 2 miljoen accommodaties, inclusief **hotelfoto's** in de content-API
 *    (Amadeus Self-Service levert geen beeldmateriaal — dat is precies het gat
 *    waar deze integratie in springt);
 *  - een `margin`-parameter: LiteAPI rekent onze opslag zelf in de prijs door.
 *    Wij vragen bewust `margin: 0` en tellen onze 8% er in `pricing.ts` bij op,
 *    zodat de servicekosten een aparte, zichtbare regel blijven;
 *  - prebook/book-flow met wekelijkse uitbetaling, geen platformkosten over de
 *    marge.
 *
 * Endpoints (v3.0, header `X-API-Key`):
 *   GET  /data/hotels          hotels + content per stad of coördinaat
 *   GET  /data/hotel           één hotel, volledige content inclusief foto's
 *   POST /hotels/rates         tarieven en beschikbaarheid
 *   POST /rates/prebook        tarief vastzetten vlak voor betaling
 *   POST /rates/book           definitief boeken
 *
 * Controleer de exacte veldnamen tegen docs.liteapi.travel zodra je een sleutel
 * hebt; de mapping hieronder volgt de v3.0-documentatie maar hun responses
 * kunnen per accounttype net iets verschillen.
 */

const BASE = 'https://api.liteapi.travel/v3.0';

function headers() {
  const key = process.env.LITEAPI_KEY;
  if (!key) throw new SupplierError('liteapi' as never, 'NO_CREDENTIALS', 'LITEAPI_KEY ontbreekt', 500);
  return { 'X-API-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: headers() });
  if (res.status === 429) throw new SupplierError('liteapi' as never, 'RATE_LIMITED', 'Te veel verzoeken naar LiteAPI', 429);
  if (!res.ok) {
    const body = await res.text();
    throw new SupplierError('liteapi' as never, 'REQUEST_FAILED', `${path} gaf ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

type LiteHotel = {
  id: string;
  name: string;
  hotelDescription?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  main_photo?: string;
  thumbnail?: string;
  hotelImages?: Array<{ url?: string; urlHd?: string; caption?: string; defaultImage?: boolean }>;
  hotelFacilities?: string[];
};

type LiteRatesResponse = {
  data: Array<{
    hotelId: string;
    roomTypes: Array<{
      offerId: string;
      rates: Array<{
        rateId: string;
        name?: string;
        boardName?: string;
        maxOccupancy?: number;
        cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: Array<{ cancelTime?: string; amount?: number }> };
        retailRate?: { total?: Array<{ amount: number; currency: string }> };
      }>;
      offerRetailRate?: { amount: number; currency: string };
    }>;
  }>;
};

function nights(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function mapBoard(board?: string): RoomOffer['boardType'] {
  const b = (board ?? '').toUpperCase();
  if (b.includes('ALL')) return 'ALL_INCLUSIVE';
  if (b.includes('FULL')) return 'FULL_BOARD';
  if (b.includes('HALF')) return 'HALF_BOARD';
  if (b.includes('BREAKFAST') || b.includes('BB')) return 'BREAKFAST';
  return 'ROOM_ONLY';
}

/**
 * Foto's van de leverancier.
 *
 * Belangrijk: beeldmateriaal van bedbanks (LiteAPI, Hotelbeds/GIATA) mag je
 * tonen zolang je het in de boekingscontext gebruikt, maar je mag het meestal
 * niet permanent op je eigen CDN zetten. Daarom cachen we alleen kortdurend en
 * gaan eigen uploads van partnerhotels altijd vóór (zie `lib/images.ts`).
 */
function mapImages(h: LiteHotel): string[] {
  const list = (h.hotelImages ?? [])
    .map((i) => i.urlHd || i.url)
    .filter((u): u is string => Boolean(u));
  const main = h.main_photo || h.thumbnail;
  if (main && !list.includes(main)) list.unshift(main);
  return list.slice(0, 24);
}

function toSummary(h: LiteHotel): HotelSummary {
  return {
    id: `liteapi:${h.id}`,
    supplier: 'liteapi' as never,
    supplierHotelId: h.id,
    name: h.name,
    stars: h.stars,
    city: h.city ?? '',
    country: h.country ?? '',
    address: h.address ?? '',
    geo: h.latitude && h.longitude ? { lat: h.latitude, lng: h.longitude } : undefined,
    images: mapImages(h),
    amenities: (h.hotelFacilities ?? []).slice(0, 12),
    rating: h.rating ? { score: h.rating, count: h.reviewCount ?? 0 } : undefined,
    description: h.hotelDescription?.replace(/<[^>]+>/g, '').slice(0, 600),
  };
}

async function fetchContent(hotelIds: string[]): Promise<Map<string, LiteHotel>> {
  const map = new Map<string, LiteHotel>();
  // Content wordt per hotel opgehaald; in productie zet je dit in een cache of
  // een nachtelijke sync — content verandert nauwelijks, tarieven wel.
  await Promise.all(
    hotelIds.map(async (id) => {
      try {
        const res = await call<{ data: LiteHotel }>(`/data/hotel?hotelId=${encodeURIComponent(id)}`);
        if (res.data) map.set(id, res.data);
      } catch {
        /* één hotel zonder content mag de zoekopdracht niet breken */
      }
    }),
  );
  return map;
}

export const liteapiSupplier: HotelSupplier = {
  id: 'liteapi' as never,

  async search(query: SearchQuery): Promise<HotelWithOffers[]> {
    const list = await call<{ data: LiteHotel[] }>(
      `/data/hotels?cityName=${encodeURIComponent(query.destination)}&limit=40`,
    );
    const hotels = list.data ?? [];
    if (!hotels.length) return [];

    const rates = await call<LiteRatesResponse>('/hotels/rates', {
      method: 'POST',
      body: JSON.stringify({
        hotelIds: hotels.map((h) => h.id),
        checkin: query.checkIn,
        checkout: query.checkOut,
        currency: query.currency ?? 'EUR',
        guestNationality: query.countryOfResidence ?? 'NL',
        occupancies: Array.from({ length: query.rooms }, () => ({
          adults: query.adults,
          children: Array.from({ length: query.children ?? 0 }, () => 8),
        })),
        // 0 = netto tarief; onze 8% tellen we zelf zichtbaar op in pricing.ts
        margin: 0,
      }),
    });

    const byId = new Map(hotels.map((h) => [h.id, h]));
    return (rates.data ?? [])
      .map((entry) => {
        const content = byId.get(entry.hotelId);
        if (!content) return null;
        return { hotel: toSummary(content), offers: mapOffers(entry, query) };
      })
      .filter((x): x is HotelWithOffers => Boolean(x) && x!.offers.length > 0);
  },

  async getHotel(hotelId: string, query: SearchQuery): Promise<HotelWithOffers | null> {
    const id = hotelId.replace(/^liteapi:/, '');
    const [content, rates] = await Promise.all([
      fetchContent([id]),
      call<LiteRatesResponse>('/hotels/rates', {
        method: 'POST',
        body: JSON.stringify({
          hotelIds: [id],
          checkin: query.checkIn,
          checkout: query.checkOut,
          currency: query.currency ?? 'EUR',
          guestNationality: query.countryOfResidence ?? 'NL',
          occupancies: [{ adults: query.adults, children: [] }],
          margin: 0,
        }),
      }),
    ]);

    const h = content.get(id);
    const entry = rates.data?.[0];
    if (!h || !entry) return null;
    return { hotel: toSummary(h), offers: mapOffers(entry, query) };
  },

  async priceOffer(offerId: string): Promise<RoomOffer | null> {
    // prebook zet het tarief vast en geeft de definitieve prijs terug.
    const id = offerId.replace(/^liteapi:/, '');
    const res = await call<{ data: { prebookId: string; price: number; currency: string; cancellationPolicies?: unknown } }>(
      '/rates/prebook',
      { method: 'POST', body: JSON.stringify({ offerId: id, usePaymentSdk: false }) },
    );
    if (!res.data) return null;
    return {
      id: `liteapi:${res.data.prebookId}`,
      supplier: 'liteapi' as never,
      supplierOfferId: res.data.prebookId,
      hotelId: '',
      roomName: '',
      boardType: 'ROOM_ONLY',
      maxOccupancy: 2,
      refundable: true,
      supplierTotal: { amount: Math.round(res.data.price * 100), currency: (res.data.currency as 'EUR') ?? 'EUR' },
      taxesIncluded: true,
      nights: 1,
    };
  },

  async book(request: BookingRequest): Promise<BookingResult> {
    const res = await call<{ data: { bookingId: string; status: string; hotelConfirmationCode?: string; checkin?: string; checkout?: string; hotel?: { name?: string } } }>(
      '/rates/book',
      {
        method: 'POST',
        body: JSON.stringify({
          prebookId: request.offerId.replace(/^liteapi:/, ''),
          holder: {
            firstName: request.guest.firstName,
            lastName: request.guest.lastName,
            email: request.guest.email,
            phone: request.guest.phone,
          },
          guests: [
            {
              occupancyNumber: 1,
              firstName: request.guest.firstName,
              lastName: request.guest.lastName,
              email: request.guest.email,
              remarks: request.specialRequests ?? '',
            },
          ],
          payment: { method: 'ACC_CREDIT_CARD', transactionId: request.paymentReference },
        }),
      },
    );

    const d = res.data;
    return {
      supplier: 'liteapi' as never,
      supplierBookingId: d.bookingId,
      confirmationNumber: d.hotelConfirmationCode ?? d.bookingId,
      status: (d.status ?? '').toUpperCase() === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
      hotelName: d.hotel?.name ?? '',
      checkIn: d.checkin ?? '',
      checkOut: d.checkout ?? '',
      raw: res,
    };
  },
};

function mapOffers(entry: LiteRatesResponse['data'][number], query: SearchQuery): RoomOffer[] {
  const n = nights(query.checkIn, query.checkOut);
  const offers: RoomOffer[] = [];

  for (const room of entry.roomTypes ?? []) {
    for (const rate of room.rates ?? []) {
      const total = rate.retailRate?.total?.[0];
      if (!total) continue;
      const refundable = (rate.cancellationPolicies?.refundableTag ?? '').toUpperCase() === 'RFN';
      const deadline = rate.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime;

      offers.push({
        id: `liteapi:${room.offerId}`,
        supplier: 'liteapi' as never,
        supplierOfferId: room.offerId,
        hotelId: `liteapi:${entry.hotelId}`,
        roomName: rate.name ?? 'Kamer',
        boardType: mapBoard(rate.boardName),
        maxOccupancy: rate.maxOccupancy ?? query.adults,
        refundable,
        cancellationDeadline: deadline,
        cancellationPolicyText: refundable
          ? deadline
            ? `Gratis annuleren tot ${new Date(deadline).toLocaleDateString('nl-NL')}`
            : 'Gratis annuleren'
          : 'Niet-restitueerbaar tarief',
        supplierTotal: { amount: Math.round(total.amount * 100), currency: (total.currency as 'EUR') ?? 'EUR' },
        taxesIncluded: true,
        nights: n,
      });
    }
  }

  return offers.sort((a, b) => a.supplierTotal.amount - b.supplierTotal.amount);
}
