import { NextResponse } from 'next/server';
import { verifyWebhook } from '@/lib/stripe';
import { confirmAfterPayment } from '@/lib/booking-service';

export const runtime = 'nodejs';

/**
 * POST /api/webhooks/stripe
 *
 * Dit is het enige punt waarop een boeking daadwerkelijk bij de leverancier
 * wordt geplaatst. Nooit vertrouwen op de redirect naar de success-URL: de
 * gast kan de browser sluiten voordat die geladen is.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Geen handtekening' }, { status: 400 });

  const raw = await request.text();

  let event;
  try {
    event = verifyWebhook(raw, signature);
  } catch (error) {
    console.error('[webhook] ongeldige handtekening', error);
    return NextResponse.json({ error: 'Ongeldige handtekening' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      if (session.payment_status === 'paid') {
        await confirmAfterPayment(session.id, String(session.payment_intent));
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook] verwerking mislukt', error);
    // 500 teruggeven laat Stripe het opnieuw proberen — dat is hier gewenst.
    return NextResponse.json({ error: 'Verwerking mislukt' }, { status: 500 });
  }
}
