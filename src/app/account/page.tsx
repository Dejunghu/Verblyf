import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasDatabase, prisma } from '@/lib/db';
import { formatMoney } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!hasDatabase) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="display text-3xl">Accounts staan nog uit</h1>
        <p className="mt-3 text-ink-soft">
          Deze site draait op voorbeelddata. Zodra de database gekoppeld is, kun je hier inloggen,
          je boekingen terugvinden en hotels bewaren.
        </p>
      </main>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/inloggen');

  const [bookings, favorites] = await Promise.all([
    prisma.booking.findMany({ where: { userId: session.user.id }, orderBy: { checkIn: 'desc' }, take: 20 }),
    prisma.favorite.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="display text-3xl">Hallo {session.user.name?.split(' ')[0] ?? ''}</h1>

      <section className="mt-10">
        <h2 className="display text-xl">Je boekingen</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-ink-soft">Je hebt nog geen boekingen. Zodra je er een maakt, staat hij hier.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
                <div>
                  <p className="font-semibold">{b.hotelName}</p>
                  <p className="text-sm text-ink-soft">
                    {b.checkIn.toLocaleDateString('nl-NL')} — {b.checkOut.toLocaleDateString('nl-NL')} · {b.roomName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono">{formatMoney({ amount: b.guestTotal, currency: 'EUR' })}</p>
                  <p className="text-xs text-ink-faint">{b.reference}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="display text-xl">Bewaarde hotels</h2>
        {favorites.length === 0 ? (
          <p className="mt-3 text-ink-soft">Nog niets bewaard. Tik het hartje aan bij een hotel dat je wilt onthouden.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {favorites.map((f) => (
              <li key={f.id} className="rounded-2xl border border-line bg-surface p-4">
                <p className="font-medium">{f.hotelName}</p>
                <p className="text-sm text-ink-soft">{f.hotelCity}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
