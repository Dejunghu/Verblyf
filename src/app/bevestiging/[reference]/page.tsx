import { notFound } from 'next/navigation';
import { hasDatabase, prisma } from '@/lib/db';
import { formatMoney } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function BevestigingPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  if (!hasDatabase) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-sm font-semibold text-brand">Demo</p>
        <h1 className="display mt-2 text-4xl">Boeking {reference}</h1>
        <p className="mt-4 text-ink-soft">
          Deze site draait op voorbeelddata, dus er is niets vastgelegd en niets afgeschreven.
          Zodra de database gekoppeld is, staat hier de echte bevestiging met het nummer van het hotel.
        </p>
      </main>
    );
  }

  const booking = await prisma.booking.findUnique({ where: { reference } });
  if (!booking) notFound();

  const fmt = (d: Date) => d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold text-brand">Boeking bevestigd</p>
      <h1 className="display mt-2 text-4xl">{booking.hotelName}</h1>
      <p className="mt-1 text-ink-soft">{booking.hotelAddress}</p>

      <dl className="mt-8 divide-y divide-line rounded-2xl bg-surface ring-1 ring-line">
        {[
          ['Referentie', booking.reference],
          ['Bevestigingsnummer hotel', booking.confirmationNumber ?? 'wordt toegevoegd'],
          ['Inchecken', fmt(booking.checkIn)],
          ['Uitchecken', fmt(booking.checkOut)],
          ['Kamer', booking.roomName],
          ['Gasten', `${booking.adults} volwassenen`],
          ['Totaal betaald', formatMoney({ amount: booking.guestTotal, currency: 'EUR' })],
          ['Waarvan servicekosten', formatMoney({ amount: booking.serviceFee, currency: 'EUR' })],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between px-6 py-4 text-sm">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 text-sm text-ink-soft">
        Een bevestiging is verstuurd naar {booking.guestEmail}. Bewaar je referentie {booking.reference} —
        daarmee kun je je boeking altijd terugvinden.
      </p>
    </main>
  );
}
