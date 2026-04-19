import type { Metadata } from 'next';
import Auth from '../components/Auth';

export const metadata: Metadata = {
  title: 'Log In | Keywise',
  description: 'Sign in to your Keywise property management account.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <Auth />;
}
