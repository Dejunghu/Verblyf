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
 * Amadeus Self-Service adapter.
 *
 * Endpoints (test: https://test.api.amadeus.com, live: https://api.amadeus.com):
 *   POST /v1/security/oauth2/token                    -> access token (30 min)
 *   GET  /v1/reference-data/locations/hotels/by-city  -> hotelIds per stad
 *   GET  /v3/shopping/hotel-offers                    -> tarieven per hotelIds
 *   GET  /v3/shopping/hotel-offers/{offerId}          -> tarief hervalideren
 *   POST /v2/booking/hotel-orders                     -> boeking plaatsen
 */

const HOSTS = {
  test: 'https://test.api.amadeus.com',
  production: 'https://api.amadeus.com',
} as const;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function host(): string {
  return process.env.AMADEUS_ENV === 'production' ? HOSTS.production : HOSTS.test;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new SupplierError('amadeus', 'NO_CREDENTIALS', 'AMADEUS_CLIENT_ID/SECRET ontbreken', 500);
  }

  const res = await fetch(`${host()}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new SupplierError('amadeus', 'AUTH_FAILED', `Token ophalen mislukt (${res.status})`, 502);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return tokenCache.token;
}

async function amadeusGet<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`${host()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 429) {
    throw new SupplierError('amadeus', 'RATE_LIMITED', 'Te veel verzoeken naar Amadeus', 429);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new SupplierError('amadeus', 'REQUEST_FAILED', `${path} gaf ${res.status}: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/** IATA-stadscodes voor de belangrijkste NL/EU-bestemmingen. */
const CITY_CODES: Record<string, string> = {
  amsterdam: 'AMS', rotterdam: 'RTM', 'den haag': 'HAG', utrecht: 'UTC', eindhoven: 'EIN',
  maastricht: 'MST', groningen: 'GRQ', antwerpen: 'ANR', brussel: 'BRU', parijs: 'PAR',
  londen: 'LON', berlijn: 'BER', barcelona: 'BCN', madrid: 'MAD', rome: 'ROM',
  wenen: 'VIE', lissabon: 'LIS', kopenhagen: 'CPH', praag: 'PRG', milaan: 'MIL',
};

export function toCityCode(destination: string): string {
  const key = destination.trim().toLowerCase();
  if (/^[A-Z]{3}$/.test(destination.trim())) return destination.trim().toUpperCase();
  return CITY_CODES[key] ?? destination.trim().slice(0, 3).toUpperCase();
}

type AmadeusHotelListItem = {
  hotelId: string;
  name: string;
  iataCode?: string;
  address?: { countryCode?: string };
  geoCode?: { latitude: number; longitude: number };
};

type AmadeusOfferResponse = {
  data: Array<{
    hotel: {
      hotelId: string; name: string; cityCode?: string; latitude?: number; longitude?: number;
      address?: { lines?: string[]; cityName?: string; countryCode?: string };
      rating?: string; description?: { text?: string }; amenities?: string[];
    };
    available: boolean;
    offers: Array<{
      id: string;
      checkInDate: string;
      checkOutDate: string;
      room?: { typeEstimated?: { category?: string; beds?: number; bedType?: string }; description?: { text?: string } };
      guests?: { adults?: number };
      price: { currency: string; total: string; base?: string; taxes?: Array<{ included?: boolean }> };
      policies?: { cancellations?: Array<{ deadline?: string; description?: { text?: string } }>; paymentType?: string };
      boardType?: string;
    }>;
  }>;
};

function nightsBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

function mapBoard(board?: string): RoomOffer['boardType'] {
  switch (board) {
    case 'BREAKFAST': case 'AMERICAN_BREAKFAST': case 'CONTINENTAL_BREAKFAST': return 'BREAKFAST';
    case 'HALF_BOARD': return 'HALF_BOARD';
    case 'FULL_BOARD': return 'FULL_BOARD';
    case 'ALL_INCLUSIVE': return 'ALL_INCLUSIVE';
    default: return 'ROOM_ONLY';
  }
}

export const amadeusSupplier: HotelSupplier = {
  id: 'amadeus',

  async search(query: SearchQuery): Promise<HotelWithOffers[]> {
    const cityCode = toCityCode(query.destination);

    // Stap 1: hotel-ids ophalen voor de stad (v3 zoekt uitsluitend op hotelId).
    const list = await amadeusGet<{ data: AmadeusHotelListItem[] }>(
      '/v1/reference-data/locations/hotels/by-city',
      { cityCode, radius: 20, radiusUnit: 'KM', hotelSource: 'ALL' },
    );

    const hotelIds = list.data.slice(0, 40).map((h) => h.hotelId);
    if (hotelIds.length === 0) return [];

    // Stap 2: tarieven ophalen. Amadeus staat max ~50 ids per call toe.
    const offers = await amadeusGet<AmadeusOfferResponse>('/v3/shopping/hotel-offers', {
      hotelIds: hotelIds.join(','),
      adults: query.adults,
      checkInDate: query.checkIn,
      checkOutDate: query.checkOut,
      roomQuantity: query.rooms,
      currency: query.currency ?? 'EUR',
      countryOfResidence: query.countryOfResidence ?? 'NL',
      bestRateOnly: false,
    });

    return (offers.data ?? [])
      .filter((entry) => entry.available && entry.offers?.length)
      .map((entry) => mapEntry(entry, query));
  },

  async getHotel(hotelId: string, query: SearchQuery): Promise<HotelWithOffers | null> {
    const supplierHotelId = hotelId.replace(/^amadeus:/, '');
    const offers = await amadeusGet<AmadeusOfferResponse>('/v3/shopping/hotel-offers', {
      hotelIds: supplierHotelId,
      adults: query.adults,
      checkInDate: query.checkIn,
      checkOutDate: query.checkOut,
      roomQuantity: query.rooms,
      currency: query.currency ?? 'EUR',
      bestRateOnly: false,
    });
    const entry = offers.data?.[0];
    return entry ? mapEntry(entry, query) : null;
  },

  async priceOffer(offerId: string): Promise<RoomOffer | null> {
    const supplierOfferId = offerId.replace(/^amadeus:/, '');
    const res = await amadeusGet<{ data: AmadeusOfferResponse['data'][number] }>(
      `/v3/shopping/hotel-offers/${supplierOfferId}`,
      {},
    );
    const entry = res.data;
    if (!entry) return null;
    const mapped = mapEntry(entry, {
      destination: '', checkIn: entry.offers[0].checkInDate, checkOut: entry.offers[0].checkOutDate,
      adults: entry.offers[0].guests?.adults ?? 2, rooms: 1,
    });
    return mapped.offers[0] ?? null;
  },

  async book(request: BookingRequest): Promise<BookingResult> {
    const token = await getAccessToken();
    const supplierOfferId = request.offerId.replace(/^amadeus:/, '');

    const payload = {
      data: {
        type: 'hotel-order',
        guests: [
          {
            tid: 1,
            title: 'MR',
            firstName: request.guest.firstName,
            lastName: request.guest.lastName,
            phone: request.guest.phone,
            email: request.guest.email,
          },
        ],
        travelAgent: {
          contact: { email: process.env.AGENCY_EMAIL ?? 'boekingen@verblyf.com' },
        },
        roomAssociations: [{ guestReferences: [{ guestReference: '1' }], hotelOfferId: supplierOfferId }],
        payment: {
          method: 'CREDIT_CARD',
          paymentCard: {
            paymentCardInfo: {
              vendorCode: process.env.VCC_VENDOR_CODE ?? 'VI',
              cardNumber: process.env.VCC_NUMBER ?? '',
              expiryDate: process.env.VCC_EXPIRY ?? '',
              holderName: process.env.VCC_HOLDER ?? 'VERBLYF BV',
            },
          },
        },
      },
    };

    const res = await fetch(`${host()}/v2/booking/hotel-orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as {
      data?: { id: string; hotelBookings?: Array<{ bookingStatus: string; hotelProviderInformation?: Array<{ confirmationNumber?: string }>; hotel?: { name?: string }; hotelOffer?: { checkInDate: string; checkOutDate: string } }> };
      errors?: Array<{ detail?: string; title?: string }>;
    };

    if (!res.ok || !json.data) {
      const detail = json.errors?.[0]?.detail ?? json.errors?.[0]?.title ?? `HTTP ${res.status}`;
      throw new SupplierError('amadeus', 'BOOKING_FAILED', `Boeking geweigerd: ${detail}`);
    }

    const hb = json.data.hotelBookings?.[0];
    return {
      supplier: 'amadeus',
      supplierBookingId: json.data.id,
      confirmationNumber: hb?.hotelProviderInformation?.[0]?.confirmationNumber ?? json.data.id,
      status: hb?.bookingStatus === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
      hotelName: hb?.hotel?.name ?? '',
      checkIn: hb?.hotelOffer?.checkInDate ?? '',
      checkOut: hb?.hotelOffer?.checkOutDate ?? '',
      raw: json,
    };
  },
};

function mapEntry(entry: AmadeusOfferResponse['data'][number], query: SearchQuery): HotelWithOffers {
  const h = entry.hotel;
  const hotel: HotelSummary = {
    id: `amadeus:${h.hotelId}`,
    supplier: 'amadeus',
    supplierHotelId: h.hotelId,
    name: h.name,
    stars: h.rating ? Number(h.rating) : undefined,
    city: h.address?.cityName ?? query.destination,
    country: h.address?.countryCode ?? 'NL',
    address: h.address?.lines?.join(', ') ?? '',
    geo: h.latitude && h.longitude ? { lat: h.latitude, lng: h.longitude } : undefined,
    images: [],
    amenities: h.amenities ?? [],
    description: h.description?.text,
  };

  const offers: RoomOffer[] = entry.offers.map((o) => {
    const cancel = o.policies?.cancellations?.[0];
    return {
      id: `amadeus:${o.id}`,
      supplier: 'amadeus',
      supplierOfferId: o.id,
      hotelId: hotel.id,
      roomName: o.room?.typeEstimated?.category?.replaceAll('_', ' ') ?? o.room?.description?.text?.split('\n')[0] ?? 'Kamer',
      bedType: o.room?.typeEstimated?.bedType,
      boardType: mapBoard(o.boardType),
      maxOccupancy: o.guests?.adults ?? query.adults,
      refundable: Boolean(cancel?.deadline),
      cancellationDeadline: cancel?.deadline,
      cancellationPolicyText: cancel?.description?.text,
      supplierTotal: {
        amount: Math.round(Number(o.price.total) * 100),
        currency: (o.price.currency as 'EUR') ?? 'EUR',
      },
      taxesIncluded: o.price.taxes?.some((t) => t.included) ?? true,
      nights: nightsBetween(o.checkInDate, o.checkOutDate),
    };
  });

  return { hotel, offers };
}
