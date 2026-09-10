import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inloggen',
  description: 'Log in op uw Verblyf-account om boekingen, favorieten en opgeslagen gegevens te bekijken.',
  alternates: { canonical: '/inloggen' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
