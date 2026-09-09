/**
 * Leveranciers-abstractie.
 *
 * Elke hotel-API (Amadeus, Hotelbeds, RateHawk, direct-connect met een hotel)
 * wordt achter dit ene contract gehangen. De rest van de applicatie weet niet
 * van welke bron een hotel of prijs komt — dat maakt het mogelijk om later
 * leveranciers toe te voegen of te wisselen zonder de UI aan te raken.
 */

export type SupplierId = 'amadeus' | 'liteapi' | 'hotelbeds' | 'ratehawk' | 'direct' | 'mock';

export interface Money {
  /** Bedrag in centen. Nooit floats gebruiken voor geld. */
  amount: number;
  currency: 'EUR' | 'USD' | 'GBP';
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface SearchQuery {
  /** Vrije tekst of stadscode, bv. "Amsterdam" of "AMS" */
  destination: string;
  checkIn: string;  // ISO date, YYYY-MM-DD
  checkOut: string; // ISO date, YYYY-MM-DD
  adults: number;
  children?: number;
  rooms: number;
  currency?: Money['currency'];
  /** Land van verblijf van de gast — beïnvloedt beschikbare tarieven en btw. */
  countryOfResidence?: string;
}

export interface HotelSummary {
  id: string;             // interne id: `${supplier}:${supplierHotelId}`
  supplier: SupplierId;
  supplierHotelId: string;
  name: string;
  stars?: number;
  city: string;
  country: string;
  address: string;
  geo?: GeoPoint;
  images: string[];
  amenities: string[];
  rating?: { score: number; count: number };
  description?: string;
}

export interface RoomOffer {
  id: string;             // interne offer id: `${supplier}:${supplierOfferId}`
  supplier: SupplierId;
  supplierOfferId: string;
  hotelId: string;
  roomName: string;
  bedType?: string;
  boardType: 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD' | 'FULL_BOARD' | 'ALL_INCLUSIVE';
  maxOccupancy: number;
  refundable: boolean;
  cancellationDeadline?: string; // ISO datetime
  /** Netto-inkoopprijs bij de leverancier voor het hele verblijf, excl. onze fee. */
  supplierTotal: Money;
  /** Taxes/fees die de leverancier al meerekent. */
  taxesIncluded: boolean;
  nights: number;
  cancellationPolicyText?: string;
}

export interface HotelWithOffers {
  hotel: HotelSummary;
  offers: RoomOffer[];
}

export interface GuestDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface BookingRequest {
  offerId: string;
  guest: GuestDetails;
  specialRequests?: string;
  /** Referentie van onze eigen betaling (Stripe PaymentIntent). */
  paymentReference: string;
}

export interface BookingResult {
  supplier: SupplierId;
  supplierBookingId: string;
  confirmationNumber: string;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED';
  hotelName: string;
  checkIn: string;
  checkOut: string;
  raw?: unknown;
}

/** Het contract waar elke leverancier-adapter aan moet voldoen. */
export interface HotelSupplier {
  id: SupplierId;
  /** Zoek hotels + beschikbare tarieven voor een periode. */
  search(query: SearchQuery): Promise<HotelWithOffers[]>;
  /** Haal één hotel met alle beschikbare kamers op. */
  getHotel(hotelId: string, query: SearchQuery): Promise<HotelWithOffers | null>;
  /** Hervalideer een tarief vlak voor betaling (prijzen verlopen snel). */
  priceOffer(offerId: string): Promise<RoomOffer | null>;
  /** Plaats de definitieve boeking bij de leverancier. */
  book(request: BookingRequest): Promise<BookingResult>;
}

export class SupplierError extends Error {
  constructor(
    public supplier: SupplierId,
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = 'SupplierError';
  }
}
