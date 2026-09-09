import Link from 'next/link';

const COMPARISON = [
  { label: 'Commissie per boeking', ota: '15 – 18%', verblyf: '2%' },
  { label: 'Bij €200 kamerprijs', ota: '€30 – €36 naar het platform', verblyf: '€4 naar Verblyf' },
  { label: 'Uitbetaling', ota: 'Maandelijks, achteraf', verblyf: 'Direct op je eigen Stripe-account' },
  { label: 'Gastgegevens', ota: 'Afgeschermd', verblyf: 'Volledig van jou' },
  { label: 'Pariteitsclausule', ota: 'Vaak verplicht', verblyf: 'Geen' },
];

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/" className="display text-lg text-brand">Verblyf</Link>
      <h1 className="display mt-8 text-4xl">Van 18% naar 2%.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        Een hotel met 60 kamers en een gemiddelde kamerprijs van €150 betaalt bij de grote platforms
        al snel €90.000 commissie per jaar. Bij ons is dat €10.000. Het verschil houd je zelf, of je
        geeft het door aan de gast.
      </p>

      <table className="mt-10 w-full overflow-hidden rounded-2xl bg-surface text-left text-sm ring-1 ring-line">
        <thead className="bg-brand-soft text-brand">
          <tr>
            <th className="px-5 py-3 font-semibold"></th>
            <th className="px-5 py-3 font-semibold">Grote boekingssites</th>
            <th className="px-5 py-3 font-semibold">Verblyf</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {COMPARISON.map((row) => (
            <tr key={row.label}>
              <td className="px-5 py-4 font-medium">{row.label}</td>
              <td className="px-5 py-4 text-ink-soft">{row.ota}</td>
              <td className="px-5 py-4 font-semibold text-brand">{row.verblyf}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <a href="mailto:partners@verblyf.com" className="mt-10 inline-block rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark">
        Aanmelden als partnerhotel
      </a>
    </main>
  );
}
