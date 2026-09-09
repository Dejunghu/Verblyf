'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function BoekenForm() {
  const sp = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'busy' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('busy');
    const fd = new FormData(e.currentTarget);

    const payload = {
      offerId: sp.get('offerId'),
      hotelId: sp.get('hotelId'),
      guest: {
        firstName: String(fd.get('firstName')),
        lastName: String(fd.get('lastName')),
        email: String(fd.get('email')),
        phone: String(fd.get('phone')),
        countryCode: 'NL',
      },
      specialRequests: String(fd.get('specialRequests') || ''),
      search: {
        destination: sp.get('destination') ?? 'nl',
        checkIn: sp.get('checkIn'),
        checkOut: sp.get('checkOut'),
        adults: Number(sp.get('adults') ?? 2),
        children: 0,
        rooms: Number(sp.get('rooms') ?? 1),
        currency: 'EUR',
      },
    };

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok || !json.url) {
      setStatus('error');
      setMessage(json.error ?? 'Er ging iets mis bij het starten van de betaling.');
      return;
    }
    window.location.href = json.url;
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-4 px-6 py-12">
      <h1 className="display text-3xl">Je gegevens</h1>
      <p className="text-sm text-ink-soft">
        Deze gegevens gaan rechtstreeks naar het hotel. Je betaalt op de volgende stap veilig via Stripe.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <input name="firstName" required placeholder="Voornaam" className="rounded-xl border border-line px-4 py-3" />
        <input name="lastName" required placeholder="Achternaam" className="rounded-xl border border-line px-4 py-3" />
      </div>
      <input name="email" type="email" required placeholder="E-mailadres" className="w-full rounded-xl border border-line px-4 py-3" />
      <input name="phone" required placeholder="Telefoonnummer" className="w-full rounded-xl border border-line px-4 py-3" />
      <textarea name="specialRequests" rows={3} placeholder="Bijzonderheden voor het hotel (optioneel)" className="w-full rounded-xl border border-line px-4 py-3" />

      <button
        type="submit"
        disabled={status === 'busy'}
        className="w-full rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {status === 'busy' ? 'Even geduld…' : 'Doorgaan naar betalen'}
      </button>

      {message && <p className="text-sm text-accent">{message}</p>}
    </form>
  );
}

export default function BoekenPage() {
  return (
    <Suspense fallback={<p className="p-12">Laden…</p>}>
      <BoekenForm />
    </Suspense>
  );
}
