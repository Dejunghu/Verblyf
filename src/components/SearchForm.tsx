'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d: string, n: number) => {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date.toISOString().slice(0, 10);
};

export function SearchForm({ compact = false, initial }: { compact?: boolean; initial?: Partial<Record<string, string>> }) {
  const router = useRouter();
  const [destination, setDestination] = useState(initial?.destination ?? '');
  const [checkIn, setCheckIn] = useState(initial?.checkIn ?? plusDays(today(), 14));
  const [checkOut, setCheckOut] = useState(initial?.checkOut ?? plusDays(today(), 16));
  const [adults, setAdults] = useState(initial?.adults ?? '2');
  const [rooms, setRooms] = useState(initial?.rooms ?? '1');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (destination.trim().length < 2) return setError('Vul een bestemming in.');
    if (new Date(checkOut) <= new Date(checkIn)) return setError('Uitchecken moet na inchecken liggen.');
    setError(null);
    const params = new URLSearchParams({ destination, checkIn, checkOut, adults, rooms });
    router.push(`/zoeken?${params}`);
  }

  return (
    <form onSubmit={submit} className={`w-full ${compact ? '' : 'shadow-xl shadow-black/5'} rounded-2xl bg-white p-2 ring-1 ring-line`}>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="rounded-xl px-4 py-3 hover:bg-paper">
          <span className="block text-xs font-medium text-ink-soft">Bestemming</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Amsterdam, Lissabon, Antwerpen…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-soft/60"
          />
        </label>
        <label className="rounded-xl px-4 py-3 hover:bg-paper">
          <span className="block text-xs font-medium text-ink-soft">Inchecken</span>
          <input type="date" min={today()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (new Date(checkOut) <= new Date(e.target.value)) setCheckOut(plusDays(e.target.value, 2)); }} className="w-full bg-transparent text-[15px] outline-none" />
        </label>
        <label className="rounded-xl px-4 py-3 hover:bg-paper">
          <span className="block text-xs font-medium text-ink-soft">Uitchecken</span>
          <input type="date" min={plusDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full bg-transparent text-[15px] outline-none" />
        </label>
        <label className="rounded-xl px-4 py-3 hover:bg-paper">
          <span className="block text-xs font-medium text-ink-soft">Gasten</span>
          <select value={adults} onChange={(e) => setAdults(e.target.value)} className="w-full bg-transparent text-[15px] outline-none">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'gast' : 'gasten'}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-brand px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-dark">
          Zoeken
        </button>
      </div>
      {error && <p className="px-4 pb-2 pt-1 text-sm text-accent">{error}</p>}
      <input type="hidden" value={rooms} onChange={() => setRooms(rooms)} />
    </form>
  );
}
