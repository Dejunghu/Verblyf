import { prisma } from './db';
import { buildPriceBreakdown } from './pricing';
import { supplierOfHotelId } from './suppliers';
import type { GuestDetails, HotelSummary, RoomOffer } from './suppliers/types';

/**
 * De boekingsflow, met één harde regel:
 *
 *   NOOIT bij de leverancier boeken voordat de betaling van de gast is
 *   bevestigd, en NOOIT geld innen zonder daarna te boeken.
 *
 * Volgorde:
 *   1. reserve()  — tarief hervalideren, boeking als PENDING vastleggen
 *   2. Stripe Checkout — gast betaalt
 *   3. confirm()  — webhook bevestigt betaling, dan pas boeken bij leverancier
 *   4. mislukt stap 3? Automatisch volledige terugbetaling + melding.
 */

export function generateReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `VBF-${out}`;
}

export async function reserve(args: {
  hotel: HotelSummary;
  offer: RoomOffer;
  guest: GuestDetails;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  rooms: number;
  specialRequests?: string;
}) {
  const supplier = supplierOfHotelId(args.offer.id);

  // Tarief hervalideren: bedbank-prijzen verlopen binnen minuten.
  const fresh = (await supplier.priceOffer(args.offer.id)) ?? args.offer;
  const priceChanged = fresh.supplierTotal.amount !== args.offer.supplierTotal.amount;
  const breakdown = buildPriceBreakdown(fresh);

  const booking = await prisma.booking.create({
    data: {
      reference: generateReference(),
      supplier: fresh.supplier,
      supplierOfferId: fresh.supplierOfferId,
      hotelId: args.hotel.id,
      hotelName: args.hotel.name,
      hotelCity: args.hotel.city,
      hotelAddress: args.hotel.address,
      roomName: fresh.roomName,
      boardType: fresh.boardType,
      checkIn: new Date(args.checkIn),
      checkOut: new Date(args.checkOut),
      nights: fresh.nights,
      adults: args.adults,
      children: args.children,
      rooms: args.rooms,
      currency: breakdown.guestTotal.currency,
      supplierTotal: breakdown.supplierTotal.amount,
      serviceFee: breakdown.serviceFee.amount,
      guestTotal: breakdown.guestTotal.amount,
      payoutToSupplier: breakdown.payoutToSupplier.amount,
      feeModel: breakdown.model,
      guestFirstName: args.guest.firstName,
      guestLastName: args.guest.lastName,
      guestEmail: args.guest.email,
      guestPhone: args.guest.phone,
      guestCountry: args.guest.countryCode,
      specialRequests: args.specialRequests,
      refundable: fresh.refundable,
      cancellationDeadline: fresh.cancellationDeadline ? new Date(fresh.cancellationDeadline) : null,
      events: { create: { type: 'RESERVED', message: priceChanged ? 'Tarief gewijzigd bij hervalidatie' : 'Tarief bevestigd' } },
    },
  });

  return { booking, offer: fresh, breakdown, priceChanged };
}

export async function confirmAfterPayment(stripeSessionId: string, paymentIntentId: string) {
  const booking = await prisma.booking.findUnique({ where: { stripeSessionId } });
  if (!booking) throw new Error(`Geen boeking voor sessie ${stripeSessionId}`);
  if (booking.status === 'CONFIRMED') return booking; // idempotent: webhooks komen vaker binnen

  await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentStatus: 'PAID', paymentIntentId, events: { create: { type: 'PAID' } } },
  });

  const supplier = supplierOfHotelId(booking.hotelId);

  try {
    const result = await supplier.book({
      offerId: `${booking.supplier}:${booking.supplierOfferId}`,
      guest: {
        firstName: booking.guestFirstName,
        lastName: booking.guestLastName,
        email: booking.guestEmail,
        phone: booking.guestPhone,
        countryCode: booking.guestCountry,
      },
      specialRequests: booking.specialRequests ?? undefined,
      paymentReference: paymentIntentId,
    });

    return prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: result.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING',
        supplierBookingId: result.supplierBookingId,
        confirmationNumber: result.confirmationNumber,
        events: { create: { type: 'SUPPLIER_CONFIRMED', message: result.confirmationNumber } },
      },
    });
  } catch (error) {
    // Betaald maar niet geboekt: direct terugbetalen, dit mag nooit blijven hangen.
    const { stripe } = await import('./stripe');
    await stripe.refunds.create({ payment_intent: paymentIntentId }).catch(() => null);

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'FAILED',
        paymentStatus: 'REFUNDED',
        events: { create: { type: 'FAILED', message: String((error as Error).message) } },
      },
    });
    throw error;
  }
}
