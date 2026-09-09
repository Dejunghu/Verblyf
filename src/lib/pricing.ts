import type { Money, RoomOffer } from './suppliers/types';

/**
 * Fee-engine.
 *
 * Twee verdienmodellen, allebei ondersteund:
 *
 *  1. MARKUP     — de gast betaalt de hotelprijs + 8% servicekosten.
 *                  Zichtbaar als aparte regel in de checkout. Wij innen het
 *                  volledige bedrag en betalen het hotel de netto-prijs.
 *
 *  2. COMMISSION — de gast betaalt precies de hotelprijs; het hotel/de
 *                  leverancier betaalt ons 8% commissie uit dat bedrag.
 *                  Onzichtbaar voor de gast, maar prijs-competitiever.
 *
 * Standaard: MARKUP. De gast ziet de servicekosten als aparte regel, vanaf
 * het eerste zoekresultaat tot en met de betaalpagina — dat is niet alleen
 * eerlijk, het is ook wat art. 6:193e BW en de Omnibus-richtlijn eisen: de
 * totaalprijs moet vooraf zichtbaar zijn, niet pas in de laatste stap.
 */

export type FeeModel = 'MARKUP' | 'COMMISSION';

export const FEE_CONFIG = {
  /** Ons tarief: 8%. */
  rate: 0.08,
  /** Ondergrens per boeking, zodat kleine boekingen niet verliesgevend zijn. */
  minFeeCents: 350,
  /** Bovengrens: boven de ~€1.900 wordt een percentage onredelijk. */
  maxFeeCents: 15000,
  defaultModel: 'MARKUP' as FeeModel,
  /**
   * Kosten van de betaaldienstverlener. Standaard de duurste route die wij
   * accepteren: niet-Europese creditcards (Stripe ~2,5% + €0,25). Europese
   * kaarten en iDEAL zijn goedkoper; `pspFor()` rekent per methode.
   * Puur voor interne marge-berekening — nooit tonen aan de gast.
   */
  psp: { percentage: 0.025, fixedCents: 25 },
} as const;

export interface PriceBreakdown {
  /** Netto-inkoop bij de leverancier. */
  supplierTotal: Money;
  /** Onze fee (8%, met onder- en bovengrens). */
  serviceFee: Money;
  /** Wat de gast in totaal afrekent. */
  guestTotal: Money;
  /** Wat wij aan de leverancier/het hotel doorbetalen. */
  payoutToSupplier: Money;
  /** Kosten van de betaaldienstverlener over guestTotal. */
  pspCost: Money;
  /** Wat er onder de streep voor ons overblijft. */
  netMargin: Money;
  /** Effectieve marge als percentage van de boekingswaarde. */
  netMarginPct: number;
  model: FeeModel;
  perNight: Money;
  nights: number;
}

const money = (amount: number, currency: Money['currency'] = 'EUR'): Money => ({
  amount: Math.round(amount),
  currency,
});

export function calculateFee(supplierTotalCents: number): number {
  const raw = supplierTotalCents * FEE_CONFIG.rate;
  return Math.round(Math.min(Math.max(raw, FEE_CONFIG.minFeeCents), FEE_CONFIG.maxFeeCents));
}

export function buildPriceBreakdown(
  offer: Pick<RoomOffer, 'supplierTotal' | 'nights'>,
  model: FeeModel = FEE_CONFIG.defaultModel,
): PriceBreakdown {
  const currency = offer.supplierTotal.currency;
  const supplierTotal = offer.supplierTotal.amount;
  const fee = calculateFee(supplierTotal);

  // Bij MARKUP komt de fee bovenop de hotelprijs; bij COMMISSION zit hij erin.
  const guestTotal = model === 'MARKUP' ? supplierTotal + fee : supplierTotal;
  const payout = model === 'MARKUP' ? supplierTotal : supplierTotal - fee;

  const pspCost = Math.round(guestTotal * FEE_CONFIG.psp.percentage + FEE_CONFIG.psp.fixedCents);
  const netMargin = fee - pspCost;

  return {
    supplierTotal: money(supplierTotal, currency),
    serviceFee: money(fee, currency),
    guestTotal: money(guestTotal, currency),
    payoutToSupplier: money(payout, currency),
    pspCost: money(pspCost, currency),
    netMargin: money(netMargin, currency),
    netMarginPct: guestTotal > 0 ? (netMargin / guestTotal) * 100 : 0,
    model,
    perNight: money(guestTotal / Math.max(offer.nights, 1), currency),
    nights: offer.nights,
  };
}

/** Werkelijke transactiekosten per betaalmethode (Stripe, NL-tarieven). */
export const PSP_METHODS = {
  ideal:      { label: 'iDEAL',                    percentage: 0,      fixedCents: 29 },
  bancontact: { label: 'Bancontact',               percentage: 0,      fixedCents: 29 },
  card_eu:    { label: 'Europese kaart',           percentage: 0.015,  fixedCents: 25 },
  card_intl:  { label: 'Niet-Europese creditcard', percentage: 0.0325, fixedCents: 25 },
} as const;

export type PaymentMethodKey = keyof typeof PSP_METHODS;

/** Wat blijft er over per betaalmethode? Voor de marge-rapportage. */
export function marginByMethod(breakdown: PriceBreakdown) {
  return (Object.keys(PSP_METHODS) as PaymentMethodKey[]).map((key) => {
    const m = PSP_METHODS[key];
    const cost = Math.round(breakdown.guestTotal.amount * m.percentage + m.fixedCents);
    const net = breakdown.serviceFee.amount - cost;
    return {
      key,
      label: m.label,
      cost: money(cost, breakdown.guestTotal.currency),
      net: money(net, breakdown.guestTotal.currency),
      pctOfBooking: breakdown.guestTotal.amount > 0 ? (net / breakdown.guestTotal.amount) * 100 : 0,
    };
  });
}

export function formatMoney(m: Money, locale = 'nl-NL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: m.currency,
    minimumFractionDigits: m.amount % 100 === 0 ? 0 : 2,
  }).format(m.amount / 100);
}

/**
 * Marge-check: bij 8% fee blijft elke betaalmethode rendabel, maar de
 * PSP een groot deel van de marge. Deze helper zegt of een boeking rendabel is
 * en, zo niet, wat het omslagpunt is.
 */
export function marginHealth(breakdown: PriceBreakdown) {
  const { netMargin, guestTotal } = breakdown;
  const breakEvenCents = Math.ceil(
    FEE_CONFIG.psp.fixedCents / (FEE_CONFIG.rate - FEE_CONFIG.psp.percentage),
  );
  return {
    profitable: netMargin.amount > 0,
    breakEvenBookingValue: money(breakEvenCents, guestTotal.currency),
    advice:
      netMargin.amount > 0
        ? 'Rendabel via kaartbetaling.'
        : 'Onder het omslagpunt: factureer de fee maandelijks per SEPA-incasso aan het hotel in plaats van via de kaartbetaling.',
  };
}
