import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supplierOfHotelId } from '@/lib/suppliers';
import { buildPriceBreakdown, formatMoney } from '@/lib/pricing';
import { searchSchema } from '@/lib/validation';
import { hotelIllustration, type Palette, type Style } from '@/components/illustration';
import { SEED_HOTELS } from '@/lib/suppliers/inventory';

export const dynamic = 'force-dynamic';

const BOARD_LABEL: Record<string, string> = {
  ROOM_ONLY: 'Zonder ontbijt',
  BREAKFAST: 'Inclusief ontbijt',
  HALF_BOARD: 'Halfpension',
  FULL_BOARD: 'Volpension',
  ALL_INCLUSIVE: 'All-inclusive',
};

export default async function HotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const hotelId = decodeURIComponent(id);

  const parsed = searchSchema.safeParse({ destination: 'nl', ...raw });
  if (!parsed.success) notFound();

  const supplier = supplierOfHotelId(hotelId);
  const result = await supplier.getHotel(hotelId, parsed.data);
  if (!result) notFound();

  const { hotel, offers } = result;
  const seed = SEED_HOTELS.find((s) => s.name === hotel.name);
  const style: Style = seed?.style ?? 'boutique';
  const palette: Palette = seed?.palette ?? 'teal';

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/" className="display text-lg text-brand">Verblyf</Link>

      <div className="mt-6 overflow-hidden rounded-[18px] ring-1 ring-line">
        <div className="aspect-[21/9]" dangerouslySetInnerHTML={{ __html: hotelIllustration(style, palette, hotel.supplierHotelId) }} />
      </div>

      <h1 className="display mt-6 text-3xl">{hotel.name}</h1>
      <p className="text-ink-soft">{hotel.address}</p>
      {hotel.description && <p className="mt-4 max-w-2xl">{hotel.description}</p>}

      <ul className="mt-4 flex flex-wrap gap-2">
        {hotel.amenities.map((a) => (
          <li key={a} className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand">{a}</li>
        ))}
      </ul>

      <h2 className="display mt-10 text-2xl">Beschikbare kamers</h2>
      <ul className="mt-4 space-y-3">
        {offers.map((offer) => {
          const price = buildPriceBreakdown(offer);
          return (
            <li key={offer.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line">
              <div>
                <h3 className="font-semibold">{offer.roomName}</h3>
                <p className="text-sm text-ink-soft">
                  {offer.bedType} · {BOARD_LABEL[offer.boardType]} · max {offer.maxOccupancy} gasten
                </p>
                <p className={`mt-1 text-sm ${offer.refundable ? 'text-brand' : 'text-ink-soft'}`}>
                  {offer.cancellationPolicyText}
                </p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="display text-xl">{formatMoney(price.guestTotal)}</p>
                  <p className="text-xs text-ink-soft">{price.nights} nachten, incl. 8% servicekosten</p>
                </div>
                <Link
                  href={`/boeken?offerId=${encodeURIComponent(offer.id)}&hotelId=${encodeURIComponent(hotel.id)}&checkIn=${parsed.data.checkIn}&checkOut=${parsed.data.checkOut}&adults=${parsed.data.adults}&rooms=${parsed.data.rooms}`}
                  className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Reserveren
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
