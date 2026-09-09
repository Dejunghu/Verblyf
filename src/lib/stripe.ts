import Stripe from 'stripe';
import { buildPriceBreakdown, type FeeModel } from './pricing';
import type { GuestDetails, RoomOffer } from './suppliers/types';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});

/**
 * Betaalstromen.
 *
 * A. MERCHANT OF RECORD (standaard bij bedbank-tarieven)
 *    De gast betaalt ons het volledige bedrag. Wij betalen de leverancier via
 *    een virtual credit card of op rekening. Onze 8% blijft achter op onze
 *    Stripe-balans. Eenvoudig, maar wij dragen het chargeback-risico.
 *
 * B. DESTINATION CHARGE (bij direct-connect hotels met een eigen Stripe-account)
 *    De gast betaalt, Stripe splitst automatisch: het hotel krijgt de netto-
 *    prijs op zijn eigen account, wij houden `application_fee_amount` in.
 *    Het hotel draagt het chargeback-risico en wij raken het geld nooit aan —
 *    juridisch en fiscaal veruit het schoonste model voor een bemiddelaar.
 */

export interface CheckoutInput {
  offer: RoomOffer;
  hotelName: string;
  guest: GuestDetails;
  checkIn: string;
  checkOut: string;
  feeModel?: FeeModel;
  /** Stripe-account van het hotel, alleen bij destination charges. */
  connectedAccountId?: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(input: CheckoutInput) {
  const breakdown = buildPriceBreakdown(input.offer, input.feeModel);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      quantity: 1,
      price_data: {
        currency: breakdown.supplierTotal.currency.toLowerCase(),
        unit_amount: breakdown.supplierTotal.amount,
        product_data: {
          name: `${input.hotelName} — ${input.offer.roomName}`,
          description: `${input.checkIn} t/m ${input.checkOut} · ${breakdown.nights} ${breakdown.nights === 1 ? 'nacht' : 'nachten'}`,
        },
      },
    },
  ];

  // Bij MARKUP tonen we de servicekosten als aparte regel — transparantie is
  // hier ook een wettelijke eis (prijs moet vooraf volledig zichtbaar zijn).
  if (breakdown.model === 'MARKUP') {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: breakdown.serviceFee.currency.toLowerCase(),
        unit_amount: breakdown.serviceFee.amount,
        product_data: { name: 'Servicekosten Verblyf (8%)' },
      },
    });
  }

  const paymentIntentData: Stripe.Checkout.SessionCreateParams.PaymentIntentData = {
    metadata: {
      offerId: input.offer.id,
      supplier: input.offer.supplier,
      feeModel: breakdown.model,
      serviceFeeCents: String(breakdown.serviceFee.amount),
    },
  };

  if (input.connectedAccountId) {
    paymentIntentData.application_fee_amount = breakdown.serviceFee.amount;
    paymentIntentData.transfer_data = { destination: input.connectedAccountId };
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: input.guest.email,
    payment_intent_data: paymentIntentData,
    payment_method_types: ['card', 'ideal', 'bancontact'],
    locale: 'nl',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { offerId: input.offer.id, guestEmail: input.guest.email },
  });
}

export function verifyWebhook(body: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
}
