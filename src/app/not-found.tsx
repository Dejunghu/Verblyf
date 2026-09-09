import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center px-6 py-20">
      <p className="eyebrow">Pagina niet gevonden</p>
      <h1 className="display mt-3 text-4xl">Hier staat niets meer.</h1>
      <p className="mt-4 text-ink-soft">
        De pagina is verplaatst of het adres klopt niet helemaal. Zoek opnieuw op bestemming, of
        ga terug naar het begin.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="rounded border border-line-strong px-5 py-3 text-sm hover:bg-surface-2">
          Naar de startpagina
        </Link>
        <Link href="/partners" className="rounded border border-line-strong px-5 py-3 text-sm hover:bg-surface-2">
          Voor hotels
        </Link>
      </div>
    </main>
  );
}
