import { NextResponse } from 'next/server';
import { searchAllSuppliers } from '@/lib/suppliers';
import { buildPriceBreakdown } from '@/lib/pricing';
import { searchSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/search?destination=Amsterdam&checkIn=...&checkOut=...&adults=2&rooms=1
 *
 * Geeft hotels terug met het goedkoopste tarief per hotel, inclusief de
 * volledige prijsopbouw (zodat de UI nooit zelf hoeft te rekenen).
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = searchSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ongeldige zoekopdracht', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { results, errors } = await searchAllSuppliers(parsed.data);

    const hotels = results
      .filter((r) => r.offers.length > 0)
      .map((r) => {
        const cheapest = r.offers.reduce((a, b) =>
          a.supplierTotal.amount <= b.supplierTotal.amount ? a : b,
        );
        return {
          hotel: r.hotel,
          offerCount: r.offers.length,
          cheapestOffer: cheapest,
          price: buildPriceBreakdown(cheapest),
        };
      })
      .sort((a, b) => a.price.guestTotal.amount - b.price.guestTotal.amount);

    return NextResponse.json({
      query: parsed.data,
      count: hotels.length,
      hotels,
      supplierErrors: errors,
    });
  } catch (error) {
    console.error('[search]', error);
    return NextResponse.json({ error: 'Zoeken is tijdelijk niet mogelijk' }, { status: 502 });
  }
}
