import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account aanmaken',
  description: 'Maak een Verblyf-account aan om boekingen te bewaren, favorieten op te slaan en sneller af te rekenen.',
  alternates: { canonical: '/registreren' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
