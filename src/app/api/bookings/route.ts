import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/** GET /api/bookings?reference=VBF-XXXXXX&email=... — boekingstatus opzoeken. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get('reference');
  const email = url.searchParams.get('email');

  if (!reference || !email) {
    return NextResponse.json({ error: 'Referentie en e-mailadres zijn verplicht' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { reference },
    select: {
      reference: true, status: true, paymentStatus: true, hotelName: true, hotelCity: true,
      hotelAddress: true, roomName: true, boardType: true, checkIn: true, checkOut: true,
      nights: true, adults: true, rooms: true, guestTotal: true, serviceFee: true,
      currency: true, confirmationNumber: true, cancellationDeadline: true, refundable: true,
      guestEmail: true, guestFirstName: true,
    },
  });

  // Geen informatie lekken: verkeerd e-mailadres geeft hetzelfde antwoord als
  // een niet-bestaande referentie.
  if (!booking || booking.guestEmail.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'Geen boeking gevonden' }, { status: 404 });
  }

  const { guestEmail: _omit, ...safe } = booking;
  return NextResponse.json({ booking: safe });
}
