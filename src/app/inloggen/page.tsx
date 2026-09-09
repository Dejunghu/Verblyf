'use client';

import Link from 'next/link';
import { useState } from 'react';
import { signIn } from '@/lib/auth-client';

export default function InloggenPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function withEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy('email'); setError(null);
    const { error } = await signIn.email({
      email: String(fd.get('email')),
      password: String(fd.get('password')),
      callbackURL: '/account',
    });
    setBusy(null);
    if (error) setError('Dit e-mailadres en wachtwoord horen niet bij elkaar. Probeer het opnieuw of stel een nieuw wachtwoord in.');
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="display text-3xl">Welkom terug</h1>
      <p className="mt-2 text-ink-soft">Log in om je boekingen en bewaarde hotels te zien.</p>

      <div className="mt-8 grid gap-3">
        <button onClick={() => signIn.social({ provider: 'google', callbackURL: '/account' })}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-surface-2">
          Doorgaan met Google
        </button>
        <button onClick={() => signIn.social({ provider: 'apple', callbackURL: '/account' })}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-surface-2">
          Doorgaan met Apple
        </button>
      </div>

      <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-wider text-ink-faint">
        <span className="h-px flex-1 bg-line" /> of met e-mail <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={withEmail} className="grid gap-3">
        <input name="email" type="email" required placeholder="E-mailadres" className="rounded-xl border border-line px-4 py-3" />
        <input name="password" type="password" required placeholder="Wachtwoord" className="rounded-xl border border-line px-4 py-3" />
        <button disabled={busy === 'email'} className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-60">
          {busy === 'email' ? 'Bezig…' : 'Inloggen'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      <p className="mt-6 text-sm text-ink-soft">
        Nog geen account? <Link href="/registreren" className="underline">Maak er een aan</Link>.
      </p>
    </main>
  );
}
