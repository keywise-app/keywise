import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Keywise | Property Management Support',
  description: 'Get in touch with Keywise support for property management help, feature requests, or partnership inquiries.',
  alternates: { canonical: 'https://keywise.app/contact' },
  openGraph: {
    title: 'Contact Keywise | Property Management Support',
    description: 'Get in touch with Keywise support for property management help, feature requests, or partnership inquiries.',
    url: 'https://keywise.app/contact',
    siteName: 'Keywise',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 628 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Keywise | Property Management Support',
    description: 'Get in touch with Keywise support for property management help.',
  },
  robots: { index: true, follow: true },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
