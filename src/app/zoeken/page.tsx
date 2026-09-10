import Link from 'next/link';
import { searchAllSuppliers } from '@/lib/suppliers';
import { buildPriceBreakdown, formatMoney } from '@/lib/pricing';
import { searchSchema } from '@/lib/validation';
import { SearchForm } from '@/components/SearchForm';
import { hotelIllustration, type Palette, type Style } from '@/components/illustration';
import { SEED_HOTELS } from '@/lib/suppliers/inventory';

export const dynamic = 'force-dynamic';

function defaultDates() {
  const inDate = new Date();
  inDate.setDate(inDate.getDate() + 14);
  const outDate = new Date(inDate);
  outDate.setDate(outDate.getDate() + 2);
  return {
    checkIn: inDate.toISOString().slice(0, 10),
    checkOut: outDate.toISOString().slice(0, 10),
    adults: '2',
    rooms: '1',
    destination: 'Nederland',
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function artFor(hotelName: string): { style: Style; palette: Palette; seed: string } {
  const seed = SEED_HOTELS.find((s) => s.name === hotelName);
  return { style: seed?.style ?? 'boutique', palette: seed?.palette ?? 'stone', seed: seed?.code ?? hotelName };
}

export default async function ZoekenPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;

  // Zonder datums toch een bruikbaar resultaat tonen: over twee weken, twee
  // nachten. Een lege zoekpagina is een doodlopende weg voor bezoekers die
  // via een gedeelde link binnenkomen.
  const withDefaults = { ...defaultDates(), ...raw };
  const parsed = searchSchema.safeParse(withDefaults);

  if (!parsed.success) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="display text-3xl">Zoekopdracht onvolledig</h1>
        <p className="mt-3 text-ink-soft">Controleer bestemming en data.</p>
        <div className="mt-8"><SearchForm /></div>
      </main>
    );
  }

  const query = parsed.data;
  const { results, errors } = await searchAllSuppliers(query);

  const hotels = results
    .filter((r) => r.offers.length)
    .map((r) => {
      const cheapest = r.offers.reduce((a, b) => (a.supplierTotal.amount <= b.supplierTotal.amount ? a : b));
      return { ...r, cheapest, price: buildPriceBreakdown(cheapest) };
    })
    .sort((a, b) => a.price.guestTotal.amount - b.price.guestTotal.amount);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/" className="display text-lg text-brand">Verblyf</Link>
      <div className="my-6"><SearchForm compact initial={raw as Record<string, string>} /></div>

      <h1 className="display text-2xl">
        {hotels.length} {hotels.length === 1 ? 'accommodatie' : 'accommodaties'} in {query.destination}
      </h1>
      <p className="text-sm text-ink-soft">
        {query.checkIn} t/m {query.checkOut} · {query.adults} gasten · prijzen inclusief btw en 8% servicekosten
      </p>

      {errors.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-900">
          Niet alle leveranciers reageerden op tijd; er kunnen tarieven ontbreken.
        </p>
      )}

      <ul className="mt-8 space-y-4">
        {hotels.map(({ hotel, price, offers }) => {
          const art = artFor(hotel.name);
          return (
            <li key={hotel.id} className="grid gap-0 overflow-hidden rounded-[18px] bg-surface ring-1 ring-line md:grid-cols-[280px_1fr_auto]">
              <div className="min-h-[180px]" dangerouslySetInnerHTML={{ __html: hotelIllustration(art.style, art.palette, art.seed, true) }} />
              <div className="p-6">
                <h2 className="display text-xl">{hotel.name}</h2>
                <p className="text-sm text-ink-soft">{hotel.address}</p>
                {hotel.rating && (
                  <p className="mt-2 text-sm"><strong>{hotel.rating.score.toFixed(1)}</strong> · {hotel.rating.count} beoordelingen</p>
                )}
                <p className="mt-3 line-clamp-2 text-sm text-ink-soft">{hotel.description}</p>
                <p className="mt-3 text-xs text-ink-soft">{offers.length} beschikbare tarieven</p>
              </div>
              <div className="flex flex-col items-end justify-between gap-4 border-line p-6 md:border-l">
                <div className="text-right">
                  <p className="text-xs text-ink-soft">{price.nights} {price.nights === 1 ? 'nacht' : 'nachten'} totaal</p>
                  <p className="display text-2xl">{formatMoney(price.guestTotal)}</p>
                  <p className="text-xs text-ink-soft">{formatMoney(price.perNight)} per nacht</p>
                </div>
                <Link
                  href={`/hotel/${encodeURIComponent(hotel.id)}?checkIn=${query.checkIn}&checkOut=${query.checkOut}&adults=${query.adults}&rooms=${query.rooms}&destination=${encodeURIComponent(query.destination)}`}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Bekijk kamers
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
