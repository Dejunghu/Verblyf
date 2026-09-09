import { NextResponse } from 'next/server';
import { supplierOfHotelId } from '@/lib/suppliers';
import { buildPriceBreakdown } from '@/lib/pricing';
import { searchSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/hotels/mock:AMS-PLD?checkIn=...&checkOut=...&adults=2&rooms=1 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotelId = decodeURIComponent(id);
  const search = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = searchSchema.safeParse({ destination: 'x'.repeat(2), ...search });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Ongeldige parameters', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const supplier = supplierOfHotelId(hotelId);
    const result = await supplier.getHotel(hotelId, parsed.data);
    if (!result) return NextResponse.json({ error: 'Hotel niet gevonden' }, { status: 404 });

    return NextResponse.json({
      hotel: result.hotel,
      offers: result.offers.map((offer) => ({ offer, price: buildPriceBreakdown(offer) })),
    });
  } catch (error) {
    console.error('[hotel]', error);
    return NextResponse.json({ error: 'Hotel kon niet worden geladen' }, { status: 502 });
  }
}
