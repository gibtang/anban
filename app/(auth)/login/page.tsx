import type { Metadata } from 'next';
import LoginClient from './login-client';

export const metadata: Metadata = {
  title: 'Sign In — Anban',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Sign In — Anban',
    description: 'Sign in to your Anban account.',
    url: 'https://www.getanban.com/login',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Anban — Kanban Boards for Humans and AI Agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In — Anban',
    description: 'Sign in to your Anban account.',
    images: ['/og-image.png'],
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
