import { BRAND, baseUrl, isDemoInventory } from '@/lib/config';

/**
 * JSON-LD voor de startpagina.
 *
 * Bewust géén Hotel- of Offer-schema zolang de inventaris fictief is: dan zou
 * je verzonnen accommodaties en prijzen aan zoekmachines voeren. Zodra er een
 * echte leverancier gekoppeld is, komt dat er in `HotelJsonLd` bij.
 */
export function SiteJsonLd() {
  const base = baseUrl();

  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organisatie`,
        name: BRAND.legalName,
        alternateName: BRAND.name,
        url: base,
        email: BRAND.email,
        description:
          'Bemiddelaar in accommodatie. Het hotel betaalt geen commissie; de gast betaalt 8% servicekosten, zichtbaar vanaf het eerste zoekresultaat.',
        areaServed: ['NL', 'BE', 'DE', 'FR', 'ES', 'PT'],
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: BRAND.name,
        inLanguage: 'nl-NL',
        publisher: { '@id': `${base}/#organisatie` },
        ...(isDemoInventory()
          ? {}
          : {
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${base}/zoeken?destination={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Hotel-schema, alleen bij echte inventaris. */
export function HotelJsonLd({
  name,
  address,
  city,
  country,
  stars,
  url,
}: {
  name: string;
  address: string;
  city: string;
  country: string;
  stars?: number;
  url: string;
}) {
  if (isDemoInventory()) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: city,
      addressCountry: country,
    },
    ...(stars ? { starRating: { '@type': 'Rating', ratingValue: stars, bestRating: 5 } } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
