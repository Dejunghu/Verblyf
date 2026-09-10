import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mijn boeking',
  description: 'Bekijk of wijzig een boeking met uw boekingsnummer en e-mailadres.',
  alternates: { canonical: '/boeking' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
