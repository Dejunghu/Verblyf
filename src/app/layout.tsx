import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Verblyf — hotels boeken zonder commissie voor het hotel',
    template: '%s · Verblyf',
  },
  description:
    'Boek rechtstreeks bij Europese hotels. Het hotel betaalt geen commissie; jij betaalt 8% servicekosten, zichtbaar vanaf het eerste zoekresultaat.',
  openGraph: { type: 'website', locale: 'nl_NL', siteName: 'Verblyf' },
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
      <body>{children}</body>
    </html>
  );
}
