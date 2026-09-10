import Link from 'next/link';
import { SearchForm } from '@/components/SearchForm';
import { hotelIllustration } from '@/components/illustration';
import { SEED_HOTELS } from '@/lib/suppliers/inventory';

export default function HomePage() {
  const featured = SEED_HOTELS.slice(0, 3);

  return (
    <main>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="display text-xl text-brand">Verblyf</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/partners" className="hover:text-brand">Voor hotels</Link>
            <Link href="/boeking" className="hover:text-brand">Mijn boeking</Link>
            <Link href="/inloggen" className="hover:text-brand">Inloggen</Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-16">
        <p className="mb-3 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          Het hotel betaalt geen commissie
        </p>
        <h1 className="display max-w-3xl text-5xl leading-[1.05] md:text-6xl">
          Rustig kiezen, en <br />precies weten wat je betaalt.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">
          De grote boekingssites houden 15 tot 18% van elke overnachting in. Bij ons betaalt het
          hotel niets en betaal jij 8% servicekosten — zichtbaar vanaf het eerste zoekresultaat,
          niet pas op de laatste pagina.
        </p>
        <div className="mt-10">
          <SearchForm />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="display mb-6 text-2xl">Populair deze maand</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((h) => (
            <article key={h.code} className="overflow-hidden rounded-[18px] bg-surface ring-1 ring-line">
              <div className="aspect-[16/10]" dangerouslySetInnerHTML={{ __html: hotelIllustration(h.style, h.palette, h.code, true) }} />
              <div className="p-5">
                <h3 className="display text-lg">{h.name}</h3>
                <p className="text-sm text-ink-soft">{h.neighbourhood}, {h.city}</p>
                <p className="mt-3 text-sm">
                  vanaf <strong>€{Math.round(h.baseRateCents / 100)}</strong> per nacht
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-16 border-t border-line bg-surface py-10 text-sm text-ink-soft">
        <div className="mx-auto max-w-6xl px-6">
          <p>Verblyf B.V. — bemiddelaar in accommodatie. Wij verkopen uitsluitend verblijf, geen pakketreizen. Alle bedragen zijn inclusief btw en de servicekosten van 8%.</p>
        </div>
      </footer>
    </main>
  );
}
