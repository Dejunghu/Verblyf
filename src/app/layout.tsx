import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Verblyf — hotels boeken met 2% in plaats van 18%',
    template: '%s · Verblyf',
  },
  description:
    'Boek rechtstreeks bij Europese hotels. Wij rekenen 2% servicefee in plaats van de 15–18% commissie van de grote boekingssites — dat scheelt jou geld en het hotel nog meer.',
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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
