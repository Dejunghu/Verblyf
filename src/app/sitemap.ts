import type { MetadataRoute } from 'next';
import { baseUrl, isDemoInventory } from '@/lib/config';
import { SEED_HOTELS } from '@/lib/suppliers/inventory';

export default function sitemap(): MetadataRoute.Sitemap {
  // Geen sitemap voor fictieve inventaris.
  if (isDemoInventory()) return [];

  const base = baseUrl();
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];

  const hotels: MetadataRoute.Sitemap = SEED_HOTELS.map((h) => ({
    url: `${base}/hotel/${encodeURIComponent(`mock:${h.code}`)}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...pages, ...hotels];
}
