import type { MetadataRoute } from 'next';
import { baseUrl, isDemoInventory } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  // Zolang de inventaris fictief is: niets indexeren. Zodra er echte hotels in
  // staan, gaat de site vanzelf open voor zoekmachines.
  if (isDemoInventory()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/account', '/boeken', '/bevestiging/', '/inloggen', '/registreren'],
      },
    ],
    sitemap: `${baseUrl()}/sitemap.xml`,
    host: baseUrl(),
  };
}
