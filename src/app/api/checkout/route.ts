import { NextResponse } from 'next/server';
import { hasDatabase, prisma } from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe';
import { reserve } from '@/lib/booking-service';
import { supplierOfHotelId } from '@/lib/suppliers';
import { checkoutSchema } from '@/lib/validation';

export const runtime = 'nodejs';

/** POST /api/checkout — reserveert en stuurt de gast door naar Stripe. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige gegevens', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { offerId, hotelId, guest, specialRequests, search } = parsed.data;

  if (!hasDatabase || !process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    return NextResponse.json(
      {
        error:
          'Deze site draait nu op voorbeelddata: betalen is uitgeschakeld. Koppel de database en Stripe om echte boekingen aan te nemen.',
        demo: true,
      },
      { status: 503 },
    );
  }

  try {
    const supplier = supplierOfHotelId(hotelId);
    const result = await supplier.getHotel(hotelId, search);
    const offer = result?.offers.find((o) => o.id === offerId);

    if (!result || !offer) {
      return NextResponse.json({ error: 'Dit tarief is niet meer beschikbaar' }, { status: 409 });
    }

    const { booking, offer: fresh, priceChanged } = await reserve({
      hotel: result.hotel,
      offer,
      guest,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      adults: search.adults,
      children: search.children,
      rooms: search.rooms,
      specialRequests,
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const session = await createCheckoutSession({
      offer: fresh,
      hotelName: result.hotel.name,
      guest,
      checkIn: search.checkIn,
      checkOut: search.checkOut,
      successUrl: `${base}/bevestiging/${booking.reference}`,
      cancelUrl: `${base}/hotel/${encodeURIComponent(hotelId)}?geannuleerd=1`,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url, reference: booking.reference, priceChanged });
  } catch (error) {
    console.error('[checkout]', error);
    return NextResponse.json({ error: 'Boeking kon niet worden gestart' }, { status: 502 });
  }
}
