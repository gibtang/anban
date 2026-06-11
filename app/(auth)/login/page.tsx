import type { Metadata } from 'next';
import LoginClient from './login-client';

export const metadata: Metadata = {
  title: 'Sign In — Anban',
  alternates: {
    canonical: 'https://www.getanban.com/login',
  },
  openGraph: {
    title: 'Sign In — Anban',
    description: 'Sign in to your Anban account.',
    url: 'https://www.getanban.com/login',
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
