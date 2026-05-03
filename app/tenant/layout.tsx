import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tenant Login | Keywise',
  description: 'Tenant portal login for Keywise. Pay rent online, view your lease, and message your landlord.',
  alternates: { canonical: 'https://keywise.app/tenant' },
  robots: { index: true, follow: true },
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
