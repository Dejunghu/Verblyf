'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth-client';

export default function RegistrerenPage() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get('password'));
    if (password.length < 10) {
      setError('Kies een wachtwoord van minstens tien tekens. Een korte zin werkt beter dan losse tekens.');
      return;
    }
    setBusy(true); setError(null);
    const { error } = await signUp.email({
      email: String(fd.get('email')),
      password,
      name: `${fd.get('firstName')} ${fd.get('lastName')}`.trim(),
      callbackURL: '/account',
    });
    setBusy(false);
    if (error) setError('Dit e-mailadres is al in gebruik. Log in of stel een nieuw wachtwoord in.');
    else setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-6 py-20">
        <h1 className="display text-3xl">Controleer je mail</h1>
        <p className="mt-3 text-ink-soft">
          We hebben je een link gestuurd om je e-mailadres te bevestigen. Daarna staat je account klaar.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="display text-3xl">Account aanmaken</h1>
      <p className="mt-2 text-ink-soft">Boek sneller, bewaar hotels en vind je reserveringen terug.</p>

      <form onSubmit={submit} className="mt-8 grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input name="firstName" required placeholder="Voornaam" className="rounded-xl border border-line px-4 py-3" />
          <input name="lastName" required placeholder="Achternaam" className="rounded-xl border border-line px-4 py-3" />
        </div>
        <input name="email" type="email" required placeholder="E-mailadres" className="rounded-xl border border-line px-4 py-3" />
        <input name="password" type="password" required placeholder="Wachtwoord (minimaal 10 tekens)" className="rounded-xl border border-line px-4 py-3" />
        <button disabled={busy} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60">
          {busy ? 'Bezig…' : 'Account aanmaken'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}
    </main>
  );
}
