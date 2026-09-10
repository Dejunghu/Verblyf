import type { Metadata } from 'next';
import './globals.css';
import { DemoNotice } from '@/components/DemoNotice';
import { SiteJsonLd } from '@/components/StructuredData';
import { baseUrl } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: {
    default: 'Verblyf — hotels boeken zonder commissie voor het hotel',
    template: '%s · Verblyf',
  },
  description:
    'Boek rechtstreeks bij Europese hotels. Het hotel betaalt geen commissie; jij betaalt 8% servicekosten, zichtbaar vanaf het eerste zoekresultaat.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'nl_NL',
    siteName: 'Verblyf',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Verblyf' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Hanken+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <DemoNotice />
        {children}
        <SiteJsonLd />
      </body>
    </html>
  );
}
