'use client';

import { Suspense, useState } from 'react';

/**
 * Boeking opzoeken zonder account: referentie plus e-mailadres. Bewust géén
 * losse referentie — dan kan iemand met wat gokken andermans reis inzien.
 */
function Lookup() {
  const [status, setStatus] = useState<'idle' | 'busy' | 'error' | 'found'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [booking, setBooking] = useState<Record<string, unknown> | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus('busy');
    setMessage(null);

    const params = new URLSearchParams({
      reference: String(fd.get('reference') ?? '').trim().toUpperCase(),
      email: String(fd.get('email') ?? '').trim(),
    });

    const res = await fetch(`/api/bookings?${params}`);
    const json = await res.json();

    if (!res.ok) {
      setStatus('error');
      setMessage(
        res.status === 404
          ? 'We vinden geen boeking bij deze combinatie. Controleer de referentie en het e-mailadres waarmee je hebt geboekt.'
          : (json.error ?? 'Opzoeken lukte even niet. Probeer het zo nog eens.'),
      );
      return;
    }

    setBooking(json.booking);
    setStatus('found');
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <p className="eyebrow">Mijn boeking</p>
      <h1 className="display mt-3 text-3xl">Je reservering opzoeken</h1>
      <p className="mt-3 text-ink-soft">
        Vul de referentie uit je bevestigingsmail in, samen met het e-mailadres waarmee je hebt
        geboekt.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-3">
        <input
          name="reference"
          required
          placeholder="VBF-XXXXXX"
          className="rounded border border-line-strong bg-surface-2 px-4 py-3 uppercase"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mailadres"
          className="rounded border border-line-strong bg-surface-2 px-4 py-3"
        />
        <button
          disabled={status === 'busy'}
          className="rounded bg-brand px-5 py-3 font-medium text-surface disabled:opacity-60"
        >
          {status === 'busy' ? 'Bezig…' : 'Boeking opzoeken'}
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-accent">{message}</p>}

      {status === 'found' && booking && (
        <dl className="mt-8 divide-y divide-line rounded border border-line bg-surface">
          {Object.entries({
            Hotel: String(booking.hotelName ?? ''),
            Plaats: String(booking.hotelCity ?? ''),
            Kamer: String(booking.roomName ?? ''),
            Inchecken: new Date(String(booking.checkIn)).toLocaleDateString('nl-NL'),
            Uitchecken: new Date(String(booking.checkOut)).toLocaleDateString('nl-NL'),
            Status: String(booking.status ?? ''),
          }).map(([k, v]) => (
            <div key={k} className="flex justify-between px-5 py-3 text-sm">
              <dt className="text-ink-soft">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}

export default function BoekingPage() {
  return (
    <Suspense fallback={<p className="p-12">Laden…</p>}>
      <Lookup />
    </Suspense>
  );
}
